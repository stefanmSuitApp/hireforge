import { defineCliConfig } from 'sanity/cli';

import { getSanityStudioDataset, getSanityStudioProjectId } from './env';

const projectId = getSanityStudioProjectId();
const dataset = getSanityStudioDataset();

export default defineCliConfig({
  api: {
    projectId,
    dataset,
  },
});
