# ADR 0001: Arquitetura Monorepo Poliglota (Next.js + FastAPI)

* **Status:** Aceito
* **Data:** 2026-09-19
* **Autor:** Nicholas / SINA_IA Core Team

---

## 1. Contexto do Problema

O projeto SINA_IA necessita de uma interface de usuário altamente acessível (conformidade WCAG 2.2 AAA para leitores de tela NVDA/JAWS e navegação por teclado) integrada a um backend robusto capaz de:
1. Processar documentos complexos (PDFs escaneados, Word, imagens).
2. Manipular fórmulas matemáticas via AST e notação LaTeX (usando SymPy e algoritmos fonéticos).
3. Conectar-se com modelos multimodais de IA (Google Gemini) e sintetizadores neurais de voz (Edge-TTS).

Surgiu a necessidade de definir se o repositório deveria ser unificado em uma única linguagem (ex: monorepo 100% TypeScript com Node.js ou 100% Python com templates/SSR) ou adotar um padrão monorepo poliglota.

---

## 2. Alternativas Consideradas

* **Alternativa A: Monorepo 100% TypeScript (Node.js/pnpm + Next.js + Fastify/Prisma)**
  * *Vantagens:* Compartilhamento de tipos entre frontend e backend, catálogo unificado de dependências, linter de fronteiras com `dependency-cruiser`.
  * *Desvantagens:* Falta de bibliotecas maduras e performáticas no ecossistema Node para computação simbólica matemática (SymPy), visão computacional (OpenCV com wrappers nativos estáveis) e manipulação precisa de layouts de PDF (PyMuPDF).

* **Alternativa B: Monorepo 100% Python (FastAPI + Jinja2/HTMX ou Reflex)**
  * *Vantagens:* Uma única linguagem para toda a base de código.
  * *Desvantagens:* Perda de flexibilidade na experiência assistiva rica do usuário no navegador, reatividade limitada para reprodução multimídia e menor facilidade para construir interfaces complexas para alunos e professores.

* **Alternativa C: Monorepo Poliglota (Next.js no Frontend + FastAPI no Backend)**
  * *Vantagens:* Utiliza a ferramenta ideal para cada problema — ecossistema React/Next.js moderno para a interface assistiva e ecossistema Python 3.13 para o processamento de IA, OCR, matemática e síntese de áudio. Ambas as partes residem no mesmo repositório com governança unificada.
  * *Desvantagens:* Necessidade de ferramentas de gerenciamento de dependências e linters separados (npm para frontend, Poetry para backend).

---

## 3. Decisão Tomada

Adotar a **Alternativa C: Monorepo Poliglota**.
* O frontend reside em `frontend/`, utilizando **Next.js 16**, **React 19**, **TypeScript** e **TailwindCSS v4**.
* O backend reside em `backend/app/`, utilizando **Python 3.13**, **FastAPI**, **Poetry**, **SQLAlchemy**, **SymPy**, **PyMuPDF**, **google-genai** e **edge-tts**.
* A governança do repositório é centralizada na raiz através de um **Quality Gate Unificado** (`check.sh` e `.github/workflows/pr.yml`) e documentação roteada (`AGENTS.md` e `docs/rules/`).

---

## 4. Consequências Arquiteturais

### Positivas:
* Preserva integralmente o poder computacional do ecossistema científico e de IA em Python.
* Garante a melhor tecnologia para componentes de acessibilidade rica no frontend (Next.js + ARIA).
* Evita a reescrita desnecessária de código já testado e validado.
* Mantém fronteiras bem definidas: a interface só conhece a API via contratos REST/JSON.

### Negativas / Trade-offs:
* O ambiente de integração contínua (CI) precisa configurar simultaneamente os runtimes de Node.js e Python.
* Desenvolvedores precisam ter Node.js e Poetry instalados em suas máquinas de desenvolvimento local.
