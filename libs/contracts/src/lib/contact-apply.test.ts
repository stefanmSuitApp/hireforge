import { describe, expect, it } from 'vitest';

import { employerJobDraftBodySchema } from './employer-jobs';
import {
  contactChannelsFor,
  formatSerbianPhone,
  isSerbianMobile,
  normalizeSerbianPhone,
} from './contact-apply';

describe('normalizeSerbianPhone', () => {
  it('reads the ways people write Serbian numbers', () => {
    for (const raw of [
      '064 123 4567',
      '064/123-4567',
      '+381 64 123 4567',
      '00381641234567',
      '(064) 1234567',
    ])
      expect(normalizeSerbianPhone(raw)).toBe('+381641234567');
    expect(normalizeSerbianPhone('018 123 456')).toBe('+38118123456');
  });

  it('refuses what is not a Serbian number', () => {
    for (const raw of ['', '123', 'pozovi me', '+44 20 7946 0958', '0641'])
      expect(normalizeSerbianPhone(raw)).toBeNull();
  });
});

describe('isSerbianMobile', () => {
  it('06x is mobile (Viber works), a landline is not', () => {
    expect(isSerbianMobile('+381641234567')).toBe(true);
    expect(isSerbianMobile('+38118123456')).toBe(false);
  });
});

describe('contactChannelsFor', () => {
  it('a mobile gets call and Viber, a landline only call, e-mail only e-mail', () => {
    expect(
      contactChannelsFor({ applyMode: 'phone', applyPhone: '+381641234567' }),
    ).toEqual(['call', 'viber']);
    expect(
      contactChannelsFor({ applyMode: 'phone', applyPhone: '+38118123456' }),
    ).toEqual(['call']);
    expect(
      contactChannelsFor({ applyMode: 'email', applyPhone: null }),
    ).toEqual(['email']);
    expect(
      contactChannelsFor({ applyMode: 'internal', applyPhone: null }),
    ).toEqual([]);
  });
});

describe('draft body with contact apply', () => {
  const base = {
    title: 'Konobar',
    description: '',
    workModel: 'onsite',
    employmentType: 'part_time',
    seniority: 'junior',
  };

  it('phone mode needs a Serbian number and stores it normalized', () => {
    const ok = employerJobDraftBodySchema.parse({
      ...base,
      applyMode: 'phone',
      applyPhone: '064 123 4567',
    });
    expect(ok.applyPhone).toBe('+381641234567');
    expect(
      employerJobDraftBodySchema.safeParse({ ...base, applyMode: 'phone' })
        .success,
    ).toBe(false);
    expect(
      employerJobDraftBodySchema.safeParse({
        ...base,
        applyMode: 'phone',
        applyPhone: 'zovi',
      }).success,
    ).toBe(false);
  });

  it('e-mail mode needs an address', () => {
    expect(
      employerJobDraftBodySchema.safeParse({ ...base, applyMode: 'email' })
        .success,
    ).toBe(false);
    expect(
      employerJobDraftBodySchema.parse({
        ...base,
        applyMode: 'email',
        applyEmail: ' Posao@Kafana.rs ',
      }).applyEmail,
    ).toBe('posao@kafana.rs');
  });
});

describe('formatSerbianPhone', () => {
  it('writes numbers the way Serbians read them', () => {
    expect(formatSerbianPhone('+381641234567')).toBe('064 123 4567');
    expect(formatSerbianPhone('+38160123456')).toBe('060 123 456');
    expect(formatSerbianPhone('+38118123456')).toBe('018 123 456');
    expect(formatSerbianPhone('+381111234567')).toBe('011 123 4567');
  });
});
