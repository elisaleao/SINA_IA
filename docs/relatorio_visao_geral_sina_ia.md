# SINA_IA — Relatório Executivo e Técnico da Aplicação

> **Documento de Visão Geral, Arquitetura e Diferenciais Competitivos**  
> *Versão:* 1.2  
> *Data:* Setembro de 2026  
> *Projeto:* SINA_IA (Sistema Inclusivo de Aprendizagem com Inteligência Artificial)  
> *Repositório:* `elisaleao/SINA_IA`

---

## 1. Sumário Executivo

O **SINA_IA** é uma plataforma educacional inclusiva, adaptativa e universal inspirada na dinâmica de cadernos de estudo inteligentes (como o Google NotebookLM), concebida desde o primeiro dia com foco rigoroso em **Acessibilidade Universal (WCAG 2.2 AAA)**, **Desenho Universal para Aprendizagem (UDL)** e **Neurodiversidade**.

Diferente de soluções convencionais de IA generativa que apenas resumem textos de forma padronizada, o SINA_IA atua como um **orquestrador pedagógico multimodal**: ele processa materiais acadêmicos complexos (PDFs de engenharia, imagens digitalizadas, documentos Word), extrai estruturas e fórmulas matemáticas, gera representações fonéticas precisas em português para leitores de tela e áudio sintetizado, e reescreve os conteúdos adaptando-os às necessidades cognitivas específicas de cada estudante (Dislexia, TDAH, Baixa Visão, Cegueira e Apoio Cognitivo).

---

## 2. Proposta de Valor e Perfis Atendidos

A plataforma estrutura sua personalização em torno de 4 eixos principais de inclusão:

| Perfil / Necessidade | Desafio Típico no Ensino Tradicional | Solução Tecnológica no SINA_IA |
|---|---|---|
| **Deficiência Visual** *(Cegueira e Baixa Visão)* | Equações matemáticas ilegíveis por leitores de tela NVDA/JAWS; diagramas e gráficos sem descrição textual (*alt-text*). | **Motor Matemático Fonético:** Conversão de sintaxe LaTeX para português falado por extenso via SymPy; KaTeX + MathML acessível; audiodescrição automática de diagramas via visão computacional; áudio TTS neural em português brasileiro. |
| **Dislexia e Dificuldades de Leitura** | Sobrecarga com blocos densos de texto, vocabulário rebuscado e ambiguidades sintáticas. | **Adaptação em Linguagem Simples (*Plain Language*):** Sentenças em ordem direta (sujeito-verbo-objeto); glossário automático de termos técnicos; tipografia adaptativa (*OpenDyslexic*, *System-UI*) com ajuste de entrelinhas e espaçamento. |
| **TDAH e Atenção** | Perda rápida de foco, fadiga mental e estresse por sobrecarga de estímulos visuais. | **Micro-learning em Chunks:** Quebra de conteúdos em blocos de 2 a 3 linhas; bullet points estruturados; eliminação de distrações e cronômetro de quiz com tempo adaptado ou sem limite. |
| **Apoio Cognitivo & Baixa Literacia** | Dificuldade com abstrações teóricas puras sem conexão com o mundo real. | **Analogias do Cotidiano:** Decomposição de conceitos abstratos em passos sequenciais simples e metáforas do dia a dia. |

---

## 3. Arquitetura de Software e Engenharia

O projeto foi construído sob uma **arquitetura monorepo poliglota**, seguindo os princípios de **Clean Architecture**, **Domínio Puro (Pure Domain)** e **Spec-Driven Development (SDD)**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   FRONTEND ASSISTIVO (Next.js 16)                      │
│   React 19 · TypeScript Estrito · TailwindCSS v4 · WAI-ARIA (WCAG AAA) │
│       Rotas: /inicio · /materias · /ambientes · /quiz · /boas-vindas   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Contratos REST / JSON Assíncronos
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (FastAPI / Python 3.13)                 │
│        Routers Modulares: /documents · /content · /audio · /health     │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       SERVIÇOS DE ORQUESTRAÇÃO       │  │    CAMADA DE PERSISTÊNCIA    │
│  - Ingestion (PyMuPDF, OpenCV)       │  │  - SQLAlchemy 2.0 Mapped     │
│  - LLM Service (Google Gemini)       │  │  - Alembic (Migrações)       │
│  - Audio Service (Edge-TTS)          │  │  - SQLite (Arquivo Local)    │
│  - Fakes/Mocks (Testes sem Custo)    │  │  - PostgreSQL 16 (Opção)     │
│                                      │  │  - Lock Otimista (version_id)│
└───────────────────┬──────────────────┘  └──────────────────────────────┘
                    │
                    ▼ (Sem I/O, Sem Banco, Sem Rede)
