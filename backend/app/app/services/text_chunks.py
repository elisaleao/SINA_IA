"""Divide textos longos em partes que cabem no limite de um provedor de IA."""

import re

_PARAGRAPH_BREAK = re.compile(r'\n\s*\n')
_SENTENCE_END = re.compile(r'(?<=[.!?])\s+')


def _split_long_paragraph(paragraph: str, max_chars: int) -> list[str]:
    parts: list[str] = []
    current = ''
    for sentence in _SENTENCE_END.split(paragraph):
        rest = sentence
        while len(rest) > max_chars:
            if current:
                parts.append(current)
                current = ''
            parts.append(rest[:max_chars])
            rest = rest[max_chars:]
        candidate = f'{current} {rest}' if current else rest
        if len(candidate) <= max_chars:
            current = candidate
        else:
            parts.append(current)
            current = rest
    if current:
        parts.append(current)
    return parts


def split_into_chunks(text: str, max_chars: int) -> list[str]:
    """Agrupa parágrafos até max_chars; parágrafo grande quebra por frase."""
    pieces: list[str] = []
    for raw in _PARAGRAPH_BREAK.split(text):
        paragraph = raw.strip()
        if not paragraph:
            continue
        if len(paragraph) <= max_chars:
            pieces.append(paragraph)
        else:
            pieces.extend(_split_long_paragraph(paragraph, max_chars))

    chunks: list[str] = []
    current = ''
    for piece in pieces:
        candidate = f'{current}\n\n{piece}' if current else piece
        if len(candidate) <= max_chars:
            current = candidate
        else:
            chunks.append(current)
            current = piece
    if current:
        chunks.append(current)
    return chunks
