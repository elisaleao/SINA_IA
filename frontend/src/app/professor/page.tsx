import { TeacherSignupForm } from "@/components/forms/TeacherSignupForm";
import { PageIntro } from "@/components/layout/PageIntro";

export default function TeacherPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12 lg:px-8 lg:py-16">
      <PageIntro
        eyebrow="Acesso do professor"
        title="Cadastre-se e prepare sua sala"
      />
      <TeacherSignupForm />
    </main>
  );
}
