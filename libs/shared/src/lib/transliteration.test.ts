import { describe, expect, it } from 'vitest';

import { toAsciiSlug } from './transliteration';

describe('toAsciiSlug', () => {
  it('handles the Sljakam brand wordmark', () => {
    expect(toAsciiSlug('Šljakam')).toBe('sljakam');
  });

  it('handles a typical job title with locations and diacritics', () => {
    expect(toAsciiSlug('Konobar — Novi Sad, Šabac')).toBe(
      'konobar-novi-sad-sabac',
    );
  });

  it('explicitly maps đ/Đ to dj/dj because NFD does not decompose them', () => {
    expect(toAsciiSlug('Đak')).toBe('djak');
    expect(toAsciiSlug('Predaja đaka')).toBe('predaja-djaka');
  });

  it('strips other diacritics via NFD (š, ć, č, ž)', () => {
    expect(toAsciiSlug('Čaj sa medom')).toBe('caj-sa-medom');
    expect(toAsciiSlug('Žuti šešir')).toBe('zuti-sesir');
    expect(toAsciiSlug('ćao')).toBe('cao');
    expect(toAsciiSlug('ŠŠŠ')).toBe('sss');
  });

  it('returns an empty string for empty or punctuation-only input', () => {
    expect(toAsciiSlug('')).toBe('');
    expect(toAsciiSlug('!!! ??? ...')).toBe('');
  });

  it('truncates to a default max length of 60 without trailing dash', () => {
    const result = toAsciiSlug('a'.repeat(80));
    expect(result.length).toBe(60);
    expect(result.endsWith('-')).toBe(false);
  });

  it('respects a custom max length', () => {
    expect(toAsciiSlug('Konobar Novi Sad', { maxLength: 7 })).toBe('konobar');
  });

  it('drops non-Latin scripts (Cyrillic) — MVP is Latin-only', () => {
    expect(toAsciiSlug('Поздрав')).toBe('');
  });

  it('trims and collapses surrounding/consecutive whitespace and dashes', () => {
    expect(toAsciiSlug('  trim  me  ')).toBe('trim-me');
    expect(toAsciiSlug('multi---dashes')).toBe('multi-dashes');
  });
});
