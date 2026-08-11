import { PageIntro } from "@/components/layout/PageIntro";
import { learnMoreGoals, learnMoreText } from "@/lib/content";

export default function LearnMorePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12 lg:px-8 lg:py-16">
      <PageIntro
        eyebrow="Sobre a plataforma"
        title="Uma base simples para uma educacao mais inclusiva"
        description={learnMoreText}
      />

      <section className="grid gap-4 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.25)] sm:p-8">
        <h2 className="text-2xl font-semibold tracking-tight text-stone-900">
          Objetivos desta primeira estrutura
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {learnMoreGoals.map((goal) => (
            <article
              key={goal}
              className="rounded-[1.5rem] bg-[#fff7ec] px-5 py-5 text-sm leading-7 text-stone-700"
            >
              {goal}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
