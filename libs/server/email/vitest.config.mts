import { unitConfig } from '../../testing/src/vitest/preset';

export default unitConfig(import.meta.url, {
  coverage: [
    'src/lib/notification-templates.ts',
    'src/lib/send-email.ts',
    'src/lib/templates.ts',
  ],
});
