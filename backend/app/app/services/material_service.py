"""Armazenamento e processamento em segundo plano dos materiais (#15)."""

import hashlib
import logging
import shutil
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from fastapi import UploadFile
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import settings
from app.database import DocumentRecord, UserRecord
from app.services.accessibility_pipeline import AccessibilityPipeline
from app.services.accessibility_prompts import LEVEL_LABELS
from app.services.file_store import GeneratedFileStore
from app.services.upload_validation import (
    UploadValidationError,
    safe_display_name,
    validate_upload,
)

logger = logging.getLogger(__name__)

# Nível de adaptação do pipeline (1 a 4) usado quando o envio não informa um
NIVEL_POR_PERFIL = {
    'visual': 1,
    'universal': 2,
    'dyslexia': 2,
    'adhd': 3,
    'cognitive': 3,
}
NIVEL_PADRAO = 2

MENSAGEM_ERRO_GENERICA = (
    'Não conseguimos processar este arquivo agora. '
    'Tente de novo em alguns minutos.'
)


def nivel_para_perfil(perfil: Optional[str]) -> int:
    return NIVEL_POR_PERFIL.get(perfil or '', NIVEL_PADRAO)


def mensagem_de_erro(detalhe: str) -> str:
    """Traduz a falha técnica para uma frase curta, sem stack trace."""
    if 'GEMINI_API_KEY' in detalhe:
        return (
            'O processamento com IA não está configurado no servidor. '
            'Avise a equipe responsável.'
        )
    if 'extrair conteúdo' in detalhe:
        return (
            'Não encontramos texto neste arquivo. Confira se ele não está '
            'em branco ou protegido por senha.'
        )
    return MENSAGEM_ERRO_GENERICA


class MaterialProcessingError(RuntimeError):
    pass


class MaterialStorage:
    """Guarda originais e resultados fora de qualquer pasta servida."""

    def __init__(self, root_dir: str | Path) -> None:
        self.root = Path(root_dir)
        self.originals = self.root / 'originais'
        self.originals.mkdir(parents=True, exist_ok=True)
        self.results = GeneratedFileStore(
            self.root / 'resultados', expires=False
        )

    def save_original(
        self, material_id: str, extension: str, data: bytes
    ) -> str:
        # Nome no disco é o UUID do material; o nome enviado nunca é usado
        path = self.originals / f'{material_id}{extension}'
        path.write_bytes(data)
        return path.name

    def read_original(self, name: str) -> bytes:
        return self._original_path(name).read_bytes()

    def audio_path(self, name: str) -> Path:
        return self.results.resolve_safe(name)

    def copy_audio(self, name: str) -> str:
        target = self.results.new_path('.mp3')
        shutil.copyfile(self.audio_path(name), target)
        return target.name

    def delete_files(self, record: DocumentRecord) -> None:
        if record.caminho_armazenamento:
            self._original_path(record.caminho_armazenamento).unlink(
                missing_ok=True
            )
        if record.audio_arquivo:
            self.audio_path(record.audio_arquivo).unlink(missing_ok=True)

    def _original_path(self, name: str) -> Path:
        if not name or Path(name).name != name:
            raise ValueError('Nome de arquivo inválido.')
        return self.originals / name


async def find_cached_result(
    session: AsyncSession, sha256: str, nivel: int
) -> Optional[DocumentRecord]:
    """Material já pronto com o mesmo conteúdo e o mesmo nível."""
    stmt = (
        select(DocumentRecord)
        .where(
            DocumentRecord.sha256 == sha256,
            DocumentRecord.nivel == nivel,
            DocumentRecord.status == 'pronto',
            DocumentRecord.audio_arquivo.is_not(None),
        )
        .order_by(DocumentRecord.created_at.desc())
        .limit(1)
    )
    return (await session.execute(stmt)).scalar_one_or_none()


class UploadRejected(Exception):
    """Um ou mais arquivos não passaram na validação de formato ou tamanho."""

    def __init__(self, errors: list[dict]) -> None:
        self.errors = errors
        super().__init__(
            'Nenhum arquivo foi enviado. Corrija os itens abaixo.'
        )


