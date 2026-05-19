import { CandidateRegisterScreen } from '@/features/candidate';
import { AuthStateSync } from '@/components/auth-state-sync';

export default function CandidateRegisterPage() {
  return (
    <>
      <AuthStateSync />
      <CandidateRegisterScreen />
    </>
  );
}
