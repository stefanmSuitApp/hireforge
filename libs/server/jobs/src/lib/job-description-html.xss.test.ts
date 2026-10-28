// T5.2 the job description sanitizer against XSS: what an employer stores is
// rendered to every candidate, so nothing executable may survive.
import { describe, expect, it } from 'vitest';
import {
  effectiveJobDescriptionHtml,
  jobDescriptionHtmlFromDoc,
  jobDescriptionHtmlFromDraftBody,
  sanitizeJobListingHtml,
} from './job-description-html';

const XSS: Array<[string, string]> = [
  ['a script tag', '<p>ok</p><script>alert(1)</script>'],
  ['an inline event handler', '<p onclick="alert(1)">ok</p>'],
  ['an img onerror', '<img src="x" onerror="alert(1)">'],
  ['a javascript: link', '<a href="javascript:alert(1)">klik</a>'],
  ['a JaVaScRiPt: link with spaces', '<a href=" JaVaScRiPt:alert(1)">klik</a>'],
  [
    'a data: link',
    '<a href="data:text/html,<script>alert(1)</script>">klik</a>',
  ],
  ['a vbscript: link', '<a href="vbscript:msgbox(1)">klik</a>'],
  ['an iframe', '<iframe src="https://evil.example"></iframe>'],
  ['an svg with onload', '<svg onload="alert(1)"><circle r="1"/></svg>'],
  ['a style tag', '<style>body{display:none}</style><p>ok</p>'],
  [
    'a style attribute with expression',
    '<p style="background:url(javascript:alert(1))">ok</p>',
  ],
  ['an object/embed', '<object data="x.swf"></object><embed src="x.swf">'],
  ['a form', '<form action="https://evil.example"><input name="p"></form>'],
  [
    'a meta refresh',
    '<meta http-equiv="refresh" content="0;url=https://evil.example">',
  ],
  ['a base tag', '<base href="https://evil.example/">'],
  ['an img with javascript: src', '<img src="javascript:alert(1)">'],
  [
    'an img with data: src',
    '<img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+">',
  ],
  [
    'an entity-encoded javascript: link',
    '<a href="&#106;avascript:alert(1)">klik</a>',
  ],
  [
    'a link with a target override',
    '<a href="https://ok.example" target="_self" onmouseover="x()">ok</a>',
  ],
];

describe('sanitizeJobListingHtml keeps candidates safe', () => {
  for (const [name, html] of XSS) {
    it(`removes ${name}`, () => {
      const out = sanitizeJobListingHtml(html).toLowerCase();
      expect(out).not.toMatch(
        /<script|<iframe|<svg|<style|<object|<embed|<form|<input|<meta|<base/,
      );
      expect(out).not.toMatch(/\son\w+=/);
      expect(out).not.toMatch(/javascript:|vbscript:|data:/);
      expect(out).not.toMatch(/expression\(|url\(/);
    });
  }

  it('keeps allowed formatting', () => {
    const html =
      '<h2>Opis</h2><p><strong>Plata</strong> i <em>uslovi</em> <u>dobri</u></p><ul><li>a</li></ul><ol><li>b</li></ol><blockquote>c</blockquote><pre><code>d</code></pre>';
    expect(sanitizeJobListingHtml(html)).toBe(html);
  });

  it('turns a non-http link into plain text but keeps its words', () => {
    expect(
      sanitizeJobListingHtml('<a href="mailto:hr@firma.rs">Pišite nam</a>'),
    ).toBe('Pišite nam');
  });

  it('every kept link opens safely in a new tab', () => {
    const out = sanitizeJobListingHtml(
      '<a href="https://firma.rs/posao" class="c" target="_self">x</a>',
    );
    expect(out).toBe(
      '<a href="https://firma.rs/posao" rel="nofollow noopener noreferrer ugc" target="_blank" class="c">x</a>',
    );
  });

  it('allows only left/right/center/justify text alignment', () => {
    expect(sanitizeJobListingHtml('<p style="text-align:center">x</p>')).toBe(
      '<p style="text-align:center">x</p>',
    );
    expect(
      sanitizeJobListingHtml(
        '<p style="text-align:center;color:red;position:fixed">x</p>',
      ),
    ).toBe('<p style="text-align:center">x</p>');
  });

  it('keeps an image alt and title, drops other attributes', () => {
    const out = sanitizeJobListingHtml(
      '<img src="https://cdn.firma.rs/a.png" alt="Tim" title="T" width="9000" class="k">',
    );
    expect(out).toBe(
      '<img src="https://cdn.firma.rs/a.png" alt="Tim" class="k" title="T" />',
    );
  });
});

describe('TipTap documents to listing HTML', () => {
  const doc = (...content: unknown[]) => ({ type: 'doc', content });

  it('renders a document and sanitises the result', () => {
    const html = jobDescriptionHtmlFromDoc(
      doc(
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Posao' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Link ', marks: [{ type: 'bold' }] },
            {
              type: 'text',
              text: 'ovde',
              marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
            },
          ],
        },
      ),
    );
    expect(html).toContain('<h2>Posao</h2>');
    expect(html).toContain('<strong>Link </strong>');
    expect(html).not.toContain('javascript:');
  });

  it('returns null for empty, invalid or non-doc input', () => {
    expect(jobDescriptionHtmlFromDoc(null)).toBeNull();
    expect(jobDescriptionHtmlFromDoc('text')).toBeNull();
    expect(jobDescriptionHtmlFromDoc({ type: 'paragraph' })).toBeNull();
    expect(jobDescriptionHtmlFromDoc(doc({ type: 'paragraph' }))).toBeNull();
    expect(jobDescriptionHtmlFromDoc(doc({ type: 'no-such-node' }))).toBeNull();
  });

  it('the draft body helper uses the document, not the legacy text', () => {
    expect(
      jobDescriptionHtmlFromDraftBody({
        description: '<b>x</b>',
        descriptionDoc: null,
      }),
    ).toBeNull();
  });

  it('effective HTML prefers the document and falls back to the stored HTML, sanitised again', () => {
    expect(
      effectiveJobDescriptionHtml('<p>staro</p><script>x()</script>', null),
    ).toBe('<p>staro</p>');
    expect(effectiveJobDescriptionHtml('  ', null)).toBeNull();
    expect(effectiveJobDescriptionHtml(null, null)).toBeNull();
    expect(
      effectiveJobDescriptionHtml(
        '<p>staro</p>',
        doc({ type: 'paragraph', content: [{ type: 'text', text: 'novo' }] }),
      ),
    ).toBe('<p>novo</p>');
  });
});
