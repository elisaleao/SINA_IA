# Documento de Contexto Técnico: Plataforma de Estudos Acessível (Estilo NotebookLM)

---

## 1. Visão geral do projeto
* **Nome do projeto:** Accessible NotebookLM Backend (referência utilizada no projeto e manifesto de pacotes).
* **Objetivo:** Desenvolver uma plataforma de estudos assistiva e adaptativa, com dinâmica inspirada no NotebookLM, estruturada com foco prioritário em acessibilidade para estudantes com deficiência visual (baixa visão e cegueira total) e atuando como um intermediário pedagógico entre aluno e professor.
* **Problema que resolve:** A inacessibilidade estrutural de documentos acadêmicos e técnicos para leitores de tela convencionais (NVDA/JAWS), especialmente arquivos sem tags de acessibilidade (PDFs escaneados ou mal estruturados), somada à incapacidade desses leitores de verbalizarem adequadamente expressões matemáticas complexas, cálculos e elementos gráficos (diagramas, figuras). Também resolve a ausência de canais de áudio integrados e a falta de mecanismos para o professor calibrar a resposta da IA conforme a necessidade pedagógica do estudante.
* **Público ou usuários:**
  * **Alunos com deficiência visual:** Usuários finais que utilizam leitores de tela, navegação por teclado e áudio sintetizado para estudo.
  * **Professores:** Mediadores que ajustam os parâmetros pedagógicos de explicação e avaliação.
* **Contexto de utilização:** Plataforma educacional onde o aluno faz upload de múltiplos arquivos didáticos, seleciona fontes para gerar resumos, questionários e guias, interagindo com o conteúdo por meio de áudio e texto acessível.
* **Motivação:** Democratizar o acesso e a permanência de estudantes com deficiência visual em cursos de ciências exatas e áreas técnicas por meio de IA multimodal, OCR semântico e conversão fonética de fórmulas.
* **Situação atual do projeto:** Backend estruturado e implementado em versão inicial funcional com FastAPI, englobando ingestão de arquivos, conversão de LaTeX para linguagem falada, integração com LLM para geração pedagógica e síntese de áudio. A evolução arquitetural para mensageria assíncrona com RabbitMQ/Celery foi planejada para mitigar gargalos de sobrecarga.

---

## 2. Objetivos
* **Objetivo principal:**
  * Construir um backend assíncrono capaz de ingerir documentos heterogêneos, extrair conteúdo estruturado com fórmulas matemáticas em LaTeX, processar materiais via LLM sob calibração do professor e converter todo o resultado em texto foneticamente acessível e áudio neural em português.
* **Objetivos secundários:**
  * Reestruturar PDFs sem tags de acessibilidade em Markdown semântico.
  * Converter notações e operadores matemáticos em português falado por extenso.
  * Permitir que o professor calibre o nível de profundidade, tom e formato dos cálculos gerados pela IA.
  * Disponibilizar arquivos de áudio em formato MP3 gerados sob demanda.
  * Suportar alto volume de requisições de arquivos pesados por meio de processamento assíncrono desacoplado.
* **Resultados esperados:**
  * Processamento confiável e estruturado de uploads multiformato.
  * Geração didática precisa de resumos, quizzes comentados e guias de estudo.
  * Entrega rápida de áudio neural de alta fidelidade para consumo assistivo.

---

## 3. Contexto da aplicação
A aplicação atua como um intermediário técnico e pedagógico. O aluno envia documentos brutos (textos, PDFs acadêmicos, arquivos Word ou imagens). O sistema realiza a triagem: se o documento contiver texto nativo, ele é estruturado em Markdown com títulos hierárquicos; se for escaneado ou imagem, passa por visão computacional e OCR inteligente para transcrever texto e converter cálculos em sintaxe LaTeX padrão.

O documento é então normalizado em duas camadas textuais: a primeira em Markdown padrão (para visualização e processamento pela IA) e a segunda em texto fonético em português, onde termos matemáticos são transcritos por extenso. Quando uma solicitação de estudo é realizada, a IA gera o material considerando as configurações pedagógicas do professor (nível de dificuldade, nível de detalhamento dos cálculos e tom). O material resultante é traduzido foneticamente e enviado para síntese de áudio neural, permitindo ao aluno estudar ouvindo ou navegando via leitor de tela sem ruídos de caracteres matemáticos.

---

## 4. Funcionalidades

* **F01 — Upload e Ingestão de Documentos Multiformato**
  * *Descrição:* Recepção de arquivos nos formatos PDF, DOCX, PNG, JPG, JPEG e TXT.
  * *Objetivo:* Centralizar múltiplos materiais de estudo enviados pelo aluno ou professor.
  * *Estado:* CONFIRMADO.

* **F02 — Extração e Reestruturação de Documentos Inacessíveis**
  * *Descrição:* Conversão de documentos sem marcação de acessibilidade em Markdown hierárquico com geração de alt-text para imagens e diagramas.
  * *Objetivo:* Permitir leitura limpa e navegação por cabeçalhos em leitores de tela como o NVDA.
  * *Estado:* CONFIRMADO.

