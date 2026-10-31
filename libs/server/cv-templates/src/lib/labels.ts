import type { CvLanguageLevel, CvLocale } from 'contracts';

/** The CV's own words, in the language the candidate built it in. */
export type CvLabels = {
  summary: string;
  experience: string;
  education: string;
  skills: string;
  languages: string;
  drivingLicence: string;
  certificates: string;
  digitalSkills: string;
  links: string;
  present: string;
  native: string;
  basic: string;
  intermediate: string;
  advanced: string;
};

export const CV_LABELS: Record<CvLocale, CvLabels> = {
  sr: {
    summary: 'O meni',
    experience: 'Radno iskustvo',
    education: 'Obrazovanje',
    skills: 'Veštine',
    languages: 'Jezici',
    drivingLicence: 'Vozačka dozvola',
    certificates: 'Sertifikati',
    digitalSkills: 'Digitalne veštine',
    links: 'Linkovi',
    present: 'danas',
    native: 'maternji',
    basic: 'osnovni',
    intermediate: 'srednji',
    advanced: 'napredni',
  },
  en: {
    summary: 'Profile',
    experience: 'Experience',
    education: 'Education',
    skills: 'Skills',
    languages: 'Languages',
    drivingLicence: 'Driving licence',
    certificates: 'Certificates',
    digitalSkills: 'Digital skills',
    links: 'Links',
    present: 'present',
    native: 'native',
    basic: 'basic',
    intermediate: 'intermediate',
    advanced: 'advanced',
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

/** `Engleski — B1 (srednji)`, `Srpski — maternji`. */
export function formatCvLanguage(
  name: string,
  level: CvLanguageLevel,
  locale: CvLocale,
): string {
  const labels = CV_LABELS[locale];
  if (level === 'native') return `${name} — ${labels.native}`;
  const band = level.startsWith('A')
    ? labels.basic
    : level.startsWith('B')
      ? labels.intermediate
      : labels.advanced;
  return `${name} — ${level} (${band})`;
}