┌────────────────────────────────────────────────────────────────────────┐
│             NÚCLEO DE DOMÍNIO PURO (MathToSpeechService)               │
│        SymPy · Tradução Fonética Matemática em Português Puro          │
└────────────────────────────────────────────────────────────────────────┘
```

### Principais Pilares Técnicos:
1. **Frontend Desacoplado (Next.js 16 App Router & React 19):**
   * Tipagem 100% estrita em TypeScript (proibição absoluta do tipo `any`).
   * Navegação acessível por teclado, *skip links*, foco programático em `<h1>` e suporte a atributos semânticos `data-*` para controle dinâmico de contraste e tamanho de fonte.
2. **Backend Assíncrono de Alta Performance (FastAPI & Python 3.13):**
   * Processamento assíncrono com Uvicorn.
   * Isolamento de dependências via injeção de dependências (`FastAPI Depends`), permitindo alternar instantaneamente entre serviços reais e clientes mockados (`FakeLLMClient`, `FakeTTSClient`) para testes determinísticos.
3. **Domínio Puro (Pure Domain Boundary):**
   * O motor de tradução fonética de matemática ([math_speech_service.py](file:///home/nkk/Área de trabalho/User/projetos/SINA_IA/backend/app/app/services/math_speech_service.py)) não realiza chamadas de rede nem acessa banco de dados. Ele opera exclusivamente em memória, sendo auditado automaticamente pelo Quality Gate.
4. **Persistência Confiável e Concorrência:**
   * Suporte a banco de dados em **arquivo local SQLite** (`sina_ia.db`) ou **PostgreSQL 16**.
   * Modelagem de dados com SQLAlchemy 2.0 `DeclarativeBase` e versionamento de schema via **Alembic** com testes de reversibilidade (`upgrade head` $\to$ `downgrade base`).
   * Proteção contra *race conditions* via **Lock Otimista** (`version_id`), garantindo integridade em operações concorrentes.
5. **Privacidade e LGPD por Design:**
   * O questionário de onboarding coleta apenas **preferências de acessibilidade** ("o que ajuda"), nunca diagnósticos clínicos ou dados médicos sensíveis.
   * Suporte nativo a exclusão total de dados do usuário (`DELETE /users/me/preferences`).

---

## 4. Funcionalidades Centrais do Produto

### 4.1 Ingestão e Processamento Multimodal de Documentos
* **Formatos Suportados:** PDF, imagens (PNG, JPG), DOCX e texto plano.
* **Validação por *Magic Bytes*:** Prevenção de ataques de arquivos maliciosos renomeados.
* **Pré-processamento com Visão Computacional (OpenCV):** Conversão em escala de cinza e realce de contraste para elevar a taxa de acerto do OCR.
* **Extração com Gemini Vision:** Transcrição para Markdown com identificação mandatória de fórmulas em LaTeX e geração de audiodescrição para diagramas e figuras.
* **Cache por Hash SHA-256:** Evita reprocessamento redundante de arquivos idênticos com os mesmos perfis.

### 4.2 Motor de Conversão Matemática Fonética
* Converte expressões LaTeX complexas em texto legível e foneticamente natural:
  * Exemplo: `$\frac{-b \pm \sqrt{\Delta}}{2a}$` $\to$ *"fração de menos b mais ou menos raiz quadrada de delta, tudo dividido por duas vezes a"*.
* Disponibiliza tanto a saída visual com **KaTeX + MathML** quanto a saída fonética para o sintetizador de voz e leitores de tela.

### 4.3 Síntese de Voz (TTS) com Vozes Neurais
* Integração com vozes de alta expressividade em português brasileiro (`pt-BR-FranciscaNeural` e `pt-BR-AntonioNeural`).
* Geração assíncrona com persistência em disco e cache local de áudios MP3 para economia de recursos.

### 4.4 Adaptação de Conteúdo e Assistência Pedagógica
* **Resumos Estruturados:** Síntese com identificação das principais fórmulas e teoremas.
* **Guias de Estudo Passo a Passo:** Decomposição de tópicos complexos em etapas executáveis.
* **Conversa Contextualizada (Estilo NotebookLM):** Chat restrito aos materiais do ambiente com citação de fontes (material e página), evitando alucinações.
* **Quiz e Testes Rápidos de Engenharia:** Questões verdadeiro/falso com gabarito comentado, timer adaptado (1x, 2x, 3x ou sem limite) e rotulação transparente de questões geradas por IA (que não afetam o placar oficial).

### 4.5 Execução e Conteinerização (Docker Compose)
* Conteinerização full-stack pronta com `docker compose up --build`.
* Persistência de todos os dados do banco, uploads e áudios diretamente na máquina hospedeira em `./data/`.

---

## 5. Matriz Comparativa: SINA_IA vs. Outras Plataformas

A tabela a seguir posiciona o SINA_IA frente a soluções de IA de mercado (como o Google NotebookLM e assistentes genéricos) e ambientes virtuais de aprendizagem tradicionais (Moodle, Canvas):

| Critério de Comparação | IA Genérica / Assistentes Convencionais | Google NotebookLM | SINA_IA (Nossa Plataforma) |
|---|---|---|---|
| **Acessibilidade para Leitores de Tela** | Parcial ou inexistente. Fórmulas são lidas como caracteres desconexos (`backslash f-r-a-c`). | Boa interface, mas fórmulas e gráficos não possuem tratamento fonético nativo em português. | **Excelente (WCAG 2.2 AAA):** Fórmulas convertidas para português fonético por extenso; KaTeX com MathML; audiodescrição para gráficos. |
| **Adaptação para Dislexia** | Depende de prompts manuais do usuário em cada interação. | Não adaptativo por padrão. Textos densos de tamanho padrão. | **Nativo por Perfil:** Aplicação automática de Linguagem Simples (*Plain Language*), sentenças curtas e glossário de termos difíceis. |
| **Adaptação para TDAH** | Gera textos longos e corridos com facilidade de dispersão. | Gera resumos estruturados, mas sem controle estrito de *chunking*. | **Nativo por Perfil:** Micro-learning em blocos de até 3 linhas, eliminação de sobrecarga e timer de exercícios sem limite. |
| **Tratamento de Matemática / Exatas** | Alucina sintaxe com frequência e gera equações sem padrão sonoro. | Foca majoritariamente em humanidades e negócios; suporte limitado a equações em áudio. | **Especializado em Engenharia:** SymPy isolado, validação sintática e fonética dedicada para Cálculo, Física e Lógica. |
| **Privacidade e LGPD** | Geralmente utiliza dados do usuário para re-treino de modelos em nuvem. | Conforme com termos corporativos da Google Cloud. | **LGPD por Design:** Coleta apenas preferências sem diagnósticos clínicos; opção de exclusão total; persistência local de banco em arquivo (`.db`). |
| **Arquitetura e Testabilidade** | Código acoplado a chamadas diretas de LLM. | Plataforma SaaS proprietária e fechada. | **Código Aberto e Testável:** Fakes e Mocks locais que rodam a suíte completa de testes em segundos e com custo zero de API. |
| **Geração de Áudio / Podcasts** | Áudio em inglês ou vozes robotizadas sem contexto. | *Audio Overviews* espetaculares, mas em formato de conversa em inglês e sem controle didático por tópicos. | **Áudio Educacional Guiado:** Síntese neural pt-BR focada na pronúncia correta de termos técnicos e cálculos. |

---

## 6. Governança, Qualidade e Métricas do Repositório

O projeto adota práticas avançadas de engenharia de software e governança contínua:

* **Quality Gate Automatizado (`./check.sh`):**
  * Linting estrito no frontend com ESLint e checagem de tipos sem erros no TypeScript.
  * Linting e formatação no backend com `ruff check` e `ruff format` (padrão de aspas simples).
  * Verificação ortográfica técnica automatizada com `typos`.
  * Verificação de dependências proibidas (Pure Domain Boundary Check).
  * **32 testes unitários e de integração** executados em menos de 3 segundos com cobertura de código superior a 80%.
* **Decisões Arquiteturais Registradas (ADRs):**
  * `ADR-0001`: Adoção de arquitetura monorepo poliglota.
  * `ADR-0002`: Pivot para Acessibilidade Universal, UDL e Neurodiversidade.
* **Grafo de Roadmap e Rastreabilidade:**
  * Todas as etapas de desenvolvimento são rastreadas via **GitHub Issues** e **Pull Requests** com Conventional Commits (`feat`, `fix`, `refactor`, `test`, `docs`).
  * As 7 novas issues da **Fase UX (#12 a #18)** garantem a evolução contínua da experiência do usuário sem quebra de compatibilidade.

---

## 7. Conclusão

O **SINA_IA** se destaca não apenas como uma ferramenta educacional potencializada por IA, mas como um **ambiente assistivo rigorosamente projetado para equidade pedagógica**. Sua combinação de domínio matemático puro, aderência estrita a padrões de acessibilidade (WCAG 2.2 AAA e UDL), governança técnica moderna e infraestrutura pronta para execução local e conteinerizada o posiciona como uma solução pioneira na interseção entre Inteligência Artificial e Educação Inclusiva.

