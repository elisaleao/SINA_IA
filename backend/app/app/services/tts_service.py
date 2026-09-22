"""Único serviço de síntese de voz (Edge-TTS) do backend."""

import uuid
from pathlib import Path
from typing import Optional

import edge_tts

from app.core.config import settings


class TTSService:
    """Voz, velocidade, volume e tom vêm do Settings; cada chamada pode trocar a voz."""

    async def synthesize(
        self, text: str, output_path: Path, voice: Optional[str] = None
    ) -> None:
        """Grava o MP3 em output_path."""
        if not text.strip():
            raise ValueError('Não há texto para gerar áudio.')

        communicate = edge_tts.Communicate(
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

    async def text_to_speech(
        self, text: str, voice: Optional[str] = None
    ) -> str:
        """Grava o MP3 em OUTPUT_DIR (servido por /api/audio) e devolve o nome."""
        filename = f'{uuid.uuid4()}.mp3'
        await self.synthesize(
            text, Path(settings.OUTPUT_DIR) / filename, voice=voice
        )
        return filename
