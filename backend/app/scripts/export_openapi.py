import json
import sys
from pathlib import Path

from app.main import app


def main() -> None:
    output = Path(sys.argv[1])
    content = json.dumps(
        app.openapi(), indent=2, sort_keys=True, ensure_ascii=False
    )
    output.write_text(content + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
