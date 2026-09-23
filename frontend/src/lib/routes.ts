export const appRoutes = {
  home: '/',
  dashboard: '/inicio',
  onboarding: '/boas-vindas',
  login: '/entrar',
  signup: '/cadastro',
  subjects: '/materias',
  environments: '/ambientes',
  quizHub: '/quiz',
  accessibilitySettings: '/configuracoes/acessibilidade',
  aiKeySettings: '/configuracoes/chave-ia',
  learnMore: '/conhecer-mais',
  exercises: '/exercicios',
  processDocument: '/processar',
  student: '/aluno',
  studentChat: '/aluno/chat',
  teacher: '/professor',
  teacherChat: '/professor/chat',
} as const;

/** Rota dinâmica para detalhe de uma matéria */
export function subjectDetailRoute(slug: string): string {
  return `/materias/${slug}`;
}

/** Rota dinâmica para detalhe de um ambiente */
export function environmentDetailRoute(id: string): string {
  return `/ambientes/${id}`;
}
