import react from '@vitejs/plugin-react';
import { unitConfig } from '../../libs/testing/src/vitest/preset';

// Component tests (*.test.tsx) opt into jsdom per file; the rest run in node.
export default unitConfig(import.meta.url, {
  extra: { plugins: [react()] },
});
