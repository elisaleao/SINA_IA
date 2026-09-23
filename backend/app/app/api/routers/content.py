"""Router para geração de conteúdo didático inclusivo e síntese de voz."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    can_access_document,
    get_ai_client,
    get_db,
    get_llm_client,
    get_optional_user,
    get_tts_client,
)
from app.core.protocols import LLMClientProtocol, TTSClientProtocol
from app.database import DocumentRecord, UserRecord
from app.models import GenerateRequest, GenerationResponse
from app.services.ai_provider import FallbackAIClient

router = APIRouter(tags=['Geração e Acessibilidade'])


@router.post(
    '/api/content/generate',
    response_model=GenerationResponse,
)
async def generate_study_content(
    req: GenerateRequest,
    db: AsyncSession = Depends(get_db),
    llm: LLMClientProtocol = Depends(get_llm_client),
    tts: TTSClientProtocol = Depends(get_tts_client),
    current_user: Optional[UserRecord] = Depends(get_optional_user),
    ai: FallbackAIClient = Depends(get_ai_client),
):
    result = await db.execute(
        select(DocumentRecord).where(DocumentRecord.id == req.document_id)
    )
    doc_record = result.scalars().first()

    # Mesmo 404 para inexistente e alheio: não revela que o documento existe
    if not doc_record or not can_access_document(doc_record, current_user):
        raise HTTPException(
            status_code=404, detail='Documento não encontrado.'
        )

    if doc_record.raw_markdown is None:
        raise HTTPException(
            status_code=409,
            detail='O material ainda está sendo processado.',
        )

    try:
        # Geração via LLM calibrada por professor e perfil de acessibilidade
        markdown_output, spoken_output = await llm.generate_content(
            text=doc_record.raw_markdown,
            gen_type=req.generation_type,
            config=req.teacher_config,
            accessibility=req.accessibility_config,
        )

        audio_url = None
        if req.generate_audio:
            audio_filename = await tts.text_to_speech(
                spoken_output, voice=req.voice
            )
            audio_url = f'/api/audio/{audio_filename}'

        profile_val = (
            req.accessibility_config.profile.value
            if req.accessibility_config
            else None
        )

        return GenerationResponse(
            document_id=req.document_id,
            generation_type=req.generation_type.value,
            text_content=markdown_output,
            spoken_content=spoken_output,
            audio_url=audio_url,
            accessibility_profile=profile_val,
            chave_pessoal_falhou=ai.used_fallback,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f'Erro na geração de conteúdo/áudio: {str(e)}',
        )
