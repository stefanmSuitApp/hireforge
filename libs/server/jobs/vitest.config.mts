import { unitConfig } from '../../testing/src/vitest/preset';

export default unitConfig(import.meta.url, {
  coverage: [
    'src/lib/entitlements-draft.ts',
    'src/lib/external-apply-url.ts',
    'src/lib/job-description-html.ts',
    'src/lib/job-slug.ts',
    'src/lib/job-trivial-patch.ts',
  ],
});
