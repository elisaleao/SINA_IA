import io
import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock

import docx
import pymupdf
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.accessibility.pipeline import AccessibilityPipeline
from app.api.deps import get_material_pipeline, get_material_storage
from app.core.config import settings
from app.database import DocumentRecord
from app.main import app
from app.services.fakes import FakeAccessibilityAI, FakeEdgeTTS
from app.services.material_service import (
    MaterialStorage,
    mensagem_de_erro,
    nivel_para_perfil,
    process_material,
)

TXT = 'Derivada de $x^2$ é $2x$. A integral desfaz a derivada.'.encode()


def _pdf_bytes() -> bytes:
    document = pymupdf.open()
    page = document.new_page()
    page.insert_text(
        (72, 72), 'Cinemática: a velocidade média é deslocamento sobre tempo.'
    )
    data = document.tobytes()
    document.close()
    return data


def _docx_bytes() -> bytes:
    document = docx.Document()
    document.add_paragraph('Leis de Newton: força é massa vezes aceleração.')
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


PNG = b'\x89PNG\r\n\x1a\n' + b'\x00' * 32


@pytest.fixture
def materials(client, tmp_path):
    state = SimpleNamespace(
        ai=FakeAccessibilityAI(),
        tts=FakeEdgeTTS(),
        storage=MaterialStorage(tmp_path / 'materiais'),
    )

    def pipeline() -> AccessibilityPipeline:
        # DocumentExtractor real; só o Gemini e o Edge-TTS são falsos
        return AccessibilityPipeline(
            ai=state.ai, tts=state.tts, store=state.storage.results
        )

    app.dependency_overrides[get_material_storage] = lambda: state.storage
    app.dependency_overrides[get_material_pipeline] = pipeline
    return state


async def _auth(client, email: str, profile: str | None = None) -> dict:
    payload = {
        'email': email,
        'password': 'senhaForte123',
        'full_name': 'Aluno Materiais',
        'role': 'aluno',
    }
    if profile:
        payload['accessibility_preferences'] = {'profile': profile}
    reg = await client.post('/auth/register', json=payload)
    return {'Authorization': f'Bearer {reg.json()["access_token"]}'}


async def _upload(client, headers, files, **form):
    return await client.post(
        '/api/materiais',
        headers=headers,
        files=[('files', f) for f in files],
        data={k: str(v) for k, v in form.items()},
    )


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ('name', 'data', 'mime'),
    [
        ('aula.txt', TXT, 'text/plain'),
        ('aula.pdf', _pdf_bytes(), 'application/pdf'),
        (
            'aula.docx',
            _docx_bytes(),
            'application/vnd.openxmlformats-officedocument.'
            'wordprocessingml.document',
        ),
        ('quadro.png', PNG, 'image/png'),
    ],
)
async def test_upload_processes_each_supported_type(
    client, materials, name, data, mime
):
    headers = await _auth(client, f'tipo_{name}@sina.edu.br')

    response = await _upload(client, headers, [(name, data)])

    assert response.status_code == 202
    [summary] = response.json()['materiais']
    assert summary['status'] == 'enviado'
    assert summary['mime'] == mime
    assert summary['nome_original'] == name

    detail = await client.get(
        f'/api/materiais/{summary["id"]}', headers=headers
    )
    body = detail.json()
    assert body['status'] == 'pronto'
    assert body['texto_acessivel'].startswith('Versão acessível:')
    assert body['texto_original']
    assert body['resultado']['audit']['status'] == 'ok'
    assert body['audio_url'] == f'/api/materiais/{summary["id"]}/audio'

    audio = await client.get(body['audio_url'], headers=headers)
    assert audio.status_code == 200
    assert audio.headers['content-type'] == 'audio/mpeg'


@pytest.mark.asyncio
async def test_upload_requires_authentication(client, materials):
    response = await _upload(client, {}, [('aula.txt', TXT)])
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_renamed_executable_is_rejected_and_nothing_is_saved(
    client, materials
):
    headers = await _auth(client, 'exe@sina.edu.br')

    response = await _upload(
        client,
        headers,
        [('aula.txt', TXT), ('prova.pdf', b'MZ\x90\x00\x03 executavel')],
    )

    assert response.status_code == 422
    detail = response.json()['detail']
    assert detail['arquivos'] == [
        {
            'arquivo': 'prova.pdf',
            'erro': (
                'Formato não aceito. Envie PDF, Word (DOCX), texto (TXT), '
                'PNG, JPG ou WEBP.'
            ),
        }
    ]
    listing = await client.get('/api/materiais', headers=headers)
    assert listing.json() == []
    assert list(materials.storage.originals.iterdir()) == []


