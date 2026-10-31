// CV templates PR 2 (docs/plans/CV_TEMPLATES.md): the profile carries what
// the five templates print beyond jobs, school and skills.
import { describe, expect, it } from 'vitest';

import {
  cvProfileSchema,
  sanitizeCvProfileForPersist,
  type CvProfileInput,
} from './cv-profile';

const FULL: CvProfileInput = {
  experiences: [],
  education: [],
  skills: [],
  summary: '  Vozač sa sedam godina iskustva.  ',
  languages: [
    { name: ' Engleski ', level: 'B1' },
    { name: '', level: 'A2' },
  ],
  drivingLicences: ['C', 'B', 'C'],
  certificates: [
    { name: ' Rukovalac viljuškarom ', issuer: '', year: 2019 },
    { name: '   ' },
  ],
  links: [
    { label: 'LinkedIn', url: 'https://linkedin.com/in/primer' },
    { label: '', url: '' },
  ],
  digitalSkills: ' MS Excel, tahograf ',
  availability: ' Odmah ',
  showEmail: false,
};

describe('CV profile', () => {
  it('an old profile (jobs, school, skills only) still parses, with empty extras', () => {
    const profile = cvProfileSchema.parse({
      experiences: [],
      education: [],
      skills: [{ name: 'Excel' }],
    });
    expect(profile).toMatchObject({
      skills: [{ name: 'Excel' }],
      languages: [],
      drivingLicences: [],
      certificates: [],
      links: [],
      showEmail: true,
    });
    expect(profile.summary).toBeUndefined();
  });

  it('keeps the new fields when saving, trimmed, without empty rows or duplicates', () => {
    // The builder and the API sanitise first, then validate.
    const saved = cvProfileSchema.parse(sanitizeCvProfileForPersist(FULL));
    expect(saved).toMatchObject({
      summary: 'Vozač sa sedam godina iskustva.',
      languages: [{ name: 'Engleski', level: 'B1' }],
      drivingLicences: ['B', 'C'],
      certificates: [{ name: 'Rukovalac viljuškarom', year: 2019 }],
      links: [{ label: 'LinkedIn', url: 'https://linkedin.com/in/primer' }],
      digitalSkills: 'MS Excel, tahograf',
      availability: 'Odmah',
      showEmail: false,
    });
    expect(saved.certificates[0]?.issuer).toBeUndefined();
  });

  it('refuses what a CV cannot hold', () => {
    const VALID = {
      summary: 'Vozač.',
      languages: [{ name: 'Engleski', level: 'B1' }],
      drivingLicences: ['B'],
      certificates: [{ name: 'Prva pomoć', year: 2022 }],
      links: [{ label: 'LinkedIn', url: 'https://linkedin.com/in/primer' }],
    };
    const ok = (patch: Record<string, unknown>) =>
      cvProfileSchema.safeParse({ ...VALID, ...patch }).success;
    expect(ok({})).toBe(true);
    expect(ok({ drivingLicences: ['Z'] })).toBe(false);
    expect(ok({ languages: [{ name: 'Engleski', level: 'B3' }] })).toBe(false);
    expect(ok({ links: [{ label: 'x', url: 'javascript:alert(1)' }] })).toBe(
      false,
    );
    expect(ok({ links: [{ label: 'x', url: 'http://plain.example' }] })).toBe(
      false,
    );
    expect(
      ok({ certificates: [{ name: 'X', year: new Date().getFullYear() + 1 }] }),
    ).toBe(false);
    expect(ok({ summary: 'a'.repeat(601) })).toBe(false);
    expect(
      ok({
        languages: Array.from({ length: 9 }, (_, i) => ({
          name: `L${i}`,
          level: 'A1',
        })),
      }),
    ).toBe(false);
  });
});
