// T5.2 generated CVs: every template puts the candidate's data on the page,
// Serbian letters included, and leaves out empty sections. Headings may be
// drawn in capitals, so text checks ignore case.
import { describe, expect, it } from 'vitest';
import { extractText, getDocumentProxy } from 'unpdf';
import {
  cvProfileSchema,
  cvTemplateCodes,
  type CvPdfLayoutInput,
} from 'contracts';
import { pdfText } from 'testing/pdf';
import { renderCvPdfBuffer } from './render-cv-pdf-buffer';
import { CV_LABELS } from './labels';
import { cvTemplates } from './registry';

const LAYOUT: CvPdfLayoutInput = {
  locale: 'sr',
  fullName: 'Đorđe Šćepanović',
  email: 'djordje@primer.rs',
  phone: '+381 64 123 4567',
  headline: 'Električar — industrijska postrojenja',
  cityLine: 'Čačak',
  profile: cvProfileSchema.parse({
    experiences: [
      {
        company: 'Elektro Žarko d.o.o.',
        title: 'Majstor',
        startDate: '2019-03-01',
        endDate: null,
        summary: 'Održavanje trafostanica.',
      },
    ],
    education: [
      {
        institution: 'Tehnička škola Čačak',
        degree: 'Elektrotehničar',
        field: 'Energetika',
        startDate: '2012-09-01',
        endDate: '2016-06-30',
      },
    ],
    skills: [{ name: 'Visoki napon' }, { name: 'AutoCAD' }],
  }),
};

const EXTRAS = {
  summary: 'Električar sa deset godina iskustva.',
  languages: [
    { name: 'Srpski', level: 'native' },
    { name: 'Engleski', level: 'B1' },
  ],
  drivingLicences: ['B', 'C'],
  certificates: [{ name: 'Rad na visini', year: 2021 }],
  links: [{ label: 'LinkedIn', url: 'https://linkedin.com/in/primer' }],
  digitalSkills: 'AutoCAD, MS Excel',
} as const;

async function textOf(
  template: (typeof cvTemplateCodes)[number],
  layout: CvPdfLayoutInput,
): Promise<string> {
  return (
    await pdfText(await renderCvPdfBuffer(template, layout))
  ).toLowerCase();
}

function expectAll(text: string, items: string[]) {
  for (const item of items) expect(text, item).toContain(item.toLowerCase());
}

function expectNone(text: string, items: string[]) {
  for (const item of items) {
    expect(text, item).not.toContain(item.toLowerCase());
  }
}

/** One distinct value in every field the builder has. */
const EVERY_FIELD: CvPdfLayoutInput = {
  locale: 'sr',
  fullName: 'Ime Prezimić',
  email: 'puna@primer.rs',
  phone: '+381 11 222 3333',
  headline: 'Naslov Polje',
  cityLine: 'Novi Sad',
  profile: cvProfileSchema.parse({
    summary: 'Sažetak polje.',
    experiences: [
      {
        company: 'Firma Polje',
        title: 'Pozicija Polje',
        startDate: '2020-01-01',
        endDate: '2021-02-01',
        summary: 'Opis polje.',
      },
    ],
    education: [
      {
        institution: 'Škola Polje',
        degree: 'Zvanje Polje',
        field: 'Smer Polje',
        startDate: '2014-09-01',
        endDate: '2018-06-01',
      },
    ],
    skills: [{ name: 'Veština Polje' }],
    languages: [{ name: 'Jezik Polje', level: 'B2' }],
    drivingLicences: ['CE'],
    certificates: [
      { name: 'Sertifikat Polje', issuer: 'Izdavač Polje', year: 2020 },
    ],
    links: [{ label: 'Portfolio', url: 'https://primer.rs/radovi' }],
    digitalSkills: 'Digitalno Polje',
    availability: 'Dostupnost Polje',
    showEmail: true,
  }),
};

