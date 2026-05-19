import { renderToBuffer } from '@react-pdf/renderer';

import type { CvPdfLayoutInput, CvTemplateCode } from 'contracts';

import { CvPdfDocument } from './cv-pdf-document';

export async function renderCvPdfBuffer(
  templateCode: CvTemplateCode,
  layout: CvPdfLayoutInput,
): Promise<Buffer> {
  return renderToBuffer(
    <CvPdfDocument templateCode={templateCode} layout={layout} />,
  );
}
