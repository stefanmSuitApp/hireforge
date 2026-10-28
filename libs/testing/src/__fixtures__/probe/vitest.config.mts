// A one-test integration project, run twice at once by
// containers/parallel-runs.int.test.ts to prove runs never share containers.
import { integrationConfig } from '../../vitest/preset';

export default integrationConfig(import.meta.url, {
  include: ['probe.check.ts'],
});
