import { integrationConfig } from '../../libs/testing/src/vitest/preset';

export default integrationConfig(import.meta.url, { nest: true });
