import { CandidateRegisterScreen } from '@/features/candidate';
import { AuthStateSync } from '@/components/auth-state-sync';

export default async function CandidateRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  return (
    <>
      <AuthStateSync />
      <CandidateRegisterScreen returnTo={returnTo ?? null} />
    </>
  );
}
