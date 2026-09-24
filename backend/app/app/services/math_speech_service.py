"""Leitura por extenso, em português, de fórmulas LaTeX dentro de um texto."""

import re

FORMULA = re.compile(
    r'\$\$(.+?)\$\$|(?<!R)\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\d)', re.DOTALL
)
TOKEN = re.compile(r'\\[A-Za-z]+|\\.|[0-9]+(?:[.,][0-9]+)?|[A-Za-z]|\S')

GREEK = {
    'alpha': 'alfa',
    'beta': 'beta',
    'gamma': 'gama',
    'delta': 'delta',
    'epsilon': 'épsilon',
    'varepsilon': 'épsilon',
    'zeta': 'zeta',
    'eta': 'eta',
    'theta': 'teta',
    'vartheta': 'teta',
    'iota': 'iota',
    'kappa': 'capa',
    'lambda': 'lambda',
    'mu': 'mi',
    'nu': 'ni',
    'xi': 'csi',
    'omicron': 'ômicron',
    'pi': 'pi',
    'rho': 'rô',
    'sigma': 'sigma',
    'tau': 'tau',
    'upsilon': 'ípsilon',
    'phi': 'fi',
    'varphi': 'fi',
    'chi': 'qui',
    'psi': 'psi',
    'omega': 'ômega',
}
UPPER_GREEK = {
    'Gamma',
    'Delta',
    'Theta',
    'Lambda',
    'Xi',
    'Pi',
    'Sigma',
    'Upsilon',
    'Phi',
    'Psi',
    'Omega',
}
FUNCTIONS = {
    'sin': 'seno',
    'sen': 'seno',
    'cos': 'cosseno',
    'tan': 'tangente',
    'tg': 'tangente',
    'cot': 'cotangente',
    'sec': 'secante',
    'csc': 'cossecante',
    'ln': 'logaritmo natural',
    'exp': 'exponencial',
}
SYMBOLS = {
    'infty': 'infinito',
    'times': 'vezes',
    'cdot': 'vezes',
    'pm': 'mais ou menos',
    'mp': 'menos ou mais',
    'div': 'dividido por',
    'leq': 'menor ou igual a',
    'le': 'menor ou igual a',
    'geq': 'maior ou igual a',
    'ge': 'maior ou igual a',
    'neq': 'diferente de',
    'ne': 'diferente de',
    'approx': 'aproximadamente igual a',
    'equiv': 'equivalente a',
    'in': 'pertence a',
    'notin': 'não pertence a',
    'cup': 'união',
    'cap': 'interseção',
    'subset': 'está contido em',
    'subseteq': 'está contido ou é igual a',
    'forall': 'para todo',
    'exists': 'existe',
    'Rightarrow': 'implica',
    'implies': 'implica',
    'Leftrightarrow': 'se e somente se',
    'iff': 'se e somente se',
    'to': 'tende a',
    'rightarrow': 'tende a',
    'partial': 'derivada parcial',
    '%': 'por cento',
    'degree': 'graus',
}
CHARACTERS = {
    '=': 'é igual a',
    '+': 'mais',
    '-': 'menos',
    '/': 'dividido por',
    '*': 'vezes',
    '<': 'menor que',
    '>': 'maior que',
    '!': 'fatorial',
}
SPACING = {
    ',',
    ';',
    ':',
    '!',
    ' ',
    'quad',
    'qquad',
    'left',
    'right',
    'displaystyle',
    'textstyle',
    'limits',
}
TEXT_COMMANDS = {'text', 'mathrm', 'mathbf', 'mathit', 'operatorname', 'mbox'}
FRACTIONS = {'frac', 'dfrac', 'tfrac'}


