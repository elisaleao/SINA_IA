import { RequireRole } from '@/components/session/RequireRole';
import { TeacherWorkspace } from '@/components/workspace/TeacherWorkspace';

export default function TeacherChatPage() {
  return (
    <RequireRole allow={['professor', 'admin']}>
      <TeacherWorkspace />
    </RequireRole>
  );
}
