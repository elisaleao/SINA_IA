import { StudentSignupForm } from "@/components/forms/StudentSignupForm";
import { PageIntro } from "@/components/layout/PageIntro";

export default function StudentPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12 lg:px-8 lg:py-16">
      <PageIntro
        eyebrow="Acesso do aluno"
        title="Comece seu cadastro"
      />
      <StudentSignupForm />
    </main>
  );
}
