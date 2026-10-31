import type { ReactElement } from 'react';

import type { CvPdfLayoutInput, CvTemplateCode } from 'contracts';

import { cvTemplates } from './registry';

export function CvPdfDocument({
  templateCode,
  layout,
}: {
  templateCode: CvTemplateCode;
  layout: CvPdfLayoutInput;
}): ReactElement {
  const { Document } = cvTemplates[templateCode];
  return <Document layout={layout} />;
}
