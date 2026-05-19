import { EmployerRegisterScreen } from '@/features/employer';
import { AuthStateSync } from '@/components/auth-state-sync';

export default function EmployerRegisterPage() {
  return (
    <>
      <AuthStateSync />
      <EmployerRegisterScreen />
    </>
  );
}
