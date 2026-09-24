import { Metadata } from 'next';
import Link from 'next/link';
import { appRoutes } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Hub de testes rápidos',
  description:
    'Testes rápidos de Verdadeiro ou Falso para fixação de conceitos com equações faladas, tempo ajustável e acessibilidade UDL.',
};

const DISCIPLINAS_QUIZ = [
  { id: 'calculo', nome: 'Cálculo Diferencial e Integral', questoes: 'Limites, derivadas e integrais' },
  { id: 'fisica', nome: 'Física Geral e Mecânica', questoes: 'Cinemática e leis de Newton' },
  { id: 'algoritmos', nome: 'Algoritmos e Lógica de Programação', questoes: 'Complexidade e lógica condicional' },
  { id: 'estruturas-de-dados', nome: 'Estruturas de Dados', questoes: 'Pilhas, filas, listas e grafos' },
];

export default function QuizHubPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-8 lg:px-8">
      <header className="border-b border-stone-200 pb-6">
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight sm:text-4xl">
          Hub de Testes Rápidos (Quiz)
        </h1>
        <p className="mt-2 text-base text-stone-600">
          Escolha uma disciplina para iniciar uma rodada de exercícios objetivos com foco em acessibilidade e retenção de conceitos.
        </p>
      </header>

      <section aria-labelledby="selecao-quiz-title">
        <h2 id="selecao-quiz-title" className="text-xl font-bold text-stone-900 mb-6">
          Escolha a Disciplina
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {DISCIPLINAS_QUIZ.map((d) => (
            <div
              key={d.id}
              className="flex flex-col justify-between p-6 rounded-2xl border border-stone-200 bg-white hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div>
                <span aria-hidden="true" className="text-2xl mb-2 block">⏱</span>
                <h3 className="text-lg font-bold text-stone-900">{d.nome}</h3>
                <p className="text-sm text-stone-600 mt-1">{d.questoes}</p>
              </div>

              <div className="mt-6 flex items-center justify-between pt-4 border-t border-stone-100">
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Verdadeiro ou Falso
                </span>
                <Link
                  href={appRoutes.exercises}
                  className="min-h-[44px] inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
                >
                  Iniciar Rodada →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

