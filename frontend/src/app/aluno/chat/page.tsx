import { RequireRole } from '@/components/session/RequireRole';
import { StudentWorkspace } from '@/components/workspace/StudentWorkspace';

export default function StudentChatPage() {
  return (
    <RequireRole allow={['aluno']}>
      <StudentWorkspace />
    </RequireRole>
  );
}
