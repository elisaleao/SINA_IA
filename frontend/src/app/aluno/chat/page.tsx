import { RequireRole } from '@/components/session/RequireRole';
import { StudentWorkspace } from '@/components/workspace/StudentWorkspace';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Conversa do aluno' };

export default function StudentChatPage() {
  return (
    <RequireRole allow={['aluno']}>
      <StudentWorkspace />
    </RequireRole>
  );
}
