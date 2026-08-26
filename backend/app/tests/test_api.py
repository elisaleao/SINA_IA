import pytest
from unittest.mock import patch, AsyncMock
from database import DocumentRecord

@pytest.mark.asyncio
async def test_upload_document(client):
    """POST /api/documents/upload should upload, call ingestion service and save to DB."""
    mock_ingest = AsyncMock(return_value=("# Título\nEquação: $x = 1$", "Texto acessível x igual a 1", ["x = 1"]))
    
    with patch("app.main.ingestion_service.process_file", mock_ingest):
        files = {"file": ("test.txt", b"conteudo de teste do arquivo", "text/plain")}
        response = await client.post("/api/documents/upload", files=files)
        
        assert response.status_code == 200
        data = response.json()
        assert "document_id" in data
        assert data["filename"] == "test.txt"
        assert data["extracted_markdown"] == "# Título\nEquação: $x = 1$"
        assert data["accessible_text"] == "Texto acessível x igual a 1"
        assert data["equations_found"] == ["x = 1"]
        mock_ingest.assert_called_once()

@pytest.mark.asyncio
async def test_generate_content_success(client, test_db_session):
    """POST /api/content/generate should retrieve document, run LLM and audio services."""
    doc_id = "test-doc-123"
    doc = DocumentRecord(
        id=doc_id,
        filename="test.txt",
        raw_markdown="Fórmula: $\\frac{1}{2}$",
        accessible_text="Fórmula: fração com numerador 1 e denominador 2"
    )
    test_db_session.add(doc)
    await test_db_session.commit()

    mock_generate = AsyncMock(return_value=("# Resumo\nFórmula: $\\frac{1}{2}$", "Fórmula: fração com numerador 1 e denominador 2"))
    mock_tts = AsyncMock(return_value="test-audio.mp3")

    with patch("app.main.llm_service.generate_content", mock_generate), \
         patch("app.main.AudioService.text_to_speech", mock_tts):
        
        request_body = {
            "document_id": doc_id,
            "generation_type": "summary",
            "teacher_config": {
                "pedagogical_level": "intermediario",
                "math_detail_level": "passo_a_passo",
                "tone": "encorajador"
            },
            "generate_audio": True,
            "voice": "pt-BR-AntonioNeural"
        }
        
        response = await client.post("/api/content/generate", json=request_body)
        
        assert response.status_code == 200
        data = response.json()
        assert data["document_id"] == doc_id
        assert data["generation_type"] == "summary"
        assert data["text_content"] == "# Resumo\nFórmula: $\\frac{1}{2}$"
        assert data["audio_url"] == "/api/audio/test-audio.mp3"
        mock_generate.assert_called_once()
        mock_tts.assert_called_once()

@pytest.mark.asyncio
async def test_generate_content_not_found(client):
    """POST /api/content/generate should return 404 if document is not in DB."""
    request_body = {
        "document_id": "non-existent-id",
        "generation_type": "summary",
        "generate_audio": False
    }
    response = await client.post("/api/content/generate", json=request_body)
    assert response.status_code == 404
    assert response.json()["detail"] == "Documento não encontrado."

@pytest.mark.asyncio
async def test_get_audio_file_success(client):
    """GET /api/audio/{filename} should return the audio file if it exists."""
    from fastapi.responses import Response
    with patch("app.main.os.path.exists", return_value=True), \
         patch("app.main.FileResponse") as mock_fileresponse:
        
        mock_fileresponse.return_value = Response(content=b"fake-audio-content", media_type="audio/mpeg")
        response = await client.get("/api/audio/test-audio.mp3")
        assert response.status_code == 200
        assert response.content == b"fake-audio-content"

@pytest.mark.asyncio
async def test_get_audio_file_not_found(client):
    """GET /api/audio/{filename} should return 404 if file does not exist."""
    with patch("app.main.os.path.exists", return_value=False):
        response = await client.get("/api/audio/non-existent.mp3")
        assert response.status_code == 404
        assert response.json()["detail"] == "Arquivo de áudio não encontrado."
