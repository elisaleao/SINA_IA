export type Role = 'aluno' | 'professor';

export const HOME_TITLE = 'SINA_IA — Plataforma Educacional Inclusiva e Adaptativa';

export const ROUTES: { path: string; title: string; role?: Role }[] = [
  { path: '/', title: HOME_TITLE },
  { path: '/entrar', title: 'Entrar | SINA_IA' },
  { path: '/cadastro', title: 'Criar conta | SINA_IA' },
  { path: '/boas-vindas', title: 'Boas-vindas | SINA_IA' },
  { path: '/inicio', title: 'Meu painel de estudos | SINA_IA' },
  { path: '/quiz', title: 'Hub de testes rápidos | SINA_IA' },
  { path: '/exercicios', title: 'Quiz de verdadeiro ou falso | SINA_IA' },
  { path: '/conhecer-mais', title: 'Conhecer mais | SINA_IA' },
  { path: '/materias/calculo', title: 'Cálculo Diferencial e Integral | SINA_IA' },
  { path: '/ambientes/exemplo', title: 'Ambiente de estudo | SINA_IA' },
  {
    path: '/configuracoes/acessibilidade',
    title: 'Preferências de acessibilidade | SINA_IA',
  },
  { path: '/processar', title: 'Meus materiais | SINA_IA', role: 'aluno' },
  { path: '/configuracoes/perfil', title: 'Perfil | SINA_IA', role: 'aluno' },
  { path: '/configuracoes/chave-ia', title: 'Chave de IA | SINA_IA', role: 'aluno' },
  { path: '/aluno', title: 'Área do aluno | SINA_IA', role: 'aluno' },
  { path: '/aluno/chat', title: 'Conversa do aluno | SINA_IA', role: 'aluno' },
  { path: '/professor', title: 'Área do professor | SINA_IA', role: 'professor' },
  {
    path: '/professor/chat',
    title: 'Conversa do professor | SINA_IA',
    role: 'professor',
  },
];