class UploadLimitExceeded(Exception):
    """A requisição violou um limite simples (quantidade de arquivos ou nível)."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


@dataclass
class UploadOutcome:
    created: list[DocumentRecord]
    to_process: list[str]


class MaterialUploadService:
    """Caso de uso de envio de materiais: limites, nível, validação, cache e gravação."""

    def __init__(self, storage: MaterialStorage) -> None:
        self.storage = storage

    async def receive(
        self,
        *,
        files: list[UploadFile],
        nivel: Optional[int],
        ambiente_id: Optional[str],
        user: UserRecord,
        db: AsyncSession,
    ) -> UploadOutcome:
        if len(files) > settings.MATERIAL_MAX_FILES:
            raise UploadLimitExceeded(
                f'Envie no máximo {settings.MATERIAL_MAX_FILES} '
                'arquivos por vez.'
            )
        if nivel is not None and nivel not in LEVEL_LABELS:
            raise UploadLimitExceeded(
                'O nível de adaptação deve ser 1, 2, 3 ou 4.'
            )

        prefs = user.accessibility_preferences
        nivel_efetivo = nivel or nivel_para_perfil(
            prefs.profile if prefs else None
        )
        max_bytes = settings.MATERIAL_MAX_FILE_MB * 1024 * 1024
        max_docx = settings.DOCX_MAX_UNCOMPRESSED_MB * 1024 * 1024

        validated = []
        errors = []
        for upload in files:
            name = safe_display_name(upload.filename)
            data = await upload.read(max_bytes + 1)
            await upload.close()
            try:
                detected = validate_upload(
                    data,
                    max_bytes=max_bytes,
                    max_docx_uncompressed_bytes=max_docx,
                )
            except UploadValidationError as exc:
                errors.append({'arquivo': name, 'erro': str(exc)})
                continue
            validated.append((name, data, detected))

        if errors:
            raise UploadRejected(errors)

        created: list[DocumentRecord] = []
        to_process: list[str] = []
        for name, data, detected in validated:
            material_id = str(uuid.uuid4())
            digest = hashlib.sha256(data).hexdigest()
            record = DocumentRecord(
                id=material_id,
                user_id=user.id,
                filename=name,
                mime=detected.mime,
                tamanho_bytes=len(data),
                sha256=digest,
                nivel=nivel_efetivo,
                ambiente_id=ambiente_id,
            )

            cached = await find_cached_result(db, digest, nivel_efetivo)
            audio_copy = None
            if cached is not None:
                try:
                    audio_copy = self.storage.copy_audio(
                        cached.audio_arquivo or ''
                    )
                except (FileNotFoundError, ValueError):
                    audio_copy = None

            if cached is not None and audio_copy is not None:
                record.raw_markdown = cached.raw_markdown
                record.accessible_text = cached.accessible_text
                record.audio_arquivo = audio_copy
                record.resultado_json = {
                    **(cached.resultado_json or {}),
                    'reaproveitado_de': cached.id,
                }
                record.status = 'pronto'
            else:
                record.caminho_armazenamento = self.storage.save_original(
                    material_id, detected.extension, data
                )
                record.status = 'enviado'
                to_process.append(material_id)

            db.add(record)
            created.append(record)

        await db.commit()
        for record in created:
            await db.refresh(record)

        return UploadOutcome(created=created, to_process=to_process)


async def process_material(
    material_id: str,
    session_maker: async_sessionmaker[AsyncSession],
    pipeline: AccessibilityPipeline,
    storage: MaterialStorage,
) -> None:
    """Processa um material enviado. Seguro para rodar mais de uma vez."""
    async with session_maker() as session:
        # Só a execução que muda enviado -> processando continua; as demais param
        claim = await session.execute(
            update(DocumentRecord)
            .where(
                DocumentRecord.id == material_id,
                DocumentRecord.status == 'enviado',
            )
            .values(status='processando', erro_mensagem=None)
        )
        await session.commit()
        if claim.rowcount != 1:
            return

        record = await session.get(DocumentRecord, material_id)
        if record is None:
            return

        try:
            data = storage.read_original(record.caminho_armazenamento or '')
            result = None
            pipeline_error: Optional[str] = None
            async for event in pipeline.run(
                filename=record.caminho_armazenamento or record.filename,
                data=data,
                level=record.nivel or NIVEL_PADRAO,
            ):
                if event.type == 'result':
                    result = event.result
                elif event.type == 'error':
                    pipeline_error = event.message
            if result is None:
                raise MaterialProcessingError(
                    pipeline_error or 'O pipeline terminou sem resultado.'
                )
        except Exception as exc:
            logger.warning(
                'Falha ao processar o material %s: %s', material_id, exc
            )
            record.status = 'erro'
            record.erro_mensagem = mensagem_de_erro(str(exc))
            await session.commit()
            return

        # O texto fica no banco; o .txt gerado pelo pipeline é descartado
        text_file = Path(result.text_download_url).name
        storage.results.resolve_safe(text_file).unlink(missing_ok=True)

        record.raw_markdown = result.raw_text
        record.accessible_text = result.accessible_text
        record.audio_arquivo = Path(result.audio_url).name
        record.resultado_json = {
            'math_detection': result.math_detection.model_dump(mode='json'),
            'charts': [c.model_dump(mode='json') for c in result.charts],
            'audit': result.audit.model_dump(mode='json'),
        }
        record.status = 'pronto'
        await session.commit()
