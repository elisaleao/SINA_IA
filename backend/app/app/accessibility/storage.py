from __future__ import annotations

import os
import time
import uuid
from pathlib import Path


class GeneratedFileStore:
    """Armazena somente resultados gerados, nunca o upload original."""

    def __init__(self) -> None:
        configured = os.getenv("ACCESSIBILITY_OUTPUT_DIR")
        self.root = Path(configured) if configured else Path(".generated_accessibility")
        self.root.mkdir(parents=True, exist_ok=True)
        self.max_age_seconds = int(
            os.getenv("ACCESSIBILITY_FILE_TTL_SECONDS", str(24 * 60 * 60))
        )

    def new_path(self, extension: str) -> Path:
        self.cleanup()
        return self.root / f"{uuid.uuid4().hex}{extension}"

    def resolve_safe(self, filename: str) -> Path:
        if not filename or Path(filename).name != filename:
            raise ValueError("Nome de arquivo inválido.")
        path = (self.root / filename).resolve()
        root = self.root.resolve()
        if path.parent != root:
            raise ValueError("Caminho inválido.")
        return path

    def cleanup(self) -> None:
        cutoff = time.time() - self.max_age_seconds
        for path in self.root.glob("*"):
            try:
                if path.is_file() and path.stat().st_mtime < cutoff:
                    path.unlink(missing_ok=True)
            except OSError:
                # Falha de limpeza não deve derrubar o processamento principal.
                pass
