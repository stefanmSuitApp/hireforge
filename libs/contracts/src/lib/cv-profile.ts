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
export function sanitizeCvProfileForPersist(profile: CvProfile): CvProfile {
  const experiences = profile.experiences
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
      summary: e.summary?.trim()
        ? e.summary.trim().slice(0, 500)
        : undefined,
    }));

  const education = profile.education
    .filter(
      (ed) =>
        ed.institution.trim().length > 0 && ISO_DATE.test(ed.startDate.trim()),
    )
    .map((ed) => ({
      institution: ed.institution.trim(),
      degree: ed.degree?.trim()
        ? ed.degree.trim().slice(0, 120)
        : undefined,
      field: ed.field?.trim() ? ed.field.trim().slice(0, 120) : undefined,
      startDate: ed.startDate.trim(),
      endDate: cleanOptionalIso(ed.endDate ?? undefined),
    }));

  const skills = profile.skills
    .filter((s) => s.name.trim().length > 0)
    .map((s) => ({ name: s.name.trim().slice(0, 80) }));

  return { experiences, education, skills };
}

export const cvTemplateCodes = ['klasican', 'moderan', 'minimalan'] as const;
export type CvTemplateCode = (typeof cvTemplateCodes)[number];
export const cvTemplateCodeSchema = z.enum(cvTemplateCodes);

/** ISO date string YYYY-MM-DD */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

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

export const cvProfileSchema = z.object({
  experiences: z.array(cvExperienceEntrySchema).max(15).default([]),
  education: z.array(cvEducationEntrySchema).max(10).default([]),
  skills: z.array(cvSkillEntrySchema).max(40).default([]),
});

export type CvExperienceEntry = z.infer<typeof cvExperienceEntrySchema>;
export type CvEducationEntry = z.infer<typeof cvEducationEntrySchema>;
export type CvSkillEntry = z.infer<typeof cvSkillEntrySchema>;
export type CvProfile = z.infer<typeof cvProfileSchema>;

/** Payload for PDF layout (resolved scalars + structured sections). */
export type CvPdfLayoutInput = {
  fullName: string | null;
  phone: string | null;
  headline: string | null;
  /** Single line for header, e.g. city name in builder locale */
  cityLine: string | null;
  profile: CvProfile;
};

export const candidateGenerateResumeBodySchema = z.object({
  templateCode: cvTemplateCodeSchema,
});

export type CandidateGenerateResumeBody = z.infer<
  typeof candidateGenerateResumeBodySchema
>;