* **F03 — Reconhecimento e Normalização de Fórmulas Matemáticas**
  * *Descrição:* Detecção e formatação de fórmulas e cálculos em notação LaTeX delimitada.
  * *Objetivo:* Padronizar a representação matemática do material.
  * *Estado:* CONFIRMADO.

* **F04 — Tradução Semântica de Matemática para Fala (LaTeX $\rightarrow$ Fala)**
  * *Descrição:* Conversão de operadores e estruturas LaTeX para sentenças descritivas em português falado.
  * *Objetivo:* Evitar que o leitor de tela ou o motor de TTS soletre símbolos matemáticos crus.
  * *Estado:* CONFIRMADO.

* **F05 — Calibração Pedagógica do Professor**
  * *Descrição:* Ajuste de parâmetros pedagógicos (nível do aluno, detalhamento de cálculos e tom da resposta) repassados ao motor de IA.
  * *Objetivo:* Adaptar a profundidade do material gerado às necessidades de cada estudante.
  * *Estado:* CONFIRMADO.

* **F06 — Geração de Conteúdo Didático Adaptativo (Resumos, Quizzes, Guias)**
  * *Descrição:* Geração automatizada de resumos estruturados, listas de questões com gabarito passo a passo e guias práticos de estudo.
  * *Objetivo:* Fornecer materiais didáticos interativos baseados nos documentos enviados.
  * *Estado:* CONFIRMADO.

* **F07 — Síntese de Voz Neural (Text-to-Speech)**
  * *Descrição:* Conversão do texto fonético gerado em arquivos de áudio MP3 utilizando vozes neurais em português brasileiro.
  * *Objetivo:* Permitir o estudo integral por meio de áudio falado natural.
  * *Estado:* CONFIRMADO.

* **F08 — Disponibilização e Streaming de Áudio**
  * *Descrição:* Rota HTTP dedicada para servir os arquivos MP3 gerados para o frontend e leitores de tela.
  * *Objetivo:* Viabilizar reprodução e download direto de mídia.
  * *Estado:* CONFIRMADO.

* **F09 — Entrada de Áudio/Voz do Aluno (Speech-to-Text)**
  * *Descrição:* Transcrição da fala do aluno para texto utilizando Whisper.
  * *Objetivo:* Permitir que o aluno faça perguntas e interaja por comandos de voz.
  * *Estado:* PROPOSTO.

* **F10 — Processamento Assíncrono com Filas de Mensageria**
  * *Descrição:* Enfileiramento de tarefas pesadas de OCR, LLM e síntese de áudio via RabbitMQ e workers Celery.
  * *Objetivo:* Evitar sobrecarga no backend e timeouts HTTP em cenários de alta concorrência.
  * *Estado:* PROPOSTO.

* **F11 — Notificação em Tempo Real (WebSockets / Polling)**
  * *Descrição:* Canal de comunicação para notificar o frontend sobre a conclusão de processamentos em background.
  * *Objetivo:* Permitir que o leitor de tela anuncie a conclusão de tarefas pesadas de forma acessível.
  * *Estado:* PROPOSTO.

---

## 5. Requisitos funcionais

* **RF01 — Recebimento de arquivos via upload multipart**
  * *Descrição:* A API deve disponibilizar endpoint para receber arquivos multipart nos formatos `.pdf`, `.docx`, `.png`, `.jpg`, `.jpeg` e `.txt`.
  * *Contexto:* Ponto de entrada de fontes de estudo.
  * *Estado:* CONFIRMADO.

* **RF02 — Triagem e roteamento de processamento por tipo de arquivo**
  * *Descrição:* O sistema deve identificar o formato do arquivo e aplicar o pipeline de extração específico (PyMuPDF para PDF nativo, python-docx para Word e OpenCV/Gemini Vision para imagens ou PDFs escaneados).
  * *Contexto:* Ingestão de arquivos.
  * *Estado:* CONFIRMADO.

* **RF03 — Extração estruturada para Markdown**
  * *Descrição:* O sistema deve extrair o conteúdo preservando títulos hierárquicos (`#`, `##`), listas e tabelas em Markdown.
  * *Contexto:* Estruturação para leitores de tela.
  * *Estado:* CONFIRMADO.

* **RF04 — Extração e delimitação de LaTeX**
  * *Descrição:* Expressões matemáticas devem ser isoladas com delimitadores `$ ... $` para inline e `$$ ... $$` para bloco.
  * *Contexto:* Padronização visual e semântica de exatas.
  * *Estado:* CONFIRMADO.

* **RF05 — Conversão fonética de expressões matemáticas**
  * *Descrição:* O sistema deve traduzir fórmulas LaTeX para sentenças em português por extenso encapsuladas na marcação `[Equação: ...]`.
  * *Contexto:* Acessibilidade auditiva e TTS.
  * *Estado:* CONFIRMADO.

