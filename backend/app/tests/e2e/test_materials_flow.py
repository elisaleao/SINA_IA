import pytest

from tests.e2e.conftest import stored_files
from tests.e2e.polling import wait_for_material
from tests.e2e.samples import (
    CORRUPTED_PDF,
    MALICIOUS_EXE,
    SAMPLE_TEX,
    sample_docx,
    sample_pdf,
)

pytestmark = pytest.mark.e2e

DOCX_MIME = (
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
)


async def _upload(client, headers, name: str, data: bytes):
    return await client.post(
        '/api/materiais', headers=headers, files=[('files', (name, data))]
    )


async def _delete(client, headers, material_id: str) -> None:
    response = await client.delete(
        f'/api/materiais/{material_id}', headers=headers
    )
    assert response.status_code == 204
    gone = await client.get(f'/api/materiais/{material_id}', headers=headers)
    assert gone.status_code == 404


@pytest.mark.parametrize(
    ('name', 'data', 'mime', 'expected_text'),
    [
        (
            'sample.pdf',
            sample_pdf(),
            'application/pdf',
            ['Cinemática', 'Velocidade | m/s', 'Aceleração'],
        ),
        (
            'sample.docx',
            sample_docx(),
            DOCX_MIME,
            ['Leis de Newton', 'Ação e reação', 'módulo'],
        ),
        (
            'sample.tex',
            SAMPLE_TEX,
            'text/plain',
            [r'\section{Relatividade}', '$E = mc^2$', r'\begin{equation}'],
        ),
    ],
)
async def test_document_goes_from_upload_to_cleanup(
    client, backend, student, name, data, mime, expected_text
):
    upload = await _upload(client, student, name, data)

    assert upload.status_code == 202, upload.text
    [summary] = upload.json()['materiais']
    assert summary['nome_original'] == name
    assert summary['mime'] == mime

    material = await wait_for_material(client, student, summary['id'])

    assert material['status'] == 'pronto', material['erro_mensagem']
    for text in expected_text:
        assert text in material['texto_original']
        assert text in material['texto_acessivel']
    assert '�' not in material['texto_acessivel']

    audio = await client.get(material['audio_url'], headers=student)
    assert audio.status_code == 200
    assert audio.headers['content-type'] == 'audio/mpeg'
    assert stored_files(backend.storage) != []

    await _delete(client, student, material['id'])

    assert stored_files(backend.storage) == []


async def test_latex_math_is_detected(client, backend, student):
    upload = await _upload(client, student, 'sample.tex', SAMPLE_TEX)
    material = await wait_for_material(
        client, student, upload.json()['materiais'][0]['id']
    )

    assert material['resultado']['math_detection']['is_math'] is True


async def test_corrupted_pdf_ends_with_plain_error(client, backend, student):
    upload = await _upload(client, student, 'corrupted.pdf', CORRUPTED_PDF)

    assert upload.status_code == 202
    material = await wait_for_material(
        client, student, upload.json()['materiais'][0]['id']
    )

    assert material['status'] == 'erro'
    assert material['erro_mensagem']
    assert 'Traceback' not in material['erro_mensagem']
    assert material['texto_acessivel'] is None

    await _delete(client, student, material['id'])
    assert stored_files(backend.storage) == []


async def test_executable_is_rejected_before_anything_is_saved(
    client, backend, student
):
    upload = await _upload(client, student, 'malicious.exe', MALICIOUS_EXE)

    assert upload.status_code == 422
    [error] = upload.json()['detail']['arquivos']
    assert error['arquivo'] == 'malicious.exe'
    listing = await client.get('/api/materiais', headers=student)
    assert listing.json() == []
    assert stored_files(backend.storage) == []
