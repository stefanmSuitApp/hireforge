import { unitConfig } from '../../testing/src/vitest/preset';

export default unitConfig(import.meta.url, {
  coverage: ['src/lib/billing-form-document.tsx'],
});
