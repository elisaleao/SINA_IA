import Link from "next/link";

import { appRoutes } from "@/lib/routes";

const actions = [
  {
    href: appRoutes.student,
    title: "Sou aluno",
    description: "Acesse o cadastro inicial com seus dados pessoais e, se necessario, o codigo da sala.",
    tone: "bg-[#1f5f5b] text-white hover:bg-[#184946]",
  },
  {
    href: appRoutes.learnMore,
    title: "Quero conhecer mais",
    description: "Veja uma explicacao breve sobre a proposta da plataforma e seus objetivos.",
    tone: "bg-[#f2e5cf] text-stone-900 hover:bg-[#ead7b6]",
  },
  {
    href: appRoutes.teacher,
    title: "Sou professor",
    description: "Cadastre-se e visualize a opcao inicial para criar uma sala.",
    tone: "bg-[#b05a2b] text-white hover:bg-[#96481d]",
  },
];

export function RoleNavigation() {
  return (
    <section aria-label="Acessos principais" className="mt-auto grid gap-4 lg:grid-cols-3">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={`flex min-h-40 flex-col justify-between rounded-[1.75rem] px-6 py-6 transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1f5f5b] ${action.tone}`}
        >
          <span className="text-2xl font-semibold tracking-tight">{action.title}</span>
          <span className="max-w-xs text-sm leading-6 opacity-90">
            {action.description}
          </span>
        </Link>
      ))}
    </section>
  );
}
