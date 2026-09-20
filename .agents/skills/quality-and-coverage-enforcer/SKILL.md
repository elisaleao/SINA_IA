---
name: quality-and-coverage-enforcer
description: >-
  Audits, expands, and enforces automated test coverage and quality gate compliance for SINA_IA across frontend (Next.js, React, Vitest, a11y) and backend (FastAPI, Pytest, coverage, Ruff, Typos). Use when adding tests, improving test coverage, enforcing pre-commit/pre-push hooks, or verifying the 100% green Quality Gate before submitting commits or PRs. Triggers on "melhorar cobertura de testes", "aumentar testes", "forçar testes locais", "quality gate", "test coverage", "enforce lint", "criar testes front e back".
metadata:
  author: SINA_IA Core Team
  version: 1.0.0
---

# Quality & Test Coverage Enforcer (SINA_IA)

Este skill define o padrão operacional, a arquitetura de testes e os mecanismos de imposição (*enforcement*) obrigatórios para garantir que todo código submetido ao **SINA_IA** atenda ao **Quality Gate 100% verde**, respeite as diretrizes de acessibilidade **WCAG 2.2 AAA** e aumente continuamente a cobertura de testes no Backend e no Frontend.

---

## 1. As 4 Camadas de Imposição (Enforcement)

Para garantir que nenhum desenvolvedor ou agente submeta código sem validação local:

```
┌─────────────────────────────────────────────────────────────┐
│ Camada 1: Pre-commit Hook (.githooks/pre-commit)            │
│ -> Rápido (< 3s): Ruff check, format, typos, tsc, fronteira │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Camada 2: Pre-push Hook (.githooks/pre-push)                │
│ -> Completo: Executa ./check.sh (testes + cobertura)        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Camada 3: CI/CD Quality Gate (.github/workflows/ci.yml)     │
│ -> Executa em container limpo em todo Push e Pull Request   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Camada 4: GitHub Branch Protection / Rulesets (main)        │
│ -> Bloqueia merge caso qualquer check do CI falhe           │
└─────────────────────────────────────────────────────────────┘
```

### 1.1 Configuração dos Hooks Locais Versionados
O Git por padrão não executa scripts dentro de `.githooks/` a menos que o caminho de hooks seja explicitamente configurado:
```bash
git config core.hooksPath .githooks
chmod +x .githooks/* scripts/*.sh
```
Qualquer desenvolvedor recém-chegado pode ativar os hooks com:
```bash
./scripts/install-hooks.sh
```

---

## 2. Padrões de Teste por Camada

### 2.1 Backend (Python 3.13 + FastAPI + Pytest)
* **Localização dos Testes:** `backend/app/tests/`
* **Padrões Obrigatórios:**
  * **Testes de Rota e Contrato:** Usam cliente assíncrono (`AsyncClient` com `lifespan` ativo em `tests/conftest.py`).
  * **Isolamento de Banco:** Cada teste deve usar sessão transacional isolada com rollback ao final (`test_db_session`).
  * **Serviços Externos Falsificados:** Chamadas para Google Gemini e Edge-TTS devem usar mocks ou fakes idempotentes (`app.services.fakes`), sem bater na rede externa durante a suíte padrão.
  * **Domínio Puro (`math_speech_service.py`):** Sem dependência de FastAPI, SQLAlchemy ou requests.
  * **Formatação Obrigatória:** Aspas simples (`quote-style = 'single'`) exigidas pelo Ruff.
* **Comandos de Execução:**
  ```bash
  cd backend/app
  poetry run pytest
  poetry run pytest --cov=app --cov-report=term-missing
  poetry run ruff check app tests
  poetry run ruff format --check app tests
  ```

### 2.2 Frontend (Next.js 16 + React 19 + Vitest / Testing Library)
* **Localização dos Testes:** `frontend/src/__tests__/` ou `*.test.tsx` adjacente ao componente.
* **Padrões Obrigatórios:**
  * **TypeScript Estrito:** Proibido o uso de `any` (explícito ou implícito).
  * **Acessibilidade Universal (WCAG 2.2 AAA):**
    * Verificar presença de labels ARIA em botões e links (`aria-label`, `aria-labelledby`).
    * Estados acessíveis anunciados: `aria-pressed`, `aria-expanded`, `aria-live="polite"`.
    * Contraste mínimo de cores e navegação completa por teclado.
  * **Isolamento de Renderização:** Usar renderizadores que simulem o DOM (`jsdom` via Vitest).
* **Comandos de Execução:**
  ```bash
  cd frontend
  npm run lint
  npx tsc --noEmit
  npm test
  ```

---

## 3. Protocolo de Auditoria e Expansão de Cobertura

Sempre que a tarefa for aumentar a cobertura de testes:

1. **Diagnóstico Inicial:**
   * Executar `poetry run pytest --cov=app --cov-report=term-missing` no backend.
   * Identificar os módulos com menor cobertura (abaixo de 80%).
   * Listar as linhas e blocos lógicos faltantes (`Miss` lines).
2. **Definição de Casos de Borda (Edge Cases):**
   * Usuário não autenticado tentando acessar recursos privados (esperado 401).
   * Usuário autenticado tentando acessar documento de terceiro (esperado 404 para evitar enumeração).
   * Payload inválido ou incompleto (esperado 422).
   * Timeouts de sessão de quiz com perfil padrão vs. adaptativo (TDAH / Apoio Cognitivo).
   * Reativação e desmontagem de componentes assistivos (ex: VLibras widget).
3. **Implementação Incremental e Atômica:**
   * Escrever testes que falham antes de corrigir eventuais bugs descobertos.
   * Não diminuir a cobertura de nenhum módulo existente.
4. **Validação do Quality Gate Completo:**
   * Executar `./check.sh` a partir da raiz do repositório.
   * Garantir **0 erros** em linters, formatters, tipos e testes.

