import { visionTool } from '@sanity/vision';
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';

import { deskStructure } from './deskStructure';
import { getSanityStudioDataset, getSanityStudioProjectId } from './env';
import { schemaTypes } from './schemaTypes';
import { singletonActions, singletonTypes } from './singletons';

const projectId = getSanityStudioProjectId();
const dataset = getSanityStudioDataset();

export default defineConfig({
  name: 'hireforge',
  title: 'Šljakam CMS',
  projectId,
  dataset,
  plugins: [structureTool({ structure: deskStructure }), visionTool()],
  schema: {
    types: schemaTypes,
    templates: (templates) =>
      templates.filter(({ schemaType }) => !singletonTypes.has(schemaType)),
  },
  document: {
    actions: (prev, context) =>
      singletonTypes.has(context.schemaType)
        ? prev.filter((action) => {
            const actionName =
              typeof action === 'function'
                ? ''
                : ((action as { action?: string }).action ?? '');
            return singletonActions.has(actionName);
          })
        : prev,
  },
});
