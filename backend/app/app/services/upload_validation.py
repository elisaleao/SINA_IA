"""Validação de arquivos enviados, pelo conteúdo e não pela extensão."""

import unicodedata
import zipfile
from dataclasses import dataclass
from io import BytesIO
from pathlib import PurePath

ACCEPTED_FORMATS_MESSAGE = 'Formato não aceito. Envie PDF, Word (DOCX), texto (TXT), PNG, JPG ou WEBP.'


@dataclass(frozen=True)
class DetectedFile:
    mime: str
    extension: str


class UploadValidationError(ValueError):
    """Erro de validação com mensagem em linguagem simples para o usuário."""


def detect_file_type(data: bytes) -> DetectedFile | None:
    """Identifica o formato pelos primeiros bytes (assinatura do arquivo)."""
    if data.startswith(b'%PDF-'):
        return DetectedFile('application/pdf', '.pdf')
    if data.startswith(b'\x89PNG\r\n\x1a\n'):
        return DetectedFile('image/png', '.png')
    if data.startswith(b'\xff\xd8\xff'):
        return DetectedFile('image/jpeg', '.jpg')
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return DetectedFile('image/webp', '.webp')
    if data.startswith(b'PK\x03\x04'):
        return _detect_docx(data)
    if _looks_like_utf8_text(data):
        return DetectedFile('text/plain', '.txt')
    return None


def _detect_docx(data: bytes) -> DetectedFile | None:
    try:
        with zipfile.ZipFile(BytesIO(data)) as archive:
            names = set(archive.namelist())
    except zipfile.BadZipFile:
        return None
    if '[Content_Types].xml' in names and 'word/document.xml' in names:
        return DetectedFile(
            'application/vnd.openxmlformats-officedocument.'
            'wordprocessingml.document',
            '.docx',
        )
    return None


def _looks_like_utf8_text(data: bytes) -> bool:
    sample = data[:8192]
    if b'\x00' in sample:
        return False
    try:
        data.decode('utf-8-sig')
    except UnicodeDecodeError:
        return False
    return True


def docx_uncompressed_size(data: bytes) -> int:
    """Soma o tamanho descompactado declarado de cada entrada do DOCX."""
    with zipfile.ZipFile(BytesIO(data)) as archive:
        return sum(info.file_size for info in archive.infolist())


def safe_display_name(filename: str | None) -> str:
    """Nome só para exibição: sem diretórios, sem caracteres de controle."""
    name = PurePath((filename or '').replace('\\', '/')).name
    name = ''.join(
        char for char in name if unicodedata.category(char)[0] != 'C'
    ).strip()
    return name[:255] or 'arquivo'


def validate_upload(
    data: bytes,
    *,
    max_bytes: int,
    max_docx_uncompressed_bytes: int,
) -> DetectedFile:
    """Valida tamanho e formato e devolve o tipo detectado."""
    if not data:
        raise UploadValidationError('O arquivo está vazio.')
    if len(data) > max_bytes:
        limit_mb = max_bytes // (1024 * 1024)
        raise UploadValidationError(
            f'O arquivo passa do limite de {limit_mb} MB.'
        )

    detected = detect_file_type(data)
    if detected is None:
        raise UploadValidationError(ACCEPTED_FORMATS_MESSAGE)

    if (
        detected.extension == '.docx'
        and docx_uncompressed_size(data) > max_docx_uncompressed_bytes
    ):
        raise UploadValidationError(
            'O documento Word fica grande demais quando aberto. '
            'Divida o arquivo em partes menores.'
        )
    return detected
