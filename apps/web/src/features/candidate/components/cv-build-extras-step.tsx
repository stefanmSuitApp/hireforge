'use client';

import {
  cvDrivingLicenceCategories,
  cvLanguageLevels,
  type CvDrivingLicenceCategory,
  type CvLanguageLevel,
  type CvProfile,
} from 'contracts';
import { useTranslations } from 'next-intl';

import { Button, Card, Input, Label } from '@/components/ui';
import { cn } from '@/lib/utils';

type Extras = Pick<
  CvProfile,
  | 'languages'
  | 'drivingLicences'
  | 'certificates'
  | 'digitalSkills'
  | 'availability'
>;

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm';

/** CV builder step: languages, driving licence, certificates, start date. */
export function CvBuildExtrasStep({
  value,
  onChange,
}: {
  value: Extras;
  onChange: (patch: Partial<Extras>) => void;
}) {
  const t = useTranslations('Candidate.cvBuild');
  const { languages, drivingLicences, certificates } = value;

  function toggleLicence(category: CvDrivingLicenceCategory) {
    onChange({
      drivingLicences: drivingLicences.includes(category)
        ? drivingLicences.filter((c) => c !== category)
        : [...drivingLicences, category],
    });
  }

  return (
    <section className="space-y-6">
      <h3 className="text-base font-medium">{t('stepExtras')}</h3>

      <div className="space-y-3">
        <h4 className="text-sm font-medium">{t('languagesTitle')}</h4>
        {languages.map((lang, i) => (
          <Card
            key={i}
            className="grid gap-3 border-border/70 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <div className="space-y-2">
              <Label htmlFor={`cv-lang-name-${i}`}>{t('languageName')}</Label>
              <Input
                id={`cv-lang-name-${i}`}
                value={lang.name}
                maxLength={60}
                onChange={(e) =>
                  onChange({
                    languages: languages.map((l, j) =>
                      j === i ? { ...l, name: e.target.value } : l,
                    ),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`cv-lang-level-${i}`}>{t('languageLevel')}</Label>
              <select
                id={`cv-lang-level-${i}`}
                className={SELECT_CLASS}
                value={lang.level}
                onChange={(e) =>
                  onChange({
                    languages: languages.map((l, j) =>
                      j === i
                        ? { ...l, level: e.target.value as CvLanguageLevel }
                        : l,
                    ),
                  })
                }
              >
                {cvLanguageLevels.map((level) => (
                  <option key={level} value={level}>
                    {t(`languageLevels.${level}`)}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                onChange({ languages: languages.filter((_, j) => j !== i) })
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
          disabled={languages.length >= 8}
          onClick={() =>
            onChange({
              languages: [
                ...languages,
                { name: '', level: languages.length ? 'B1' : 'native' },
              ],
            })
          }
        >
          {t('addLanguage')}
        </Button>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium" id="cv-licences-title">
          {t('drivingLicencesTitle')}
        </h4>
        <p className="text-sm text-muted-foreground">
          {t('drivingLicencesHint')}
        </p>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-labelledby="cv-licences-title"
        >
          {cvDrivingLicenceCategories.map((category) => {
            const held = drivingLicences.includes(category);
            return (
              <button
                key={category}
                type="button"
                aria-pressed={held}
                onClick={() => toggleLicence(category)}
                className={cn(
                  'min-h-10 min-w-12 rounded-md border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  held
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background hover:bg-muted',
                )}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium">{t('certificatesTitle')}</h4>
        {certificates.map((cert, i) => (
          <Card key={i} className="space-y-3 border-border/70 p-4">
            <div className="grid gap-3 sm:grid-cols-[2fr_2fr_1fr]">
              <div className="space-y-2">
                <Label htmlFor={`cv-cert-name-${i}`}>
                  {t('certificateName')}
                </Label>
                <Input
                  id={`cv-cert-name-${i}`}
                  value={cert.name}
                  maxLength={120}
                  onChange={(e) =>
                    onChange({
                      certificates: certificates.map((c, j) =>
                        j === i ? { ...c, name: e.target.value } : c,
                      ),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`cv-cert-issuer-${i}`}>
                  {t('certificateIssuer')}
                </Label>
                <Input
                  id={`cv-cert-issuer-${i}`}
                  value={cert.issuer ?? ''}
                  maxLength={120}
                  onChange={(e) =>
                    onChange({
                      certificates: certificates.map((c, j) =>
                        j === i ? { ...c, issuer: e.target.value } : c,
                      ),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`cv-cert-year-${i}`}>
                  {t('certificateYear')}
                </Label>
                <Input
                  id={`cv-cert-year-${i}`}
                  inputMode="numeric"
                  value={cert.year ?? ''}
                  onChange={(e) => {
                    const digits = e.target.value
                      .replace(/\D/g, '')
                      .slice(0, 4);
                    onChange({
                      certificates: certificates.map((c, j) =>
                        j === i
                          ? { ...c, year: digits ? Number(digits) : undefined }
                          : c,
                      ),
                    });
                  }}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                onChange({
                  certificates: certificates.filter((_, j) => j !== i),
                })
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
          disabled={certificates.length >= 15}
          onClick={() =>
            onChange({ certificates: [...certificates, { name: '' }] })
          }
        >
          {t('addCertificate')}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cv-digital-skills">{t('digitalSkills')}</Label>
          <Input
            id="cv-digital-skills"
            value={value.digitalSkills ?? ''}
            maxLength={200}
            placeholder={t('digitalSkillsPlaceholder')}
            onChange={(e) => onChange({ digitalSkills: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cv-availability">{t('availability')}</Label>
          <Input
            id="cv-availability"
            value={value.availability ?? ''}
            maxLength={120}
            placeholder={t('availabilityPlaceholder')}
            onChange={(e) => onChange({ availability: e.target.value })}
          />
        </div>
      </div>
    </section>
  );
}
