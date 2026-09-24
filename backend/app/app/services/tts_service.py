"""Único serviço de síntese de voz do backend: Edge-TTS e Piper (ADR-0004)."""

import io
import logging
import uuid
import wave
from pathlib import Path
from typing import Awaitable, Callable, Optional

import edge_tts
import httpx
import lameenc

from app.core.config import settings

logger = logging.getLogger(__name__)

ONLINE = 'online'
LOCAL = 'local'
MP3_BIT_RATE_KBPS = 64


def wav_to_mp3(wav_bytes: bytes) -> bytes:
    """Converte o WAV PCM do Piper em MP3, o formato que o sistema serve."""
    with wave.open(io.BytesIO(wav_bytes), 'rb') as wav:
        encoder = lameenc.Encoder()
        encoder.set_bit_rate(MP3_BIT_RATE_KBPS)
        encoder.set_in_sample_rate(wav.getframerate())
        encoder.set_channels(wav.getnchannels())
        encoder.set_quality(2)
        frames = wav.readframes(wav.getnframes())
    return bytes(encoder.encode(frames) + encoder.flush())


class TTSService:
    """Tenta o motor preferido e, se falhar, o outro; sem Piper, só o Edge."""

    def __init__(
        self,
        prefer: str = ONLINE,
        piper_url: Optional[str] = None,
        piper_transport: Optional[httpx.AsyncBaseTransport] = None,
        edge_communicate: Optional[Callable[..., edge_tts.Communicate]] = None,
    ):
        self.prefer = prefer
        self.piper_url = (
            settings.PIPER_URL if piper_url is None else piper_url
        ).rstrip('/')
        self._piper_transport = piper_transport
        self._edge_communicate = edge_communicate

    def _engines(
        self,
    ) -> list[tuple[str, Callable[[str, Path, Optional[str]], Awaitable]]]:
        if not self.piper_url:
            return [(ONLINE, self._edge)]
        if self.prefer == LOCAL:
            return [(LOCAL, self._piper), (ONLINE, self._edge)]
        return [(ONLINE, self._edge), (LOCAL, self._piper)]

    async def synthesize(
        self, text: str, output_path: Path, voice: Optional[str] = None
    ) -> None:
        """Grava o MP3 em output_path."""
        if not text.strip():
            raise ValueError('Não há texto para gerar áudio.')

        last_error: Optional[Exception] = None
        for name, engine in self._engines():
            try:
                await engine(text, Path(output_path), voice)
                return
            except Exception as exc:
                logger.warning('Motor de voz %s falhou: %s', name, exc)
                last_error = exc
        assert last_error is not None
        raise last_error

    async def _edge(
        self, text: str, output_path: Path, voice: Optional[str]
    ) -> None:
        factory = self._edge_communicate or edge_tts.Communicate
        communicate = factory(
            text=text,
            voice=voice or settings.EDGE_TTS_VOICE,
            rate=settings.EDGE_TTS_RATE,
            volume=settings.EDGE_TTS_VOLUME,
            pitch=settings.EDGE_TTS_PITCH,
        )
        await communicate.save(str(output_path))

        if not output_path.exists() or output_path.stat().st_size == 0:
            raise RuntimeError(
                'O Edge TTS não gerou um arquivo de áudio válido.'
            )

    async def _piper(
        self, text: str, output_path: Path, voice: Optional[str]
    ) -> None:
        async with httpx.AsyncClient(
            timeout=settings.PIPER_TIMEOUT_SECONDS,
            transport=self._piper_transport,
        ) as client:
            response = await client.post(
                f'{self.piper_url}/synthesize', json={'text': text}
            )
        if response.status_code != 200 or not response.content.startswith(
            b'RIFF'
        ):
            raise RuntimeError(
                f'O Piper não devolveu um WAV (HTTP {response.status_code}).'
            )
        output_path.write_bytes(wav_to_mp3(response.content))

    async def text_to_speech(
        self, text: str, voice: Optional[str] = None
    ) -> str:
        """Grava o MP3 em OUTPUT_DIR (servido por /api/audio) e devolve o nome."""
        filename = f'{uuid.uuid4()}.mp3'
        await self.synthesize(
            text, Path(settings.OUTPUT_DIR) / filename, voice=voice
        )
        return filename
