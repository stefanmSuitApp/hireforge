import { describe, expect, it } from 'vitest';

import {
  extractEurMiddleRateRsdPerEurFromNbsOfficialHtml,
  NBS_OFFICIAL_MIDDLE_RATE_PAGE_URL,
} from './nbs-middle-rate';

describe('extractEurMiddleRateRsdPerEurFromNbsOfficialHtml', () => {
  it('parses the current NBS HTML row shape (978, unit 1, Serbian comma)', () => {
    const html = `
      <tr>
        <td>EUR</td>
        <td>978</td>
        <td>EMU</td>
        <td>1</td>
        <td>117,3771</td>
      </tr>`;
    expect(extractEurMiddleRateRsdPerEurFromNbsOfficialHtml(html)).toBe(
      '117.3771',
    );
  });

  it('throws when EUR row is missing', () => {
    expect(() =>
      extractEurMiddleRateRsdPerEurFromNbsOfficialHtml('<html></html>'),
    ).toThrow(/not found/);
  });
});

describe('NBS source URL', () => {
  it('points at the official middle-rate web app', () => {
    expect(NBS_OFFICIAL_MIDDLE_RATE_PAGE_URL).toMatch(/^https:\/\//);
    expect(NBS_OFFICIAL_MIDDLE_RATE_PAGE_URL).toContain('nbs.rs');
  });
});
