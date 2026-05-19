import type { StructureResolver } from 'sanity/structure';

import { singletonTypes } from './singletons';

export const deskStructure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Site settings')
        .id('singleton-siteSettings')
        .child(
          S.document()
            .schemaType('siteSettings')
            .documentId('siteSettings')
            .title('Site settings'),
        ),
      S.listItem()
        .title('Main navigation')
        .id('singleton-navigation')
        .child(
          S.document()
            .schemaType('navigation')
            .documentId('navigation')
            .title('Main navigation'),
        ),
      S.listItem()
        .title('Home job discovery')
        .id('singleton-homeJobsDiscovery')
        .child(
          S.document()
            .schemaType('homeJobsDiscovery')
            .documentId('homeJobsDiscovery')
            .title('Home job discovery rails'),
        ),
      S.divider(),
      ...S.documentTypeListItems().filter((item) => {
        const id = item.getId();
        return typeof id === 'string' && !singletonTypes.has(id);
      }),
    ]);
