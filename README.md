# SINA_IA

Plataforma educacional que transforma material de estudo em versões acessíveis para cada aluno. O professor ou o próprio aluno envia um PDF, DOCX, TXT ou imagem, e o sistema devolve o conteúdo reestruturado em Markdown semântico, com as fórmulas matemáticas escritas por extenso em português e um áudio neural em pt-BR.

O projeto nasceu para estudantes cegos ou com baixa visão em cursos de exatas, que esbarram em PDFs sem estrutura e em fórmulas LaTeX que o leitor de tela soletra símbolo por símbolo (`\frac{a}{b}` vira "barra invertida frac abre chaves..."). Depois do [ADR 0002](docs/adr/0002-pivot-acessibilidade-universal-e-neurodiversidade.md), passou a atender também:

| Perfil | Como o conteúdo é adaptado |
|---|---|
| Deficiência visual | Hierarquia de títulos para NVDA/JAWS, equações convertidas para `[Equação: fração com numerador a e denominador b]`, áudio MP3 |
| Dislexia | Linguagem Simples, frases curtas na ordem direta, glossário ao final, fonte e espaçamento ajustáveis |
| TDAH | Blocos de 2 a 3 linhas, listas no lugar de parágrafos longos, conceitos centrais em destaque |
| Apoio cognitivo | Analogias do cotidiano e resolução em passos numerados |

A interface segue a WCAG 2.2 (meta AAA) e os princípios do Desenho Universal para a Aprendizagem (UDL). Ela tem barra de acessibilidade global (tamanho de fonte, alto contraste, espaçamento, tipografia para dislexia, áudio automático), tradutor de Libras VLibras sob demanda e navegação completa por teclado.

## O que já funciona

- Upload e ingestão de documentos, com OCR via Google Gemini para páginas escaneadas e imagens.
- Geração de resumo, quiz ou guia de estudo adaptado ao perfil do aluno e à calibração do professor (nível, detalhamento dos cálculos e tom).
- Pipeline de acessibilidade com progresso em tempo real (`POST /api/accessibility/process-stream`), quatro níveis de adaptação e auditoria de fidelidade feita pela IA.
- Síntese de voz com Edge-TTS.
- Cadastro e login com JWT, refresh token rotativo e papéis `aluno`, `professor` e `admin`.
- Quiz de Verdadeiro ou Falso com tempo controlado no servidor, maior para os perfis TDAH e apoio cognitivo. Questões geradas pela IA começam como rascunho e só entram no quiz depois que um professor publica.

O andamento das próximas fases está em [docs/roadmap.md](docs/roadmap.md) e nas issues do repositório.

## Arquitetura

Monorepo com duas aplicações que conversam só por HTTP/JSON ([ADR 0001](docs/adr/0001-arquitetura-monorepo-poliglota.md)):

```
frontend/       Next.js 16 (App Router), React 19, TypeScript, TailwindCSS v4
backend/app/    FastAPI (Python 3.13), SQLAlchemy assíncrono, Alembic,
                google-genai, Edge-TTS, PyMuPDF, python-docx, OpenCV
docs/           Arquitetura, ADRs, regras de domínio, acessibilidade e roadmap
```

O backend guarda os dados em SQLite no desenvolvimento e aceita PostgreSQL pelo Docker Compose. A conversão de LaTeX para fala fica em `backend/app/app/services/math_speech_service.py`, um módulo sem I/O que o quality gate impede de importar banco ou framework web. Os detalhes estão em [docs/architecture.md](docs/architecture.md).

## Como rodar na sua máquina

### Pré-requisitos

