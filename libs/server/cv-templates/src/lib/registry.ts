import type { ReactElement } from 'react';

import {
  cvTemplateInfo,
  type CvPdfLayoutInput,
  type CvTemplateCode,
  type CvTemplateInfo,
} from 'contracts';

import { EvropskiDoc } from './templates/evropski';
import { KlasicanDoc } from './templates/klasican';
import { MinimalanDoc } from './templates/minimalan';
import { ModeranDoc } from './templates/moderan';
import { PrakticniDoc } from './templates/prakticni';

type CvTemplate = CvTemplateInfo & {
  Document: (props: { layout: CvPdfLayoutInput }) => ReactElement;
};

export const cvTemplates: Record<CvTemplateCode, CvTemplate> = {
  klasican: { ...cvTemplateInfo.klasican, Document: KlasicanDoc },
  moderan: { ...cvTemplateInfo.moderan, Document: ModeranDoc },
  minimalan: { ...cvTemplateInfo.minimalan, Document: MinimalanDoc },
  evropski: { ...cvTemplateInfo.evropski, Document: EvropskiDoc },
  prakticni: { ...cvTemplateInfo.prakticni, Document: PrakticniDoc },
};
