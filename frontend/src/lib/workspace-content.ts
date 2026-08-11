export type SidebarItem = {
  title: string;
  description: string;
  badge?: string;
};

export type SidebarSection = {
  title: string;
  items: SidebarItem[];
};

export const studentSections: SidebarSection[] = [
  {
    title: "Quadro de horarios",
    items: [
      {
        title: "Gerenciar agenda",
        description:
          "Organize aulas, estudos e compromissos pessoais em um mesmo quadro.",
        badge: "Editavel",
      },
      {
        title: "Prioridades da semana",
        description:
          "Ajuste horarios conforme provas, tarefas e outras obrigacoes.",
      },
    ],
  },
  {
    title: "Salas em que voce participa",
    items: [
      {
        title: "Sala de Matematica",
        description: "Conteudos, atividades e comunicados da turma regular.",
      },
      {
        title: "Laboratorio de Leitura",
        description: "Espaco complementar para leitura guiada e apoio.",
      },
      {
        title: "Projeto Interdisciplinar",
        description: "Sala compartilhada para atividades em grupo.",
      },
    ],
  },
];

export const teacherSections: SidebarSection[] = [
  {
    title: "Salas que voce gerencia",
    items: [
      {
        title: "1A - Linguagens",
        description: "Acompanhe recados, interacoes e demandas da turma.",
        badge: "32 alunos",
      },
      {
        title: "Clube de Redacao",
        description: "Espaco para orientacao e pratica semanal de escrita.",
      },
      {
        title: "Sala de Apoio",
        description: "Turma dedicada a reforco e acompanhamento individual.",
      },
    ],
  },
];

export const sharedChatHighlights = [
  "Este chat sera a base da IA educacional nas proximas fases.",
  "A estrutura atual ja separa contexto de aluno e professor.",
  "As conversas futuras poderao considerar horarios, salas e objetivos de aprendizagem.",
];