@pytest.mark.asyncio
async def test_empty_file_is_rejected(client, materials):
    headers = await _auth(client, 'vazio@sina.edu.br')
    response = await _upload(client, headers, [('vazio.txt', b'')])
    assert response.status_code == 422
    assert response.json()['detail']['arquivos'][0]['erro'] == (
        'O arquivo está vazio.'
    )


@pytest.mark.asyncio
async def test_file_over_size_limit_is_rejected(
    client, materials, monkeypatch
):
    monkeypatch.setattr(settings, 'MATERIAL_MAX_FILE_MB', 1)
    headers = await _auth(client, 'grande@sina.edu.br')

    response = await _upload(
        client, headers, [('grande.txt', b'a' * (1024 * 1024 + 1))]
    )

    assert response.status_code == 422
    assert 'limite de 1 MB' in response.json()['detail']['arquivos'][0]['erro']


@pytest.mark.asyncio
async def test_too_many_files_are_rejected(client, materials, monkeypatch):
    monkeypatch.setattr(settings, 'MATERIAL_MAX_FILES', 2)
    headers = await _auth(client, 'muitos@sina.edu.br')

    response = await _upload(
        client,
        headers,
        [('a.txt', TXT), ('b.txt', TXT), ('c.txt', TXT)],
    )

    assert response.status_code == 422
    assert 'no máximo 2 arquivos' in response.json()['detail']


@pytest.mark.asyncio
async def test_path_traversal_name_is_only_used_for_display(client, materials):
    headers = await _auth(client, 'traversal@sina.edu.br')

    response = await _upload(
        client, headers, [('../../../etc/segredo.txt', TXT)]
    )

    [summary] = response.json()['materiais']
    assert summary['nome_original'] == 'segredo.txt'
    stored = [p.name for p in materials.storage.originals.iterdir()]
    assert stored == [f'{summary["id"]}.txt']


@pytest.mark.asyncio
async def test_same_file_and_level_reuses_previous_result(client, materials):
    headers = await _auth(client, 'cache@sina.edu.br')
    first = (await _upload(client, headers, [('aula.txt', TXT)])).json()
    calls_after_first = len(materials.ai.calls)

    second = await _upload(client, headers, [('copia.txt', TXT)])

    [summary] = second.json()['materiais']
    assert summary['status'] == 'pronto'
    assert summary['reaproveitado'] is True
    assert len(materials.ai.calls) == calls_after_first

    # O áudio é uma cópia: apagar o primeiro não afeta o segundo
    first_id = first['materiais'][0]['id']
    await client.delete(f'/api/materiais/{first_id}', headers=headers)
    audio = await client.get(
        f'/api/materiais/{summary["id"]}/audio', headers=headers
    )
    assert audio.status_code == 200


@pytest.mark.asyncio
async def test_different_level_does_not_reuse_result(client, materials):
    headers = await _auth(client, 'nivel_cache@sina.edu.br')
    await _upload(client, headers, [('aula.txt', TXT)], nivel=1)

    second = await _upload(client, headers, [('aula.txt', TXT)], nivel=3)

    [summary] = second.json()['materiais']
    assert summary['status'] == 'enviado'
    assert summary['reaproveitado'] is False


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ('profile', 'form', 'expected'),
    [
        ('visual', {}, 1),
        ('dyslexia', {}, 2),
        ('adhd', {}, 3),
        ('adhd', {'nivel': 1}, 1),
    ],
)
async def test_level_comes_from_profile_unless_informed(
    client, materials, profile, form, expected
):
    headers = await _auth(
        client, f'nivel_{profile}_{expected}@sina.edu.br', profile
    )
    response = await _upload(client, headers, [('aula.txt', TXT)], **form)
    assert response.json()['materiais'][0]['nivel'] == expected


@pytest.mark.asyncio
async def test_invalid_level_is_rejected(client, materials):
    headers = await _auth(client, 'nivel_invalido@sina.edu.br')
    response = await _upload(client, headers, [('aula.txt', TXT)], nivel=7)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_processing_failure_shows_plain_message_and_can_retry(
    client, materials
):
    headers = await _auth(client, 'falha@sina.edu.br')
    materials.ai = FakeAccessibilityAI(
        failure=RuntimeError('GEMINI_API_KEY não configurada no backend.')
    )

    uploaded = await _upload(client, headers, [('aula.txt', TXT)])
    material_id = uploaded.json()['materiais'][0]['id']

    failed = (
        await client.get(f'/api/materiais/{material_id}', headers=headers)
    ).json()
    assert failed['status'] == 'erro'
    assert 'não está configurado no servidor' in failed['erro_mensagem']
    assert 'GEMINI_API_KEY' not in failed['erro_mensagem']
    assert failed['audio_url'] is None

    materials.ai = FakeAccessibilityAI()
    retry = await client.post(
        f'/api/materiais/{material_id}/reprocessar', headers=headers
    )
    assert retry.status_code == 202

    done = (
        await client.get(f'/api/materiais/{material_id}', headers=headers)
    ).json()
    assert done['status'] == 'pronto'
    assert done['erro_mensagem'] is None


