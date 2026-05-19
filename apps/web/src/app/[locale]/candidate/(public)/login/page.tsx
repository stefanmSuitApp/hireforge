import { CandidateLoginScreen } from '@/features/candidate';
import { AuthStateSync } from '@/components/auth-state-sync';

export default async function CandidateLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  return (
    <>
      <AuthStateSync />
      <CandidateLoginScreen returnTo={returnTo ?? null} />
    </>
  );
}
