import pytest

from app.services.exercise_service import (
    build_generation_prompt,
    parse_generated_items,
    time_limit_for,
)


@pytest.mark.parametrize(
    ('profile', 'expected'),
    [
        (None, 13),
        ('visual', 13),
        ('dyslexia', 13),
        ('universal', 13),
        ('adhd', 26),
        ('cognitive', 39),
    ],
)
def test_time_limit_for(profile, expected):
    assert time_limit_for(profile) == expected


def test_build_generation_prompt_matches_current_template():
    texto_base = 'a' * 6000
    prompt = build_generation_prompt('calculo', 3, texto_base)

    assert prompt == (
        'Gere exatamente 3 questões de fixação no formato Verdadeiro ou '
        'Falso (V/F) sobre a matéria calculo a partir do texto abaixo.\n'
        'Retorne EXCLUSIVAMENTE um array JSON contendo objetos com os '
        'seguintes campos:\n'
        '- enunciado: Texto em Markdown com equações em sintaxe LaTeX '
        '($...$)\n'
        '- codigo: Trecho de código se aplicável, ou null\n'
        "- linguagem: 'python', 'c', ou null\n"
        '- resposta_correta: true ou false\n'
        '- explicacao: Justificativa curta em Linguagem Simples\n'
        '\n'
        'Texto base:\n'
        f'{texto_base[:5000]}\n'
    )
    assert len(texto_base[:5000]) == 5000


def test_parse_generated_items_valid_json():
    raw = (
        '[{"enunciado": "Q1", "codigo": null, "linguagem": null, '
        '"resposta_correta": true, "explicacao": "Explicação"}]'
    )
    items = parse_generated_items(raw, 'fisica')
    assert items == [
        {
            'enunciado': 'Q1',
            'codigo': None,
            'linguagem': None,
            'resposta_correta': True,
            'explicacao': 'Explicação',
        }
    ]


def test_parse_generated_items_json_surrounded_by_text():
    raw = (
        'Aqui estão as questões pedidas:\n'
        '[{"enunciado": "Q1", "codigo": null, "linguagem": null, '
        '"resposta_correta": false, "explicacao": "Explicação"}]\n'
        'Espero que ajude!'
    )
    items = parse_generated_items(raw, 'fisica')
    assert items == [
        {
            'enunciado': 'Q1',
            'codigo': None,
            'linguagem': None,
            'resposta_correta': False,
            'explicacao': 'Explicação',
        }
    ]


def test_parse_generated_items_fallback_on_invalid_response():
    items = parse_generated_items('Texto livre sem JSON.', 'quimica')
    assert items == [
        {
            'enunciado': 'Questão gerada sobre quimica.',
            'codigo': None,
            'linguagem': None,
            'resposta_correta': True,
            'explicacao': 'Explicação formativa em Linguagem Simples.',
        }
    ]
