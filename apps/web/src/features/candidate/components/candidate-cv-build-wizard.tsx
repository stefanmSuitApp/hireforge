'use client';

import type {
  CandidateMeResponse,
  CvEducationEntry,
  CvExperienceEntry,
  CvPdfLayoutInput,
  CvProfile,
  CvSkillEntry,
  CvTemplateCode,
  PublicJobTaxonomyDistrictGroup,
  PublicJobTaxonomyItem,
} from 'contracts';
import {
  cvProfileSchema,
  cvTemplateCodes,
  sanitizeCvProfileForPersist,
} from 'contracts';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import {
  Button,
  Card,
  Combobox,
  type ComboboxGroupSection,
  type ComboboxOption,
  Input,
  IsoDatePicker,
  Label,
  Textarea,
} from '@/components/ui';
import {
  localizedTaxonomyItemLine,
  pickLocalizedBilingual,
} from '@/features/jobs/lib/bilingual-label';
import { useCandidateCvSaveAndGenerateMutation } from '@/hooks/mutations/use-candidate-cv-save-and-generate';
import type { CmsCvTemplateRow } from '@/lib/cms-content';

const PdfPreview = dynamic(
  async () => {
    const [{ PDFViewer }, { CvPdfDocument }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('server-cv-templates/document'),
    ]);
    return function PdfPreviewInner(props: {
      layout: CvPdfLayoutInput;
      code: CvTemplateCode;
    }) {
      return (
        <PDFViewer
          width="100%"
          height={520}
          showToolbar={false}
          className="rounded-md border border-border"
        >
          <CvPdfDocument templateCode={props.code} layout={props.layout} />
        </PDFViewer>
      );
    };
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[520px] items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
        Loading preview
      </div>
    ),
  },
);

function emptyExperience(): CvExperienceEntry {
  return {
    company: '',
    title: '',
    startDate: '',
    endDate: null,
    summary: '',
  };
}

function emptyEducation(): CvEducationEntry {
  return {
    institution: '',
    degree: '',
    field: '',
    startDate: '',
    endDate: null,
  };
}

function emptySkill(): CvSkillEntry {
  return { name: '' };
}

function normalizeProfileForParse(profile: CvProfile): CvProfile {
  return {
    experiences: profile.experiences.map((e) => ({
      ...e,
      endDate:
        e.endDate === '' || e.endDate === undefined ? null : e.endDate ?? null,
      summary: e.summary?.trim() || undefined,
    })),
    education: profile.education.map((ed) => ({
      ...ed,
      degree: ed.degree?.trim() || undefined,
      field: ed.field?.trim() || undefined,
      endDate:
        ed.endDate === '' || ed.endDate === undefined
          ? null
          : ed.endDate ?? null,
    })),
    skills: profile.skills.map((s) => ({ name: s.name.trim() })),
  };
}

type Props = {
  locale: string;
  initial: CandidateMeResponse['candidate'];
  cityGroups: PublicJobTaxonomyDistrictGroup[];
  flatCities: PublicJobTaxonomyItem[];
  cmsTemplates: CmsCvTemplateRow[];
};

const STEPS = 6;

const CITY_NONE = '__hf_cv_city_none__';