class _Parser:
    """Converte os símbolos de uma fórmula em uma frase falada."""

    def __init__(self, latex: str) -> None:
        found = list(TOKEN.finditer(latex))
        self.tokens = [match.group() for match in found]
        self.starts = [match.start() for match in found]
        self.ends = [match.end() for match in found]
        self.pos = 0

    def peek(self) -> str | None:
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def take(self) -> str | None:
        token = self.peek()
        if token is not None:
            self.pos += 1
        return token

    def sequence(self, stop: str | None = None) -> str:
        parts: list[tuple[str, bool]] = []
        while self.peek() is not None and self.peek() != stop:
            spoken, attach = self.atom()
            if spoken:
                spoken = self.scripts(spoken)
                parts.append((spoken, attach))
            else:
                parts.append(('', False))
        if stop is not None and self.peek() == stop:
            self.take()
        return _join(parts)

    def argument(self) -> str:
        token = self.peek()
        if token == '{':
            self.take()
            return self.sequence('}')
        if token is None:
            return ''
        spoken, _ = self.atom()
        return spoken

    def limits(self) -> tuple[str, str]:
        lower = upper = ''
        while self.peek() in ('_', '^'):
            marker = self.take()
            if marker == '_':
                lower = self.argument()
            else:
                upper = self.argument()
        return lower, upper

    def scripts(self, base: str) -> str:
        while self.peek() in ('^', '_'):
            marker = self.take()
            value = self.argument()
            if marker == '_':
                base = f'{base} de índice {value}'
            elif value == '2':
                base = f'{base} ao quadrado'
            elif value == '3':
                base = f'{base} ao cubo'
            else:
                base = f'{base} elevado a {value}'
        return base

    def call_argument(self) -> str:
        if self.peek() == '(':
            self.take()
            return self.sequence(')')
        return ''

    def atom(self) -> tuple[str, bool]:
        token = self.take()
        if token is None:
            return '', False
        if token == '{':
            return self.sequence('}'), False
        if token.startswith('\\'):
            return self.command(token[1:]), False
        if token in CHARACTERS:
            return CHARACTERS[token], False
        if token == '(':
            inner = self.sequence(')')
            return f'abre parênteses {inner} fecha parênteses', False
        if token.isalnum() or token[0].isdigit():
            if token.isalpha() and len(token) == 1 and self.peek() == '(':
                return f'{token} de {self.call_argument()}', False
            return token, self._touches_previous_word()
        if token in (')', '}', '[', ']', '|', '&'):
            return '', False
        return token, False

    def _touches_previous_word(self) -> bool:
        index = self.pos - 1
        if index == 0:
            return False
        previous = self.tokens[index - 1]
        adjacent = self.ends[index - 1] == self.starts[index]
        return adjacent and previous.isalnum()

    def command(self, name: str) -> str:
        if name in SPACING:
            return ''
        if name in FRACTIONS:
            numerator = self.argument()
            denominator = self.argument()
            if numerator == 'd' and denominator.startswith('d'):
                variable = denominator[1:].strip()
                return f'derivada em relação a {variable} de'
            return (
                f'fração com numerador {numerator} e denominador {denominator}'
            )
        if name == 'sqrt':
            index = ''
            if self.peek() == '[':
                self.take()
                index = self.sequence(']')
            radicand = self.argument()
            if index:
                return f'raiz de índice {index} de {radicand}'
            return f'raiz quadrada de {radicand}'
        if name == 'int':
            lower, upper = self.limits()
            if lower and upper:
                return f'integral de {lower} a {upper} de'
            return 'integral de'
        if name in ('sum', 'prod'):
            word = 'somatório' if name == 'sum' else 'produtório'
            lower, upper = self.limits()
            if lower and upper:
                return f'{word} de {lower} até {upper} de'
            return word
        if name == 'lim':
            lower, _ = self.limits()
            return f'limite quando {lower} de' if lower else 'limite de'
        if name == 'log':
            base, _ = self.limits()
            argument = self.call_argument()
            prefix = f'logaritmo na base {base} de' if base else 'logaritmo de'
            return f'{prefix} {argument}'.strip()
        if name in FUNCTIONS:
            argument = self.call_argument()
            return f'{FUNCTIONS[name]} de {argument}'.strip()
        if name in TEXT_COMMANDS:
            return self.argument()
        if name in GREEK:
            return GREEK[name]
        if name in UPPER_GREEK:
            return f'{GREEK[name.lower()]} maiúsculo'
        if name in SYMBOLS:
            return SYMBOLS[name]
        return name


def _join(parts: list[tuple[str, bool]]) -> str:
    words: list[str] = []
    for spoken, attach in parts:
        if not spoken:
            continue
        if attach and words:
            words[-1] += spoken
        else:
            words.append(spoken)
    return re.sub(r' +', ' ', ' '.join(words)).strip()


def _tidy(text: str) -> str:
    lines = []
    for raw in text.split('\n'):
        line = re.sub(r'[ \t]+', ' ', raw).strip()
        lines.append(re.sub(r' +([.,;:!?])', r'\1', line))
    return '\n'.join(lines).strip()


class MathToSpeechService:
    @staticmethod
    def latex_to_spoken_portuguese(text: str) -> str:
        """Troca cada fórmula $...$ ou $$...$$ pela leitura por extenso."""

        def replace(match: re.Match[str]) -> str:
            latex = match.group(1) or match.group(2) or ''
            return f' {_Parser(latex).sequence()} '

        return _tidy(FORMULA.sub(replace, text))
