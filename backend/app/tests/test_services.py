import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from app.services.llm_service import LLMService
from app.services.audio_service import AudioService
from models import TeacherConfig, GenerationType

# LLMService Tests
def test_llm_service_no_api_key():
    """ValueError is raised if API key is not configured."""
    with patch("app.services.llm_service.settings") as mock_settings:
        mock_settings.GEMINI_API_KEY = None
        service = LLMService()
        
        with pytest.raises(ValueError, match="GEMINI_API_KEY não configurada."):
            import asyncio
            asyncio.run(service.generate_content("teste", GenerationType.SUMMARY, TeacherConfig()))

@pytest.mark.asyncio
async def test_llm_service_generate_content():
    """LLMService should format prompts and process responses using MathToSpeechService."""
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "Este é um resumo do texto com $\\frac{1}{2}$."
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.llm_service.genai.Client", return_value=mock_client), \
         patch("app.services.llm_service.settings") as mock_settings:
        
        mock_settings.GEMINI_API_KEY = "dummy_key"
        
        service = LLMService()
        markdown, spoken = await service.generate_content(
            text="Conteúdo do arquivo",
            gen_type=GenerationType.SUMMARY,
            config=TeacherConfig(pedagogical_level="basico", math_detail_level="direto", tone="formal")
        )

        assert markdown == "Este é um resumo do texto com $\\frac{1}{2}$."
        assert "fração com numerador 1 e denominador 2" in spoken
        mock_client.models.generate_content.assert_called_once()


# AudioService Tests
@pytest.mark.asyncio
async def test_audio_service_text_to_speech():
    """AudioService should call edge_tts Communicate and save the file."""
    mock_communicate = MagicMock()
    mock_communicate.save = AsyncMock()

    with patch("app.services.audio_service.edge_tts.Communicate", return_value=mock_communicate) as mock_comm_cls, \
         patch("app.services.audio_service.settings") as mock_settings:
        
        mock_settings.OUTPUT_DIR = "/dummy/dir"
        
        filename = await AudioService.text_to_speech("Texto fonético", voice="pt-BR-AntonioNeural")
        
        assert filename.endswith(".mp3")
        mock_comm_cls.assert_called_once_with("Texto fonético", "pt-BR-AntonioNeural")
        mock_communicate.save.assert_called_once()