@pytest.mark.asyncio
async def test_retry_is_only_allowed_after_an_error(client, materials):
    headers = await _auth(client, 'retry_pronto@sina.edu.br')
    uploaded = await _upload(client, headers, [('aula.txt', TXT)])
    material_id = uploaded.json()['materiais'][0]['id']

    response = await client.post(
        f'/api/materiais/{material_id}/reprocessar', headers=headers
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_other_user_cannot_see_or_change_material(client, materials):
    owner = await _auth(client, 'dono_material@sina.edu.br')
    other = await _auth(client, 'outro_material@sina.edu.br')
    uploaded = await _upload(client, owner, [('aula.txt', TXT)])
    material_id = uploaded.json()['materiais'][0]['id']

    for method, suffix in [
        ('get', ''),
        ('get', '/audio'),
        ('post', '/reprocessar'),
        ('delete', ''),
    ]:
        response = await client.request(
            method, f'/api/materiais/{material_id}{suffix}', headers=other
        )
        assert response.status_code == 404, (method, suffix)

    assert (await client.get('/api/materiais', headers=other)).json() == []
    still_there = await client.get(
        f'/api/materiais/{material_id}', headers=owner
    )
    assert still_there.status_code == 200


@pytest.mark.asyncio
async def test_list_filters_by_environment(client, materials):
    headers = await _auth(client, 'ambiente@sina.edu.br')
    await _upload(client, headers, [('a.txt', TXT)], ambiente_id='amb-1')
    await _upload(client, headers, [('b.txt', b'outro texto')])

    all_items = (await client.get('/api/materiais', headers=headers)).json()
    filtered = (
        await client.get(
            '/api/materiais', headers=headers, params={'ambiente_id': 'amb-1'}
        )
    ).json()

    assert len(all_items) == 2
    assert [m['nome_original'] for m in filtered] == ['a.txt']


@pytest.mark.asyncio
async def test_delete_removes_record_and_files(client, materials):
    headers = await _auth(client, 'apagar@sina.edu.br')
    materials.ai = FakeAccessibilityAI(failure=RuntimeError('falhou'))
    uploaded = await _upload(client, headers, [('aula.txt', TXT)])
    material_id = uploaded.json()['materiais'][0]['id']
    assert any(materials.storage.originals.iterdir())

    response = await client.delete(
        f'/api/materiais/{material_id}', headers=headers
    )

    assert response.status_code == 204
    assert not any(materials.storage.originals.iterdir())
    missing = await client.get(
        f'/api/materiais/{material_id}', headers=headers
    )
    assert missing.status_code == 404


@pytest.mark.asyncio
async def test_process_material_runs_only_once(test_engine, tmp_path):
    session_maker = async_sessionmaker(
        test_engine, expire_on_commit=False, class_=AsyncSession
    )
    async with session_maker() as session:
        session.add(
            DocumentRecord(
                id='ja-processado',
                filename='aula.txt',
                raw_markdown='texto',
                accessible_text='texto',
                status='pronto',
            )
        )
        await session.commit()

    pipeline = MagicMock()
    await process_material(
        'ja-processado',
        session_maker,
        pipeline,
        MaterialStorage(tmp_path),
    )

    pipeline.run.assert_not_called()


@pytest.mark.asyncio
async def test_legacy_routes_handle_material_still_processing(
    client, test_db_session
):
    doc_id = str(uuid.uuid4())
    test_db_session.add(
        DocumentRecord(id=doc_id, filename='aula.txt', status='processando')
    )
    await test_db_session.commit()

    document = await client.get(f'/api/documents/{doc_id}')
    assert document.status_code == 200
    assert not document.json()['accessible_text']

    generate = await client.post(
        '/api/content/generate',
        json={
            'document_id': doc_id,
            'generation_type': 'summary',
            'generate_audio': False,
        },
    )
    assert generate.status_code == 409


@pytest.mark.parametrize(
    ('profile', 'expected'),
    [('visual', 1), ('dyslexia', 2), ('adhd', 3), ('cognitive', 3), (None, 2)],
)
def test_nivel_para_perfil(profile, expected):
    assert nivel_para_perfil(profile) == expected


@pytest.mark.parametrize(
    ('raw', 'fragment'),
    [
        ('GEMINI_API_KEY não configurada', 'não está configurado'),
        (
            'Não foi possível extrair conteúdo do arquivo.',
            'Não encontramos texto',
        ),
        ('Traceback: KeyError', 'Tente de novo'),
    ],
)
def test_mensagem_de_erro_is_plain_language(raw, fragment):
    message = mensagem_de_erro(raw)
    assert fragment in message
    assert 'Traceback' not in message
