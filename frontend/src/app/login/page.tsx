import { redirect } from 'next/navigation';
import { appRoutes } from '@/lib/routes';

export default function LoginPage() {
  redirect(appRoutes.login);
}
