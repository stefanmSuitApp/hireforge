import { afterEach, beforeEach, vi } from 'vitest';
import { fixedNow } from '../clock';

/** Freezes `Date` at the fixed test time for every test in the file; timers keep running. */
export function useFixedClock(now: Date = fixedNow()): void {
  beforeEach(() => {
    vi.useFakeTimers({ now, toFake: ['Date'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });
}

export { integrationConfig, unitConfig } from './preset';
