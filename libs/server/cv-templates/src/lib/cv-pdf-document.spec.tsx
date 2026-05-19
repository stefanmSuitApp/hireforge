import { describe, expect, it } from 'vitest';

import { renderCvPdfBuffer } from './render-cv-pdf-buffer';

describe('renderCvPdfBuffer', () => {
  it('renders a non-empty PDF for each template', async () => {
    const layout = {
      fullName: 'Test Candidate',
      phone: '+381 11 123 456',
      headline: 'Engineer',
      cityLine: 'Belgrade',
      profile: {
        experiences: [
          {
            company: 'Acme',
            title: 'Dev',
            startDate: '2020-01-01',
            endDate: null,
            summary: 'Built things.',
          },
        ],
        education: [
          {
            institution: 'University',
            degree: 'BSc',
            field: 'CS',
            startDate: '2015-09-01',
            endDate: '2019-06-30',
          },
        ],
        skills: [{ name: 'TypeScript' }, { name: 'PostgreSQL' }],
      },
    };
    for (const templateCode of ['klasican', 'moderan', 'minimalan'] as const) {
      const buf = await renderCvPdfBuffer(templateCode, layout);
      expect(buf.byteLength).toBeGreaterThan(500);
      expect(buf.subarray(0, 4).toString()).toBe('%PDF');
    }
  });
});