* **RF06 — Persistência de documentos processados**
  * *Descrição:* O sistema deve persistir metadados, texto original extraído e texto fonético acessível no banco de dados relacional.
  * *Contexto:* Armazenamento de documentos.
  * *Estado:* CONFIRMADO.

* **RF07 — Geração de material instrucional parametrizado**
  * *Descrição:* O sistema deve gerar resumos, quizzes e guias com a LLM utilizando as preferências de `pedagogical_level`, `math_detail_level` e `tone` do professor.
  * *Contexto:* Mediação pedagógica.
  * *Estado:* CONFIRMADO.

* **RF08 — Síntese assíncrona de áudio MP3**
  * *Descrição:* O sistema deve sintetizar o texto fonético em arquivo MP3 via Edge-TTS e armazenar em pasta de saídas.
  * *Contexto:* Produção de áudio.
  * *Estado:* CONFIRMADO.

* **RF09 — Entrega de arquivos de áudio**
  * *Descrição:* O sistema deve disponibilizar endpoint GET para streaming de arquivos MP3 com `media_type="audio/mpeg"`.
  * *Contexto:* Reprodução de mídia.
  * *Estado:* CONFIRMADO.

---

## 6. Requisitos não funcionais

* **RNF01 — Processamento assíncrono não-bloqueante**
  * *Descrição:* Todas as rotas da API, transações de banco de dados e integrações externas devem ser não-bloqueantes (`async/await`).
  * *Contexto:* Performance do backend.
  * *Estado:* CONFIRMADO.

* **RNF02 — Acessibilidade em conformidade com WCAG 2.2 AAA**
  * *Descrição:* A saída textual e a estrutura semântica devem atender aos critérios de navegação e interpretação do NVDA/JAWS.
  * *Contexto:* Usabilidade assistiva.
  * *Estado:* CONFIRMADO.

* **RNF03 — Desacoplamento para escalabilidade**
  * *Descrição:* Operações pesadas (OCR, LLM, síntese de áudio) devem ser desacopladas do ciclo HTTP usando filas de mensageria.
  * *Contexto:* Escalabilidade e tolerância a falhas.
  * *Estado:* PROPOSTO.

* **RNF04 — Gerenciamento determinístico de dependências**
  * *Descrição:* O projeto deve ser gerenciado estritamente via Poetry com `pyproject.toml` e `poetry.lock`.
  * *Contexto:* Manutenibilidade e reprodutibilidade.
  * *Estado:* CONFIRMADO.

* **RNF05 — Conteinerização completa com dependências nativas**
  * *Descrição:* A aplicação deve rodar em container Docker contendo pacotes nativos para áudio e processamento gráfico (`ffmpeg`, `libgl1`, `libglib2.0-0`).
  * *Contexto:* Infraestrutura.
  * *Estado:* CONFIRMADO.

* **RNF06 — Resolução mínima para OCR de páginas escaneadas**
  * *Descrição:* Páginas de PDF escaneadas devem ser renderizadas com no mínimo 150 DPI antes do processamento de visão.
  * *Contexto:* Acurácia de OCR.
  * *Estado:* CONFIRMADO.

---

## 7. Arquitetura

### Componentes e Responsabilidades

* **Frontend (Tecnologia Assistiva / Web):** Interface acessível que coleta arquivos, recebe parâmetros do professor, exibe Markdown semântico e reproduz os áudios gerados.
* **Backend Gateway (FastAPI):** Roteamento HTTP, injeção de dependência de banco de dados, validação de esquemas (Pydantic), orquestração de serviços e entrega de arquivos de mídia.
* **Módulo de Ingestão e OCR (`IngestionService`):** Parsing de arquivos locais, pré-processamento com OpenCV, extração estruturada com PyMuPDF e python-docx, e fallback de OCR multimodal com Gemini Vision.
* **Módulo de Expressões Matemáticas (`MathToSpeechService`):** Analisador baseado em expressões regulares que traduz sintaxe LaTeX em português falado descritivo.
* **Módulo de IA Pedagógica (`LLMService`):** Montagem de prompts com configurações do professor e chamada ao modelo `gemini-1.5-flash` para geração de resumos, quizzes e guias.
* **Módulo de Áudio (`AudioService`):** Integração assíncrona com `edge-tts` para geração de arquivos MP3 com vozes neurais em português brasileiro (`pt-BR-AntonioNeural`).
* **Camada de Persistência (`database.py`):** Armazenamento relacional com SQLAlchemy assíncrono e SQLite (`aiosqlite`).
* **Camada de Mensageria e Workers (RabbitMQ + Celery) [Proposta]:** Enfileiramento de tarefas pesadas com divisão por filas dedicadas (`queue_ocr`, `queue_llm`, `queue_tts`) e controle de concorrência.

---

## 8. Tecnologias e ferramentas

