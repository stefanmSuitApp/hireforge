import { AuthStateSync } from '@/components/auth-state-sync';
import { ModeratorLoginScreen } from '@/features/moderator';

export default function ModeratorLoginPage() {
  return (
    <>
      <AuthStateSync />
      <ModeratorLoginScreen />
    </>
  );
}
