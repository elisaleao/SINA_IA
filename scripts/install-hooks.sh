#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

echo -e "${BLUE}Configurando Git Hooks versionados para o SINA_IA...${NC}"

# Configura o Git para apontar os hooks para a pasta versionada .githooks
git config core.hooksPath .githooks

# Garante permissões de execução
chmod +x "$ROOT_DIR/.githooks/"* "$ROOT_DIR/check.sh" 2>/dev/null || true

echo -e "${GREEN}✓ Git Hooks ativados com sucesso!${NC}"
echo -e "  - pre-commit: valida formatação (Ruff aspas simples), linters, typos, TypeScript e domínio puro."
echo -e "  - pre-push: executa o Quality Gate completo (./check.sh) antes de qualquer envio remoto."

