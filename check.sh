#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FAILED=0

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}        SINA_IA — Quality Gate Local (Poliglota)      ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. FRONTEND: LINT & TIPOS
echo -e "\n${BLUE}[1/4] Verificando Frontend (Next.js & TypeScript)...${NC}"
cd "$ROOT_DIR/frontend"

echo "  -> Executando ESLint..."
if npm run lint; then
    echo -e "  ${GREEN}✓ ESLint passou sem erros.${NC}"
else
    echo -e "  ${RED}✗ Falha no ESLint.${NC}"
    FAILED=1
fi

echo "  -> Executando checagem estrita de tipos (TypeScript)..."
if npx tsc --noEmit; then
    echo -e "  ${GREEN}✓ TypeScript typecheck passou sem erros.${NC}"
else
    echo -e "  ${RED}✗ Falha na checagem de tipos do TypeScript.${NC}"
    FAILED=1
fi

# 2. BACKEND: LINT, FORMATAÇÃO E TIPOS
echo -e "\n${BLUE}[2/4] Verificando Backend (Python 3.13 & FastAPI)...${NC}"
cd "$ROOT_DIR/backend/app"

VENV_BIN=""
if command -v poetry >/dev/null 2>&1; then
    RUN_CMD="poetry run"
elif [ -d "$HOME/.cache/pypoetry/virtualenvs/app-WFJRWoMS-py3.13/bin" ]; then
    VENV_BIN="$HOME/.cache/pypoetry/virtualenvs/app-WFJRWoMS-py3.13/bin"
    RUN_CMD=""
else
    echo -e "  ${RED}✗ Ambiente virtual do backend não localizado.${NC}"
    FAILED=1
fi

if [ -n "$RUN_CMD" ] || [ -n "$VENV_BIN" ]; then
    RUFF_BIN="${RUN_CMD:+$RUN_CMD ruff}"
    RUFF_BIN="${RUFF_BIN:-$VENV_BIN/ruff}"

    TYPOS_BIN="${RUN_CMD:+$RUN_CMD typos}"
    TYPOS_BIN="${TYPOS_BIN:-$VENV_BIN/typos}"

    PYTEST_BIN="${RUN_CMD:+$RUN_CMD pytest}"
    PYTEST_BIN="${PYTEST_BIN:-$VENV_BIN/pytest}"

    echo "  -> Executando verificação de ortografia técnica (typos)..."
    if $TYPOS_BIN; then
        echo -e "  ${GREEN}✓ Typos passou sem erros.${NC}"
    else
        echo -e "  ${RED}✗ Erros encontrados pelo typos.${NC}"
        FAILED=1
    fi

    echo "  -> Executando linter estrito (ruff check)..."
    if $RUFF_BIN check app tests; then
        echo -e "  ${GREEN}✓ Ruff check passou sem erros.${NC}"
    else
        echo -e "  ${RED}✗ Violações de linter encontradas pelo Ruff.${NC}"
        FAILED=1
    fi

    echo "  -> Verificando formatação de código (ruff format)..."
    if $RUFF_BIN format --check app tests; then
        echo -e "  ${GREEN}✓ Formatação de código validada.${NC}"
    else
        echo -e "  ${RED}✗ Arquivos fora do padrão de formatação.${NC}"
        FAILED=1
    fi

    echo "  -> Executando suíte de testes unitários com cobertura (pytest)..."
    if $PYTEST_BIN; then
        echo -e "  ${GREEN}✓ Todos os testes do backend passaram com cobertura.${NC}"
    else
        echo -e "  ${RED}✗ Falha na execução dos testes do backend.${NC}"
        FAILED=1
    fi
fi

# 3. FRONTEIRAS ARQUITETURAIS (DOMÍNIO PURO)
echo -e "\n${BLUE}[3/4] Verificando Fronteiras Arquiteturais (Domínio Puro)...${NC}"
cd "$ROOT_DIR"
python3 -c "
import sys
with open('backend/app/app/services/math_speech_service.py') as f:
    code = f.read()
forbidden = ['sqlalchemy', 'fastapi', 'requests', 'aiofiles', 'database']
violations = [lib for lib in forbidden if lib in code]
if violations:
    print(f'  ✗ VIOLAÇÃO DE FRONTEIRA: math_speech_service.py importou: {violations}')
    sys.exit(1)
print('  ✓ Fronteira de Domínio Puro validada: zero dependências de banco ou HTTP no motor matemático.')
" || FAILED=1

# 4. REGRESSÃO DO MOTOR DE ACESSIBILIDADE E MATEMÁTICA
echo -e "\n${BLUE}[4/4] Verificando Regressão do Motor de Acessibilidade...${NC}"
cd "$ROOT_DIR/backend/app"
if [ -n "$RUN_CMD" ] || [ -n "$VENV_BIN" ]; then
    if $PYTEST_BIN tests/test_math_speech.py tests/test_services.py -q; then
        echo -e "  ${GREEN}✓ Motor matemático e perfis de acessibilidade sem regressão.${NC}"
    else
        echo -e "  ${RED}✗ Falha nos testes de regressão do motor.${NC}"
        FAILED=1
    fi
fi

echo -e "\n${BLUE}======================================================${NC}"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ QUALITY GATE 100% VERDE: PRONTO PARA COMMIT & PR!${NC}"
    echo -e "${BLUE}======================================================${NC}"
    exit 0
else
    echo -e "${RED}✗ QUALITY GATE FALHOU. Corrija as inconsistências acima.${NC}"
    echo -e "${BLUE}======================================================${NC}"
    exit 1
fi
