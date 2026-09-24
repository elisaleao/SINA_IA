import pytest

from app.services.math_speech_service import MathToSpeechService


def speak(text: str) -> str:
    return MathToSpeechService.latex_to_spoken_portuguese(text)


def test_no_latex_text():
    """Text without any LaTeX expressions should remain unchanged."""
    text = 'Olá, este é um texto comum sem fórmulas matematicas.'
    assert speak(text) == text


def test_inline_latex_is_spoken_inside_the_sentence():
    # No "[Equação: ...]" marker: the screen reader and the TTS would read
    # the brackets and the word aloud in the middle of the sentence.
    assert speak('O valor de $x = 2$ é a resposta.') == (
        'O valor de x é igual a 2 é a resposta.'
    )


def test_display_latex_simple():
    assert speak('Dada a equação: $$y = 10$$') == (
        'Dada a equação: y é igual a 10'
    )


def test_latex_fractions():
    assert speak('Temos $\\frac{a}{b}$ como resultado.') == (
        'Temos fração com numerador a e denominador b como resultado.'
    )


def test_latex_square_root():
    assert speak('Calcule $\\sqrt{y}$.') == 'Calcule raiz quadrada de y.'


def test_latex_custom_root():
    assert speak('A expressão $\\sqrt[3]{8}$ é igual a 2.') == (
        'A expressão raiz de índice 3 de 8 é igual a 2.'
    )


@pytest.mark.parametrize(
    ('latex', 'spoken'),
    [
        ('$x^2$', 'x ao quadrado'),
        ('$x^3$', 'x ao cubo'),
        ('$y^{3a}$', 'y elevado a 3a'),
        ('$e^{x+1}$', 'e elevado a x mais 1'),
    ],
)
def test_latex_exponentiation(latex, spoken):
    assert speak(latex) == spoken


def test_latex_indices():
    assert speak('Considere $x_1$ e $y_{max}$.') == (
        'Considere x de índice 1 e y de índice max.'
    )


@pytest.mark.parametrize(
    ('latex', 'expected'),
    [
        ('$\\int$', 'integral de'),
        ('$\\sum$', 'somatório'),
        ('$\\infty$', 'infinito'),
        ('$\\times$', 'vezes'),
        ('$\\cdot$', 'vezes'),
        ('$\\pm$', 'mais ou menos'),
        ('$\\leq$', 'menor ou igual a'),
        ('$\\geq$', 'maior ou igual a'),
        ('$\\neq$', 'diferente de'),
        ('$\\approx$', 'aproximadamente igual a'),
        ('$\\pi$', 'pi'),
        ('$+$', 'mais'),
        ('$-$', 'menos'),
        ('$/$', 'dividido por'),
    ],
)
def test_latex_operators(latex, expected):
    assert speak(latex) == expected


@pytest.mark.parametrize(
    ('latex', 'spoken'),
    [
        # MATH-01 AC1: trigonometric functions
        ('$\\sin x$', 'seno de x'),
        ('$\\cos(2x)$', 'cosseno de 2x'),
        ('$\\tan x$', 'tangente de x'),
        ('$\\cot x$', 'cotangente de x'),
        ('$\\sec x$', 'secante de x'),
        ('$\\csc x$', 'cossecante de x'),
        # MATH-01 AC2: logarithms
        ('$\\log_{2} 8$', 'logaritmo na base 2 de 8'),
        ('$\\log x$', 'logaritmo de x'),
        ('$\\ln x$', 'logaritmo natural de x'),
        # MATH-01 AC3: greek letters
        ('$\\alpha + \\beta$', 'alfa mais beta'),
        ('$\\omega$', 'ômega'),
        ('$\\Delta x$', 'delta maiúsculo x'),
        ('$\\Sigma$', 'sigma maiúsculo'),
        ('$\\Pi$', 'pi maiúsculo'),
        # MATH-01 AC4: limits and derivatives
        ('$\\lim_{x \\to a} f(x)$', 'limite quando x tende a a de f de x'),
        ('$\\frac{d}{dx} x^2$', 'derivada em relação a x de x ao quadrado'),
        # MATH-01 AC5: relations, sets and logic
        ('$a < b$', 'a menor que b'),
        ('$a > b$', 'a maior que b'),
        ('$x \\in A$', 'x pertence a A'),
        ('$A \\cup B$', 'A união B'),
        ('$A \\cap B$', 'A interseção B'),
        ('$\\forall x$', 'para todo x'),
        ('$\\exists x$', 'existe x'),
        ('$p \\Rightarrow q$', 'p implica q'),
        ('$p \\Leftrightarrow q$', 'p se e somente se q'),
        # MATH-01 AC6: nested fractions
        (
            '$\\frac{a+b}{\\sqrt{c}}$',
            'fração com numerador a mais b e denominador raiz quadrada de c',
        ),
    ],
)
def test_math_01_rules(latex, spoken):
    assert speak(latex) == spoken


def test_definite_integral_reads_its_limits():
    assert speak('$$\\int_0^1 2x\\,dx = 1$$') == (
        'integral de 0 a 1 de 2x dx é igual a 1'
    )


def test_sum_reads_its_limits():
    assert speak('$\\sum_{i=1}^{n} i$') == (
        'somatório de i é igual a 1 até n de i'
    )


def test_function_application_reads_as_de():
    assert speak('$f(x) = x^2$') == 'f de x é igual a x ao quadrado'


def test_money_is_not_treated_as_math():
    # Brazilian materials mention R$ often; it must reach the audio intact.
    assert speak('Custa R$ 10 e R$ 20.') == 'Custa R$ 10 e R$ 20.'


def test_paragraph_breaks_are_kept_for_audio_pauses():
    assert speak('Primeiro.\n\nSegundo com $x^2$.') == (
        'Primeiro.\n\nSegundo com x ao quadrado.'
    )


def test_invalid_latex_does_not_raise():
    assert 'fração' in speak('$\\frac{1}{$ fim')


def test_only_symbols_written_together_are_read_together():
    # "2x" and "dx" are one word; "m c" is two symbols and must stay apart,
    # otherwise E = m c^2 would be read as "mc".
    assert speak('$$E = m c^2$$') == 'E é igual a m c ao quadrado'
    assert speak('$2x\\,dx$') == '2x dx'


@pytest.mark.parametrize(
    ('latex', 'spoken'),
    [
        # Used by the logic questions of the quiz bank.
        ('$A \\rightarrow B$', 'A implica B'),
        ('$A \\land B$', 'A e B'),
        ('$A \\lor B$', 'A ou B'),
        ('$\\neg A$', 'não A'),
        ('$\\lnot A \\wedge B \\vee C$', 'não A e B ou C'),
        (
            '$\\neg(A \\land B)$',
            'não abre parênteses A e B fecha parênteses',
        ),
    ],
)
def test_logic_operators(latex, spoken):
    assert speak(latex) == spoken


def test_arrow_in_a_limit_still_reads_tends_to():
    assert speak('$\\lim_{x \\to 0} x$') == 'limite quando x tende a 0 de x'
