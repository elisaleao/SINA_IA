"""Router para disponibilização de arquivos de áudio sintetizados."""

import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.core.config import settings

router = APIRouter(tags=['Áudio'])


@router.get('/api/audio/{filename}')
async def get_audio_file(filename: str):
    file_path = os.path.join(settings.OUTPUT_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404, detail='Arquivo de áudio não encontrado.'
        )
    return FileResponse(file_path, media_type='audio/mpeg', filename=filename)
