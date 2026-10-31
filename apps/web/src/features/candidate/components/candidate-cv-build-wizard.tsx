'use client';

import type {
  CandidateMeResponse,
  CvAccent,
  CvEducationEntry,
  CvExperienceEntry,
  CvLocale,
  CvPdfLayoutInput,
  CvProfile,
  CvSkillEntry,
  CvTemplateCode,
  PublicJobTaxonomyDistrictGroup,
  PublicJobTaxonomyItem,
} from 'contracts';
import {
  cvAccentColors,
  cvAccents,
  cvProfileSchema,
  cvTemplateCodes,
  cvTemplateInfo,
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
  RadioGroup,
  RadioGroupItem,
  Switch,
  Textarea,
} from '@/components/ui';
import {
  localizedTaxonomyItemLine,
  pickLocalizedBilingual,
} from '@/features/jobs/lib/bilingual-label';
import { useCandidateCvSaveAndGenerateMutation } from '@/hooks/mutations/use-candidate-cv-save-and-generate';
import type { CmsCvTemplateRow } from '@/lib/cms-content';

import { recommendCvTemplate } from '../lib/recommend-cv-template';
import { CvBuildExtrasStep } from './cv-build-extras-step';
import { cvPhotoUrl, CvPhotoField } from './cv-photo-field';

const PdfPreview = dynamic(
  async () => {
    const [{ PDFViewer }, { CvPdfDocument, registerLocalePdfFonts }] =
      await Promise.all([
        import('@react-pdf/renderer'),
        import('server-cv-templates/document'),
      ]);
    // Same Noto Sans the server uses, served from `public/fonts/pdf`.
    registerLocalePdfFonts('/fonts/pdf');
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
    loading: () => <PdfPreviewLoading />,
  },
);

function PdfPreviewLoading() {
  const t = useTranslations('Candidate.cvBuild');
  return (
    <div className="flex h-[520px] items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
      {t('previewLoading')}
    </div>
  );
}

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
    ...profile,
    experiences: profile.experiences.map((e) => ({
      ...e,
      endDate:
        e.endDate === '' || e.endDate === undefined
          ? null
          : (e.endDate ?? null),
      summary: e.summary?.trim() || undefined,
    })),
    education: profile.education.map((ed) => ({
      ...ed,
      degree: ed.degree?.trim() || undefined,
      field: ed.field?.trim() || undefined,
      endDate:
        ed.endDate === '' || ed.endDate === undefined
          ? null
          : (ed.endDate ?? null),
    })),
    skills: profile.skills.map((s) => ({ name: s.name.trim() })),
  };
}

type Props = {
  locale: string;
  /** Account email: printed on the CV under the name. */
  email: string;
  initial: CandidateMeResponse['candidate'];
  cityGroups: PublicJobTaxonomyDistrictGroup[];
  flatCities: PublicJobTaxonomyItem[];
  cmsTemplates: CmsCvTemplateRow[];
};

const STEPS = 7;

const CITY_NONE = '__hf_cv_city_none__';

