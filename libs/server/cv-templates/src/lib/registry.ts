import type { ReactElement } from 'react';

import type { CvPdfLayoutInput, CvTemplateCode } from 'contracts';

import { KlasicanDoc } from './templates/klasican';
import { MinimalanDoc } from './templates/minimalan';
import { ModeranDoc } from './templates/moderan';

/** What the picker tells the candidate about a template. */
export type CvTemplateInfo = {
  /** Two-column layouts can come out of a CV scanner (ATS) mixed up. */
  columns: 1 | 2;
  atsSafe: boolean;
  supportsPhoto: boolean;
};

type CvTemplate = CvTemplateInfo & {
  Document: (props: { layout: CvPdfLayoutInput }) => ReactElement;
};

export const cvTemplates: Record<CvTemplateCode, CvTemplate> = {
  klasican: {
    columns: 1,
    atsSafe: true,
    supportsPhoto: false,
    Document: KlasicanDoc,
  },
  moderan: {
    columns: 2,
    atsSafe: false,
    supportsPhoto: false,
    Document: ModeranDoc,
  },
  minimalan: {
    columns: 1,
    atsSafe: true,
    supportsPhoto: false,
    Document: MinimalanDoc,
  },
};