describe.each(cvTemplateCodes)('CV template %s', (template) => {
  it("shows the candidate's name, contact, headline, experience, education and skills", async () => {
    expectAll(await textOf(template, LAYOUT), [
      'Đorđe Šćepanović',
      '+381 64 123 4567',
      'Električar — industrijska postrojenja',
      'Čačak',
      'Elektro Žarko d.o.o.',
      'Majstor',
      'Održavanje trafostanica.',
      'Tehnička škola Čačak',
      'Visoki napon',
      'AutoCAD',
    ]);
  });

  // Stefan, 2026-10-31: "some information from the forms is missing on the
  // PDFs". Nothing the candidate typed may be dropped by a template.
  it('prints every field the builder asks for', async () => {
    const text = await textOf(template, EVERY_FIELD);
    expectAll(text, [
      'Ime Prezimić',
      'puna@primer.rs',
      '+381 11 222 3333',
      'Naslov Polje',
      'Novi Sad',
      'Sažetak polje.',
      'Firma Polje',
      'Pozicija Polje',
      'jan 2020.',
      'feb 2021.',
      'Opis polje.',
      'Škola Polje',
      'Zvanje Polje',
      'Smer Polje',
      'sep 2014.',
      'Veština Polje',
      'Jezik Polje',
      'B2',
      'CE',
      'Sertifikat Polje',
      'Izdavač Polje',
      '2020',
      'Portfolio',
      'https://primer.rs/radovi',
      'Digitalno Polje',
      'Dostupnost Polje',
    ]);
  });

  // Stefan, 2026-10-31: a Serbian user got "Experience", "present" and
  // raw ISO dates, and no email at all.
  it('speaks the builder language: Serbian titles, months and email', async () => {
    const text = await textOf(template, LAYOUT);
    // Praktičan calls the school section "Škola".
    expect(text).toMatch(/obrazovanje|škola/);
    expectAll(text, [
      'Radno iskustvo',
      'Veštine',
      'mar 2019. — danas',
      'sep 2012. — jun 2016.',
      'djordje@primer.rs',
    ]);
    expectNone(text, ['Experience', 'Education', 'Skills', 'present']);
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('uses English words for an English CV', async () => {
    expectAll(await textOf(template, { ...LAYOUT, locale: 'en' }), [
      'Experience',
      'Education',
      'Skills',
      'Mar 2019 — present',
    ]);
  });

  it('prints the extras the candidate filled in: summary, languages, licence, certificates, links', async () => {
    const text = await textOf(template, {
      ...LAYOUT,
      profile: cvProfileSchema.parse({
        ...LAYOUT.profile,
        ...EXTRAS,
        experiences: [
          {
            company: 'Elektro Žarko d.o.o.',
            title: 'Majstor',
            startDate: '2019-03-01',
            endDate: null,
            summary: '- Održavanje trafostanica\n- Dežurstva vikendom',
          },
        ],
      }),
    });
    expectAll(text, [
      'O meni',
      'Električar sa deset godina iskustva.',
      'Održavanje trafostanica',
      'Dežurstva vikendom',
      'Jezici',
      'Vozačka dozvola',
      'Sertifikati',
      'Rad na visini (2021)',
      'Digitalne veštine',
      'AutoCAD, MS Excel',
      'https://linkedin.com/in/primer',
    ]);
    expect(text).toMatch(/vozačka dozvola:?\s+b[\s,]+c/);
    // "Engleski — B1 (srednji)", or a table row in the European format.
    expect(text).toMatch(/engleski\W+b1\W+srednji/);
    expect(text).toMatch(/srpski\W+maternji|maternji jezik\W+srpski/);
    // Bullets, not a dash-run paragraph.
    expect(text).toMatch(/•\s*održavanje trafostanica/);
    expect(text).not.toContain('- održavanje');
  });

  it('leaves out empty extras and the email when the candidate hides it', async () => {
    expectNone(
      await textOf(template, {
        ...LAYOUT,
        profile: { ...LAYOUT.profile, showEmail: false },
      }),
      [
        'O meni',
        'Jezici',
        'Vozačka dozvola',
        'Sertifikati',
        'djordje@primer.rs',
      ],
    );
  });

  // The old Moderan printed the skills twice: in the sidebar and the body.
  it('lists every skill once', async () => {
    const text = await textOf(template, LAYOUT);
    expect(text.split('visoki napon').length - 1).toBe(1);
  });

  it('renders a CV with only a name', async () => {
    expectAll(
      await textOf(template, {
        locale: 'sr',
        fullName: 'Ana Anić',
        email: null,
        phone: null,
        headline: null,
        cityLine: null,
        profile: cvProfileSchema.parse({}),
      }),
      ['Ana Anić'],
    );
  });

  // PR 3: a typical CV fits one A4 page; a maximum one flows on cleanly.
  it('fits a typical CV on one page and flows a maximum one onto more', async () => {
    const pages = async (layout: CvPdfLayoutInput) =>
      (
        await getDocumentProxy(
          new Uint8Array(await renderCvPdfBuffer(template, layout)),
        )
      ).numPages;
    expect(
      await pages({
        ...LAYOUT,
        profile: cvProfileSchema.parse({ ...LAYOUT.profile, ...EXTRAS }),
      }),
    ).toBe(1);
    const job = LAYOUT.profile.experiences[0];
    const max = cvProfileSchema.parse({
      ...EXTRAS,
      experiences: Array.from({ length: 15 }, (_, i) => ({
        ...job,
        title: `Pozicija ${i + 1}`,
        summary: 'Opis posla. '.repeat(40).trim(),
      })),
      education: Array.from({ length: 10 }, () => LAYOUT.profile.education[0]),
      skills: Array.from({ length: 40 }, (_, i) => ({ name: `Veština ${i}` })),
    });
    const text = await textOf(template, { ...LAYOUT, profile: max });
    expectAll(text, ['Pozicija 1', 'Pozicija 15', 'Veština 39']);
    const n = await pages({ ...LAYOUT, profile: max });
    expect(n).toBeGreaterThan(1);
    expect(n).toBeLessThanOrEqual(8);
  });

  // A heading left alone at the bottom of a page, its entries on the next.
  it('never ends a page on a section heading', async () => {
    const l = CV_LABELS.sr;
    const headings = [
      l.summary,
      l.experience,
      l.education,
      l.skills,
      l.languages,
      l.drivingLicence,
      l.certificates,
      l.digitalSkills,
      l.links,
      l.contact,
      l.skillsAndMore,
      l.additional,
      l.personal,
      l.school,
    ].map((h) => h.toLowerCase());
    const job = LAYOUT.profile.experiences[0];
    for (const jobs of [4, 5, 6, 7, 8, 9]) {
      const buffer = await renderCvPdfBuffer(template, {
        ...LAYOUT,
        profile: cvProfileSchema.parse({
          ...LAYOUT.profile,
          ...EXTRAS,
          experiences: Array.from({ length: jobs }, (_, i) => ({
            ...job,
            title: `Pozicija ${i + 1}`,
            summary: '- Prvi zadatak\n- Drugi zadatak\n- Treći zadatak',
          })),
        }),
      });
      const { text } = await extractText(
        await getDocumentProxy(new Uint8Array(buffer)),
      );
      for (const page of text.slice(0, -1)) {
        const end = page.replace(/\s+/g, ' ').trim().toLowerCase();
        const orphan = headings.find((h) => end.endsWith(h));
        expect(orphan, `${jobs} jobs: page ends on "${orphan}"`).toBe(
          undefined,
        );
      }
    }
  });

  if (cvTemplates[template].atsSafe) {
    // A CV scanner reads text in order: name, story, jobs, school.
    it('reads in order for a CV scanner (ATS)', async () => {
      const text = await textOf(template, {
        ...LAYOUT,
        profile: cvProfileSchema.parse({ ...LAYOUT.profile, ...EXTRAS }),
      });
      const order = [
        'Đorđe Šćepanović',
        'Električar sa deset godina iskustva.',
        'Majstor',
        'Tehnička škola Čačak',
      ].map((s) => text.indexOf(s.toLowerCase()));
      expect(order.every((i) => i >= 0)).toBe(true);
      expect([...order].sort((a, b) => a - b)).toEqual(order);
    });
  }
});

// fontkit kept glyph state between documents: after a CV with bold "Š"/"ć",
// the next CV's bold "S"/"c" lost their text mapping ("Experiene", "kills").
it('a CV rendered after another keeps every letter a scanner reads', async () => {
  await renderCvPdfBuffer('klasican', LAYOUT);
  expectAll(
    await textOf('klasican', {
      ...LAYOUT,
      locale: 'en',
      fullName: 'Scott Cooper',
    }),
    ['Scott Cooper', 'Skills', 'Experience', 'Education'],
  );
});