export function CandidateCvBuildWizard({
  locale,
  email,
  initial,
  cityGroups,
  flatCities,
  cmsTemplates,
}: Props) {
  const t = useTranslations('Candidate.cvBuild');
  const cvLocale: CvLocale = locale === 'en' ? 'en' : 'sr';

  const [step, setStep] = React.useState(0);
  const [fullName, setFullName] = React.useState(initial.fullName ?? '');
  const [phone, setPhone] = React.useState(initial.phone ?? '');
  const [headline, setHeadline] = React.useState(initial.headline ?? '');
  const [cityId, setCityId] = React.useState<string | null>(
    initial.cityId ?? null,
  );
  const [cvProfile, setCvProfile] = React.useState<CvProfile>(() => ({
    // Defaults first: a profile saved before a field existed lacks it.
    ...cvProfileSchema.parse({}),
    ...initial.cvProfile,
    experiences:
      initial.cvProfile.experiences.length > 0
        ? [...initial.cvProfile.experiences]
        : [],
    education:
      initial.cvProfile.education.length > 0
        ? [...initial.cvProfile.education]
        : [],
    skills:
      initial.cvProfile.skills.length > 0 ? [...initial.cvProfile.skills] : [],
  }));
  const [hasPhoto, setHasPhoto] = React.useState(initial.hasPhoto ?? false);
  // Changes after each upload so the preview and <img> load the new photo.
  const [photoVersion, setPhotoVersion] = React.useState(0);
  const [templateCode, setTemplateCode] = React.useState<CvTemplateCode | null>(
    null,
  );
  const [error, setError] = React.useState<string | null>(null);
  const cvSaveGenerate = useCandidateCvSaveAndGenerateMutation();

  React.useEffect(() => {
    if (step === 5 && templateCode == null) {
      setTemplateCode(recommendCvTemplate(cvProfile));
    }
  }, [step, templateCode, cvProfile]);

  const effectiveCityGroups =
    React.useMemo((): PublicJobTaxonomyDistrictGroup[] => {
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
        ? pickLocalizedBilingual(locale, g.district.nameSr, g.district.nameEn)
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
    () => sanitizeCvProfileForPersist(normalizeProfileForParse(cvProfile)),
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
      locale: cvLocale,
      fullName: fullName.trim() || null,
      email,
      phone: phone.trim() || null,
      headline: headline.trim() || null,
      cityLine,
      profile,
      photo: hasPhoto ? cvPhotoUrl(photoVersion) : null,
    };
  }, [
    cvLocale,
    fullName,
    email,
    phone,
    headline,
    cityLine,
    parsedCvProfile,
    hasPhoto,
    photoVersion,
  ]);

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

  function setExperience(index: number, patch: Partial<CvExperienceEntry>) {
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
      locale: cvLocale,
    });
  }

  const canPreview = templateCode != null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
      <div className="space-y-6 rounded-xl border border-border/70 bg-background p-5">
        <div className="rounded-lg border border-border/70 bg-card px-3 py-2 text-xs text-muted-foreground">
          {t('stepIndicator', { current: step + 1, total: STEPS })}{' '}
          <span className="font-medium text-foreground">
            ({step + 1}/{STEPS})
          </span>
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
                onValueChange={(v) => setCityId(v === CITY_NONE ? null : v)}
                placeholder={t('cityNone')}
                searchPlaceholder={t('citySearchPlaceholder')}
                emptyText={t('cityEmpty')}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cv-about">{t('aboutLabel')}</Label>
              <Textarea
                id="cv-about"
                aria-describedby="cv-about-hint"
                value={cvProfile.summary ?? ''}
                maxLength={600}
                rows={3}
                onChange={(e) =>
                  setCvProfile((p) => ({ ...p, summary: e.target.value }))
                }
              />
              <p id="cv-about-hint" className="text-xs text-muted-foreground">
                {t('aboutHint', {
                  count: (cvProfile.summary ?? '').length,
                  max: 600,
                })}
              </p>
            </div>
            <CvPhotoField
              hasPhoto={hasPhoto}
              version={photoVersion}
              onPhotoChange={(has) => {
                setHasPhoto(has);
                setPhotoVersion((v) => v + 1);
                // A new photo is meant to be seen; a removed one can't be.
                setCvProfile((p) => ({ ...p, showPhoto: has }));
              }}
              showPhoto={cvProfile.showPhoto}
              onShowPhotoChange={(show) =>
                setCvProfile((p) => ({ ...p, showPhoto: show }))
              }
            />
            <div className="flex items-center gap-3">
              <Switch
                id="cv-show-email"
                checked={cvProfile.showEmail}
                onCheckedChange={(checked) =>
                  setCvProfile((p) => ({ ...p, showEmail: checked }))
                }
              />
              <Label htmlFor="cv-show-email">{t('showEmail', { email })}</Label>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t('linksTitle')}</h4>
              {cvProfile.links.map((link, i) => (
                <div
                  key={i}
                  className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end"
                >
                  <div className="space-y-2">
                    <Label htmlFor={`cv-link-label-${i}`}>
                      {t('linkLabel')}
                    </Label>
                    <Input
                      id={`cv-link-label-${i}`}
                      value={link.label}
                      maxLength={40}
                      onChange={(e) =>
                        setCvProfile((p) => ({
                          ...p,
                          links: p.links.map((l, j) =>
                            j === i ? { ...l, label: e.target.value } : l,
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`cv-link-url-${i}`}>{t('linkUrl')}</Label>
                    <Input
                      id={`cv-link-url-${i}`}
                      type="url"
                      value={link.url}
                      maxLength={300}
                      placeholder="https://"
                      onChange={(e) =>
                        setCvProfile((p) => ({
                          ...p,
                          links: p.links.map((l, j) =>
                            j === i ? { ...l, url: e.target.value } : l,
                          ),
                        }))
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setCvProfile((p) => ({
                        ...p,
                        links: p.links.filter((_, j) => j !== i),
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
                disabled={cvProfile.links.length >= 3}
                onClick={() =>
                  setCvProfile((p) => ({
                    ...p,
                    links: [...p.links, { label: '', url: '' }],
                  }))
                }
              >
                {t('addLink')}
              </Button>
            </div>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="space-y-4">
            <h3 className="text-base font-medium">{t('stepExperience')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('experienceHint')}
            </p>
            {cvProfile.experiences.map((ex, i) => (
              <Card key={i} className="space-y-3 border-border/70 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`cv-ex-company-${i}`}>
                      {t('employer')}
                    </Label>
                    <Input
                      id={`cv-ex-company-${i}`}
                      value={ex.company}
                      onChange={(e) =>
                        setExperience(i, { company: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`cv-ex-title-${i}`}>{t('jobTitle')}</Label>
                    <Input
                      id={`cv-ex-title-${i}`}
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
                      onChange={(v) => setExperience(i, { startDate: v })}
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
                  <Label htmlFor={`cv-ex-summary-${i}`}>{t('summary')}</Label>
                  <Textarea
                    id={`cv-ex-summary-${i}`}
                    aria-describedby="cv-ex-summary-hint"
                    value={ex.summary ?? ''}
                    onChange={(e) =>
                      setExperience(i, { summary: e.target.value })
                    }
                    rows={3}
                  />
                  <p
                    id="cv-ex-summary-hint"
                    className="text-xs text-muted-foreground"
                  >
                    {t('summaryBulletsHint')}
                  </p>
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
                    <Label htmlFor={`cv-ed-institution-${i}`}>
                      {t('institution')}
                    </Label>
                    <Input
                      id={`cv-ed-institution-${i}`}
                      value={ed.institution}
                      onChange={(e) =>
                        setEducation(i, { institution: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`cv-ed-degree-${i}`}>{t('degree')}</Label>
                    <Input
                      id={`cv-ed-degree-${i}`}
                      value={ed.degree ?? ''}
                      onChange={(e) =>
                        setEducation(i, { degree: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`cv-ed-field-${i}`}>{t('field')}</Label>
                    <Input
                      id={`cv-ed-field-${i}`}
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
                      onChange={(v) => setEducation(i, { startDate: v })}
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
                  <Label htmlFor={`cv-skill-${i}`}>{t('skillName')}</Label>
                  <Input
                    id={`cv-skill-${i}`}
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
          <CvBuildExtrasStep
            value={cvProfile}
            onChange={(patch) => setCvProfile((p) => ({ ...p, ...patch }))}
          />
        ) : null}

        {step === 5 ? (
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
                    aria-pressed={active}
                    onClick={() => setTemplateCode(code)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      active
                        ? 'border-primary ring-2 ring-ring'
                        : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    {/* Sanity's image wins; else the thumbnail `pnpm cv:previews` renders. */}
                    <img
                      src={cms?.previewUrl ?? `/cv-templates/${code}.png`}
                      alt=""
                      className="mb-2 h-36 w-full rounded border border-border/60 bg-white object-cover object-top"
                    />
                    <div className="text-sm font-medium">
                      {cms?.name ?? t(`templateNames.${code}`)}
                    </div>
                    <span
                      className={
                        cvTemplateInfo[code].atsSafe
                          ? 'mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'
                          : 'mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'
                      }
                    >
                      {cvTemplateInfo[code].atsSafe
                        ? t('badgeAtsSafe')
                        : t('badgeTwoColumns')}
                    </span>
                    {cvTemplateInfo[code].supportsPhoto ? (
                      <span className="ml-1 mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {t('badgePhoto')}
                      </span>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
                      {cms?.description ?? t(`templateHints.${code}`)}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="space-y-2">
              <h4 id="cv-accent-title" className="text-sm font-medium">
                {t('accentTitle')}
              </h4>
              <RadioGroup
                aria-labelledby="cv-accent-title"
                value={cvProfile.accent}
                disabled={templateCode === 'klasican'}
                onValueChange={(accent) =>
                  setCvProfile((p) => ({ ...p, accent: accent as CvAccent }))
                }
                className="flex flex-wrap gap-3"
              >
                {cvAccents.map((accent) => (
                  <RadioGroupItem
                    key={accent}
                    value={accent}
                    aria-label={t(`accentNames.${accent}`)}
                    title={t(`accentNames.${accent}`)}
                    className="size-9 border-2 border-background data-[state=checked]:ring-2 data-[state=checked]:ring-foreground data-[state=checked]:ring-offset-2"
                    style={{ backgroundColor: cvAccentColors[accent] }}
                  />
                ))}
              </RadioGroup>
              {templateCode === 'klasican' ? (
                <p className="text-xs text-muted-foreground">
                  {t('accentKlasicanNote')}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {step === 6 ? (
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
            disabled={step >= STEPS - 1 || (step === 5 && templateCode == null)}
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
            <p className="mb-2 text-xs text-warning">
              {t('previewValidationHint')}
              <span className="mt-1 block font-mono text-[11px] text-muted-foreground">
                {previewIssuesText}
              </span>
            </p>
          ) : null}
          {canPreview && templateCode ? (
            <PdfPreview layout={layoutPreview} code={templateCode} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('previewPlaceholder')}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
