'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/lib/auth';
import { appRoutes } from '@/lib/routes';
import { useSession } from './SessionProvider';

function homeForRole(role: UserRole): string {
  return role === 'aluno' ? appRoutes.student : appRoutes.teacher;
}

export function RequireRole({
  allow,
  children,
}: {
  allow: UserRole[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { status, role } = useSession();

  const redirectTo =
    status === 'anonymous'
      ? appRoutes.login
      : role && !allow.includes(role)
        ? homeForRole(role)
        : null;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  if (status === 'authenticated' && !redirectTo) {
    return <>{children}</>;
  }

  return (
    <div role="status" aria-busy="true" className="p-8 text-center">
      Carregando sua sessão…
    </div>
  );
}
