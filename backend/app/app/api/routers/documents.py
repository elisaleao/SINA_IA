"""Router de upload e ingestão de documentos."""

import os
import uuid
from typing import Optional

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_ingestion_service, get_optional_user
from app.core.config import settings
from app.database import DocumentRecord, UserRecord
from app.models import DocumentProcessResponse
from app.schemas.user import UserRole
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
    current_user: Optional[UserRecord] = Depends(get_optional_user),
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
        # Persistência com vínculo opcional ao usuário logado
        doc_record = DocumentRecord(
            id=doc_id,
            user_id=current_user.id if current_user else None,
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


@router.get(
    '/api/documents/{document_id}',
    response_model=DocumentProcessResponse,
    summary='Obter documento por ID com controle de posse',
)
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[UserRecord] = Depends(get_optional_user),
) -> DocumentProcessResponse:
    """Retorna o documento pelo ID. Se pertencer a outro usuário, retorna 404 para privacidade."""
    stmt = select(DocumentRecord).where(DocumentRecord.id == document_id)
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Documento não encontrado.',
        )

    # Se o documento tiver dono, apenas o dono ou um admin podem acessar
    if doc.user_id is not None:
        if not current_user or (
            current_user.id != doc.user_id
            and current_user.role != UserRole.ADMIN.value
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Documento não encontrado.',
            )

    return DocumentProcessResponse(
        document_id=doc.id,
        filename=doc.filename,
        extracted_markdown=doc.raw_markdown,
        accessible_text=doc.accessible_text,
        equations_found=[],
    )
