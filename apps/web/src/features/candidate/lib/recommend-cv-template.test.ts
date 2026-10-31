import { describe, expect, it } from 'vitest';

import { recommendCvTemplate } from './recommend-cv-template';

const none = { drivingLicences: [], certificates: [], links: [] };

describe('recommendCvTemplate', () => {
  it('suggests Klasičan by default', () => {
    expect(recommendCvTemplate(none)).toBe('klasican');
  });

  it('suggests Praktičan for a driving licence or certificates', () => {
    expect(recommendCvTemplate({ ...none, drivingLicences: ['C'] })).toBe(
      'prakticni',
    );
    expect(
      recommendCvTemplate({ ...none, certificates: [{ name: 'HACCP' }] }),
    ).toBe('prakticni');
  });

  it('keeps Klasičan when the candidate links a portfolio or LinkedIn', () => {
    expect(
      recommendCvTemplate({
        ...none,
        drivingLicences: ['B'],
        links: [{ label: 'LinkedIn', url: 'https://linkedin.com/in/x' }],
      }),
    ).toBe('klasican');
  });
});
