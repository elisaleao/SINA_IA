import Link from 'next/link';
import { RequireRole } from '@/components/session/RequireRole';
import { PageIntro } from '@/components/layout/PageIntro';
import { appRoutes } from '@/lib/routes';

export default function TeacherPage() {
  return (
    <RequireRole allow={['professor', 'admin']}>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12 lg:px-8 lg:py-16">
        <PageIntro
          eyebrow="Acesso do professor"
          title="Sua sala de aula"
        />
        <Link
          href={appRoutes.teacherChat}
          className="min-h-[44px] inline-flex w-fit items-center rounded-full border border-blue-600 bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
        >
          Entrar na sala de aula
        </Link>
      </div>
    </RequireRole>
  );
}
