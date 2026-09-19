# Diretrizes de Acessibilidade Assistiva (WCAG 2.2 AAA)

A missão primordial do **SINA_IA** é nivelar o acesso de estudantes com deficiência visual (cegueira e baixa visão) ao material didático de ciências exatas e humanas.

---

## 1. Princípios de Acessibilidade da Interface (Frontend)

1. **Navegação Exclusiva por Teclado:**
   * Todas as ações (upload, seleção de sala, leitura de texto, acionamento de áudio) devem ser operáveis via teclado (`Tab`, `Shift+Tab`, `Enter`, `Espaço`).
   * A ordem de foco visual e programático deve coincidir exatamente com a ordem lógica do documento.
   * Não pode haver bloqueio de foco (*keyboard trap*).

2. **Suporte a Leitores de Tela (NVDA e JAWS):**
   * Botões de ação e controles devem conter `aria-label` descritivo.
   * Regiões de alerta ou atualização de status (mensagens de erro, progresso de geração) devem usar atributos `aria-live="polite"` ou `aria-live="assertive"`.
   * Cabeçalhos hierárquicos (`<h1>`, `<h2>`, `<h3>`) devem ser estritamente preservados para navegação rápida por seções.

3. **Contraste Visual e Tipografia:**
   * Proporção de contraste mínima de 7:1 para texto normal e 4.5:1 para texto grande (critério WCAG AAA).
   * A interface deve responder adequadamente ao zoom de até 200% sem quebras de layout ou perda de legibilidade.

---

## 2. Princípios de Transcrição Fonética Matemática (Backend)

1. **Linguagem Natural por Extenso:** Leitores de tela não devem encontrar fórmulas em código bruto (ex: `\frac{1}{2}` ou `x^2`). O backend deve converter toda notação para linguagem natural:
   * `\frac{a}{b}` $\rightarrow$ *"fração com numerador a e denominador b"*
   * `\sqrt{x}` $\rightarrow$ *"raiz quadrada de x"*
   * `x^2` $\rightarrow$ *"x elevado a 2"*
   * `\int` $\rightarrow$ *"integral de"*
   * `\sum` $\rightarrow$ *"somatório"*

2. **Isolamento de Equações:** Toda equação convertida deve ser encapsulada em `[Equação: ...]` para permitir que o sintetizador vocal module a entonação e faça as pausas adequadas.

3. **Geração de Áudio Neural:** A síntese de voz deve utilizar vozes de alta fidelidade em português brasileiro (`pt-BR-AntonioNeural`), garantindo cadência pedagógica natural para sessões longas de estudo.
