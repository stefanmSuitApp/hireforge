// T5.2 generated CVs: every template puts the candidate's data on the page,
// Serbian letters included, and leaves out empty sections.
import { describe, expect, it } from 'vitest';
import { cvProfileSchema, type CvPdfLayoutInput } from 'contracts';
import { pdfText } from 'testing/pdf';
import { renderCvPdfBuffer } from './render-cv-pdf-buffer';

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

describe.each(['klasican', 'moderan', 'minimalan'] as const)(
  'CV template %s',
  (template) => {
    it("shows the candidate's name, contact, headline, experience, education and skills", async () => {
      const text = await pdfText(await renderCvPdfBuffer(template, LAYOUT));
      for (const expected of [
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
      ]) {
        expect(text, expected).toContain(expected);
      }
    });

    // Stefan, 2026-10-31: a Serbian user got "Experience", "present" and
    // raw ISO dates, and no email at all.
    it('speaks the builder language: Serbian titles, months and email', async () => {
      const text = await pdfText(await renderCvPdfBuffer(template, LAYOUT));
      for (const expected of [
        'Radno iskustvo',
        'Obrazovanje',
        'Veštine',
        'mar 2019. — danas',
        'sep 2012. — jun 2016.',
        'djordje@primer.rs',
      ]) {
        expect(text, expected).toContain(expected);
      }
      for (const english of ['Experience', 'Education', 'Skills', 'present']) {
        expect(text, english).not.toContain(english);
      }
      expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('uses English words for an English CV', async () => {
      const text = await pdfText(
        await renderCvPdfBuffer(template, { ...LAYOUT, locale: 'en' }),
      );
      for (const expected of [
        'Experience',
        'Education',
        'Skills',
        'Mar 2019 — present',
      ]) {
        expect(text, expected).toContain(expected);
      }
    });

    it('prints the extras the candidate filled in: summary, languages, licence, certificates, links', async () => {
      const text = await pdfText(
        await renderCvPdfBuffer(template, {
          ...LAYOUT,
          profile: {
            ...LAYOUT.profile,
            experiences: [
              {
                company: 'Elektro Žarko d.o.o.',
                title: 'Majstor',
                startDate: '2019-03-01',
                endDate: null,
                summary: '- Održavanje trafostanica\n- Dežurstva vikendom',
              },
            ],
            summary: 'Električar sa deset godina iskustva.',
            languages: [
              { name: 'Srpski', level: 'native' },
              { name: 'Engleski', level: 'B1' },
            ],
            drivingLicences: ['B', 'C'],
            certificates: [{ name: 'Rad na visini', year: 2021 }],
            links: [
              { label: 'LinkedIn', url: 'https://linkedin.com/in/primer' },
            ],
            digitalSkills: 'AutoCAD, MS Excel',
          },
        }),
      );
      for (const expected of [
        'O meni',
        'Električar sa deset godina iskustva.',
        '• Održavanje trafostanica',
        '• Dežurstva vikendom',
        'Jezici',
        'Srpski — maternji',
        'Engleski — B1 (srednji)',
        'Vozačka dozvola',
        'B, C',
        'Sertifikati',
        'Rad na visini (2021)',
        'Digitalne veštine',
        'AutoCAD, MS Excel',
        'https://linkedin.com/in/primer',
      ]) {
        expect(text, expected).toContain(expected);
      }
    });

    it('leaves out empty extras and the email when the candidate hides it', async () => {
      const text = await pdfText(
        await renderCvPdfBuffer(template, {
          ...LAYOUT,
          profile: { ...LAYOUT.profile, showEmail: false },
        }),
      );
      for (const absent of [
        'O meni',
        'Jezici',
        'Vozačka dozvola',
        'Sertifikati',
        'djordje@primer.rs',
      ]) {
        expect(text, absent).not.toContain(absent);
      }
    });

    it('renders a CV with only a name', async () => {
      const text = await pdfText(
        await renderCvPdfBuffer(template, {
          locale: 'sr',
          fullName: 'Ana Anić',
          email: null,
          phone: null,
          headline: null,
          cityLine: null,
          profile: cvProfileSchema.parse({}),
        }),
      );
      expect(text).toContain('Ana Anić');
    });
  },
);

// fontkit kept glyph state between documents: after a CV with bold "Š"/"ć",
// the next CV's bold "S"/"c" lost their text mapping ("Experiene", "kills").
it('a CV rendered after another keeps every letter a scanner reads', async () => {
  await renderCvPdfBuffer('klasican', LAYOUT);
  const text = await pdfText(
    await renderCvPdfBuffer('klasican', {
      ...LAYOUT,
      locale: 'en',
      fullName: 'Scott Cooper',
    }),
  );
  for (const expected of [
    'Scott Cooper',
    'Skills',
    'Experience',
    'Education',
  ]) {
    expect(text, expected).toContain(expected);
  }
});
