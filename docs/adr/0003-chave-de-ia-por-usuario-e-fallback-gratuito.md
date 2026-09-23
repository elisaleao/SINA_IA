# ADR 0003: Chave de IA por usuário, com fallback gratuito no Groq, em vez de cliente único compartilhado

* **Status:** Aceito
* **Data:** 2026-09-23
* **Autor:** Nicholas / SINA_IA Core Team

---

## 1. Contexto do Problema

Desde a Fase 1, todo processamento com IA (texto, OCR, análise de gráfico, adaptação de
acessibilidade) passa por uma única instância de `GeminiService`, criada uma vez na subida do
processo (`_default_gemini` em `app/api/deps.py`) e compartilhada por todas as requisições e todos os
usuários. A chave do Gemini é uma só, configurada pelo administrador do servidor.

Isso concentra dois riscos no mesmo ponto: o custo de todo o uso da plataforma cai sobre a cota de
uma única conta, e qualquer problema com essa chave (expiração, limite de cota, revogação) derruba o
processamento para todo mundo ao mesmo tempo. Um usuário que quer usar a própria cota do Gemini, ou
testar a plataforma sem depender da chave do servidor, não tem como.

A pergunta central: o cliente de IA continua sendo um recurso único do processo, ou passa a ser
resolvido por requisição, considerando quem está pedindo?

---

## 2. Alternativas Consideradas

* **Alternativa A: Manter a chave única do servidor, sem opção de chave pessoal**
  * *Desvantagens:* nenhum usuário consegue usar a própria cota; uma falha na chave do servidor
    derruba todo o sistema; não atende ao pedido de testar a plataforma sem depender do administrador.

* **Alternativa B: Permitir chave pessoal, mas sem fallback (sem chave = sem processar)**
  * *Desvantagens:* transforma a chave pessoal numa trava disfarçada - quem não configura fica
    bloqueado. Contradiz o objetivo de tornar a plataforma mais acessível a testar, não menos.

* **Alternativa C: Cliente de IA resolvido por requisição - chave pessoal do Gemini quando existe e é
  válida, com fallback automático para um segundo provedor gratuito (Groq) quando não há chave ou ela
  falha com 401/403/429**
  * *Vantagens:* cada usuário pode usar a própria cota; o sistema nunca fica bloqueado por falta ou
    falha de uma chave; o fallback é automático e transparente, sem exigir nada de quem não quer
    configurar nada.

---

## 3. Decisão Tomada

Adotar a **Alternativa C**.

1. `AccessibilityAIProtocol` formaliza, em `app/core/protocols.py`, a superfície que `GeminiService`
   já expõe hoje (`generate_text`, `ocr_image`, `analyze_chart`, `audit`, `correct`).
2. `GroqService`, novo em `app/services/groq_service.py`, implementa o mesmo protocolo sobre a API
   compatível com OpenAI do Groq - gratuita, sem cartão, só com limite de taxa.
3. `FallbackAIClient` (`app/services/ai_provider.py`) compõe um cliente pessoal opcional com o Groq
   compartilhado, decidindo por chamada se usa o pessoal ou cai para o gratuito.
4. A chave pessoal do usuário fica cifrada no backend (`app/services/crypto.py`,
   `Fernet`), nunca em texto puro fora do momento em que é recebida para validação.
5. `_default_gemini`, a instância única e compartilhada, deixa de ser o único caminho: rotas que
   antes recebiam essa instância fixa passam a receber o cliente resolvido por `get_ai_client`, que
   considera o usuário autenticado (ou anônimo, quando a rota já permite) a cada requisição.

Isso substitui a regra hoje escrita no `AGENTS.md` ("um único módulo por integração... não crie outro
cliente"), que valia enquanto só havia um provedor de IA no sistema. A partir desta decisão, o
`AGENTS.md` deve ser atualizado para refletir dois provedores de IA sob um protocolo comum, em vez de
um cliente único.

---

## 4. Consequências Arquiteturais

### Positivas:

* Nenhum usuário fica bloqueado por falta de chave: o Groq garante que o sistema sempre responde.
* Quem quer usar a própria cota do Gemini pode, sem depender do administrador do servidor.
* O protocolo formalizado (`AccessibilityAIProtocol`) deixa qualquer provedor futuro plugável no
  mesmo ponto, sem reescrever quem consome (pipeline de acessibilidade, geração de conteúdo).
* `FakeAccessibilityAI`, já usado nos testes, bate por estrutura com o protocolo novo - nenhum teste
  existente precisa mudar por causa disto.

### Negativas / Trade-offs:

* O sistema passa a depender de dois provedores externos de IA em vez de um, com dois conjuntos de
  limites, formatos de erro e comportamento a manter.
* A resolução por requisição substitui uma instância única e barata de manter por uma decisão
  tomada a cada chamada, com mais pontos de falha possíveis (decifrar a chave, testar antes de usar,
  decidir se cai para o fallback).
* Guardar uma credencial de terceiro por usuário, mesmo cifrada, é uma responsabilidade de segurança
  que a plataforma não tinha antes: uma falha na cifragem ou no controle de acesso expõe uma chave que
  pertence à conta pessoal do usuário no Google, não ao SINA_IA.
* O `AGENTS.md` precisa de atualização explícita para não contradizer o código: a regra de "um único
  módulo por integração" deixa de valer para a camada de IA.

**Gatilho de reavaliação:** se um terceiro provedor de IA precisar entrar no sistema, ou se o Groq
mudar os termos do tier gratuito de um jeito que quebre o fallback, revisitar esta decisão antes de
adicionar mais um provedor sob o mesmo padrão.
