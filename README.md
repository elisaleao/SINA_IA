# SINA_IA — Plataforma Educacional Universalmente Acessível

O **SINA_IA** é uma plataforma educacional inclusiva e adaptativa (inspirada na dinâmica do NotebookLM) projetada sob os princípios do **Desenho Universal para a Aprendizagem (UDL)** e da **WCAG 2.2 AAA**. O sistema converte materiais acadêmicos e técnicos (PDF, imagens, Word, textos) em formatos personalizados para múltiplos perfis:

* 👁️ **Deficiência Visual (Cegueira e Baixa Visão):** Leitura via leitores de tela (NVDA/JAWS), tradução fonética de expressões matemáticas em LaTeX para português falado e síntese de áudio neural.
* 📖 **Dislexia:** Adaptação do texto segundo as normas de **Linguagem Simples (Plain Language)**, sentenças curtas na ordem direta, glossário explicativo de termos complexos e apoio visual bimodal.
* ⚡ **TDAH (Déficit de Atenção):** Estruturação em micro-learning (*chunks* de 2 a 3 linhas), bullet points objetivos, destaque de ideias centrais e eliminação de sobrecarga cognitiva.
* 🧠 **Apoio Cognitivo e Baixa Literacia:** Analogias concretas do cotidiano e decomposição de raciocínios em etapas passo a passo.

---

## 🏗️ Arquitetura Poliglota

O repositório é organizado em uma arquitetura monorepo poliglota com fronteiras e responsabilidades estritas:

* **`frontend/`**: Interface web acessível construída com **Next.js 16 (App Router)**, **React 19**, **TypeScript 5** e **TailwindCSS v4**.
* **`backend/app/`**: API assíncrona robusta em **FastAPI (Python 3.13)** integrada com **Google Gemini** (`google-genai`), banco de dados relacional assíncrono (**SQLAlchemy** / `aiosqlite`), **SymPy**, **PyMuPDF**, **python-docx**, **OpenCV** e síntese vocal neural (**Edge-TTS**).
* **`docs/`**: Governança viva do projeto com diretrizes temáticas (`docs/rules/`), registros de decisão de arquitetura (`docs/adr/`) e mapa de dependências de tarefas (`docs/roadmap.md`).

---

## ⚙️ Pré-requisitos

* **Node.js** (versão 20 ou 22 LTS) e **npm**.
* **Python** (versão 3.13 ou superior) e **Poetry**.

---

## 🚀 Como Configurar e Rodar o Projeto

### 1. Variáveis de Ambiente

#### Backend:
Crie um arquivo `.env` dentro de `backend/app/` (baseie-se no `backend/app/.env.example`):
```env
GEMINI_API_KEY=sua_chave_gemini_aqui
DATABASE_URL=sqlite+aiosqlite:///sina_ia.db
```

#### Frontend:
Crie um arquivo `.env.local` na raiz de `frontend/`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

### 2. Rodando o Backend (FastAPI)

```bash
cd backend/app

# Instale as dependências com Poetry
poetry install

# Inicie a API com Uvicorn
poetry run uvicorn app.main:app --reload
```
A API estará disponível em `http://localhost:8000` (e Swagger em `http://localhost:8000/docs`).

---

### 3. Rodando o Frontend (Next.js)

```bash
cd frontend

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```
A aplicação estará disponível em `http://localhost:3000`.

---

## 🧪 Quality Gate Unificado (CI Local)

O projeto conta com um validador unificado de integridade arquitetural na raiz. Ele executa os testes e checagens estritas de TypeScript, ESLint, Ruff, Typos e Pytest com cobertura:

```bash
# Na raiz do projeto:
./check.sh
```

---

## 📚 Documentação e Governança

* [AGENTS.md](file:///home/nkk/Área%20de%20trabalho/User/projetos/SINA_IA/AGENTS.md): Ponto de entrada para agentes de IA e desenvolvedores.
* [docs/architecture.md](file:///home/nkk/Área%20de%20trabalho/User/projetos/SINA_IA/docs/architecture.md): Visão detalhada da arquitetura e fluxo de processamento.
* [docs/rules/accessibility.md](file:///home/nkk/Área%20de%20trabalho/User/projetos/SINA_IA/docs/rules/accessibility.md): Diretrizes WCAG 2.2 AAA, UDL, Dislexia e TDAH.
* [docs/rules/domain.md](file:///home/nkk/Área%20de%20trabalho/User/projetos/SINA_IA/docs/rules/domain.md): Regras de domínio puro e determinismo.
* [docs/rules/concurrency.md](file:///home/nkk/Área%20de%20trabalho/User/projetos/SINA_IA/docs/rules/concurrency.md): Idempotência e padrão outbox/job queue.
* [docs/adr/](file:///home/nkk/Área%20de%20trabalho/User/projetos/SINA_IA/docs/adr/): Registros de Decisões de Arquitetura (ADRs).
