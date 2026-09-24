import { RequireRole } from '@/components/session/RequireRole';
import { TeacherWorkspace } from '@/components/workspace/TeacherWorkspace';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Conversa do professor' };

export default function TeacherChatPage() {
  return (
    <RequireRole allow={['professor', 'admin']}>
      <h1 className="sr-only">Conversa do professor</h1>
      <TeacherWorkspace />
    </RequireRole>
  );
}
