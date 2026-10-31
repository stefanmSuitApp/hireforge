import { cvAccentColors, type CvPdfLayoutInput } from 'contracts';
import { PDF_BODY_FONT, PDF_SERIF_FONT } from 'server-pdf/locale-fonts';

/** Colours and fonts every template draws with (1 pt = 1/595 of A4 width). */
export const CV_INK = '#1B1F22';
export const CV_MUTED = '#5B6468';
export const CV_RULE = '#D9DEE0';
/** The accent the candidate picked (Šljakam teal by default). */
export function accentOf(layout: CvPdfLayoutInput): string {
  return cvAccentColors[layout.profile.accent ?? 'teal'];
}

export const SANS = PDF_BODY_FONT;
export const SERIF = PDF_SERIF_FONT;

/**
 * Letter spacing above ~0.08 of the font size makes PDF text readers (and CV
 * scanners) split a heading into single letters: "K O N T A K T".
 */
export type PdfStyle = Record<string, string | number>;

/** A soft tint of `hex` on white, for boxes and chips. */
export function tint(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c * amount + 255 * (1 - amount));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
