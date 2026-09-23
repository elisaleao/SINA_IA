"""Router de envio de materiais com processamento em segundo plano (#15)."""

from typing import Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.deps import (
    can_access_document,
    get_current_user,
    get_db,
    get_material_pipeline,
    get_material_storage,
    get_material_upload_service,
    get_session_maker,
)
from app.database import DocumentRecord, UserRecord
from app.schemas.material import (
    MaterialDetail,
    MaterialSummary,
    MaterialUploadResponse,
)
from app.services.accessibility_pipeline import AccessibilityPipeline
from app.services.material_service import (
    MaterialStorage,
    MaterialUploadService,
    UploadLimitExceeded,
    UploadRejected,
    process_material,
)

router = APIRouter(prefix='/api/materiais', tags=['Materiais'])

MATERIAL_NAO_ENCONTRADO = 'Material não encontrado.'


def _summary(record: DocumentRecord) -> MaterialSummary:
    return MaterialSummary(
        id=record.id,
        nome_original=record.filename,
        mime=record.mime,
        tamanho_bytes=record.tamanho_bytes,
        status=record.status,
        erro_mensagem=record.erro_mensagem,
        nivel=record.nivel,
        ambiente_id=record.ambiente_id,
        reaproveitado=bool(
            record.resultado_json
            and record.resultado_json.get('reaproveitado_de')
        ),
        criado_em=record.created_at,
    )


def _detail(record: DocumentRecord) -> MaterialDetail:
    return MaterialDetail(
        **_summary(record).model_dump(),
        atualizado_em=record.updated_at,
        texto_original=record.raw_markdown,
        texto_acessivel=record.accessible_text,
        resultado=record.resultado_json,
        audio_url=(
            f'/api/materiais/{record.id}/audio'
            if record.audio_arquivo
            else None
        ),
    )


async def _get_accessible_material(
    db: AsyncSession, material_id: str, user: UserRecord
) -> DocumentRecord:
    record = await db.get(DocumentRecord, material_id)
    # 404 também para material alheio: não revela que ele existe
    if record is None or not can_access_document(record, user):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=MATERIAL_NAO_ENCONTRADO,
        )
    return record


@router.post(
    '',
    status_code=status.HTTP_202_ACCEPTED,
    response_model=MaterialUploadResponse,
    summary='Enviar um ou mais materiais para processamento',
)
async def upload_materials(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    nivel: Optional[int] = Form(None),
    ambiente_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: UserRecord = Depends(get_current_user),
    storage: MaterialStorage = Depends(get_material_storage),
    upload_service: MaterialUploadService = Depends(
        get_material_upload_service
    ),
    pipeline: AccessibilityPipeline = Depends(get_material_pipeline),
    session_maker: async_sessionmaker[AsyncSession] = Depends(
        get_session_maker
    ),
) -> MaterialUploadResponse:
    """Valida todos os arquivos antes de gravar qualquer um e responde 202."""
    try:
        outcome = await upload_service.receive(
            files=files,
            nivel=nivel,
            ambiente_id=ambiente_id,
            user=current_user,
            db=db,
        )
    except UploadLimitExceeded as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.message,
        ) from exc
    except UploadRejected as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={'mensagem': str(exc), 'arquivos': exc.errors},
        ) from exc

    for material_id in outcome.to_process:
        background_tasks.add_task(
            process_material, material_id, session_maker, pipeline, storage
        )

    return MaterialUploadResponse(
        materiais=[_summary(r) for r in outcome.created]
    )


@router.get(
    '',
    response_model=list[MaterialSummary],
    summary='Listar os materiais do usuário',
)
async def list_materials(
    ambiente_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: UserRecord = Depends(get_current_user),
) -> list[MaterialSummary]:
    stmt = select(DocumentRecord).where(
        DocumentRecord.user_id == current_user.id
    )
    if ambiente_id:
        stmt = stmt.where(DocumentRecord.ambiente_id == ambiente_id)
    stmt = stmt.order_by(DocumentRecord.created_at.desc())
    records = (await db.execute(stmt)).scalars().all()
    return [_summary(r) for r in records]


@router.get(
    '/{material_id}',
    response_model=MaterialDetail,
    summary='Status e resultado de um material',
)
async def get_material(
    material_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserRecord = Depends(get_current_user),
) -> MaterialDetail:
    record = await _get_accessible_material(db, material_id, current_user)
    return _detail(record)


@router.get(
    '/{material_id}/audio',
    summary='Áudio MP3 do material, só para quem pode acessá-lo',
)
async def get_material_audio(
    material_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserRecord = Depends(get_current_user),
    storage: MaterialStorage = Depends(get_material_storage),
) -> FileResponse:
    record = await _get_accessible_material(db, material_id, current_user)
    if not record.audio_arquivo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Este material ainda não tem áudio.',
        )
    path = storage.audio_path(record.audio_arquivo)
    if not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Este material ainda não tem áudio.',
        )
    return FileResponse(
        path,
        media_type='audio/mpeg',
        filename='material_acessivel.mp3',
        headers={'Cache-Control': 'private, no-store'},
    )


@router.post(
    '/{material_id}/reprocessar',
    status_code=status.HTTP_202_ACCEPTED,
    response_model=MaterialSummary,
    summary='Tentar de novo o processamento de um material com erro',
)
async def reprocess_material(
    material_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: UserRecord = Depends(get_current_user),
    storage: MaterialStorage = Depends(get_material_storage),
    pipeline: AccessibilityPipeline = Depends(get_material_pipeline),
    session_maker: async_sessionmaker[AsyncSession] = Depends(
        get_session_maker
    ),
) -> MaterialSummary:
    record = await _get_accessible_material(db, material_id, current_user)
    if record.status != 'erro' or not record.caminho_armazenamento:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Só é possível tentar de novo um material com erro.',
        )
    record.status = 'enviado'
    record.erro_mensagem = None
    await db.commit()
    background_tasks.add_task(
        process_material, record.id, session_maker, pipeline, storage
    )
    return _summary(record)


@router.delete(
    '/{material_id}',
    status_code=status.HTTP_204_NO_CONTENT,
    summary='Apagar um material e seus arquivos',
)
async def delete_material(
    material_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserRecord = Depends(get_current_user),
    storage: MaterialStorage = Depends(get_material_storage),
) -> Response:
    record = await _get_accessible_material(db, material_id, current_user)
    storage.delete_files(record)
    await db.delete(record)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
