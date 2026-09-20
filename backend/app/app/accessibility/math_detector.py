from __future__ import annotations

import re

from .schemas import MathDetection

_MATH_SYMBOLS = re.compile(r'[∑∫√±≤≥≠∞∂∏⊂⊆∈∉∀∃⇒⇔∧∨¬π∆σμλθφωΣΠΔ°²³]')
_MATH_PATTERNS = re.compile(
    r'(\bsin\s*\(|\bcos\s*\(|\btan\s*\(|\blog\s*\(|\bln\s*\(|'
    r'\blim\b|\bd\s*/\s*dx\b|\^[0-9a-zA-Z(]|'
    r'[a-zA-Z]\s*=\s*[a-zA-Z0-9]|\b\d+\s*/\s*\d+\b)',
    flags=re.IGNORECASE,
)


def detect_math_content(text: str) -> MathDetection:
    """Porta para Python a heurística local usada no protótipo."""
    symbol_matches = len(_MATH_SYMBOLS.findall(text))
    pattern_matches = len(_MATH_PATTERNS.findall(text))
    score = symbol_matches * 2 + pattern_matches
    density = score / max(len(text), 1) * 1000
    return MathDetection(
        is_math=score >= 4 and density >= 1.2,
        score=score,
        density=round(density, 4),
    )
