# Plataforma de Acessbilidade Backend

Backend assíncrono em Python projetado para atuar como uma plataforma de estudos inteligente e adaptativa, inspirada no NotebookLM, com **foco prioritário em acessibilidade para estudantes com deficiência visual (baixa visão e cegueira total)**.

O sistema resolve um dos maiores gargalos de tecnologia assistiva na área de ciências exatas: a **ingestão e verbalização semântica de equações matemáticas (LaTeX/MathML)**, geração de *alt-text* para gráficos e diagramas, e conversão fluida de materiais acadêmicos em áudio neural com calibração pedagógica para professores.

---

## 📌 Sumário
1. [Visão Geral da Arquitetura](#-visão-geral-da-arquitetura)
2. [Principais Desafios de Acessibilidade Endereçados](#-principais-desafios-de-acessibilidade-endereçados)
3. [Stack Tecnológica e Decisões Técnicas](#-stack-tecnológica-e-decisões-técnicas)
4. [Estrutura de Pastas e Arquivos](#-estrutura-de-pastas-e-arquivos)
5. [Detalhamento dos Módulos e Funcionamento](#-detalhamento-dos-módulos-e-funcionamento)
6. [Fluxo de Execução dos Endpoints](#-fluxo-de-execução-dos-endpoints)
7. [Guia de Instalação e Execução](#-guia-de-instalação-e-execução)
8. [Exemplo de Uso via cURL / API](#-exemplo-de-uso-via-curl--api)

---

## 🏗 Visão Geral da Arquitetura

O sistema opera em um fluxo desacoplado de ingestão multimodal, estruturação semântica, geração de conteúdo instrucional e síntese de voz:

---

## 🎯 Principais Desafios de Acessibilidade Endereçados

1. **Documentos sem Tags de Acessibilidade (PDFs "inacessíveis"):**
   * Leitores de tela como NVDA e JAWS falham ao navegar em PDFs mal estruturados ou escaneados. O backend processa o arquivo bruto e reconstrói o conteúdo em **Markdown semântico padronizado** com hierarquia estrita de cabeçalhos (`#`, `##`, `###`).
2. **Leitura Fonética de Matemática e Notações Científicas:**
   * Sintetizadores de voz convencionais soletram caracteres especiais de fórmulas (`\frac{a}{b}` é lido literalmente como *"barra invertida frac abre chaves..."*). O módulo `MathToSpeechService` traduz símbolos e operadores para português fonético natural (*"fração com numerador a e denominador b"*).
3. **Imagens, Gráficos e Diagramas Técnicos:**
   * Imagens e esquemas visuais passam por visão computacional multimodal (`Gemini Vision`), que gera transcrições e descrições textuais longas (*Alt-text técnico*).
4. **Mediação Pedagógica (Professor $\leftrightarrow$ Aluno):**
   * O professor pode parametrizar a IA para responder no nível cognitivo do aluno (básico, intermediário, avançado), definir a granularidade das contas (direto vs. passo a passo) e dosar o tom instrucional.

---

## 🛠 Stack Tecnológica e Decisões Técnicas

| Tecnologia | Finalidade | Justificativa |
| :--- | :--- | :--- |
| **Python 3.11** | Core da Aplicação | Suporte moderno a tipagem, assincronismo e ampla compatibilidade com libs de IA e OCR. |
| **FastAPI** | Framework Web Assíncrono | Alta performance (`asyncio`), validação nativa via Pydantic e geração automática de OpenAPI/Swagger. |
| **Poetry** | Gerenciador de Pacotes e Ambiente | Resolução determinística de dependências via `poetry.lock` e builds reproduzíveis. |
| **Google Gemini 1.5 Flash** | OCR Multimodal e LLM Pedagógica | Baixa latência, ampla janela de contexto e alta precisão na extração de equações LaTeX e geração didática. |
| **PyMuPDF (`fitz`)** | Parsing de PDFs | Extração ultrarrápida de texto e renderização de páginas escaneadas em imagens de alta resolução (150 DPI). |
| **python-docx** | Parsing de arquivos Word | Preserva a estrutura semântica dos estilos (`Heading 1`, `Heading 2`, tabelas). |
| **OpenCV + Pillow** | Pré-processamento Visual | Normalização em escala de cinza e redução de ruído antes do envio para modelos de OCR. |
| **Edge-TTS** | Síntese de Voz (TTS) | Geração de áudio neural de alta qualidade em português brasileiro (`pt-BR-AntonioNeural`) de forma gratuita e rápida. |
| **SQLAlchemy (Async) + aiosqlite** | Persistência Relacional | Armazenamento assíncrono dos documentos, metadados e versões acessíveis sem bloqueio de I/O. |
| **Docker & Docker Compose** | Conteinerização | Empacota dependências de sistema (`ffmpeg`, `libgl1`, `libglib2.0-0`) garantindo execução idêntica em qualquer ambiente. |

---

## 📂 Estrutura de Pastas e Arquivos

```text
app/
├── app/
│   ├── __init__.py
│   ├── main.py                     # Entrypoint da API, rotas HTTP e ciclo de vida
│   ├── config.py                   # Variáveis de ambiente e caminhos de I/O
│   ├── models.py                   # Schemas Pydantic (Request / Response / Enums)
│   ├── database.py                 # Engine assíncrono SQLAlchemy e modelo DocumentRecord
│   └── services/
│       ├── __init__.py
│       ├── ingestion_service.py    # Pipeline de ingestão (PDF, DOCX, Imagens, OCR)
│       ├── math_speech_service.py  # Conversor semântico de LaTeX para fala em PT-BR
│       ├── llm_service.py          # Integração Gemini com calibração pedagógica
│       └── audio_service.py        # Síntese de fala assíncrona (Edge-TTS -> MP3)
├── uploads/                        # Armazenamento temporário de arquivos recebidos
├── outputs/                        # Armazenamento de arquivos de áudio (.mp3) gerados
├── tests/                          # Testes automatizados com pytest e httpx
├── Dockerfile                      # Multi-stage build para produção
├── docker-compose.yml              # Orquestração do container e volumes
├── pyproject.toml                  # Manifesto de dependências e configuração do Poetry
├── poetry.lock                     # Lockfile com versões exatas dos pacotes
└── .env.example                    # Modelo de variáveis de ambiente