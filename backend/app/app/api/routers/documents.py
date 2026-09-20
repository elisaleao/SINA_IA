"""Router de upload e ingestão de documentos."""

import os
import uuid

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_ingestion_service
from app.core.config import settings
from app.database import DocumentRecord
from app.models import DocumentProcessResponse
from app.services.ingestion_service import IngestionService

router = APIRouter(tags=['Documentos'])


@router.post(
    '/api/documents/upload',
    response_model=DocumentProcessResponse,
)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    ingestion: IngestionService = Depends(get_ingestion_service),
):
    doc_id = str(uuid.uuid4())
    saved_path = os.path.join(settings.UPLOAD_DIR, f'{doc_id}_{file.filename}')

    try:
        async with aiofiles.open(saved_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)

        # Ingestão e OCR inteligente
        (
            raw_markdown,
            accessible_text,
            equations,
        ) = await ingestion.process_file(saved_path, file.filename)

        # Persistência
        doc_record = DocumentRecord(
            id=doc_id,
            filename=file.filename,
            raw_markdown=raw_markdown,
            accessible_text=accessible_text,
        )
        db.add(doc_record)
        await db.commit()

        return DocumentProcessResponse(
            document_id=doc_id,
            filename=file.filename,
            extracted_markdown=raw_markdown,
            accessible_text=accessible_text,
            equations_found=equations,
        )

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500, detail=f'Erro ao processar arquivo: {str(e)}'
        )
    finally:
        if os.path.exists(saved_path):
            os.remove(saved_path)
