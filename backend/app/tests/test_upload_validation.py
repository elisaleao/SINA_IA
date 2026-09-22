import io
import zipfile

import pytest

from app.services.upload_validation import (
    UploadValidationError,
    detect_file_type,
    docx_uncompressed_size,
    safe_display_name,
    validate_upload,
)

MB = 1024 * 1024


def _docx_bytes(extra_member_size: int = 0) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('[Content_Types].xml', '<Types/>')
        archive.writestr('word/document.xml', '<w:document/>')
        if extra_member_size:
            archive.writestr('word/media/zeros.bin', b'\0' * extra_member_size)
    return buffer.getvalue()


@pytest.mark.parametrize(
    ('data', 'mime', 'extension'),
    [
        (b'%PDF-1.7\n...', 'application/pdf', '.pdf'),
        (b'\x89PNG\r\n\x1a\n rest', 'image/png', '.png'),
        (b'\xff\xd8\xff\xe0 rest', 'image/jpeg', '.jpg'),
        (b'RIFF\x00\x00\x00\x00WEBPVP8 ', 'image/webp', '.webp'),
        ('Derivada de $x^2$ é $2x$.'.encode(), 'text/plain', '.txt'),
    ],
)
def test_detect_file_type_by_signature(data, mime, extension):
    detected = detect_file_type(data)
    assert detected is not None
    assert detected.mime == mime
    assert detected.extension == extension


def test_detect_docx_requires_word_structure():
    detected = detect_file_type(_docx_bytes())
    assert detected is not None
    assert detected.extension == '.docx'

    plain_zip = io.BytesIO()
    with zipfile.ZipFile(plain_zip, 'w') as archive:
        archive.writestr('notas.txt', 'não é Word')
    assert detect_file_type(plain_zip.getvalue()) is None


@pytest.mark.parametrize(
    'data',
    [
        b'MZ\x90\x00\x03\x00\x00\x00',  # executável Windows
        b'PK\x03\x04 zip quebrado',
        b'texto\x00com byte nulo',
        'acentuação em latin-1'.encode('latin-1'),
    ],
)
def test_detect_file_type_rejects_unknown_content(data):
    assert detect_file_type(data) is None


def test_validate_upload_rejects_empty_file():
    with pytest.raises(UploadValidationError, match='vazio'):
        validate_upload(b'', max_bytes=MB, max_docx_uncompressed_bytes=MB)


def test_validate_upload_rejects_file_over_limit():
    with pytest.raises(UploadValidationError, match='limite de 1 MB'):
        validate_upload(
            b'a' * (MB + 1), max_bytes=MB, max_docx_uncompressed_bytes=MB
        )


def test_validate_upload_rejects_renamed_executable():
    with pytest.raises(UploadValidationError, match='Formato não aceito'):
        validate_upload(
            b'MZ\x90\x00 executavel',
            max_bytes=MB,
            max_docx_uncompressed_bytes=MB,
        )


def test_validate_upload_rejects_docx_that_expands_too_much():
    bomb = _docx_bytes(extra_member_size=2 * MB)
    assert len(bomb) < MB  # compactado é pequeno
    assert docx_uncompressed_size(bomb) > MB

    with pytest.raises(UploadValidationError, match='grande demais'):
        validate_upload(bomb, max_bytes=MB, max_docx_uncompressed_bytes=MB)


@pytest.mark.parametrize(
    ('raw', 'expected'),
    [
        ('../../etc/passwd', 'passwd'),
        ('..\\..\\windows\\system.ini', 'system.ini'),
        ('aula\x00\x1f.pdf', 'aula.pdf'),
        ('', 'arquivo'),
        (None, 'arquivo'),
        ('a' * 300 + '.pdf', 'a' * 255),
    ],
)
def test_safe_display_name(raw, expected):
    assert safe_display_name(raw) == expected
