import { describe, expect, it } from 'vitest';
import {
  isWithinTrivialPatchRatio,
  JOB_TRIVIAL_PATCH_MAX_RATIO,
  levenshteinDistance,
  normalizedLevenshteinRatio,
} from './job-trivial-patch';

describe('trivial patch distance', () => {
  it.each([
    ['', '', 0],
    ['abc', '', 3],
    ['', 'abc', 3],
    ['kitten', 'sitting', 3],
    ['Vozac', 'Vozač', 1],
    ['isto', 'isto', 0],
  ])('levenshtein(%j, %j) = %i', (a, b, d) => {
    expect(levenshteinDistance(a, b)).toBe(d);
  });

  it('normalises by the longer string, and two empty strings are equal', () => {
    expect(normalizedLevenshteinRatio('abcd', 'abce')).toBe(0.25);
    expect(normalizedLevenshteinRatio('', '')).toBe(0);
  });

  it('allows up to 5 % change: one letter in 20 is trivial, one in 19 is not', () => {
    expect(JOB_TRIVIAL_PATCH_MAX_RATIO).toBe(0.05);
    expect(
      isWithinTrivialPatchRatio('a'.repeat(20), 'a'.repeat(19) + 'b'),
    ).toBe(true);
    expect(
      isWithinTrivialPatchRatio('a'.repeat(19), 'a'.repeat(18) + 'b'),
    ).toBe(false);
  });
});
