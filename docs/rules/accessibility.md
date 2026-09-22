# Diretrizes de Acessibilidade Universal e Neurodiversidade (WCAG 2.2 AAA & UDL)

O **SINA_IA** fundamenta-se nos princípios do **Desenho Universal para a Aprendizagem (UDL)** e na conformidade com os padrões internacionais **WCAG 2.2 AAA**, atendendo estudantes com deficiência sensorial, física e neurodivergência.

---

## 1. Perfis Atendidos e Diretrizes Técnicas

### 1.1. Deficiência Visual (Cegueira e Baixa Visão)
* **Navegação Exclusiva por Teclado:** Toda ação do sistema deve ser operável sem mouse (`Tab`, `Shift+Tab`, `Enter`, `Espaço`).
* **Semântica para Leitores de Tela (NVDA e JAWS):**
  * Elementos interativos devem ter `aria-label` descritivo.
  * Regiões dinâmicas devem utilizar `aria-live="polite"` ou `aria-live="assertive"`.
* **Tradução Fonética de Matemática:** Equações matemáticas em LaTeX (`$...$`) devem ser convertidas pelo backend para sentenças por extenso no padrão `[Equação: ...]`.
* **Contraste e Zoom:** Relação de contraste mínima de 7:1 (critério AAA) e suporte a redimensionamento de texto em até 200% sem perda de funcionalidade.

---

### 1.2. Dislexia e Dificuldades de Processamento Ortográfico
* **Princípios de Linguagem Simples (Plain Language):**
  * Estruturação sintática direta: sujeito + verbo + predicado.
  * Extensão máxima recomendada de 15 a 20 palavras por sentença.
  * Eliminação de jargões desnecessários e substituição de termos rebuscados por equivalentes cotidianos.
  * Glossário automático ao fim do material explicando termos técnicos essenciais.
* **Tipografia Adaptativa:**
  * Suporte a fontes com pesos diferenciados na base dos caracteres (ex: `Lexend`, `OpenDyslexic` ou `Atkinson Hyperlegible`).
  * Espaçamento ajustável entre letras (`letter-spacing`), palavras e linhas (`line-height` de no mínimo 1.5).
* **Apoio Bimodal (Visual + Auditivo):**
  * O estudante pode ouvir o texto neural ao mesmo tempo em que acompanha a leitura visual, reforçando a rota fonológica.

---

### 1.3. TDAH e Dificuldades de Atenção Sustentada
* **Divisão em Micro-Chunks:**
  * O conteúdo deve ser segmentado em blocos temáticos curtos de 2 a 3 linhas.
  * Uso extensivo de listas ordenadas e *bullet points* no lugar de blocos longos de texto.
* **Eliminação de Ruído Cognitivo:**
  * Textos gerados pela IA devem ser objetivos, eliminando introduções prolixas ou rodeios.
  * Destaque em **negrito** nos conceitos fundamentais e nas ideias centrais.
* **Modo Foco e Réguas de Leitura:**
  * A interface deve oferecer modo de foco sem menus visuais secundários e réguas guias para leitura linha a linha.

---

### 1.4. Apoio Cognitivo e Dificuldades de Aprendizagem
* **Analogias Concretas:**
  * Conceitos abstratos ou cálculos complexos devem ser acompanhados por metáforas do cotidiano.
* **Decomposição Passo a Passo:**
  * Resoluções de exercícios e demonstrações teóricas devem ser enumeradas de forma linear e cronológica, sem saltos lógicos implícitos.

---

## 2. Primitivas de Componentes Reutilizáveis (Fase UX1)

Todos os componentes interativos do SINA_IA em `frontend/src/components/ui/` seguem rigorosamente os critérios WCAG 2.2 AAA:

1. **Alvo de Toque e Espaçamento (Critério 2.5.5 / 2.5.8):**
   * Altura mínima de 44px (`min-h-[44px]` ou `min-h-[48px]`) em botões, abas e cartões de formulário.
2. **Contraste Visual Elevado (Critério 1.4.6):**
   * Razão de contraste mínima de 7:1 para textos normais e 4.5:1 para elementos gráficos essenciais.
3. **Indicador de Foco Visível (Critério 2.4.7 / 2.4.11):**
   * Anel de foco com espessura de 2px e deslocamento (`focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2`).
4. **Independência de Cor (Critério 1.4.1):**
   * Elementos de estado (`StatusBadge`) combinam texto explícito com ícone semântico, nunca sinalizando informação exclusivamente por cor.

### Catálogo de Componentes Base:
* **`RadioCard`**: Seleção única em formato de cartão com semântica nativa `input[type="radio"]` encapsulada.
* **`CheckboxCard`**: Seleção múltipla em formato de cartão com semântica nativa `input[type="checkbox"]`.
* **`ProgressSteps`**: Navegação sequencial de etapas com indicação acessível via `aria-current="step"`.
* **`Dropzone`**: Zona de envio acessível tanto por teclado quanto por arrastar e soltar, associada por `aria-describedby` às instruções de formato.
* **`StatusBadge`**: Tag de estado com texto e ícone (ex: Sucesso, Aviso, Erro, Informação).
* **`EmptyState`**: Mensagem padronizada com ícone ilustrativo, título, descrição e botão de ação orientador.
* **`Tabs`**: Sistema de abas em conformidade estrita com o padrão WAI-ARIA (`role="tablist"`, `role="tab"`, `role="tabpanel"` e controle por setas direcionais, Home e End).

