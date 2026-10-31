import { z } from 'zod';

/** ISO date `YYYY-MM-DD` (HTML `<input type="date" />` value). */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function cleanOptionalIso(value: string | null | undefined): string | null {
  if (value == null || value === '') return null;
  const v = String(value).trim();
  return ISO_DATE.test(v) ? v : null;
}

/**
 * Drops incomplete draft rows so Zod validation matches what users expect.
 * Call before `cvProfileSchema.parse` / `safeParse` on PATCH and in the CV builder.
 */
export function sanitizeCvProfileForPersist(
  profile: CvProfileInput,
): CvProfile {
  const experiences = (profile.experiences ?? [])
    .filter(
      (e) =>
        e.company.trim().length > 0 &&
        e.title.trim().length > 0 &&
        ISO_DATE.test(e.startDate.trim()),
    )
    .map((e) => ({
      company: e.company.trim(),
      title: e.title.trim(),
      startDate: e.startDate.trim(),
      endDate: cleanOptionalIso(e.endDate ?? undefined),
      summary: e.summary?.trim() ? e.summary.trim().slice(0, 500) : undefined,
    }));

  const education = (profile.education ?? [])
    .filter(
      (ed) =>
        ed.institution.trim().length > 0 && ISO_DATE.test(ed.startDate.trim()),
    )
    .map((ed) => ({
      institution: ed.institution.trim(),
      degree: ed.degree?.trim() ? ed.degree.trim().slice(0, 120) : undefined,
      field: ed.field?.trim() ? ed.field.trim().slice(0, 120) : undefined,
      startDate: ed.startDate.trim(),
      endDate: cleanOptionalIso(ed.endDate ?? undefined),
    }));

  const skills = (profile.skills ?? [])
    .filter((s) => s.name.trim().length > 0)
    .map((s) => ({ name: s.name.trim().slice(0, 80) }));

  const languages = (profile.languages ?? [])
    .filter((l) => l.name.trim().length > 0)
    .map((l) => ({ name: l.name.trim().slice(0, 60), level: l.level }));

  // Unique, in the order a licence lists them.
  const held = new Set(profile.drivingLicences ?? []);
  const drivingLicences = cvDrivingLicenceCategories.filter((c) => held.has(c));

  const certificates = (profile.certificates ?? [])
    .filter((c) => c.name.trim().length > 0)
    .map((c) => ({
      name: c.name.trim().slice(0, 120),
      issuer: optionalText(c.issuer, 120),
      year: c.year ?? undefined,
    }));

  const links = (profile.links ?? [])
    .filter((l) => l.label.trim().length > 0 && l.url.trim().length > 0)
    .map((l) => ({ label: l.label.trim().slice(0, 40), url: l.url.trim() }));

  return {
    experiences,
    education,
    skills,
    summary: optionalText(profile.summary, 600),
    languages,
    drivingLicences,
    certificates,
    links,
    digitalSkills: optionalText(profile.digitalSkills, 200),
    availability: optionalText(profile.availability, 120),
    showEmail: profile.showEmail ?? true,
    accent: profile.accent ?? 'teal',
    showPhoto: profile.showPhoto ?? false,
  };
}

function optionalText(
  value: string | null | undefined,
  max: number,
): string | undefined {
  const v = value?.trim();
  return v ? v.slice(0, max) : undefined;
}

export const cvTemplateCodes = [
  'klasican',
  'moderan',
  'minimalan',
  'evropski',
  'prakticni',
] as const;
export type CvTemplateCode = (typeof cvTemplateCodes)[number];
export const cvTemplateCodeSchema = z.enum(cvTemplateCodes);

/** What the template picker tells a candidate (the PDFs live in server-cv-templates). */
export type CvTemplateInfo = {
  /** Two-column layouts can come out of a CV scanner (ATS) mixed up. */
  columns: 1 | 2;
  atsSafe: boolean;
  supportsPhoto: boolean;
};

export const cvTemplateInfo: Record<CvTemplateCode, CvTemplateInfo> = {
  klasican: { columns: 1, atsSafe: true, supportsPhoto: false },
  moderan: { columns: 2, atsSafe: false, supportsPhoto: true },
  minimalan: { columns: 1, atsSafe: true, supportsPhoto: false },
  evropski: { columns: 1, atsSafe: true, supportsPhoto: true },
  prakticni: { columns: 1, atsSafe: true, supportsPhoto: false },
};

/** Accent colours a candidate can pick; Klasičan stays black and white. */
export const cvAccents = [
  'teal',
  'navy',
  'plum',
  'burgundy',
  'graphite',
] as const;
export type CvAccent = (typeof cvAccents)[number];

/** Dark enough for white text on them and for coloured text on white (≥ 4.5:1). */
export const cvAccentColors: Record<CvAccent, string> = {
  teal: '#0B6E65',
  navy: '#1F3A5F',
  plum: '#5B2A55',
  burgundy: '#7A1F2B',
  graphite: '#2F3437',
};

