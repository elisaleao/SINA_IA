import { Metadata } from 'next';
import Link from 'next/link';
import { appRoutes, environmentDetailRoute } from '@/lib/routes';
import { EmptyState } from '@/components/ui';

interface MateriaPageProps {
  params: Promise<{ slug: string }>;
}

const MATERIAS_MAP: Record<string, { nome: string; descricao: string }> = {
  calculo: {
    nome: 'Cálculo Diferencial e Integral',
    descricao:
      'Estudo de funções, limites, derivadas, integrais e aplicações com equações descritas e transcrição fonética.',
  },
  fisica: {
    nome: 'Física Geral e Mecânica',
    descricao:
      'Cinemática, leis de Newton, trabalho e energia com gráficos adaptados e audiodescrição de esquemas.',
  },
  algoritmos: {
    nome: 'Algoritmos e Lógica de Programação',
    descricao:
      'Estruturas de controle, pseudocódigo, funções e decomposição lógica em passos curtos.',
  },
  'estruturas-de-dados': {
    nome: 'Estruturas de Dados',
    descricao:
      'Listas, pilhas, filas, árvores e tabelas hash explicadas por analogias práticas e mapas conceituais.',
  },
};

export async function generateMetadata({
  params,
}: MateriaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const materia = MATERIAS_MAP[slug];
  const title = materia ? `${materia.nome} | SINA_IA` : 'Disciplina | SINA_IA';
  return {
    title,
    description: materia?.descricao || 'Estudos dedicados por disciplina.',
  };
}

export default async function MateriaDetailPage({ params }: MateriaPageProps) {
  const { slug } = await params;
  const materia = MATERIAS_MAP[slug] || {
    nome: slug.replace(/-/g, ' ').toUpperCase(),
    descricao: 'Ambientes e materiais de estudo organizados para esta matéria.',
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-8 lg:px-8">
      <nav aria-label="Navegação estrutural (Breadcrumb)">
        <Link
          href={appRoutes.dashboard}
          className="text-sm font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          ← Voltar ao Painel
        </Link>
      </nav>

      <header className="border-b border-stone-200 pb-6">
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight sm:text-4xl">
          {materia.nome}
        </h1>
        <p className="mt-2 text-base text-stone-600 max-w-3xl">
          {materia.descricao}
        </p>
      </header>

      <section aria-labelledby="ambientes-materia-title">
        <div className="flex items-center justify-between mb-4">
          <h2 id="ambientes-materia-title" className="text-xl font-bold text-stone-900">
            Ambientes de Estudo
          </h2>
          <Link
            href={environmentDetailRoute(`${slug}-modulo-1`)}
            className="min-h-[44px] inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
          >
            Abrir Ambiente Padrão
          </Link>
        </div>

        <EmptyState
          icon="📚"
          title="Nenhum material adicional enviado"
          description="Você pode processar documentos desta disciplina ou iniciar um quiz formativo."
          actionText="Processar documento"
          onAction={undefined}
        />
      </section>
    </div>
  );
}

