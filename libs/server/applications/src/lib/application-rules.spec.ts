import { describe, expect, it } from 'vitest';

import {
  applicationOccupiesListingSlot,
  isWithinReapplicationCooldown,
  REAPPLICATION_COOLDOWN_MS,
} from './application-rules';

describe('applicationOccupiesListingSlot', () => {
  it('treats withdrawn as not occupying the listing slot', () => {
    expect(applicationOccupiesListingSlot('withdrawn')).toBe(false);
  });

  it('counts other statuses as occupying the listing slot', () => {
    expect(applicationOccupiesListingSlot('submitted')).toBe(true);
    expect(applicationOccupiesListingSlot('viewed')).toBe(true);
    expect(applicationOccupiesListingSlot('shortlisted')).toBe(true);
    expect(applicationOccupiesListingSlot('rejected')).toBe(true);
    expect(applicationOccupiesListingSlot('hired')).toBe(true);
  });
});

describe('isWithinReapplicationCooldown', () => {
  it('is true strictly before the 24h window elapses since withdraw', () => {
    const withdrawAt = Date.UTC(2026, 0, 1, 12, 0, 0);
    expect(
      isWithinReapplicationCooldown(
        withdrawAt,
        withdrawAt + REAPPLICATION_COOLDOWN_MS - 1,
      ),
    ).toBe(true);
  });

  it('is false once exactly 24h have passed', () => {
    const withdrawAt = Date.UTC(2026, 0, 1, 12, 0, 0);
    expect(
      isWithinReapplicationCooldown(
        withdrawAt,
        withdrawAt + REAPPLICATION_COOLDOWN_MS,
      ),
    ).toBe(false);
  });
});
