"""Regras de quiz movidas das rotas de exercícios (#39a)."""

import json

TEMPO_PADRAO_SEGUNDOS = 13
SEM_LIMITE_DE_TEMPO = 0
TEMPO_ADHD_SEGUNDOS = 26
TEMPO_COGNITIVE_SEGUNDOS = 39


def time_limit_for(profile: str | None) -> int:
    """Tempo limite do quiz em segundos, de acordo com o perfil do aluno."""
    if profile == 'visual':
        return SEM_LIMITE_DE_TEMPO
    if profile == 'adhd':
        return TEMPO_ADHD_SEGUNDOS
    if profile == 'cognitive':
        return TEMPO_COGNITIVE_SEGUNDOS
    return TEMPO_PADRAO_SEGUNDOS


def build_generation_prompt(
    materia_id: str, quantidade: int, texto_base: str
) -> str:
    """Monta o prompt de geração de questões enviado à IA."""
    return f"""Gere exatamente {quantidade} questões de fixação no formato Verdadeiro ou Falso (V/F) sobre a matéria {materia_id} a partir do texto abaixo.
Retorne EXCLUSIVAMENTE um array JSON contendo objetos com os seguintes campos:
- enunciado: Texto em Markdown com equações em sintaxe LaTeX ($...$)
- codigo: Trecho de código se aplicável, ou null
- linguagem: 'python', 'c', ou null
- resposta_correta: true ou false
- explicacao: Justificativa curta em Linguagem Simples

Texto base:
{texto_base[:5000]}
"""


def parse_generated_items(raw: str, materia_id: str) -> list[dict]:
    """Extrai a lista JSON da resposta da IA, com fallback determinístico."""
    try:
        start_idx = raw.find('[')
        end_idx = raw.rfind(']') + 1
        return json.loads(raw[start_idx:end_idx])
    except Exception:
        return [
            {
                'enunciado': f'Questão gerada sobre {materia_id}.',
                'codigo': None,
                'linguagem': None,
                'resposta_correta': True,
                'explicacao': 'Explicação formativa em Linguagem Simples.',
            }
        ]
