# CLAUDE.md — SINA_IA

@AGENTS.md

## Estado real (prevalece sobre docs/ quando divergir)
- Backend em três pastas: rotas em `app/api/routers/`, DTOs em `app/schemas/`, regras, fluxos e
  integrações em `app/services/`. Não existe mais `app/accessibility/`; não crie pacote paralelo.
- Um único módulo por integração: `services/tts_service.py` (Edge-TTS e Piper, ver ADR-0004) e
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
- Banco: PostgreSQL (Docker, dev local e padrão do `config.py`). SQLite só na suíte de testes, em memória.
  O CI roda as migrações num PostgreSQL de verdade (job `migrations`).
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
  Nunca chame Gemini, Groq, Edge-TTS ou Piper reais na suíte padrão (marcador `live` para isso).
  O `TTSService` aceita `edge_communicate` e `piper_transport` falsos (ver tests/test_tts_service.py).
  Para trocar o provedor de IA num teste de rota, sobrescreva `get_fallback_ai` e `get_personal_ai_factory`.
- Rota nova → teste de rota + atualizar `tests/contract/openapi.baseline.json` se o contrato mudar.
- Mudou modelo em `app/database.py` → criar migração em `alembic/versions/` (próximo: 0012).
  O `alembic check` do gate falha se o model mudar sem migração.

## Idioma
- Prosa/docs em português com acentos; código, testes e commits em inglês (Conventional Commits).
- Exceção existente: tabelas/campos de domínio e rotas de quiz estão em português; siga o padrão local do arquivo.

## Acessibilidade (frontend)
- Primitivas em `frontend/src/components/ui/` (alvo ≥44px, foco visível `ring-2`, contraste 7:1,
  estado nunca só por cor). Reutilize antes de criar componente novo. Detalhes: docs/rules/accessibility.md.

# Regras de trabalho (12 regras)

Estas regras valem para toda tarefa neste projeto, salvo quando forem substituídas explicitamente.
Viés: cautela acima de velocidade em trabalho não trivial. Use bom senso em tarefas triviais.

## Regra 1: Pense antes de codar
Declare as premissas explicitamente. Na dúvida, pergunte em vez de chutar.
Quando houver ambiguidade, apresente as interpretações possíveis.
Discorde quando existir um caminho mais simples.
Pare quando estiver confuso e diga o que não está claro.

## Regra 2: Simplicidade primeiro
O mínimo de código que resolve o problema. Nada especulativo.
Nenhuma funcionalidade além do que foi pedido. Nenhuma abstração para código de uso único.
Teste: um engenheiro sênior acharia isso complicado demais? Se sim, simplifique.

## Regra 3: Mudanças mínimas e localizadas
Mexa só no que for preciso. Limpe só a sua própria bagunça.
Não "melhore" código, comentários ou formatação vizinhos.
Não refatore o que não está quebrado. Siga o estilo existente.

## Regra 4: Execução guiada por objetivo
Defina critérios de sucesso. Repita até verificar.
Em vez de seguir passos, defina o sucesso e itere.
Critérios de sucesso fortes permitem iterar com autonomia.

## Regra 5: Use o modelo só para decisões de julgamento
Use o modelo para: classificação, rascunhos, resumos, extração.
NÃO use o modelo para: roteamento, retentativas, transformações determinísticas.
Se o código consegue responder, o código responde.

## Regra 6: Orçamento de tokens é obrigatório
Por tarefa: 4.000 tokens. Por sessão: 30.000 tokens.
Perto do limite, resuma e comece de novo.
Avise quando estourar. Nunca ultrapasse em silêncio.

## Regra 7: Exponha conflitos, sem misturar
Se dois padrões se contradizem, escolha um (o mais recente ou o mais testado).
Explique o motivo. Sinalize o outro para limpeza.
Não misture padrões conflitantes.

## Regra 8: Leia antes de escrever
Antes de adicionar código, leia as exportações, quem chama diretamente e os utilitários compartilhados.
"Parece independente" é perigoso. Se não entender por que o código está estruturado assim, pergunte.

## Regra 9: Testes verificam a intenção
Testes devem registrar POR QUE o comportamento importa, além de O QUE ele faz.
Um teste que não falha quando a regra de negócio muda está errado.

## Regra 10: Ponto de controle a cada passo relevante
Resuma o que foi feito, o que foi verificado e o que falta.
Não continue a partir de um estado que você não consegue descrever.
Se perder o fio, pare e reformule.

## Regra 11: Siga as convenções do código, mesmo discordando
Conformidade vale mais que gosto pessoal dentro do código.
Se achar que uma convenção é prejudicial, diga. Não crie um caminho paralelo em silêncio.

## Regra 12: Falhe de forma visível
"Concluído" está errado se algo foi pulado em silêncio.
"Testes passam" está errado se algum teste foi pulado.
Por padrão, exponha a incerteza em vez de escondê-la.