/** Language of the CV's own words (section titles, months), the builder's locale. */
export const cvLocales = ['sr', 'en'] as const;
export type CvLocale = (typeof cvLocales)[number];

/** ISO date string YYYY-MM-DD */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const cvExperienceEntrySchema = z.object({
  company: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(120),
  startDate: isoDate,
  endDate: isoDate.nullable().optional(),
  summary: z.string().trim().max(500).optional(),
});

export const cvEducationEntrySchema = z.object({
  institution: z.string().trim().min(1).max(160),
  degree: z.string().trim().max(120).optional(),
  field: z.string().trim().max(120).optional(),
  startDate: isoDate,
  endDate: isoDate.nullable().optional(),
});

export const cvSkillEntrySchema = z.object({
  name: z.string().trim().min(1).max(80),
});

/** CEFR levels; `native` is the mother tongue. */
export const cvLanguageLevels = [
  'native',
  'A1',
  'A2',
  'B1',
  'B2',
  'C1',
  'C2',
] as const;
export type CvLanguageLevel = (typeof cvLanguageLevels)[number];

export const cvLanguageEntrySchema = z.object({
  name: z.string().trim().min(1).max(60),
  level: z.enum(cvLanguageLevels),
});

/** Serbian driving licence categories, in the order a licence lists them. */
export const cvDrivingLicenceCategories = [
  'AM',
  'A1',
  'A2',
  'A',
  'B1',
  'B',
  'BE',
  'C1',
  'C1E',
  'C',
  'CE',
  'D1',
  'D1E',
  'D',
  'DE',
  'F',
  'M',
] as const;
export type CvDrivingLicenceCategory =
  (typeof cvDrivingLicenceCategories)[number];

export const cvCertificateEntrySchema = z.object({
  name: z.string().trim().min(1).max(120),
  issuer: z.string().trim().max(120).optional(),
  year: z
    .number()
    .int()
    .min(1950)
    .refine((y) => y <= new Date().getFullYear(), 'Year is in the future')
    .optional(),
});

export const cvLinkEntrySchema = z.object({
  label: z.string().trim().min(1).max(40),
  url: z.url({ protocol: /^https$/ }).max(300),
});

export const cvProfileSchema = z.object({
  experiences: z.array(cvExperienceEntrySchema).max(15).default([]),
  education: z.array(cvEducationEntrySchema).max(10).default([]),
  skills: z.array(cvSkillEntrySchema).max(40).default([]),
  /** "O meni": two or three sentences under the name. */
  summary: z.string().trim().max(600).optional(),
  languages: z.array(cvLanguageEntrySchema).max(8).default([]),
  drivingLicences: z
    .array(z.enum(cvDrivingLicenceCategories))
    .max(cvDrivingLicenceCategories.length)
    .default([]),
  certificates: z.array(cvCertificateEntrySchema).max(15).default([]),
  links: z.array(cvLinkEntrySchema).max(3).default([]),
  digitalSkills: z.string().trim().max(200).optional(),
  /** When the candidate can start, e.g. "odmah", "smene". */
  availability: z.string().trim().max(120).optional(),
  /** Print the account email on the CV. */
  showEmail: z.boolean().default(true),
  /** Colour of headings and the sidebar; remembered for the next CV. */
  accent: z.enum(cvAccents).default('teal'),
  /** Print the uploaded photo (templates that support one). Off by default. */
  showPhoto: z.boolean().default(false),
});

export type CvExperienceEntry = z.infer<typeof cvExperienceEntrySchema>;
export type CvEducationEntry = z.infer<typeof cvEducationEntrySchema>;
export type CvSkillEntry = z.infer<typeof cvSkillEntrySchema>;
export type CvProfile = z.infer<typeof cvProfileSchema>;
/** A profile before defaults: older rows and form state may lack the newer fields. */
export type CvProfileInput = z.input<typeof cvProfileSchema>;
export type CvLanguageEntry = z.infer<typeof cvLanguageEntrySchema>;
export type CvCertificateEntry = z.infer<typeof cvCertificateEntrySchema>;
export type CvLinkEntry = z.infer<typeof cvLinkEntrySchema>;

/** Payload for PDF layout (resolved scalars + structured sections). */
export type CvPdfLayoutInput = {
  locale: CvLocale;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  headline: string | null;
  /** Single line for header, e.g. city name in builder locale */
  cityLine: string | null;
  /**
   * The photo to print, when the candidate has one and `showPhoto` is on: JPEG
   * bytes on the server, a same-origin URL in the browser preview.
   */
  photo?: { data: Uint8Array; format: 'jpg' } | string | null;
  profile: CvProfile;
};

export const candidateGenerateResumeBodySchema = z.object({
  templateCode: cvTemplateCodeSchema,
  locale: z.enum(cvLocales).default('sr'),
});

export type CandidateGenerateResumeBody = z.infer<
  typeof candidateGenerateResumeBodySchema
>;
