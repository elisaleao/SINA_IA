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
* **`backend/app/`**: API assíncrona robusta em **FastAPI (Python 3.13)**, **SQLAlchemy**, **SymPy**, **PyMuPDF**, **Edge-TTS**, **Piper** (voz local) e integração com **Google Gemini**.

---

## 2. Roteamento de Pastas e Responsabilidades

Consulte a documentação temática antes de realizar alterações:

| Se você vai... | Diretório principal | Documento de referência |
|---|---|---|
| Entender a arquitetura macro e decisões | Raiz | `docs/architecture.md` e `docs/adr/` |
| Criar ou alterar telas, componentes e acessibilidade | `frontend/src/` | `docs/rules/accessibility.md` |
| Criar ou alterar rotas HTTP | `backend/app/app/api/routers/` | `docs/architecture.md` |
| Criar ou alterar contratos de entrada e saída (DTOs) | `backend/app/app/schemas/` | `docs/architecture.md` |
| Alterar regras, fluxos, Gemini, TTS ou extração de documentos | `backend/app/app/services/` | `docs/architecture.md` |
| Alterar regras de conversão matemática e didática | `backend/app/app/services/` | `docs/rules/domain.md` |
| Criar ou modificar modelos de dados e migrações | `backend/app/app/database.py` e `backend/app/alembic/versions/` | `docs/rules/concurrency.md` |
| Mexer em concorrência, jobs de OCR e áudio TTS | `backend/app/app/` | `docs/rules/concurrency.md` |
| Consultar roadmap, prioridades e dependências | Raiz | `docs/roadmap.md` |
| Validar a integridade geral do projeto | Raiz | `./check.sh` |

---

## 3. Direção Estrita de Dependências

```
frontend/ (Cliente Next.js / Camada de Apresentação)
    │
    ▼ (HTTP / REST / JSON)
backend/app/app/api/routers/ (Rotas HTTP; recebem serviços por api/deps.py e DTOs de schemas/)
    │
    ├──► backend/app/app/services/ (Fluxos e integrações: gemini_service, groq_service, ai_provider, tts_service, document_extractor, pipelines)
    │        │
    │        ▼
    │    Domínio puro em services/: math_speech_service.py, math_detector.py, upload_validation.py (sem I/O, sem banco)
    │
    └──► backend/app/app/database.py (Persistência com SQLAlchemy assíncrono; schema só muda por migração Alembic)
```

Cada integração externa tem **um único** módulo: voz em `services/tts_service.py` e extração de documentos em `services/document_extractor.py`. Não crie outro serviço de voz nem outro extrator; estenda o existente. O `tts_service.py` tem dois motores: o Edge-TTS (online) e o Piper (local, em container próprio por ser GPL), escolhidos pela preferência `tts_engine` do usuário e com fallback de um para o outro ([ADR-0004](docs/adr/0004-voz-local-piper-com-fallback.md)).

A camada de IA tem dois provedores sob o mesmo contrato, `AccessibilityAIProtocol` (`core/protocols.py`): o Gemini com a chave pessoal do usuário (`services/gemini_service.py`) e o Groq como fallback gratuito (`services/groq_service.py`). O `FallbackAIClient` (`services/ai_provider.py`) escolhe entre os dois a cada requisição. Um provedor novo só entra com um ADR que substitua o [ADR-0003](docs/adr/0003-chave-de-ia-por-usuario-e-fallback-gratuito.md).

### Regras de Fronteira:
1. **Domínio Puro:** Módulos de regras matemáticas (como `math_speech_service.py` e `math_detector.py`), validações (`upload_validation.py`) e cálculos pedagógicos **não devem importar** SQLAlchemy, FastAPI, nem realizar chamadas de rede/disco.
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
