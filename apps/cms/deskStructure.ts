import type { StructureResolver } from 'sanity/structure';

import { LEGAL_PAGE_KINDS } from './schemaTypes/documents/legalPage';
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
      S.listItem()
        .title('Legal pages')
        .id('legal-pages')
        .child(
          S.list()
            .title('Legal pages')
            .items(
              LEGAL_PAGE_KINDS.map(({ title, value }) =>
                S.listItem()
                  .title(title)
                  .id(`legal-${value}`)
                  .child(
                    S.document()
                      .schemaType('legalPage')
                      .documentId(`legal-${value}`)
                      .title(title),
                  ),
              ),
            ),
        ),
      S.divider(),
      ...S.documentTypeListItems().filter((item) => {
        const id = item.getId();
        return typeof id === 'string' && !singletonTypes.has(id);
      }),
    ]);