export function CandidateCvBuildWizard({
  locale,
  initial,
  cityGroups,
  flatCities,
  cmsTemplates,
}: Props) {
  const t = useTranslations('Candidate.cvBuild');

  const [step, setStep] = React.useState(0);
  const [fullName, setFullName] = React.useState(initial.fullName ?? '');
  const [phone, setPhone] = React.useState(initial.phone ?? '');
  const [headline, setHeadline] = React.useState(initial.headline ?? '');
  const [cityId, setCityId] = React.useState<string | null>(
    initial.cityId ?? null,
  );
  const [cvProfile, setCvProfile] = React.useState<CvProfile>(() => ({
    experiences:
      initial.cvProfile.experiences.length > 0
        ? [...initial.cvProfile.experiences]
        : [],
    education:
      initial.cvProfile.education.length > 0
        ? [...initial.cvProfile.education]
        : [],
    skills:
      initial.cvProfile.skills.length > 0
        ? [...initial.cvProfile.skills]
        : [],
  }));
  const [templateCode, setTemplateCode] = React.useState<CvTemplateCode | null>(
    null,
  );
  const [error, setError] = React.useState<string | null>(null);
  const cvSaveGenerate = useCandidateCvSaveAndGenerateMutation();

  React.useEffect(() => {
    if (step === 4 && templateCode == null) {
      setTemplateCode(cvTemplateCodes[0]);
    }
  }, [step, templateCode]);

  const effectiveCityGroups = React.useMemo((): PublicJobTaxonomyDistrictGroup[] => {
    if (cityGroups.length > 0) return cityGroups;
    return [{ district: null, cities: flatCities }];
  }, [cityGroups, flatCities]);

  const cityLine = React.useMemo(() => {
    if (!cityId) return null;
    const c = flatCities.find((x) => x.id === cityId);
    if (!c) return null;
    return localizedTaxonomyItemLine(locale, c);
  }, [cityId, flatCities, locale]);

  const cityComboboxSections = React.useMemo((): {
    leadingOptions: ComboboxOption[];
    groups: ComboboxGroupSection[];
  } => {
    const leadingOptions: ComboboxOption[] = [
      {
        value: CITY_NONE,
        label: t('cityNone'),
        keywords: [t('cityNone')],
      },
    ];
    const groups: ComboboxGroupSection[] = effectiveCityGroups.map((g) => {
      const districtKeywords = (
        g.district
          ? [g.district.slug, g.district.nameSr, g.district.nameEn ?? '']
          : [t('cityGroupOther')]
      ).filter(Boolean);
      const heading = g.district
        ? pickLocalizedBilingual(
            locale,
            g.district.nameSr,
            g.district.nameEn,
          )
        : t('cityGroupOther');
      const options: ComboboxOption[] = g.cities
        .filter((c) => c.id)
        .map((c) => ({
          value: c.id,
          label: localizedTaxonomyItemLine(locale, c),
          keywords: [
            c.slug,
            c.nameSr,
            c.nameEn ?? '',
            ...districtKeywords,
          ].filter(Boolean),
        }));
      return { heading, options };
    });
    return { leadingOptions, groups };
  }, [effectiveCityGroups, locale, t]);

  const sanitizedCvProfile = React.useMemo(
    () =>
      sanitizeCvProfileForPersist(normalizeProfileForParse(cvProfile)),
    [cvProfile],
  );

  const parsedCvProfile = React.useMemo(
    () => cvProfileSchema.safeParse(sanitizedCvProfile),
    [sanitizedCvProfile],
  );

  const layoutPreview: CvPdfLayoutInput = React.useMemo(() => {
    const profile = parsedCvProfile.success
      ? parsedCvProfile.data
      : cvProfileSchema.parse({});
    return {
      fullName: fullName.trim() || null,
      phone: phone.trim() || null,
      headline: headline.trim() || null,
      cityLine,
      profile,
    };
  }, [fullName, phone, headline, cityLine, parsedCvProfile]);

  const previewIssuesText = React.useMemo(() => {
    if (parsedCvProfile.success) return null;
    return parsedCvProfile.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join('.') || 'profile'}: ${i.message}`)
      .join(' · ');
  }, [parsedCvProfile]);

  function cmsRowFor(code: CvTemplateCode): CmsCvTemplateRow | undefined {
    return cmsTemplates.find((r) => r.code === code);
  }

  function setExperience(
    index: number,
    patch: Partial<CvExperienceEntry>,
  ) {
    setCvProfile((p) => {
      const next = [...p.experiences];
      next[index] = { ...next[index], ...patch };
      return { ...p, experiences: next };
    });
  }

  function setEducation(index: number, patch: Partial<CvEducationEntry>) {
    setCvProfile((p) => {
      const next = [...p.education];
      next[index] = { ...next[index], ...patch };
      return { ...p, education: next };
    });
  }

  function setSkill(index: number, name: string) {
    setCvProfile((p) => {
      const next = [...p.skills];
      next[index] = { name };
      return { ...p, skills: next };
    });
  }

  function runSaveAndGenerate() {
    setError(null);
    if (!templateCode) {
      const msg = t('pickTemplateError');
      toast.error(msg);
      setError(msg);
      return;
    }
    if (!parsedCvProfile.success) {
      const msg = `${t('validationError')} ${previewIssuesText ?? ''}`.trim();
      toast.error(msg);
      setError(msg);
      return;
    }
    cvSaveGenerate.mutate({
      profile: {
        fullName: fullName.trim() || null,
        phone: phone.trim() || null,
        headline: headline.trim() || null,
        cityId,
        cvProfile: parsedCvProfile.data,
      },
      templateCode,
    });
  }

  const canPreview = templateCode != null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr,minmax(300px,400px)]">
      <div className="space-y-6 rounded-xl border border-border/70 bg-background p-5">
        <div className="rounded-lg border border-border/70 bg-card px-3 py-2 text-xs text-muted-foreground">
          {t('stepIndicator', { current: step + 1, total: STEPS })}{' '}
          <span className="font-medium text-foreground">({step + 1}/{STEPS})</span>
        </div>

        {step === 0 ? (
          <section className="space-y-4">
            <h3 className="text-base font-medium">{t('stepBasics')}</h3>
            <div className="space-y-2">
              <Label htmlFor="cv-fullName">{t('fullName')}</Label>
              <Input
                id="cv-fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cv-phone">{t('phone')}</Label>
              <Input
                id="cv-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cv-headline">{t('headline')}</Label>
              <Input
                id="cv-headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cv-city">{t('city')}</Label>
              <Combobox
                id="cv-city"
                leadingOptions={cityComboboxSections.leadingOptions}
                groups={cityComboboxSections.groups}
                value={cityId ?? CITY_NONE}
                onValueChange={(v) =>
                  setCityId(v === CITY_NONE ? null : v)
                }
                placeholder={t('cityNone')}
                searchPlaceholder={t('citySearchPlaceholder')}
                emptyText={t('cityEmpty')}
                className="w-full"
              />
            </div>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="space-y-4">
            <h3 className="text-base font-medium">{t('stepExperience')}</h3>
            <p className="text-sm text-muted-foreground">{t('experienceHint')}</p>
            {cvProfile.experiences.map((ex, i) => (
              <Card key={i} className="space-y-3 border-border/70 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('employer')}</Label>
                    <Input
                      value={ex.company}
                      onChange={(e) =>
                        setExperience(i, { company: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('jobTitle')}</Label>
                    <Input
                      value={ex.title}
                      onChange={(e) =>
                        setExperience(i, { title: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`cv-ex-start-${i}`}>{t('startDate')}</Label>
                    <IsoDatePicker
                      id={`cv-ex-start-${i}`}
                      value={ex.startDate}
                      onChange={(v) =>
                        setExperience(i, { startDate: v })
                      }
                      placeholder={t('datePickPlaceholder')}
                      clearLabel={t('dateClear')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`cv-ex-end-${i}`}>{t('endDate')}</Label>
                    <IsoDatePicker
                      id={`cv-ex-end-${i}`}
                      value={ex.endDate ?? ''}
                      onChange={(v) =>
                        setExperience(i, {
                          endDate: v ? v : null,
                        })
                      }
                      placeholder={t('datePickPlaceholder')}
                      clearLabel={t('dateClear')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('summary')}</Label>
                  <Textarea
                    value={ex.summary ?? ''}
                    onChange={(e) =>
                      setExperience(i, { summary: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setCvProfile((p) => ({
                      ...p,
                      experiences: p.experiences.filter((_, j) => j !== i),
                    }))
                  }
                >
                  {t('removeRow')}
                </Button>
              </Card>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={cvProfile.experiences.length >= 15}
              onClick={() =>
                setCvProfile((p) => ({
                  ...p,
                  experiences: [...p.experiences, emptyExperience()],
                }))
              }
            >
              {t('addExperience')}
            </Button>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-4">
            <h3 className="text-base font-medium">{t('stepEducation')}</h3>
            {cvProfile.education.map((ed, i) => (
              <Card key={i} className="space-y-3 border-border/70 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>{t('institution')}</Label>
                    <Input
                      value={ed.institution}
                      onChange={(e) =>
                        setEducation(i, { institution: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('degree')}</Label>
                    <Input
                      value={ed.degree ?? ''}
                      onChange={(e) =>
                        setEducation(i, { degree: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('field')}</Label>
                    <Input
                      value={ed.field ?? ''}
                      onChange={(e) =>
                        setEducation(i, { field: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`cv-ed-start-${i}`}>{t('startDate')}</Label>
                    <IsoDatePicker
                      id={`cv-ed-start-${i}`}
                      value={ed.startDate}
                      onChange={(v) =>
                        setEducation(i, { startDate: v })
                      }
                      placeholder={t('datePickPlaceholder')}
                      clearLabel={t('dateClear')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`cv-ed-end-${i}`}>{t('endDate')}</Label>
                    <IsoDatePicker
                      id={`cv-ed-end-${i}`}
                      value={ed.endDate ?? ''}
                      onChange={(v) =>
                        setEducation(i, {
                          endDate: v ? v : null,
                        })
                      }
                      placeholder={t('datePickPlaceholder')}
                      clearLabel={t('dateClear')}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setCvProfile((p) => ({
                      ...p,
                      education: p.education.filter((_, j) => j !== i),
                    }))
                  }
                >
                  {t('removeRow')}
                </Button>
              </Card>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={cvProfile.education.length >= 10}
              onClick={() =>
                setCvProfile((p) => ({
                  ...p,
                  education: [...p.education, emptyEducation()],
                }))
              }
            >
              {t('addEducation')}
            </Button>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-4">
            <h3 className="text-base font-medium">{t('stepSkills')}</h3>
            {cvProfile.skills.map((s, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2">
                <div className="min-w-[200px] flex-1 space-y-2">
                  <Label>{t('skillName')}</Label>
                  <Input
                    value={s.name}
                    onChange={(e) => setSkill(i, e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setCvProfile((p) => ({
                      ...p,
                      skills: p.skills.filter((_, j) => j !== i),
                    }))
                  }
                >
                  {t('removeRow')}
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={cvProfile.skills.length >= 40}
              onClick={() =>
                setCvProfile((p) => ({
                  ...p,
                  skills: [...p.skills, emptySkill()],
                }))
              }
            >
              {t('addSkill')}
            </Button>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="space-y-4">
            <h3 className="text-base font-medium">{t('stepTemplate')}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {cvTemplateCodes.map((code) => {
                const cms = cmsRowFor(code);
                const active = templateCode === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setTemplateCode(code)}
                    className={`rounded-lg border p-3 text-left transition-colors ${active
                        ? 'border-primary ring-2 ring-ring'
                        : 'border-border hover:bg-muted/40'
                      }`}
                  >
                    {cms?.previewUrl ? (
                      <img
                        src={cms.previewUrl}
                        alt=""
                        className="mb-2 h-28 w-full rounded object-cover"
                      />
                    ) : (
                      <div className="mb-2 flex h-28 w-full items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                        {t('noPreview')}
                      </div>
                    )}
                    <div className="text-sm font-medium">
                      {cms?.name ?? t(`templateNames.${code}`)}
                    </div>
                    {cms?.description ? (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
                        {cms.description}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {step === 5 ? (
          <section className="space-y-4">
            <h3 className="text-base font-medium">{t('stepGenerate')}</h3>
            <p className="text-sm text-muted-foreground">{t('generateHint')}</p>
            <Button
              type="button"
              disabled={cvSaveGenerate.isPending || !templateCode}
              onClick={() => runSaveAndGenerate()}
            >
              {cvSaveGenerate.isPending ? t('generating') : t('generateCta')}
            </Button>
          </section>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            {t('back')}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={
              step >= STEPS - 1 || (step === 4 && templateCode == null)
            }
            onClick={() => setStep((s) => Math.min(STEPS - 1, s + 1))}
          >
            {t('next')}
          </Button>
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-xl border border-border/70 bg-background p-4">
          <h3 className="mb-2 text-sm font-medium">{t('previewTitle')}</h3>
          {previewIssuesText ? (
            <p className="mb-2 text-xs text-amber-700 dark:text-amber-400">
              {t('previewValidationHint')}
              <span className="mt-1 block font-mono text-[11px] text-muted-foreground">
                {previewIssuesText}
              </span>
            </p>
          ) : null}
          {canPreview && templateCode ? (
            <PdfPreview layout={layoutPreview} code={templateCode} />
          ) : (
            <p className="text-sm text-muted-foreground">{t('previewPlaceholder')}</p>
          )}
        </div>
      </aside>
    </div>
  );
}
