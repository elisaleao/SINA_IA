# AGENTS.md — SINA_IA

Este é o ponto de entrada da arquitetura, governança viva e regras do repositório **SINA_IA** para agentes de IA e desenvolvedores.

---

## 1. Visão Geral do Projeto

O **SINA_IA** é uma plataforma educacional inclusiva, adaptativa e universal (inspirada na dinâmica do NotebookLM), estruturada com foco em **Acessibilidade Universal e Neurodiversidade**:
* **Deficiência Visual:** Cegueira total e baixa visão (leitores de tela NVDA/JAWS, audiodescrição e equações matemáticas faladas por extenso).
* **Dislexia:** Adaptação em Linguagem Simples (*Plain Language*), sentenças curtas na ordem direta, glossários automáticos e tipografia adaptativa.
* **TDAH e Atenção:** Micro-learning em blocos curtos (*chunks* de 2 a 3 linhas), bullet points estruturados e eliminação de sobrecarga cognitiva.
* **Apoio Cognitivo e Baixa Literacia:** Analogias concretas do cotidiano e decomposição sequencial de conteúdos complexos.

O projeto possui uma arquitetura poliglota clara:
* **`frontend/`**: Interface assistiva moderna em **Next.js 16 (App Router)**, **React 19**, **TypeScript** e **TailwindCSS v4**.
* **`backend/app/`**: API assíncrona robusta em **FastAPI (Python 3.13)**, **SQLAlchemy**, **SymPy**, **PyMuPDF**, **Edge-TTS** e integração com **Google Gemini**.

---

## 2. Roteamento de Pastas e Responsabilidades

Consulte a documentação temática antes de realizar alterações:

| Se você vai... | Diretório principal | Documento de referência |
|---|---|---|
| Entender a arquitetura macro e decisões | Raiz | `docs/architecture.md` e `docs/adr/` |
| Criar ou alterar telas, componentes e acessibilidade | `frontend/src/` | `docs/rules/accessibility.md` |
| Alterar regras de conversão matemática e didática | `backend/app/app/services/` | `docs/rules/domain.md` |
| Criar ou modificar modelos de dados e migrações | `backend/app/app/database.py` | `docs/rules/concurrency.md` |
| Mexer em concorrência, jobs de OCR e áudio TTS | `backend/app/app/` | `docs/rules/concurrency.md` |
| Consultar roadmap, prioridades e dependências | Raiz | `docs/roadmap.md` |
| Validar a integridade geral do projeto | Raiz | `./check.sh` |

---

## 3. Direção Estrita de Dependências

```
frontend/ (Cliente Next.js / Camada de Apresentação)
    │
    ▼ (HTTP / REST / JSON)
backend/app/app/main.py (Gateway FastAPI / Rotas de Borda)
    │
    ├──► backend/app/app/services/ (Orquestração e Integrações Externas: Gemini, Edge-TTS, PyMuPDF)
    │        │
    │        ▼
    │    backend/app/app/services/math_speech_service.py (Domínio Puro: Sem I/O, Sem Banco)
    │
    └──► backend/app/app/database.py (Persistência com SQLAlchemy Assíncrono)
```

### Regras de Fronteira:
1. **Domínio Puro:** Módulos de regras matemáticas (como `math_speech_service.py`), cálculos e validações pedagógicas **não devem importar** SQLAlchemy, FastAPI, nem realizar chamadas de rede/disco.
2. **Frontend Desacoplado:** O frontend interage exclusivamente via contratos HTTP/JSON com a API FastAPI.
3. **Isolamento de Tipos:** O frontend deve manter TypeScript estrito (proibido o uso de `any`).

---

## 4. Regras Inegociáveis

1. **Quality Gate 100% Verde:** O comando `./check.sh` deve passar sem erros antes de qualquer commit.
2. **Acessibilidade Universal (WCAG 2.2 AAA & UDL):**
   * Elementos interativos devem ter labels e semântica ARIA acessíveis por leitores de tela.
   * Adaptações de texto devem respeitar as preferências do perfil (Linguagem Simples para dislexia, concisão para TDAH, transcrição fonética para cegueira).
3. **TypeScript Estrito:** Nenhuma variável, propriedade ou retorno no frontend pode ter tipo `any` explícito ou implícito.
4. **Idempotência e Resiliência:** Operações pesadas de processamento (OCR, geração via LLM e síntese de voz) devem suportar retentativas seguras.
5. **Idioma dos Artefatos:**
   * Prosa, documentação e discussões técnicas em **Português com acentos corretos**.
   * Código, variáveis, nomes de funções, testes e mensagens de commit em **Inglês** (padrão Conventional Commits).