| Tecnologia/Ferramenta | Finalidade | Estado | Observações |
| :--- | :--- | :--- | :--- |
| **Python 3.11** | Linguagem de programação principal | CONFIRMADO | Base do backend. |
| **FastAPI** | Framework web assíncrono | CONFIRMADO | Endpoints REST, validação e OpenAPI. |
| **Poetry** | Gerenciador de dependências e ambiente | CONFIRMADO | Lockfile determinístico (`pyproject.toml`). |
| **PyMuPDF (`fitz`)** | Extração de texto de PDF e renderização | CONFIRMADO | Extração vetorial e geração de pixmaps a 150 DPI. |
| **python-docx** | Extração de texto e estilos de Word | CONFIRMADO | Mapeamento de títulos para Markdown. |
| **OpenCV (`opencv-python-headless`)** | Pré-processamento de imagens | CONFIRMADO | Conversão em tons de cinza e limpeza para OCR. |
| **Pillow (`PIL`)** | Manipulação e salvamento de imagens | CONFIRMADO | Suporte gráfico auxiliar. |
| **Google Gemini 1.5 Flash (`google-genai`)** | OCR visual e LLM pedagógica | CONFIRMADO | Extração de LaTeX e geração de resumos/quizzes adaptados. |
| **Edge-TTS** | Síntese de voz neural (Text-to-Speech) | CONFIRMADO | Geração assíncrona de MP3 em português (`pt-BR-AntonioNeural`). |
| **SQLAlchemy (Async)** | ORM para persistência | CONFIRMADO | Operações assíncronas com banco relacional. |
| **aiosqlite** | Driver assíncrono para SQLite | CONFIRMADO | Driver não-bloqueante para SQLite. |
| **Pydantic / Pydantic-Settings** | Schemas e variáveis de ambiente | CONFIRMADO | Validação e carregamento do `.env`. |
| **Docker / Docker Compose** | Conteinerização | CONFIRMADO | Multi-stage build com pacotes de sistema. |
| **FFmpeg** | Processamento de áudio no sistema | CONFIRMADO | Dependência nativa no Docker para suporte a áudio. |
| **RabbitMQ** | Message Broker para tarefas em background | PROPOSTO | Arquitetura assíncrona para evitar sobrecarga. |
| **Celery** | Gerenciador de filas e workers | PROPOSTO | Execução paralela de OCR, LLM e TTS. |
| **Pix2Text / Marker-pdf** | Modelos locais de OCR de fórmulas | PROPOSTO | Mapeados no manifesto; substituídos pelo Gemini Vision no pipeline inicial. |
| **OpenAI Whisper** | Transcrição de fala (Speech-to-Text) | PROPOSTO | Previsto para entrada por voz do aluno. |
| **Redis** | Broker de mensagens ou cache | PROPOSTO | Alternativa de mensageria / backend do Celery. |
| **Qdrant / ChromaDB** | Bancos de dados vetoriais | PROPOSTO | Previstos para RAG com múltiplos documentos em chunks. |

---

## 9. Backend
* **Linguagem e Framework:** Python 3.11 estruturado sobre FastAPI com servidor ASGI Uvicorn.
* **Organização Modular:**
  * `app/main.py`: Configuração da aplicação, middlewares (CORS), rotas HTTP e ciclo de vida (`startup`).
  * `app/config.py`: Gestão tipada de variáveis de ambiente com `pydantic-settings` e criação automática de diretórios `uploads/` e `outputs/`.
  * `app/models.py`: Modelos Pydantic para validação de requisições, respostas e enums de tipos de geração e perfil pedagógico.
  * `app/database.py`: Configuração do engine assíncrono do SQLAlchemy, sessão assíncrona e definição da tabela `documents`.
  * `app/services/`: Camada com serviços isolados (`IngestionService`, `MathToSpeechService`, `LLMService`, `AudioService`).
* **Validações e Tratamento:** Validação automática com Pydantic, rollback de transações do banco em falhas e lançamento de `HTTPException` com mensagens descritivas.

---

## 10. Frontend
* **Tecnologia:** Não definido na conversa (aplicação cliente web/assistiva).
* **Responsabilidades:** Upload de arquivos, envio de parâmetros pedagógicos do professor, exibição do texto estruturado em Markdown e reprodução/download dos arquivos de áudio gerados.
* **Requisitos de Acessibilidade:** Navegação por teclado sem armadilhas de foco, conformidade com WCAG 2.2 AAA e marcação com WAI-ARIA live regions para leitura automática com NVDA/JAWS.

---

## 11. Banco de dados
* **Tecnologia:** SQLite com driver assíncrono `aiosqlite` via ORM SQLAlchemy.
* **Tabelas Definidas:**
  * **`documents` (`DocumentRecord`):**
    * `id` (Text, Chave Primária): Identificador único do documento (UUID string).
    * `filename` (Text, Não nulo): Nome original do arquivo enviado.
    * `raw_markdown` (Text, Não nulo): Conteúdo extraído formatado em Markdown com LaTeX.
    * `accessible_text` (Text, Não nulo): Conteúdo com fórmulas convertidas em linguagem falada em português.
    * `created_at` (DateTime): Data e hora de criação do registro.
