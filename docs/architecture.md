# Arquitetura do Sistema SINA_IA

Este documento descreve como o **SINA_IA** está organizado hoje: as aplicações, as pastas do backend, a responsabilidade de cada módulo e os fluxos que transformam um material de estudo em conteúdo acessível.

As decisões que levaram a essa estrutura estão em [`docs/adr/`](adr/).

---

## 1. Visão geral

O repositório é um monorepo com duas aplicações que conversam só por HTTP/JSON ([ADR 0001](adr/0001-arquitetura-monorepo-poliglota.md)):

- **`frontend/`**: Next.js 16 (App Router), React 19, TypeScript estrito e TailwindCSS v4.
- **`backend/app/`**: FastAPI (Python 3.13), SQLAlchemy assíncrono, Alembic, Google Gemini (`google-genai`), Groq (SDK `openai`), Edge-TTS, PyMuPDF e python-docx.

```mermaid
flowchart TD
    subgraph Frontend["frontend/ (Next.js)"]
        UI["Telas e componentes acessíveis"]
        LIB["src/lib/*: clientes HTTP"]
        UI --> LIB
    end

    subgraph Backend["backend/app/app"]
        ROUTERS["api/routers/*: rotas HTTP"]
        DEPS["api/deps.py: injeção de dependências"]
        SCHEMAS["schemas/*: contratos (Pydantic)"]
        SERVICES["services/*: regras, fluxos e integrações"]
        DB["database.py + alembic/: persistência"]
        ROUTERS --> DEPS
        ROUTERS --> SCHEMAS
        DEPS --> SERVICES
        ROUTERS --> SERVICES
        SERVICES --> DB
    end

    GEMINI["Google Gemini (chave do usuário)"]
    GROQ["Groq (fallback gratuito)"]
    TTS["Edge-TTS"]

    LIB -->|REST / multipart / NDJSON| ROUTERS
    SERVICES --> GEMINI
    SERVICES --> GROQ
    SERVICES --> TTS
```

---

## 2. Organização do backend

Cada responsabilidade tem um único lugar. Não existe outro pacote de serviços fora de `app/services/`.

```
backend/app/app/
  main.py              cria o FastAPI, o CORS e registra os routers
  core/                config.py (Settings), security.py (JWT, Argon2), protocols.py
  database.py          engine, sessão e models do SQLAlchemy
  models.py            DTOs de geração de conteúdo (AccessibilityConfig, GenerateRequest)
  schemas/             DTOs das rotas: auth, user, exercise, material, accessibility
  api/
    deps.py            sessão do banco, usuário logado, RBAC e as instâncias dos serviços
    routers/           uma rota HTTP por arquivo (lista na seção 3)
  services/            regras, fluxos e integrações externas (lista abaixo)
backend/app/alembic/   migrações; o schema do banco só muda por elas
```

### 2.1. `app/services/`

| Módulo | Responsabilidade | Tipo |
|---|---|---|
| `gemini_service.py` | Cliente do Google Gemini, assíncrono: texto, OCR, descrição de gráfico, auditoria e correção. Usa a chave pessoal do usuário. Modelo em `Settings.GEMINI_MODEL`. | Integração |
| `groq_service.py` | Cliente do Groq pela API compatível com OpenAI, com a mesma superfície do Gemini. É o fallback gratuito. Modelo em `Settings.GROQ_MODEL`. | Integração |
| `ai_provider.py` | `FallbackAIClient`: tenta a chave pessoal e cai para o Groq quando ela falha (401, 403, 429 ou 400 `API_KEY_INVALID`). Marca `used_fallback`. | Integração |
| `llm_key_service.py` | Salva, testa, lê e remove a chave pessoal do Gemini. | Fluxo |
| `crypto.py` | Cifra e decifra a chave pessoal com `Fernet`. | Domínio puro |
| `tts_service.py` | **Único** serviço de voz (Edge-TTS). Voz, velocidade, volume e tom em `Settings.EDGE_TTS_*`. | Integração |
| `document_extractor.py` | **Único** extrator de documentos: PDF (texto nativo ou OCR por página), DOCX (títulos, parágrafos, tabelas e imagens), TXT e imagens. PyMuPDF e python-docx rodam fora do event loop. | Integração |
| `file_store.py` | Arquivos gerados, com `resolve_safe` contra path traversal e expiração opcional. | Integração |
| `accessibility_pipeline.py` | Fluxo completo de acessibilidade: extração, detecção de matemática, adaptação por nível (1 a 4), auditoria, correção e MP3. | Fluxo |
| `accessibility_prompts.py` | Prompts do pipeline (mestre, matemática, OCR, gráficos, auditoria e correção). | Fluxo |
| `llm_service.py` | Geração de resumo, quiz ou guia por perfil de acessibilidade e configuração do professor. | Fluxo |
| `ingestion_service.py` | Extração síncrona usada por `/api/documents/upload`; usa o `DocumentExtractor`. | Fluxo |
| `material_service.py` | Armazenamento e processamento em segundo plano dos materiais (`/api/materiais`), com cache por `sha256 + nível`. | Fluxo |
| `math_speech_service.py` | Conversão determinística de LaTeX para fala em português (`[Equação: ...]`). | Domínio puro |
| `math_detector.py` | Heurística que decide se um texto tem matemática relevante. | Domínio puro |
| `upload_validation.py` | Tipo do arquivo pela assinatura (não pela extensão), limites e nome seguro para exibição. | Domínio puro |
| `fakes.py` | Implementações falsas do LLM, do Gemini e do TTS para os testes. | Testes |

