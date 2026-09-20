from __future__ import annotations

import os
from pathlib import Path

import edge_tts


class EdgeTTSService:
    def __init__(self) -> None:
        self.voice = os.getenv("EDGE_TTS_VOICE", "pt-BR-FranciscaNeural")
        self.rate = os.getenv("EDGE_TTS_RATE", "+0%")
        self.volume = os.getenv("EDGE_TTS_VOLUME", "+0%")
        self.pitch = os.getenv("EDGE_TTS_PITCH", "+0Hz")

    async def synthesize(self, text: str, output_path: Path) -> None:
        if not text.strip():
            raise ValueError("Não há texto para gerar áudio.")

        communicate = edge_tts.Communicate(
            text=text,
            voice=self.voice,
            rate=self.rate,
            volume=self.volume,
            pitch=self.pitch,
        )
        await communicate.save(str(output_path))

        if not output_path.exists() or output_path.stat().st_size == 0:
            raise RuntimeError("O Edge TTS não gerou um arquivo de áudio válido.")