- Node.js 22 e npm
- Python 3.13 e [Poetry](https://python-poetry.org/docs/#installation) 2.x
- Uma chave da API do Google Gemini, obtida em [aistudio.google.com](https://aistudio.google.com/apikey). Sem ela a API sobe, o upload de PDF com texto e de TXT funciona, mas OCR, geração de conteúdo e o pipeline de acessibilidade respondem com erro.
- Acesso à internet, porque o Edge-TTS sintetiza o áudio num serviço remoto.

### 1. Backend

```bash
cd backend/app
poetry install
cp .env.example .env
```

Edite o `backend/app/.env`. Para rodar sem Docker, use SQLite:

```env
GEMINI_API_KEY=sua_chave_aqui
DATABASE_URL=sqlite+aiosqlite:///./sina_ia.db
JWT_SECRET=troque-por-um-valor-aleatorio
```

Suba a API:

```bash
poetry run uvicorn app.main:app --reload
```

Na primeira execução a API cria as tabelas. Confira em http://localhost:8000/api/health e veja todos os endpoints em http://localhost:8000/docs.

Para ter questões no quiz, carregue o banco de exemplo (com a API já iniciada pelo menos uma vez):

```bash
poetry run python scripts/seed_exercicios.py
```

Se preferir criar o banco pelas migrações em vez da criação automática, rode `poetry run alembic upgrade head`, que usa a mesma `DATABASE_URL`.

### 2. Frontend

Em outro terminal:

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Abra http://localhost:3000. Crie uma conta em `/cadastro`, entre por `/entrar` e teste o envio de documentos em `/processar` e o quiz em `/quiz`.

### Alternativa: Docker Compose

Com Docker instalado, na raiz do repositório:

```bash
GEMINI_API_KEY=sua_chave_aqui docker compose up --build
```

Isso sobe o backend na porta 8000, o frontend na 3000 e um PostgreSQL na 5432. Por padrão o backend usa SQLite em `./data/sina_ia.db`, e uploads e áudios também ficam em `./data`. Para usar o PostgreSQL, troque a linha `DATABASE_URL` do serviço `backend` no `docker-compose.yml` pela que está comentada logo abaixo dela.

## Testes e quality gate

Todo commit precisa passar pelo `./check.sh`, que roda na raiz:

| Parte | Verificações |
|---|---|
| Frontend | ESLint, `tsc --noEmit`, Vitest |
| Backend | typos, Ruff (lint e formatação com aspas simples), pytest com cobertura mínima de 85% |
| Arquitetura | O módulo de domínio matemático não pode importar banco nem framework web |

Para rodar partes isoladas:

```bash
cd backend/app && poetry run pytest          # testes do backend
cd backend/app && poetry run ruff format app tests   # formata o Python
cd frontend && npm test                      # testes do frontend
cd frontend && npm run build                 # build de produção
```

Os testes do backend usam SQLite em memória e clientes falsos de LLM e TTS (`app/services/fakes.py`), então não gastam cota do Gemini nem precisam de internet.

Para que o Git rode o gate sozinho, ative os hooks versionados uma vez:

```bash
./scripts/install-hooks.sh
```

O `pre-commit` roda lint e checagem de tipos. O `pre-push` roda o `./check.sh` completo. No GitHub, o workflow `.github/workflows/quality-gate.yml` repete as verificações e também gera o build do frontend em todo pull request para a `main`.

## Como contribuir

1. Escolha uma issue e se atribua a ela.
2. Crie uma branch a partir da `main`, por exemplo `feature/fase-3-quiz` ou `fix/descricao-curta`.
3. Escreva os commits em inglês, no padrão [Conventional Commits](https://www.conventionalcommits.org/).
4. Rode `./check.sh` antes de abrir o pull request e coloque `Closes #N` na descrição.

Código, testes e commits ficam em inglês. Documentação e textos da interface ficam em português. As regras para agentes de IA e desenvolvedores estão em [AGENTS.md](AGENTS.md).

## Documentação

- [docs/architecture.md](docs/architecture.md): camadas, responsabilidades e fluxo de processamento
- [docs/adr/](docs/adr/): decisões de arquitetura
- [docs/rules/accessibility.md](docs/rules/accessibility.md): diretrizes WCAG, UDL e o catálogo de componentes acessíveis
- [docs/rules/domain.md](docs/rules/domain.md): regras do domínio puro
- [docs/rules/concurrency.md](docs/rules/concurrency.md): idempotência e processamento em segundo plano (planejado)
- [docs/roadmap.md](docs/roadmap.md): fases, prioridades e dependências