Módulos de **domínio puro** não fazem I/O e não importam FastAPI, SQLAlchemy nem clientes externos (ver [`docs/rules/domain.md`](rules/domain.md)).

### 2.2. Injeção de dependências

`app/api/deps.py` entrega as integrações às rotas por `Depends`. O TTS e o Groq têm uma instância compartilhada. O cliente de IA é montado a cada requisição por `get_ai_client`: com a chave pessoal do usuário, se houver, e o Groq como fallback. Pipelines, `LLMService` e `IngestionService` recebem esse cliente. Nos testes, `app.dependency_overrides` troca essas instâncias pelos fakes de `app/services/fakes.py`, então a suíte não chama o Gemini nem o Edge-TTS.

### 2.3. Configuração

Toda configuração fica em `app/core/config.py` (`Settings`, lido do `backend/app/.env`). Nenhum outro módulo lê variáveis de ambiente diretamente.

Para a IA:

- `GROQ_API_KEY`: chave do servidor para o fallback gratuito (console.groq.com, sem cartão). Sem ela, quem não tem chave pessoal fica sem IA.
- `GROQ_MODEL`: modelo do Groq, com visão e saída estruturada (padrão `qwen/qwen3.8-27b`).
- `LLM_KEY_ENCRYPTION_SECRET`: segredo que cifra as chaves pessoais. Obrigatório em produção. Trocar o valor invalida as chaves já salvas.
- `GEMINI_API_KEY`: não é mais usada pelas rotas; o Gemini só roda com a chave pessoal de cada usuário ([ADR-0003](adr/0003-chave-de-ia-por-usuario-e-fallback-gratuito.md)).

---

## 3. Rotas HTTP

| Router | Prefixo | Uso |
|---|---|---|
| `health.py` | `/health`, `/api/health` | Verificação de saúde |
| `auth.py` | `/auth/*`, `/users/me*` | Cadastro (só `aluno` e `professor`), login, refresh token, logout e preferências |
| `documents.py` | `/api/documents` | Upload síncrono (legado, usado pelo `TeacherWorkspace`) |
| `materials.py` | `/api/materiais` | Upload com processamento em segundo plano, status, áudio protegido, reprocessar e apagar |
| `content.py` | `/api/content/generate` | Resumo, quiz ou guia por perfil (usado pelo `StudentWorkspace`) |
| `audio.py` | `/api/audio/{arquivo}` | MP3 gerado pelo `/api/content/generate` |
| `accessibility.py` | `/api/accessibility` | Pipeline com progresso em NDJSON (tela `/processar`) e download dos arquivos gerados |
| `exercises.py` | `/api/exercicios` | Sessões de quiz, respostas, resultado, geração por IA e publicação pelo professor |

Documentos e materiais com dono só são acessíveis pelo dono ou por um admin (`deps.can_access_document`). Para qualquer outra pessoa a resposta é 404, sem revelar que o recurso existe.

### 3.1. Tipos da API

O backend é a fonte da verdade do contrato. O OpenAPI exportado fica em `frontend/src/lib/openapi.json`, e os tipos TypeScript gerados a partir dele ficam em `frontend/src/lib/api-types.ts`. Os dois arquivos são versionados.

Depois de mudar uma rota ou um schema, regenere os dois arquivos e faça o commit deles:

```bash
cd backend/app && PYTHONPATH=. poetry run python scripts/export_openapi.py ../../frontend/src/lib/openapi.json
cd frontend && npm run api:types
```

O `./check.sh` e o job `static` do CI rodam os mesmos comandos e falham se algum dos arquivos mudar. O `PYTHONPATH=.` garante que o script importe o `app` da pasta atual, e não outra cópia instalada no ambiente virtual.

---

## 4. Fluxos de processamento

Os fluxos compartilham o mesmo extrator, o mesmo cliente de IA da requisição e o mesmo serviço de voz. A unificação dos fluxos num pipeline só está em andamento no refactor do backend.

| Fluxo | Entrada | Etapas | Resultado |
|---|---|---|---|
| Pipeline de acessibilidade | `POST /api/accessibility/process-stream` | extração, detecção de matemática, adaptação por nível, auditoria, correção, MP3 | Eventos NDJSON; arquivos temporários com expiração |
| Materiais | `POST /api/materiais` | o mesmo pipeline, em tarefa de fundo | Linha em `documentos` com `status` (`enviado`, `processando`, `pronto`, `erro`) e MP3 permanente |
| Documento legado | `POST /api/documents/upload` | extração e matemática falada | Linha em `documentos` com `status = pronto` |
| Conteúdo | `POST /api/content/generate` | prompt por perfil, Gemini, matemática falada, MP3 | Texto, texto falado e URL do áudio |

---

## 5. Persistência

- `database.py` define as tabelas `usuarios`, `preferencias_acessibilidade`, `chave_gemini_usuario`, `documentos`, `refresh_tokens`, `exercicios`, `sessoes_exercicio` e `respostas_exercicio`.
- O schema muda **só por migração** em `backend/app/alembic/versions/`. A API não cria tabelas ao iniciar, e o container do backend roda `alembic upgrade head` antes de subir.
- O `./check.sh` e o CI rodam `alembic check`, que falha quando um model muda sem migração correspondente.
- SQLite no desenvolvimento e nos testes; PostgreSQL opcional pelo `docker-compose.yml`.
