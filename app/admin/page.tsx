import { authConfigProblem, currentAdmin, demoAccess, isDevMode } from '@/lib/server/auth';
import { getContent, storeMode } from '@/lib/server/store';
import { mailConfigured } from '@/lib/server/mail';
import AdminApp from '@/components/admin/AdminApp';
import Login from '@/components/admin/Login';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const email = await currentAdmin();
  if (!email) return <Login problem={authConfigProblem()} dev={isDevMode()} demo={demoAccess()} />;
  const content = await getContent();
  return <AdminApp initial={content} env={{ store: storeMode(), resend: mailConfigured(), user: email }} />;
}
