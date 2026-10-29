import { describe, expect, it } from 'vitest';

import { belgradeMidnight, campaignWindow } from './promo-campaigns';

describe('campaignWindow (Belgrade time)', () => {
  it('a 7-day campaign runs from midnight to the last second of day 7', () => {
    // November: Belgrade is UTC+1.
    expect(campaignWindow('2026-11-02', { kind: 'days', days: 7 })).toEqual({
      validFrom: '2026-11-01T23:00:00.000Z',
      validTo: '2026-11-08T22:59:59.000Z',
    });
  });

  it('a weekend starts on the next Friday and ends Sunday night', () => {
    // 2026-11-04 is a Wednesday.
    expect(campaignWindow('2026-11-04', { kind: 'weekend' })).toEqual({
      validFrom: '2026-11-05T23:00:00.000Z',
      validTo: '2026-11-08T22:59:59.000Z',
    });
  });

  it('a weekend picked on a Friday starts that day', () => {
    expect(campaignWindow('2026-11-06', { kind: 'weekend' }).validFrom).toBe(
      '2026-11-05T23:00:00.000Z',
    );
  });

  it('spans the switch to summer time (29 March 2026) correctly', () => {
    // Starts at UTC+1, ends at UTC+2.
    expect(campaignWindow('2026-03-27', { kind: 'days', days: 3 })).toEqual({
      validFrom: '2026-03-26T23:00:00.000Z',
      validTo: '2026-03-29T21:59:59.000Z',
    });
  });

  it('knows summer midnight is 22:00 UTC', () => {
    expect(belgradeMidnight('2026-07-15').toISOString()).toBe(
      '2026-07-14T22:00:00.000Z',
    );
  });
});
