import type { CvLocale } from 'contracts';

/** The CV's own words, in the language the candidate built it in. */
export type CvLabels = {
  experience: string;
  education: string;
  skills: string;
  present: string;
};

export const CV_LABELS: Record<CvLocale, CvLabels> = {
  sr: {
    experience: 'Radno iskustvo',
    education: 'Obrazovanje',
    skills: 'Veštine',
    present: 'danas',
  },
  en: {
    experience: 'Experience',
    education: 'Education',
    skills: 'Skills',
    present: 'present',
  },
};

const MONTHS: Record<CvLocale, readonly string[]> = {
  sr: [
    'jan',
    'feb',
    'mar',
    'apr',
    'maj',
    'jun',
    'jul',
    'avg',
    'sep',
    'okt',
    'nov',
    'dec',
  ],
  en: [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ],
};

/** `2019-03-01` → `mar 2019.` (sr) or `Mar 2019` (en). */
export function formatCvDate(iso: string, locale: CvLocale): string {
  const [year, month] = iso.split('-');
  const name = MONTHS[locale][Number(month) - 1];
  if (!year || !name) return iso;
  return locale === 'sr' ? `${name} ${year}.` : `${name} ${year}`;
}

export function formatCvRange(
  start: string,
  end: string | null | undefined,
  locale: CvLocale,
): string {
  const until = end ? formatCvDate(end, locale) : CV_LABELS[locale].present;
  return `${formatCvDate(start, locale)} — ${until}`;
}
