from __future__ import annotations

import json
import os
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse

from app.accessibility.extractor import SUPPORTED_EXTENSIONS
from app.accessibility.pipeline import AccessibilityPipeline
from app.accessibility.storage import GeneratedFileStore

router = APIRouter(prefix='/api/accessibility', tags=['accessibility'])


def get_generated_file_store() -> GeneratedFileStore:
    return GeneratedFileStore()


def get_accessibility_pipeline() -> AccessibilityPipeline:
    return AccessibilityPipeline()


MAX_UPLOAD_MB = int(os.getenv('ACCESSIBILITY_MAX_UPLOAD_MB', '20'))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024


@router.post('/process-stream')
async def process_document_stream(
    file: UploadFile = File(...),
    level: int = Form(2),
    pipeline: AccessibilityPipeline = Depends(get_accessibility_pipeline),
):
    filename = Path(file.filename or 'documento').name
    extension = Path(filename).suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=(
                'Formato não suportado. Use PDF, DOCX, TXT, PNG, JPG/JPEG ou WEBP.'
            ),
        )
    if level not in (1, 2, 3, 4):
        raise HTTPException(
            status_code=422, detail='Nível deve ser 1, 2, 3 ou 4.'
        )

    data = await file.read(MAX_UPLOAD_BYTES + 1)
    await file.close()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f'Arquivo excede o limite de {MAX_UPLOAD_MB} MB.',
        )
    if not data:
        raise HTTPException(
            status_code=400, detail='O arquivo enviado está vazio.'
        )

    async def ndjson_stream():
        try:
            async for event in pipeline.run(
                filename=filename,
                data=data,
                level=level,
            ):
                yield event.model_dump_json(exclude_none=True) + '\n'
        except Exception as exc:
            payload = {
                'type': 'error',
                'message': f'Falha ao iniciar o pipeline: {exc}',
            }
            yield json.dumps(payload, ensure_ascii=False) + '\n'

    return StreamingResponse(
        ndjson_stream(),
        media_type='application/x-ndjson; charset=utf-8',
        headers={
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
        },
    )


@router.get('/files/{filename}')
async def download_generated_file(
    filename: str,
    store: GeneratedFileStore = Depends(get_generated_file_store),
):
    try:
        path = store.resolve_safe(filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not path.exists() or not path.is_file():
        raise HTTPException(
            status_code=404, detail='Arquivo não encontrado ou expirado.'
        )

    media_type = (
        'audio/mpeg' if path.suffix == '.mp3' else 'text/plain; charset=utf-8'
    )
    download_name = (
        'documento_acessivel.mp3'
        if path.suffix == '.mp3'
        else 'documento_acessivel.txt'
    )
    return FileResponse(
        path,
        media_type=media_type,
        filename=download_name,
        headers={'Cache-Control': 'no-store'},
    )
