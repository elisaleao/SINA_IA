from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
import os
import aiofiles

from config import settings
from database import init_db, AsyncSessionLocal, DocumentRecord
from models import DocumentProcessResponse, GenerateRequest, GenerationResponse
from services.ingestion_service import IngestionService
from services.llm_service import LLMService
from services.audio_service import AudioService

app = FastAPI(
    title="Accessible NotebookLM API",
    description="Backend focado em acessibilidade para estudantes com deficiência visual.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ingestion_service = IngestionService()
llm_service = LLMService()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

@app.on_event("startup")
async def on_startup():
    await init_db()

# ----------------- ENDPOINT: UPLOAD & INGESTÃO ----------------- #
@app.post("/api/documents/upload", response_model=DocumentProcessResponse, tags=["Documentos"])
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    doc_id = str(uuid.uuid4())
    saved_path = os.path.join(settings.UPLOAD_DIR, f"{doc_id}_{file.filename}")

    try:
        async with aiofiles.open(saved_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)

        # Ingestão e OCR inteligente
        raw_markdown, accessible_text, equations = await ingestion_service.process_file(
            saved_path, file.filename
        )

        # Persistência
        doc_record = DocumentRecord(
            id=doc_id,
            filename=file.filename,
            raw_markdown=raw_markdown,
            accessible_text=accessible_text
        )
        db.add(doc_record)
        await db.commit()

        return DocumentProcessResponse(
            document_id=doc_id,
            filename=file.filename,
            extracted_markdown=raw_markdown,
            accessible_text=accessible_text,
            equations_found=equations
        )

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao processar arquivo: {str(e)}")
    finally:
        if os.path.exists(saved_path):
            os.remove(saved_path)

# ----------------- ENDPOINT: GERAÇÃO DE CONTEÚDO E ÁUDIO ----------------- #
@app.post("/api/content/generate", response_model=GenerationResponse, tags=["Geração e Acessibilidade"])
async def generate_study_content(
    req: GenerateRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(DocumentRecord).where(DocumentRecord.id == req.document_id))
    doc_record = result.scalars().first()

    if not doc_record:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")

    try:
        # Geração via Gemini calibrada pelo professor
        markdown_output, spoken_output = await llm_service.generate_content(
            text=doc_record.raw_markdown,
            gen_type=req.generation_type,
            config=req.teacher_config
        )

        audio_url = None
        if req.generate_audio:
            audio_filename = await AudioService.text_to_speech(spoken_output, voice=req.voice)
            audio_url = f"/api/audio/{audio_filename}"

        return GenerationResponse(
            document_id=req.document_id,
            generation_type=req.generation_type.value,
            text_content=markdown_output,
            spoken_content=spoken_output,
            audio_url=audio_url
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na geração de conteúdo/áudio: {str(e)}")

# ----------------- ENDPOINT: SERVIR ARQUIVOS DE ÁUDIO ----------------- #
@app.get("/api/audio/{filename}", tags=["Áudio"])
async def get_audio_file(filename: str):
    file_path = os.path.join(settings.OUTPUT_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Arquivo de áudio não encontrado.")
    return FileResponse(file_path, media_type="audio/mpeg", filename=filename)