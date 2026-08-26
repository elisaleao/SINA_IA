import pytest
from app.services.math_speech_service import MathToSpeechService

def test_no_latex_text():
    """Text without any LaTeX expressions should remain unchanged (only whitespace normalized)."""
    text = "Olá, este é um texto comum sem fórmulas matematicas."
    result = MathToSpeechService.latex_to_spoken_portuguese(text)
    assert result == "Olá, este é um texto comum sem fórmulas matematicas."

def test_inline_latex_simple():
    """Simple inline LaTeX expressions should be converted correctly."""
    text = "O valor de $x = 2$ é a resposta."
    result = MathToSpeechService.latex_to_spoken_portuguese(text)
    assert "O valor de [Equação: x igual a 2] é a resposta." in result

def test_display_latex_simple():
    """Display LaTeX expressions ($$...$$) should also be converted."""
    text = "Dada a equação: $$y = 10$$"
    result = MathToSpeechService.latex_to_spoken_portuguese(text)
    assert "Dada a equação: [Equação: y igual a 10]" in result

def test_latex_fractions():
    """Fractions in LaTeX should be expanded to numerador and denominador words."""
    text = "Temos $\\frac{a}{b}$ como resultado."
    result = MathToSpeechService.latex_to_spoken_portuguese(text)
    assert "[Equação: fração com numerador a e denominador b]" in result

def test_latex_square_root():
    """Square roots should be converted into 'raiz quadrada de'."""
    text = "Calcule $\\sqrt{y}$."
    result = MathToSpeechService.latex_to_spoken_portuguese(text)
    assert "[Equação: raiz quadrada de y]" in result

def test_latex_custom_root():
    """Roots with custom index should display index text."""
    text = "A expressão $\\sqrt[3]{8}$ é igual a 2."
    result = MathToSpeechService.latex_to_spoken_portuguese(text)
    assert "[Equação: raiz de índice 3 de 8]" in result

def test_latex_exponentiation():
    """Powers/exponents should display 'elevado a'."""
    text = "Seja $x^2$ e $y^{3a}$."
    result = MathToSpeechService.latex_to_spoken_portuguese(text)
    assert "[Equação: x elevado a 2]" in result
    assert "[Equação: y elevado a 3a]" in result

def test_latex_indices():
    """Subscripts/indices should translate to 'de índice'."""
    text = "Considere $x_1$ e $y_{max}$."
    result = MathToSpeechService.latex_to_spoken_portuguese(text)
    assert "[Equação: x de índice 1]" in result
    assert "[Equação: y de índice max]" in result

def test_latex_operators():
    """Common mathematical operators should be replaced by their written Portuguese equivalent."""
    cases = [
        ("$\\int$", "integral de"),
        ("$\\sum$", "somatório"),
        ("$\\infty$", "infinito"),
        ("$\\times$", "vezes"),
        ("$\\cdot$", "vezes"),
        ("$\\pm$", "mais ou menos"),
        ("$\\leq$", "menor ou igual a"),
        ("$\\geq$", "maior ou igual a"),
        ("$\\neq$", "diferente de"),
        ("$\\approx$", "aproximadamente"),
        ("$\\pi$", "pi"),
        ("$+$", "mais"),
        ("$-$", "menos"),
        ("$/$", "dividido por")
    ]
    for latex, expected in cases:
        result = MathToSpeechService.latex_to_spoken_portuguese(latex)
        assert expected in result, f"Falha na tradução de {latex}. Esperava '{expected}' no resultado '{result}'"
