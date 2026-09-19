#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FAILED=0

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}        SINA_IA — Quality Gate Local          ${NC}"
echo -e "${BLUE}==============================================${NC}"

# 1. FRONTEND CHECKS
echo -e "\n${BLUE}[1/2] Verificando Frontend (Next.js & TypeScript)...${NC}"
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

# 2. BACKEND CHECKS
echo -e "\n${BLUE}[2/2] Verificando Backend (Python 3.13 & FastAPI)...${NC}"
cd "$ROOT_DIR/backend/app"

# Localizar Poetry ou binários do virtualenv
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

echo -e "\n${BLUE}==============================================${NC}"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ QUALITY GATE 100% VERDE: PRONTO PARA COMMIT!${NC}"
    echo -e "${BLUE}==============================================${NC}"
    exit 0
else
    echo -e "${RED}✗ QUALITY GATE FALHOU. Corrija os problemas acima.${NC}"
    echo -e "${BLUE}==============================================${NC}"
    exit 1
fi
