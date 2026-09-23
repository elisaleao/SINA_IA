# CLAUDE.md — SINA_IA

@AGENTS.md

## Estado real (prevalece sobre docs/ quando divergir)
- Backend em três pastas: rotas em `app/api/routers/`, DTOs em `app/schemas/`, regras, fluxos e
  integrações em `app/services/`. Não existe mais `app/accessibility/`; não crie pacote paralelo.
- Um único módulo por integração: `services/tts_service.py` (Edge-TTS) e
  `services/document_extractor.py` (PDF, DOCX, TXT, imagens). Estenda o existente em vez de criar outro.
  Configuração só em `core/config.py` (sem `os.getenv`).
- IA tem dois provedores sob `AccessibilityAIProtocol` (`core/protocols.py`), ver ADR-0003:
  `services/gemini_service.py` com a chave pessoal do usuário (cifrada, `services/llm_key_service.py`)
  e `services/groq_service.py` como fallback gratuito. `FallbackAIClient` (`services/ai_provider.py`)
  escolhe por requisição; rotas recebem o cliente por `get_ai_client` em `api/deps.py`, nunca criam um.
  `GEMINI_API_KEY` do servidor não é usada; o fallback exige `GROQ_API_KEY`.
- Ainda há fluxos separados sobre esses módulos (`accessibility_pipeline.py` para /process-stream e
  /api/materiais; `llm_service.py` para /api/content; `ingestion_service.py` para /api/documents).
  A unificação num pipeline só está em andamento no refactor.
- NÃO existe fila, outbox, `processing_jobs` nem `idempotency_key` (docs/rules/concurrency.md é alvo, não realidade).
- Domínio puro fica em `app/services/` (`math_speech_service.py`, `math_detector.py`,
  `upload_validation.py`). NÃO existe `app/domain/` nem tipo Result (docs/rules/domain.md é alvo).
- docs/roadmap.md está desatualizado: fases 0–4 já foram mergeadas.

## Comandos
- Gate completo (obrigatório antes de commit): `./check.sh`
- Backend (em backend/app): `poetry run pytest` · `poetry run ruff check app tests` ·
  `poetry run ruff format app tests` · `poetry run typos` · dev: `poetry run uvicorn app.main:app --reload`
- Frontend (em frontend): `npm run lint` · `npx tsc --noEmit` · `npm test` · `npm run dev`
- Hooks: `./scripts/install-hooks.sh`

## Regras que o gate verifica
- Python: aspas simples, linha 79, cobertura mínima 85% (`fail_under`).
- `app/services/math_speech_service.py` não pode conter os textos sqlalchemy/fastapi/requests/aiofiles/database.
- TS estrito, sem `any`. Rotas via `appRoutes` em `frontend/src/lib/routes.ts`.
- Next.js 16 tem APIs diferentes: consulte `frontend/node_modules/next/dist/docs/` antes de escrever código.

## Testes
- Backend: fixture `client` em tests/conftest.py (SQLite em memória + FakeLLMClient/FakeTTSClient).
  Nunca chame Gemini, Groq ou Edge-TTS reais na suíte padrão (marcador `live` para isso).
  Para trocar o provedor de IA num teste de rota, sobrescreva `get_fallback_ai` e `get_personal_ai_factory`.
- Rota nova → teste de rota + atualizar `tests/contract/openapi.baseline.json` se o contrato mudar.
- Mudou modelo em `app/database.py` → criar migração em `alembic/versions/` (próximo: 0009).
  O `alembic check` do gate falha se o model mudar sem migração.

## Idioma
- Prosa/docs em português com acentos; código, testes e commits em inglês (Conventional Commits).
- Exceção existente: tabelas/campos de domínio e rotas de quiz estão em português; siga o padrão local do arquivo.

## Acessibilidade (frontend)
- Primitivas em `frontend/src/components/ui/` (alvo ≥44px, foco visível `ring-2`, contraste 7:1,
  estado nunca só por cor). Reutilize antes de criar componente novo. Detalhes: docs/rules/accessibility.md.
