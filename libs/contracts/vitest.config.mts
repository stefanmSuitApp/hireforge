import { unitConfig } from '../testing/src/vitest/preset';

export default unitConfig(import.meta.url, {
  coverage: [
    'src/lib/billing.ts',
    'src/lib/cv-profile.ts',
    'src/lib/packages.ts',
    'src/lib/promo-checkout-math.ts',
    'src/lib/promo-codes.ts',
    'src/lib/prose-plain.ts',
    'src/lib/public-jobs.ts',
    'src/lib/subscriptions.ts',
  ],
});
