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

- Upload e ingestão de documentos, com OCR por IA para páginas escaneadas e imagens.
- IA com a chave do próprio usuário (Google Gemini) ou, sem ela, um provedor gratuito (Groq). Se a chave pessoal falhar, a mesma chamada segue no Groq ([ADR-0003](docs/adr/0003-chave-de-ia-por-usuario-e-fallback-gratuito.md)).
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
                google-genai, Edge-TTS, PyMuPDF, python-docx
docs/           Arquitetura, ADRs, regras de domínio, acessibilidade e roadmap
```

Dentro do backend (`backend/app/app/`), cada responsabilidade tem um único lugar:

```
api/routers/    rotas HTTP, uma por arquivo
schemas/        contratos de entrada e saída (Pydantic)
services/       regras, fluxos e integrações: IA (Gemini e Groq), um serviço de voz,
                um extrator de documentos, os pipelines e o domínio puro
core/           configuração (Settings), segurança e protocolos
database.py     models do SQLAlchemy; o schema só muda por migração em alembic/
```

O backend guarda os dados em PostgreSQL. O SQLite só é usado pela suíte de testes, em memória. A conversão de LaTeX para fala fica em `backend/app/app/services/math_speech_service.py`, um módulo sem I/O que o quality gate impede de importar banco ou framework web. Os detalhes estão em [docs/architecture.md](docs/architecture.md).

## Como rodar

O banco de dados é o PostgreSQL. O SQLite só é usado pela suíte de testes, em memória.

### Com Docker (recomendado)

Pré-requisitos: Docker com o Compose v2. Nada mais precisa estar instalado na máquina.

```bash
cp .env.example .env        # na raiz do repositório
# edite o .env: JWT_SECRET e LLM_KEY_ENCRYPTION_SECRET (obrigatórios) e GROQ_API_KEY
docker compose up -d --build
```

Sem `JWT_SECRET` ou `LLM_KEY_ENCRYPTION_SECRET` no `.env` da raiz, o `docker compose` para com uma mensagem dizendo qual variável falta. O próprio `.env.example` mostra um comando que gera valores aleatórios.

Isso sobe três serviços:

| Serviço | Endereço | Observação |
| --- | --- | --- |
| Frontend | http://localhost:3000 | Next.js em modo de desenvolvimento |
| API | http://localhost:8000 (documentação em `/docs`) | Aplica as migrações (`alembic upgrade head`) antes de subir |
| PostgreSQL | localhost:5432 | Usuário `sina`, senha `sina_secret`, banco `sina_ia` |

Os dados ficam em `./data`: o banco em `./data/postgres`, e uploads e áudios em `./data/uploads` e `./data/outputs`.

Comandos do dia a dia:

```bash
docker compose ps                                          # estado dos serviços
docker compose logs -f backend                             # logs da API
docker compose exec backend python -m scripts.seed_exercicios   # questões de exemplo do quiz
docker compose up -d --build backend                       # depois de mudar o código do backend
docker compose down                                        # para tudo e mantém os dados
docker compose down && rm -rf data/postgres                # apaga o banco e começa do zero
```

O `.env` do `backend/app` não entra na imagem (está no `.dockerignore`). No Docker, as variáveis vêm do `.env` da raiz e do `docker-compose.yml`.

Versões anteriores do Compose usavam SQLite em `./data/sina_ia.db`. Esses dados **não são levados** para o PostgreSQL: contas, preferências e materiais antigos não aparecem depois da atualização. O arquivo continua em `./data`, sem uso.

### Sem Docker (desenvolvimento)

Pré-requisitos: Node.js 22, Python 3.13, [Poetry](https://python-poetry.org/docs/#installation) 2.x e Docker, só para o PostgreSQL.

Suba só o banco. O Compose lê o `.env` da raiz mesmo para um serviço só, então crie esse arquivo antes, como na seção anterior:

```bash
docker compose up -d db
```

Backend:

```bash
cd backend/app
poetry install
cp .env.example .env        # já aponta para o PostgreSQL em localhost:5432
# edite o .env: GROQ_API_KEY, LLM_KEY_ENCRYPTION_SECRET e JWT_SECRET
poetry run alembic upgrade head
poetry run python -m scripts.seed_exercicios   # opcional: questões do quiz
poetry run uvicorn app.main:app --reload
```

A API não cria tabelas sozinha. Depois de um `git pull` que traga migração nova em `alembic/versions/`, rode `alembic upgrade head` de novo.

Frontend, em outro terminal:

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

### Chaves de IA

- `GROQ_API_KEY` (servidor): IA gratuita de quem não cadastrou chave própria. Crie em [console.groq.com](https://console.groq.com/keys), sem cartão. Sem ela, o processamento com IA responde com erro para esses usuários.
- Chave do Gemini (por usuário, opcional): cada pessoa cadastra a sua em `/configuracoes/chave-ia`. Gere em [aistudio.google.com](https://aistudio.google.com/apikey). A chave é testada antes de salvar e fica cifrada com `LLM_KEY_ENCRYPTION_SECRET`.
- O Edge-TTS, que gera o áudio, precisa de acesso à internet e não usa chave.

## Testes e quality gate

Todo commit precisa passar pelo `./check.sh`, que roda na raiz:

| Parte | Verificações |
|---|---|
| Frontend | ESLint, `tsc --noEmit`, Vitest |
| Backend | typos, Ruff (lint e formatação com aspas simples), `alembic check` (as migrações precisam cobrir todos os models), pytest com cobertura mínima de 85% |
| Arquitetura | O módulo de domínio matemático não pode importar banco nem framework web |

Para rodar partes isoladas:

```bash
cd backend/app && poetry run pytest          # testes do backend
cd backend/app && poetry run ruff format app tests   # formata o Python
cd frontend && npm test                      # testes do frontend
cd frontend && npm run build                 # build de produção
```

Os testes do backend usam SQLite em memória e clientes falsos de IA e TTS (`app/services/fakes.py`), então não gastam cota do Gemini nem do Groq e não precisam de internet.

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
