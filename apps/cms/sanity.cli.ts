import { defineCliConfig } from 'sanity/cli';

import { getSanityStudioDataset, getSanityStudioProjectId } from './env';

const projectId = getSanityStudioProjectId();
const dataset = getSanityStudioDataset();

export default defineCliConfig({
  api: {
    projectId,
    dataset,
  },
  // `sanity deploy` publishes the Studio to https://sljakam.sanity.studio.
  studioHost: 'sljakam',
  deployment: { appId: 'b9j2qhf9fcleokmktl0m1i2v' },
});