* **Relacionamentos:** Não definidos na conversa (modelagem de entidades separadas para Aluno, Professor e Turmas planejada conceitualmente).
* **Migrações:** Criação automática de tabelas na inicialização (`on_startup`) via `init_db()`.

---

## 12. API e comunicação

### Endpoints Implementados

* **1. Upload e Ingestão de Documentos**
  * *Método:* `POST`
  * *Caminho:* `/api/documents/upload`
  * *Objetivo:* Receber arquivo multipart, executar extração/OCR, gerar texto acessível e persistir no banco.
  * *Entrada:* `file` (UploadFile multipart).
  * *Saída:* JSON com `document_id`, `filename`, `extracted_markdown`, `accessible_text` e `equations_found`.
  * *Autenticação:* Não definida na conversa.
  * *Situação:* CONFIRMADO.

* **2. Geração de Conteúdo Pedagógico e Áudio**
  * *Método:* `POST`
  * *Caminho:* `/api/content/generate`
  * *Objetivo:* Gerar resumo/quiz/guia via Gemini com base nas configurações do professor e gerar áudio MP3 opcional.
  * *Entrada:* JSON com `document_id`, `generation_type` (`summary`, `quiz`, `study_guide`), `teacher_config` (`pedagogical_level`, `math_detail_level`, `tone`), `generate_audio` (bool) e `voice` (str).
  * *Saída:* JSON com `document_id`, `generation_type`, `text_content`, `spoken_content` e `audio_url`.
  * *Autenticação:* Não definida na conversa.
  * *Situação:* CONFIRMADO.

* **3. Streaming de Áudio**
  * *Método:* `GET`
  * *Caminho:* `/api/audio/{filename}`
  * *Objetivo:* Servir o arquivo de áudio MP3 gravado.
  * *Entrada:* `filename` (parâmetro de rota).
  * *Saída:* Arquivo binário com `media_type="audio/mpeg"`.
  * *Autenticação:* Não definida na conversa.
  * *Situação:* CONFIRMADO.

### Endpoints Propostos (Arquitetura com Filas)

