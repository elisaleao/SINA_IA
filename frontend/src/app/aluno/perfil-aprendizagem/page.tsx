import { StudentLearningProfileForm } from "@/components/forms/StudentLearningProfileForm";
import { PageIntro } from "@/components/layout/PageIntro";

export default function StudentLearningProfilePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12 lg:px-8 lg:py-16">
      <PageIntro
        eyebrow="Perfil de aprendizagem"
        title="Conte como voce aprende melhor"
        description="Antes de entrar no ambiente principal, responda estas perguntas para orientar futuras adaptacoes personalizadas com IA."
      />
      <StudentLearningProfileForm />
    </main>
  );
}