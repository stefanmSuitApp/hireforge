import { unitConfig } from '../testing/src/vitest/preset';

export default unitConfig(import.meta.url, {
  coverage: [
    'src/lib/api-client.ts',
    'src/lib/correlation.ts',
    'src/lib/sanity.ts',
    'src/lib/structured-log.ts',
    'src/lib/transliteration.ts',
    'src/lib/bullmq/job-logging.ts',
  ],
});
