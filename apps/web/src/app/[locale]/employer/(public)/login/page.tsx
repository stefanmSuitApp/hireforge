import { EmployerLoginScreen } from '@/features/employer';
import { AuthStateSync } from '@/components/auth-state-sync';

export default async function EmployerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  return (
    <>
      <AuthStateSync />
      <EmployerLoginScreen returnTo={returnTo ?? null} />
    </>
  );
}
