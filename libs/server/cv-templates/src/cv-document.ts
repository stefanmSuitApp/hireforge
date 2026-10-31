/** Browser-safe entry: the document, template list and font setup (no Node `renderToBuffer`). */
export { registerLocalePdfFonts } from 'server-pdf/locale-fonts';
export { CvPdfDocument } from './lib/cv-pdf-document';
export { cvTemplates, type CvTemplateInfo } from './lib/registry';
