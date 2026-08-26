# SINA_IA - Plataforma Educacional Inclusiva

Uma plataforma educacional focada em acessibilidade, projetada para converter materiais de estudo tradicionais (PDF, imagens, Word) em conteúdos adaptados para estudantes com deficiência visual utilizando Inteligência Artificial (Google Gemini) e leitura de fórmulas matemáticas em português fonético falado.

---

## 🏗️ Estrutura do Projeto

O projeto é dividido em duas partes principais:

*   **`frontend/`**: Interface web moderna construída com **Next.js**, **React 19**, **TypeScript** e **TailwindCSS**.
*   **`backend/app/`**: API REST robusta em **FastAPI** (Python 3.13) integrada com a API do Google Gemini (`google-genai`), banco de dados SQLite (`aiosqlite`/`SQLAlchemy`) e síntese de áudio por IA (`edge-tts`).

---

## ⚙️ Pré-requisitos

Certifique-se de possuir instalado em sua máquina:
1.  **Node.js** (versão 18 ou superior) e **npm**.
2.  **Python** (versão 3.13 ou superior).
3.  **Poetry** (gerenciador de dependências Python).

---

## 🚀 Como Configurar e Rodar o Projeto

### 1. Configurando as Variáveis de Ambiente

#### Back-end:
Crie um arquivo `.env` dentro da pasta `backend/app/` com as seguintes chaves:
```env
# Sua chave de API da Google Gemini
GEMINI_API_KEY=sua_gemini_api_key_aqui

# URL do banco de dados (SQLite assíncrono padrão)
DATABASE_URL=sqlite+aiosqlite:///sina_ia.db
```

#### Front-end:
Crie um arquivo `.env.local` na raiz da pasta `frontend/` apontando para o servidor back-end:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

### 2. Rodando o Back-end (FastAPI)

Navegue até a pasta do back-end, instale as dependências com o Poetry e inicie o servidor de desenvolvimento:

```bash
# Entre na pasta do backend
cd backend/app

# Desative o keyring do Poetry se estiver em ambiente headless/Linux
poetry config keyring.enabled false

# Instale as dependências do Python
poetry install

# Inicie o servidor FastAPI (Uvicorn)
poetry run uvicorn app.main:app --reload
```
A API estará disponível em `http://localhost:8000` (e a documentação Swagger interativa em `http://localhost:8000/docs`).

---

### 3. Rodando o Front-end (Next.js)

Abra uma nova janela de terminal, navegue até a pasta do front-end, instale as dependências e inicie o servidor:

```bash
# Entre na pasta do frontend
cd frontend

# Instale as dependências do Node.js
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```
A interface web estará disponível em `http://localhost:3000`.

---

## 🧪 Como Rodar a Suíte de Testes Automatizados

O back-end possui testes automatizados unitários e de integração que garantem o funcionamento correto das conversões matemáticas de LaTeX para fala humana e a integridade de todas as rotas API.

Para rodar os testes:
```bash
cd backend/app
poetry run pytest
```
Os testes utilizam um banco de dados SQLite em memória totalmente isolado e mocks para os serviços externos do Gemini e Edge-TTS.
