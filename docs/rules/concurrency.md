# Diretrizes de Concorrência, Idempotência e Resiliência

Este documento estabelece a governança de controle de concorrência e processamento desacoplado no **SINA_IA**.

---

## 1. O Desafio de Concorrência no SINA_IA

O sistema executa tarefas intensivas em CPU e latência externa:
1. Extração de PDFs e renderização de imagens de alta resolução.
2. OCR via visão computacional e chamadas de API ao provedor de IA (Gemini do usuário ou Groq).
3. Síntese assíncrona de arquivos MP3 via Edge-TTS.

A execução dessas etapas diretamente no ciclo síncrono da requisição HTTP bloqueia workers da API e expõe a aplicação a timeouts de gateway em momentos de alta demanda.

---

## 2. Idempotência por Desenho

Todo processamento de documento ou geração de conteúdo deve aceitar uma **chave de idempotência** (`idempotency_key` ou hash do arquivo/conteúdo):
* Se uma requisição com a mesma chave chegar repetidamente (ex: retry de rede no frontend), o sistema não reprocessa o arquivo: retorna imediatamente o resultado existente ou o status em andamento.
* Chaves únicas no banco garantem que concorrência paralela no mesmo documento seja serializada de forma determinística.

---

## 3. Padrão Transactional Outbox / Database Jobs

Antes de introduzir filas externas com RabbitMQ e Celery (que elevam o custo de infraestrutura e complexidade operacional), o SINA_IA utiliza uma tabela de tarefas transacionais no banco de dados (`processing_jobs`):

```
HTTP POST -> Grava registro em 'documents' e 'processing_jobs' (status: PENDING)
                    │ (Transação atômica única)
                    ▼
Worker Poller -> Consome 'processing_jobs' com 'FOR UPDATE SKIP LOCKED'
                 Atualiza status para 'PROCESSING'
                 Executa OCR / LLM / TTS
                 Atualiza status para 'COMPLETED' com resultado ou 'FAILED'
```

### Propriedades Essenciais:
* **Garantia At-Least-Once:** Nenhuma tarefa é perdida caso um worker caia durante a síntese de áudio.
* **Consumo Concorrente Seguro:** Múltiplos workers paralelos utilizam `SKIP LOCKED` (no PostgreSQL) ou transação atômica serializada (no SQLite) para evitar que a mesma tarefa seja executada duas vezes.
* **Controle de Tentativas (`attempts`):** Tarefas com falhas transitórias de API externa (ex: rate limit temporário) sofrem retentativa exponencial controlada.

