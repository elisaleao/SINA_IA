import hashlib
import io
from types import SimpleNamespace

import pytest
from fastapi import UploadFile
from sqlalchemy import select

from app.core.config import settings
from app.database import DocumentRecord
from app.services.material_service import (
    MaterialStorage,
    MaterialUploadService,
    UploadLimitExceeded,
    UploadRejected,
)

TEXT = 'Texto da aula de física sobre movimento.'.encode()


def _upload(data: bytes, filename: str = 'aula.txt') -> UploadFile:
    return UploadFile(file=io.BytesIO(data), filename=filename)


def _user(profile: str | None = None) -> SimpleNamespace:
    prefs = SimpleNamespace(profile=profile) if profile else None
    return SimpleNamespace(id='user-1', accessibility_preferences=prefs)


@pytest.fixture
def storage(tmp_path):
    return MaterialStorage(tmp_path / 'materiais')


@pytest.fixture
def service(storage):
    return MaterialUploadService(storage)


async def _documents(db) -> list[DocumentRecord]:
    return list((await db.execute(select(DocumentRecord))).scalars())


@pytest.mark.asyncio
async def test_too_many_files_are_rejected(
    service, test_db_session, monkeypatch
):
    monkeypatch.setattr(settings, 'MATERIAL_MAX_FILES', 1)

    with pytest.raises(UploadLimitExceeded) as exc:
        await service.receive(
            files=[_upload(TEXT), _upload(TEXT)],
            nivel=None,
            ambiente_id=None,
            user=_user(),
            db=test_db_session,
        )

    assert exc.value.message == 'Envie no máximo 1 arquivos por vez.'
    assert await _documents(test_db_session) == []


@pytest.mark.asyncio
async def test_invalid_level_is_rejected(service, test_db_session):
    with pytest.raises(UploadLimitExceeded) as exc:
        await service.receive(
            files=[_upload(TEXT)],
            nivel=5,
            ambiente_id=None,
            user=_user(),
            db=test_db_session,
        )

    assert exc.value.message == 'O nível de adaptação deve ser 1, 2, 3 ou 4.'
    assert await _documents(test_db_session) == []


@pytest.mark.asyncio
async def test_invalid_file_rejects_the_whole_upload(
    service, storage, test_db_session
):
    with pytest.raises(UploadRejected) as exc:
        await service.receive(
            files=[
                _upload(TEXT),
                _upload(b'MZ\x90\x00' + b'\x00' * 64, 'trabalho.pdf'),
            ],
            nivel=None,
            ambiente_id=None,
            user=_user(),
            db=test_db_session,
        )

    assert [item['arquivo'] for item in exc.value.errors] == ['trabalho.pdf']
    assert exc.value.errors[0]['erro']
    assert await _documents(test_db_session) == []
    assert list(storage.originals.iterdir()) == []


@pytest.mark.asyncio
async def test_new_material_is_saved_and_queued(
    service, storage, test_db_session
):
    outcome = await service.receive(
        files=[_upload(TEXT)],
        nivel=None,
        ambiente_id='ambiente-1',
        user=_user('adhd'),
        db=test_db_session,
    )

    [record] = outcome.created
    assert outcome.to_process == [record.id]
    assert record.status == 'enviado'
    assert record.nivel == 3
    assert record.ambiente_id == 'ambiente-1'
    assert record.user_id == 'user-1'
    assert record.sha256 == hashlib.sha256(TEXT).hexdigest()
    saved = storage.originals / record.caminho_armazenamento
    assert saved.read_bytes() == TEXT


@pytest.mark.asyncio
async def test_same_content_and_level_reuses_ready_result(
    service, storage, test_db_session
):
    audio = storage.results.new_path('.mp3')
    audio.write_bytes(b'mp3')
    test_db_session.add(
        DocumentRecord(
            id='anterior',
            filename='aula.txt',
            sha256=hashlib.sha256(TEXT).hexdigest(),
            nivel=2,
            status='pronto',
            raw_markdown='# Aula',
            accessible_text='Aula adaptada',
            audio_arquivo=audio.name,
            resultado_json={'resumo': 'ok'},
        )
    )
    await test_db_session.commit()

    outcome = await service.receive(
        files=[_upload(TEXT)],
        nivel=2,
        ambiente_id=None,
        user=_user(),
        db=test_db_session,
    )

    [record] = outcome.created
    assert outcome.to_process == []
    assert record.status == 'pronto'
    assert record.accessible_text == 'Aula adaptada'
    assert record.resultado_json == {
        'resumo': 'ok',
        'reaproveitado_de': 'anterior',
    }
    assert record.audio_arquivo != audio.name
    assert storage.audio_path(record.audio_arquivo).read_bytes() == b'mp3'
    assert record.caminho_armazenamento is None