* **4. Consulta de Status de Tarefa (Polling)**
  * *Método:* `GET`
  * *Caminho:* `/api/tasks/{task_id}`
  * *Objetivo:* Consultar status (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`) e resultado de processamentos em background.
  * *Situação:* PROPOSTO.

* **5. Notificação via WebSockets**
  * *Protocolo:* `WS`
  * *Caminho:* `/ws/notifications/{client_id}`
  * *Objetivo:* Notificar o frontend em tempo real sobre o término do OCR e do áudio.
  * *Situação:* PROPOSTO.

---

## 13. Regras de negócio

* **RN01 — Dupla Camada para Matemática:** Todo material ingerido ou gerado contendo fórmulas deve manter uma representação visual em LaTeX (`$...$`, `$$...$$`) e uma representação fonética por extenso em português.
* **RN02 — Isolamento Textual de Equações:** No texto falado, cada equação transcrita deve ser envolvida pela tag `[Equação: ...]` para indicar contexto e pausa ao leitor de tela e TTS.
* **RN03 — Fallback para OCR Visual em PDFs:** PDFs com densidade de texto inferior a 50 caracteres por página devem ser obrigatoriamente renderizados como imagem a 150 DPI e processados via visão computacional multimodal.
* **RN04 — Calibração por Perfil do Professor:** As respostas do motor de IA devem respeitar obrigatoriamente as diretrizes pedagógicas recebidas na requisição (`pedagogical_level`, `math_detail_level`, `tone`).
* **RN05 — Limpeza de Arquivos Transitórios:** Arquivos temporários salvos durante o upload direto devem ser excluídos do disco local após a conclusão do processamento.
* **RN06 — Proibição de Binários em Mensageria:** Em arquitetura de filas (RabbitMQ), o corpo das mensagens deve conter apenas metadados e ponteiros de caminho de armazenamento, nunca o binário pesado do arquivo.

---

## 14. Autenticação e segurança
* **Autenticação:** Não definida na conversa (endpoints atuais não possuem validação por tokens JWT ou OAuth).
* **Autorização e Papéis:** Distinção conceitual entre os papéis de Aluno e Professor estabelecida, mas sem implementação de RBAC no código atual.
* **Segurança da API:** CORS configurado para aceitar todas as origens (`*`) em fase de desenvolvimento; chaves sensíveis carregadas exclusivamente via `.env`.

---

## 15. Integrações externas
* **Google Gemini API (`google-genai`):** Utilizado para OCR multimodal de imagens/documentos complexos com geração de LaTeX e como LLM (`gemini-1.5-flash`) para geração didática adaptada.
* **Edge-TTS (`edge-tts`):** Serviço de síntese de voz neural assíncrona para gerar áudios em MP3 em português brasileiro.
* **RabbitMQ:** Broker de mensageria mapeado para gerenciamento de filas de tarefas desacopladas.

---

## 16. Decisões técnicas

* **Decisão:** FastAPI como framework backend.
  * *Motivo:* Alta performance com `asyncio`, facilidade de validação com Pydantic e geração automática de documentação OpenAPI.
  * *Alternativas:* Flask, Django.
  * *Estado:* CONFIRMADO.

* **Decisão:** Poetry como gerenciador de dependências e ambiente.
  * *Motivo:* Lockfile determinístico e controle de empacotamento consistente.
  * *Alternativas:* `pip` com `requirements.txt`.
  * *Estado:* CONFIRMADO.

* **Decisão:** Conversor customizado de LaTeX para linguagem falada (`MathToSpeechService`).
  * *Motivo:* Permitir que sintetizadores de voz e leitores de tela leiam matemática por extenso em português sem soletrar comandos crus.
  * *Alternativas:* MathML puro, bibliotecas externas pesadas.
  * *Estado:* CONFIRMADO.

* **Decisão:** Gemini 1.5 Flash como motor unificado de OCR inteligente e geração de conteúdo.
  * *Motivo:* Baixo custo, rapidez, ampla janela de contexto e alta precisão para transcrever cálculos e gerar descrições de imagens.
  * *Alternativas:* Modelos locais pesados de OCR (Nougat, Surya, Marker) rodando no servidor.
  * *Estado:* CONFIRMADO.

* **Decisão:** Dockerfile multi-stage com pacotes nativos de sistema (`ffmpeg`, `libgl1`, `libglib2.0-0`).
  * *Motivo:* Garantir a execução estável de OpenCV, PyMuPDF e síntese de áudio em qualquer ambiente de implantação.
  * *Alternativas:* Execução sem isolamento em container.
  * *Estado:* CONFIRMADO.

* **Decisão:** Arquitetura desacoplada com filas (RabbitMQ + Celery).
  * *Motivo:* Evitar sobrecarga no backend, concorrência descontrolada de memória e timeouts em uploads simultâneos.
  * *Alternativas:* Processamento síncrono dentro da requisição HTTP.
  * *Estado:* PROPOSTO / EM TRANSIÇÃO.

---

## 17. Decisões alteradas ou descartadas

* **Decisão original:** Uso de `requirements.txt` com `pip`.
  * *Motivo da mudança:* Solicitação explícita do usuário para adotar o **Poetry**.
  * *Decisão atual:* Projeto integralmente configurado com `pyproject.toml` e `poetry install`.

* **Decisão original:** Processamento de OCR síncrono dentro da requisição HTTP de upload.
  * *Motivo da mudança:* Risco de gargalo e esgotamento de recursos em cenários de múltiplos uploads pesados simultâneos.
  * *Decisão atual:* Evolução para fila de mensagens com RabbitMQ e workers assíncronos.

---

## 18. Problemas encontrados
* **Sobrecarga de CPU/I/O em uploads concorrentes:** Risco de bloqueio do servidor ao processar OCR e LLM de múltiplos arquivos pesados ao mesmo tempo. *(Endereçado pelo planejamento de RabbitMQ + Celery)*.
* **Leitura distorcida de equações por tecnologias assistivas:** Leitores de tela soletravam caracteres de LaTeX de forma ininteligível. *(Resolvido pelo `MathToSpeechService`)*.
* **PDFs ilegíveis por falta de marcação textual:** Documentos escaneados não retornavam texto em leitores de tela. *(Resolvido pela renderização a 150 DPI com OCR do Gemini Vision)*.
* **Ausência de bibliotecas gráficas e de mídia no Linux:** Erros em containers minimalistas sem bibliotecas C compartilhadas. *(Resolvido no Dockerfile com pacotes de sistema necessários)*.

---

## 19. Pendências
* **P01 — Implementação de RabbitMQ e Workers Celery:** Configurar o broker no `docker-compose.yml` e desacoplar o processamento pesado em workers de background.
* **P02 — Endpoints de Status e Notificação:** Implementar rota de polling (`/api/tasks/{task_id}`) e canal WebSockets para avisos em tempo real ao frontend.
* **P03 — Módulo Speech-to-Text (STT):** Integrar o Whisper para permitir entrada de perguntas e navegação por voz pelo aluno.
* **P04 — Autenticação e Gestão de Usuários:** Criar autenticação (JWT/OAuth) e regras de controle de acesso (Aluno e Professor).
* **P05 — RAG com Banco Vetorial:** Integrar Qdrant ou ChromaDB para busca semântica em múltiplos documentos fragmentados em chunks.

---

## 20. Conflitos e inconsistências

* **Conflito 01: Processamento Síncrono no Código Atual vs. Arquitetura Assíncrona com Filas**
  * *Informação A:* O endpoint `/api/documents/upload` no código atual executa o processamento do arquivo e aguarda o resultado antes de responder.
  * *Informação B:* Foi acordado conceitualmente que uploads devem ser enfileirados no RabbitMQ, retornando status imediato com `task_id`.
  * *Contexto:* O código gerado representa a primeira iteração funcional da API, enquanto a discussão sobre RabbitMQ representa a evolução da arquitetura.
  * *Decisão necessária:* O agente ou desenvolvedor deve refatorar o endpoint de upload para despachar tarefas assíncronas no Celery/RabbitMQ e responder com status 202 Accepted.

* **Conflito 02: Modelos Locais de OCR (Marker/Pix2Text) vs. Gemini Vision API**
  * *Informação A:* A lista de dependências no `pyproject.toml` inclui pacotes locais de OCR como `pix2text`.
  * *Informação B:* A implementação do `IngestionService` utiliza chamadas remotas à API do Gemini 1.5 Flash para OCR multimodal.
  * *Contexto:* O uso de modelos locais consome recursos pesados de servidor, enquanto a API externa transfere o custo computacional.
  * *Decisão necessária:* Definir se o Gemini Vision será o motor padrão e se os pacotes locais serão mantidos como fallback offline ou removidos das dependências.

---

## 21. Fluxos da aplicação

### Fluxo 1: Ingestão de Documento (Implementação Atual)
Usuário $\rightarrow$ Frontend $\rightarrow$ `POST /api/documents/upload` $\rightarrow$ FastAPI grava arquivo temporário $\rightarrow$ `IngestionService` executa parsing/OCR (PyMuPDF / Gemini Vision) $\rightarrow$ `MathToSpeechService` gera texto falado $\rightarrow$ Registro persistido no SQLite (`DocumentRecord`) $\rightarrow$ Arquivo temporário excluído $\rightarrow$ Resposta JSON com Markdown e texto fonético $\rightarrow$ Frontend exibe confirmação acessível.

### Fluxo 2: Geração de Conteúdo Didático e Áudio
Usuário $\rightarrow$ Frontend $\rightarrow$ `POST /api/content/generate` (com ID do documento, tipo e parâmetros do professor) $\rightarrow$ FastAPI recupera texto do SQLite $\rightarrow$ `LLMService` monta prompt pedagógico e chama Gemini 1.5 Flash $\rightarrow$ `MathToSpeechService` converte fórmulas do material gerado em fala $\rightarrow$ `AudioService` gera MP3 via Edge-TTS em `outputs/` $\rightarrow$ FastAPI responde com texto estruturado, texto fonético e URL do áudio $\rightarrow$ Frontend reproduz áudio acessível.

### Fluxo 3: Ingestão com Filas (Fluxo Arquitetural Proposto)
Usuário $\rightarrow$ Frontend $\rightarrow$ `POST /api/documents/upload` $\rightarrow$ FastAPI salva arquivo em volume compartilhado e registro no banco como `PENDING` $\rightarrow$ FastAPI publica mensagem leve no RabbitMQ e responde `202 Accepted` com `task_id` $\rightarrow$ Worker Celery consome mensagem, processa OCR e geração fonética $\rightarrow$ Worker atualiza status no banco para `COMPLETED` $\rightarrow$ Frontend é notificado via WebSocket ou consulta status via polling $\rightarrow$ Leitor de tela (NVDA) anuncia término do processamento.

---

## 22. Estado atual do projeto

* **Definido:**
  * Escopo centrado em acessibilidade para estudantes com deficiência visual.
  * Estrutura do backend em Python 3.11 com FastAPI e gerenciamento via Poetry.
  * Regras de conversão de expressões LaTeX em linguagem falada em português.
  * Uso do Google Gemini 1.5 Flash para OCR multimodal e geração pedagógica.
  * Uso do Edge-TTS para síntese de áudio neural.
  * Conteinerização com Docker multi-stage build.
  * Modelo de persistência relacional com SQLAlchemy e SQLite.

* **Em desenvolvimento / Estruturado em Código:**
  * Endpoints REST síncronos de upload, geração de conteúdo e streaming de áudio.
  * Módulos de ingestão (`IngestionService`), matemática falada (`MathToSpeechService`), IA (`LLMService`) e áudio (`AudioService`).

* **Pendente:**
  * Implementação prática de RabbitMQ e Celery para processamento desacoplado.
  * Criação de endpoints de consulta de status (`/api/tasks/{task_id}`) e WebSockets.
  * Módulo de transcrição de voz do aluno (Whisper).
  * Autenticação e autorização de papéis (Aluno e Professor).
  * Interface frontend acessível.

* **Descartado:**
  * Gerenciamento de dependências via `requirements.txt` plano.
  * Processamento pesado síncrono como solução final de produção.

---

## 23. Próximos passos

1. **Configuração da Infraestrutura de Mensageria:**
   * Adicionar os serviços do RabbitMQ e Redis ao `docker-compose.yml`.
   * Adicionar o pacote `celery` às dependências no `pyproject.toml` via Poetry.
2. **Refatoração para Tarefas Assíncronas:**
   * Criar tarefas Celery para processamento de arquivos e síntese de áudio em background.
   * Ajustar o endpoint `/api/documents/upload` para retornar `202 Accepted` com `task_id`.
   * Implementar endpoint `GET /api/tasks/{task_id}` para polling de status.
3. **Expansão do Dicionário Matemático (`MathToSpeechService`):**
   * Ampliar expressões regulares para cobrir matrizes, limites complexos, integrais múltiplas e trigonometria.
4. **Implementação de Testes Automatizados:**
   * Escrever suíte de testes com `pytest` e `httpx` para validação de endpoints, parsing de LaTeX e mocks de chamadas externas de IA e áudio.

---

## 24. CONTEXTO PARA AGENTE DE PROGRAMAÇÃO

### O que é o projeto?
Backend de uma plataforma educacional acessível (estilo NotebookLM) para estudantes com deficiência visual (leitores de tela NVDA/JAWS). As funcionalidades centrais são: extração de documentos inacessíveis em Markdown estruturado, tradução semântica de fórmulas LaTeX para fala em português, geração de resumos/quizzes adaptados a parâmetros pedagógicos do professor e síntese de áudio neural.

### Qual é a arquitetura?
* **Atual:** API FastAPI modular estruturada em serviços (`ingestion_service`, `math_speech_service`, `llm_service`, `audio_service`), persistência SQLite assíncrona via SQLAlchemy e gravação de arquivos em disco local.
* **Alvo:** API FastAPI atuando como gateway leve, RabbitMQ como broker de mensageria, Celery executando tarefas pesadas de OCR/LLM/áudio em background e WebSockets/Polling notificando o frontend acessível.

### Qual é a stack?
* **Linguagem:** Python 3.11
* **Gerenciador de Pacotes:** Poetry (`pyproject.toml`)
* **Framework Web:** FastAPI
* **IA & Visão Computacional:** Google Gemini 1.5 Flash (`google-genai`)
* **Extração de Documentos:** PyMuPDF (`fitz`), `python-docx`, `OpenCV`
* **Síntese de Voz (TTS):** `edge-tts` (voz `pt-BR-AntonioNeural`)
* **Banco de Dados:** SQLite com `aiosqlite` e `SQLAlchemy`
* **Infraestrutura:** Docker e Docker Compose (com pacotes nativos `ffmpeg`, `libgl1`, `libglib2.0-0`)

### O que já está definido?
* Schemas Pydantic para validação de requisições, uploads e respostas.
* Mecanismo de conversão de LaTeX para português falado (`MathToSpeechService`).
* Triagem híbrida de documentos no `IngestionService` (texto nativo via PyMuPDF ou imagem/escaneado via Gemini Vision a 150 DPI).
* Configuração do Dockerfile multi-stage com Poetry.

### O que ainda está pendente?
* Integração de RabbitMQ + Celery para processamento assíncrono em background.
* Endpoint de consulta de tarefas (`GET /api/tasks/{task_id}`) e canal WebSockets.
* Módulo de transcrição de voz (Whisper) para entrada de áudio do aluno.
* Autenticação e gestão de usuários/papéis.

### Quais decisões não podem ser ignoradas?
* **Acessibilidade em primeiro lugar:** Todo conteúdo com fórmulas matemáticas deve conter a representação em LaTeX delimitado e a representação fonética em português encapsulada por `[Equação: ...]`.
* **Proibição de binários em filas:** Mensagens no RabbitMQ devem conter apenas ponteiros e metadados, nunca os arquivos pesados.
* **Gerenciamento exclusivo com Poetry:** Adicionar dependências sempre via `poetry add <pacote>`.

### Quais decisões antigas foram descartadas?
* Processamento síncrono bloqueante na rota de upload como design final de produção.
* Uso de `requirements.txt` simples (substituído pelo Poetry).

### Quais arquivos/documentações devem ser consultados?
* `pyproject.toml` — Dependências e versões do projeto.
* `app/services/math_speech_service.py` — Algoritmo de conversão fonética de equações.
* `app/services/ingestion_service.py` — Pipeline de extração e OCR multimodal.
* `app/models.py` — Contratos de dados e configurações pedagógicas.
* `Dockerfile` — Pacotes de sistema necessários para áudio e visão.

### Quais são os principais cuidados para não implementar algo incorretamente?
* Nunca remova a geração do texto fonético; leitores de tela dependem da descrição por extenso de termos matemáticos.
* Garanta que operações de I/O de arquivos e chamadas de rede sejam executadas de forma assíncrona (`await`).
* Ao configurar os workers Celery, certifique-se de que eles compartilhem os mesmos volumes de disco (`uploads/` e `outputs/`) que a API FastAPI.