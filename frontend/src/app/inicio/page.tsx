import { Metadata } from 'next';
import Link from 'next/link';
import { appRoutes, subjectDetailRoute } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Meu Painel de Estudos | SINA_IA',
  description:
    'Painel central de aprendizagem inclusiva com acesso aos ambientes de estudo, disciplinas acadêmicas e testes rápidos.',
};

const MATERIAS_DESTAQUE = [
  { slug: 'calculo', nome: 'Cálculo Diferencial e Integral', icone: '∫' },
  { slug: 'fisica', nome: 'Física Geral e Mecânica', icone: '⚡' },
  { slug: 'algoritmos', nome: 'Algoritmos e Lógica de Programação', icone: '💻' },
  { slug: 'estruturas-de-dados', nome: 'Estruturas de Dados', icone: '🌲' },
];

export default function InicioPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-8 lg:px-8">
      <header className="border-b border-stone-200 pb-6">
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight sm:text-4xl">
          Meu Painel de Estudos
        </h1>
        <p className="mt-2 text-base text-stone-600">
          Bem-vindo ao seu espaço acessível e adaptativo. Continue seus estudos ou inicie um novo módulo.
        </p>
      </header>

      {/* Seção: Ações Rápidas */}
      <section aria-labelledby="acoes-rapidas-title">
        <h2 id="acoes-rapidas-title" className="text-xl font-bold text-stone-900 mb-4">
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href={appRoutes.processDocument}
            className="flex flex-col justify-between p-6 rounded-2xl border border-stone-200 bg-white hover:border-blue-500 hover:shadow-md transition-all group"
          >
            <div>
              <span aria-hidden="true" className="text-3xl mb-3 block">📄</span>
              <h3 className="text-lg font-bold text-stone-900 group-hover:text-blue-600 transition-colors">
                Processar Material
              </h3>
              <p className="text-sm text-stone-600 mt-1">
                Envie PDFs, textos ou imagens e obtenha adaptação por áudio e simplificação de fórmulas.
              </p>
            </div>
            <span className="mt-4 text-sm font-bold text-blue-600 inline-flex items-center gap-1">
              Acessar ferramenta →
            </span>
          </Link>

          <Link
            href={appRoutes.quizHub}
            className="flex flex-col justify-between p-6 rounded-2xl border border-stone-200 bg-white hover:border-blue-500 hover:shadow-md transition-all group"
          >
            <div>
              <span aria-hidden="true" className="text-3xl mb-3 block">⏱</span>
              <h3 className="text-lg font-bold text-stone-900 group-hover:text-blue-600 transition-colors">
                Teste Rápido (Quiz)
              </h3>
              <p className="text-sm text-stone-600 mt-1">
                Resolva questões de Verdadeiro ou Falso com feedback formativo e tempo ajustável.
              </p>
            </div>
            <span className="mt-4 text-sm font-bold text-blue-600 inline-flex items-center gap-1">
              Iniciar treino →
            </span>
          </Link>

          <Link
            href={appRoutes.accessibilitySettings}
            className="flex flex-col justify-between p-6 rounded-2xl border border-stone-200 bg-white hover:border-blue-500 hover:shadow-md transition-all group"
          >
            <div>
              <span aria-hidden="true" className="text-3xl mb-3 block">⚙</span>
              <h3 className="text-lg font-bold text-stone-900 group-hover:text-blue-600 transition-colors">
                Preferências de Acessibilidade
              </h3>
              <p className="text-sm text-stone-600 mt-1">
                Ajuste tipografia, contraste, áudio automático e perfil neurodivergente.
              </p>
            </div>
            <span className="mt-4 text-sm font-bold text-blue-600 inline-flex items-center gap-1">
              Configurar →
            </span>
          </Link>
        </div>
      </section>

      {/* Seção: Matérias e Disciplinas */}
      <section aria-labelledby="materias-title">
        <div className="flex items-center justify-between mb-4">
          <h2 id="materias-title" className="text-xl font-bold text-stone-900">
            Disciplinas Acadêmicas
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MATERIAS_DESTAQUE.map((materia) => (
            <Link
              key={materia.slug}
              href={subjectDetailRoute(materia.slug)}
              className="flex items-center gap-3 p-4 rounded-xl border border-stone-200 bg-white hover:border-blue-500 hover:shadow-sm transition-all"
            >
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 font-bold text-lg"
              >
                {materia.icone}
              </span>
              <span className="font-bold text-stone-900 text-sm leading-snug">
                {materia.nome}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

