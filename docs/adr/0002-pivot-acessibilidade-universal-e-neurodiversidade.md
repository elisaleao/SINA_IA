# ADR 0002: Pivot para Acessibilidade Universal e Neurodiversidade

* **Status:** Aceito
* **Data:** 2026-09-20
* **Autor:** Nicholas / SINA_IA Core Team

---

## 1. Contexto do Problema

A versão inicial do **SINA_IA** foi concebida com foco quase exclusivo em acessibilidade para estudantes com deficiência visual (baixa visão e cegueira total), priorizando a tradução fonética de fórmulas matemáticas em LaTeX e a síntese de voz neural.

Entretanto, avaliações pedagógicas e feedbacks de mediação educacional demonstraram que as maiores barreiras no aprendizado de exatas e conteúdos densos também afetam profundamente:
1. **Estudantes com Dislexia:** Enfrentam sobrecarga no processamento ortográfico, parágrafos densos e construções sintáticas complexas.
2. **Estudantes com TDAH (Déficit de Atenção):** Sofrem fadiga cognitiva diante de textos prolixos, necessitando de divisão em micro-tópicos (*chunks*) com foco imediato.
3. **Estudantes com Dificuldades de Aprendizagem e Baixa Literacia:** Necessitam de simplificação léxica sem perda do rigor didático, uso de analogias concretas e glossários rápidos.

Manter o sistema restrito à deficiência visual limitava o alcance e a proposta de valor inclusiva da plataforma.

---

## 2. Alternativas Consideradas

* **Alternativa A: Manter o foco restrito a cegos e criar uma ferramenta separada para dislexia e TDAH**
  * *Desvantagens:* Duplicação de esforços de infraestrutura, custo dobrado de manutenção de APIs e separação artificial de alunos na mesma sala de aula.
* **Alternativa B: Pivotar o SINA_IA para uma Plataforma Educacional Universalmente Acessível (UDL)**
  * *Vantagens:* Uma única arquitetura atende a múltiplos perfis de neurodiversidade e sensoriais. O pipeline existente (Ingestão $\rightarrow$ IA $\rightarrow$ Domínio Puro $\rightarrow$ Áudio) é generalizado com perfis de adaptação (`AccessibilityConfig`), mantendo a estabilidade técnica já conquistada.

---

## 3. Decisão Tomada

Adotar a **Alternativa B: Expansão para Acessibilidade Universal e Neurodiversidade**.
1. O pipeline de IA agora aceita um perfil explícito de acessibilidade (`AccessibilityProfileType`), modulando prompts e formatações de saída.
2. Para **Dislexia**, incorpora princípios de **Linguagem Simples (Plain Language)**, frases curtas, glossários técnicos e tipografia amigável (Lexend/OpenDyslexic).
3. Para **TDAH**, adota **micro-learning**, blocos de leitura ultra-concisos e eliminação de distrações.
4. Para **Deficiência Visual**, mantém a conversão fonética integral de LaTeX para áudio neural e conformidade estrita com leitores de tela (NVDA/JAWS).

---

## 4. Consequências Arquiteturais

### Positivas:
* O projeto passa a atender a uma parcela substancialmente maior da comunidade acadêmica e escolar.
* A separação limpa de camadas criada na Fase 1 permite adicionar os novos perfis apenas na camada de orquestração e contratos de DTO, sem alterar as bibliotecas de baixo nível.
* Compatibilidade retroativa total: requisições existentes sem perfil explícito mantêm o comportamento assistivo visual original.

### Negativas / Trade-offs:
* A engenharia de prompts da LLM torna-se mais sofisticada e requer testes contínuos de consistência para cada perfil.
