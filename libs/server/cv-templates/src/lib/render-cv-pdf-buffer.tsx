import type { CvPdfLayoutInput, CvTemplateCode } from 'contracts';
import { renderPdfToBuffer } from 'server-pdf';

import { CvPdfDocument } from './cv-pdf-document';

export async function renderCvPdfBuffer(
  templateCode: CvTemplateCode,
  layout: CvPdfLayoutInput,
): Promise<Buffer> {
  return renderPdfToBuffer(
    <CvPdfDocument templateCode={templateCode} layout={layout} />,
  );
}
