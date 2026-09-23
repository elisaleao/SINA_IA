import json
import os
import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
SCRIPT = BACKEND_DIR / 'scripts' / 'export_openapi.py'


def _export(output: Path, cwd: Path) -> None:
    env = {
        key: value
        for key, value in os.environ.items()
        if key != 'GEMINI_API_KEY'
    }
    env['PYTHONPATH'] = str(BACKEND_DIR)
    subprocess.run(
        [sys.executable, str(SCRIPT), str(output)],
        cwd=cwd,
        env=env,
        check=True,
    )


def test_export_writes_valid_openapi_without_gemini_key(tmp_path):
    output = tmp_path / 'openapi.json'

    _export(output, tmp_path)

    schema = json.loads(output.read_text(encoding='utf-8'))
    assert schema['openapi'].startswith('3.')
    assert '/users/me' in schema['paths']


def test_export_is_sorted_with_two_space_indent(tmp_path):
    output = tmp_path / 'openapi.json'

    _export(output, tmp_path)

    content = output.read_text(encoding='utf-8')
    schema = json.loads(content)
    expected = json.dumps(schema, indent=2, sort_keys=True, ensure_ascii=False)
    assert content == expected + '\n'


def test_export_is_deterministic(tmp_path):
    first = tmp_path / 'first.json'
    second = tmp_path / 'second.json'

    _export(first, tmp_path)
    _export(second, tmp_path)

    assert first.read_bytes() == second.read_bytes()
