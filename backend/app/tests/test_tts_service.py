import io
import json
import logging
import wave
from pathlib import Path

import httpx
import pytest

from app.services.tts_service import TTSService

PIPER_URL = 'http://piper:5000'


def _wav_bytes() -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(22050)
        wav.writeframes(b'\x00\x00' * 2205)
    return buffer.getvalue()


class FakePiper:
    def __init__(self, status=200, body=None, error=None):
        self.status = status
        self.body = _wav_bytes() if body is None else body
        self.error = error
        self.requests: list[httpx.Request] = []

    def transport(self) -> httpx.MockTransport:
        def handler(request: httpx.Request) -> httpx.Response:
            self.requests.append(request)
            if self.error:
                raise self.error
            return httpx.Response(self.status, content=self.body)

        return httpx.MockTransport(handler)


class FakeEdge:
    def __init__(self, fail=False):
        self.fail = fail
        self.texts: list[str] = []

    def communicate(self, text, **_kwargs):
        edge = self

        class _Communicate:
            async def save(self, path: str) -> None:
                edge.texts.append(text)
                if edge.fail:
                    raise ConnectionError('edge offline')
                Path(path).write_bytes(b'edge-mp3')

        return _Communicate()


def _service(prefer, piper: FakePiper, edge: FakeEdge, url=PIPER_URL):
    return TTSService(
        prefer=prefer,
        piper_url=url,
        piper_transport=piper.transport(),
        edge_communicate=edge.communicate,
    )


def _is_mp3(data: bytes) -> bool:
    return data[:3] == b'ID3' or (data[0] == 0xFF and data[1] & 0xE0 == 0xE0)


@pytest.mark.asyncio
async def test_local_preference_uses_piper_and_writes_mp3(tmp_path):
    piper, edge = FakePiper(), FakeEdge()
    out = tmp_path / 'a.mp3'

    await _service('local', piper, edge).synthesize('Olá.', out)

    assert len(piper.requests) == 1
    assert piper.requests[0].url == httpx.URL(f'{PIPER_URL}/synthesize')
    assert json.loads(piper.requests[0].read()) == {'text': 'Olá.'}
    assert edge.texts == []
    # Routes, player and downloads only know MP3 (TTS-02 AC 6).
    assert _is_mp3(out.read_bytes())


@pytest.mark.asyncio
async def test_online_preference_uses_edge_without_calling_piper(tmp_path):
    piper, edge = FakePiper(), FakeEdge()
    out = tmp_path / 'a.mp3'

    await _service('online', piper, edge).synthesize('Olá.', out)

    assert edge.texts == ['Olá.']
    assert piper.requests == []
    assert out.read_bytes() == b'edge-mp3'


@pytest.mark.asyncio
async def test_failed_local_voice_falls_back_to_edge(tmp_path):
    piper, edge = FakePiper(status=500, body=b'erro'), FakeEdge()
    out = tmp_path / 'a.mp3'

    await _service('local', piper, edge).synthesize('Olá.', out)

    assert out.read_bytes() == b'edge-mp3'


@pytest.mark.asyncio
async def test_failed_online_voice_falls_back_to_piper(tmp_path):
    # A blind student keeps getting audio when the internet or the
    # Microsoft endpoint is down.
    piper, edge = FakePiper(), FakeEdge(fail=True)
    out = tmp_path / 'a.mp3'

    await _service('online', piper, edge).synthesize('Olá.', out)

    assert len(piper.requests) == 1
    assert _is_mp3(out.read_bytes())


@pytest.mark.asyncio
async def test_piper_timeout_counts_as_failure(tmp_path):
    piper = FakePiper(error=httpx.ReadTimeout('slow'))
    edge = FakeEdge()
    out = tmp_path / 'a.mp3'

    await _service('local', piper, edge).synthesize('Olá.', out)

    assert out.read_bytes() == b'edge-mp3'


@pytest.mark.asyncio
async def test_piper_answer_that_is_not_wav_counts_as_failure(
    tmp_path, caplog, monkeypatch
):
    # The Piper server answers error pages with HTTP 200 and text/html; the
    # log must say so plainly for whoever runs the server.
    piper = FakePiper(status=200, body=b'<html>erro</html>')
    edge = FakeEdge()
    out = tmp_path / 'a.mp3'

    tts_logger = logging.getLogger('app.services.tts_service')
    monkeypatch.setattr(tts_logger, 'disabled', False)
    with caplog.at_level(logging.WARNING, logger=tts_logger.name):
        await _service('local', piper, edge).synthesize('Olá.', out)

    assert out.read_bytes() == b'edge-mp3'
    assert 'O Piper não devolveu um WAV' in caplog.text


@pytest.mark.asyncio
async def test_both_engines_failing_raises_the_last_error(tmp_path):
    piper, edge = FakePiper(status=500, body=b''), FakeEdge(fail=True)

    with pytest.raises(ConnectionError, match='edge offline'):
        await _service('local', piper, edge).synthesize(
            'Olá.', tmp_path / 'a.mp3'
        )


@pytest.mark.asyncio
async def test_without_piper_url_only_edge_is_used(tmp_path):
    # Development without Docker has no piper service and must work as before.
    piper, edge = FakePiper(), FakeEdge()
    out = tmp_path / 'a.mp3'

    await _service('local', piper, edge, url='').synthesize('Olá.', out)

    assert piper.requests == []
    assert out.read_bytes() == b'edge-mp3'


@pytest.mark.asyncio
async def test_empty_text_is_refused_without_calling_any_engine(tmp_path):
    piper, edge = FakePiper(), FakeEdge()

    with pytest.raises(ValueError, match='Não há texto'):
        await _service('local', piper, edge).synthesize(
            '   ', tmp_path / 'a.mp3'
        )

    assert piper.requests == []
    assert edge.texts == []
