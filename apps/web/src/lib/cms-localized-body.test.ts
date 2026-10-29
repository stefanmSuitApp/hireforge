import { describe, expect, it } from 'vitest';

import { pickLocalizedBody } from './cms-localized-body';

const block = (text: string) => [
  { _type: 'block', children: [{ _type: 'span', text }] },
];

describe('pickLocalizedBody', () => {
  const sr = block('Šljakam se fokusira na jasne oglase.');
  const en = block('Šljakam focuses on clear job listings.');

  it('returns the body in the requested locale', () => {
    expect(pickLocalizedBody({ sr, en }, 'en')).toEqual(en);
    expect(pickLocalizedBody({ sr, en }, 'sr')).toEqual(sr);
  });

  it('falls back to the other locale when one is empty', () => {
    expect(pickLocalizedBody({ sr, en: [] }, 'en')).toEqual(sr);
    expect(pickLocalizedBody({ en }, 'sr')).toEqual(en);
  });

  it('keeps the old single-language array for both locales', () => {
    expect(pickLocalizedBody(sr, 'en')).toEqual(sr);
  });

  it('returns null when there is no body', () => {
    expect(pickLocalizedBody(null, 'sr')).toBeNull();
    expect(pickLocalizedBody({}, 'sr')).toBeNull();
    expect(pickLocalizedBody([], 'en')).toBeNull();
  });
});
