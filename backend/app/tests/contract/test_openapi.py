import json
from pathlib import Path

from app.main import app

BASELINE_PATH = Path(__file__).parent / 'openapi.baseline.json'


def test_openapi_contract_preservation():
    """Garante que a refatoração dos routers não quebrou os contratos de rotas existentes."""
    assert BASELINE_PATH.exists(), (
        f'Baseline OpenAPI não encontrado em {BASELINE_PATH}'
    )

    with open(BASELINE_PATH, encoding='utf-8') as f:
        baseline = json.load(f)

    current = app.openapi()

    baseline_paths = baseline.get('paths', {})
    current_paths = current.get('paths', {})

    # 1. Todas as rotas do baseline devem existir no OpenAPI atual
    for path, methods in baseline_paths.items():
        assert path in current_paths, f'Rota {path} ausente no OpenAPI atual!'
        for method, spec in methods.items():
            assert method in current_paths[path], (
                f'Método {method.upper()} para rota {path} ausente no OpenAPI atual!'
            )
            current_spec = current_paths[path][method]

            # Verificar parâmetros de rota/query
            baseline_params = {p['name'] for p in spec.get('parameters', [])}
            current_params = {
                p['name'] for p in current_spec.get('parameters', [])
            }
            assert baseline_params.issubset(current_params), (
                f'Parâmetros ausentes na rota {method.upper()} {path}: '
                f'{baseline_params - current_params}'
            )

            # Verificar códigos de resposta
            baseline_responses = set(spec.get('responses', {}).keys())
            current_responses = set(current_spec.get('responses', {}).keys())
            assert baseline_responses.issubset(current_responses), (
                f'Respostas HTTP ausentes na rota {method.upper()} {path}: '
                f'{baseline_responses - current_responses}'
            )
