import { cvProfileSchema, type CvPdfLayoutInput } from 'contracts';

/**
 * Made-up candidate for picker thumbnails and visual checks (the same one as
 * the approved sketches).
 */
export const SAMPLE_CANDIDATE: CvPdfLayoutInput = {
  locale: 'sr',
  fullName: 'Nikola Petrović',
  email: 'nikola.petrovic@primer.rs',
  phone: '+381 64 123 4567',
  headline: 'Vozač C i CE kategorije · magacioner',
  cityLine: 'Kragujevac',
  profile: cvProfileSchema.parse({
    summary:
      'Vozač sa sedam godina iskustva u dostavi i radu u magacinu. Tačan i pouzdan, navikao na rad u smenama i na terenu, sa važećom kvalifikacionom karticom vozača.',
    experiences: [
      {
        title: 'Vozač dostavnog vozila (C)',
        company: 'Morava Distribucija d.o.o.',
        startDate: '2021-03-01',
        endDate: null,
        summary:
          '- Dnevna dostava na 25–30 adresa u Šumadijskom okrugu\n- Utovar i istovar robe viljuškarom\n- Vođenje putnih naloga i otpremnica',
      },
      {
        title: 'Magacioner',
        company: 'Veleprodaja Sloga',
        startDate: '2017-06-01',
        endDate: '2021-02-01',
        summary:
          '- Prijem i izdavanje robe, popis zaliha\n- Rukovanje viljuškarom i ručnim paletarom',
      },
    ],
    education: [
      {
        institution: 'Srednja saobraćajna škola, Kragujevac',
        degree: 'Vozač motornih vozila',
        startDate: '2013-09-01',
        endDate: '2017-06-01',
      },
    ],
    skills: [
      { name: 'Viljuškar' },
      { name: 'Utovar i istovar' },
      { name: 'Planiranje ruta' },
      { name: 'Digitalni tahograf' },
      { name: 'Rad u smenama' },
    ],
    languages: [
      { name: 'Srpski', level: 'native' },
      { name: 'Engleski', level: 'B1' },
      { name: 'Nemački', level: 'A2' },
    ],
    drivingLicences: ['B', 'C', 'CE'],
    certificates: [
      { name: 'Kvalifikaciona kartica vozača', year: 2021 },
      { name: 'Rukovalac viljuškarom', year: 2019 },
      { name: 'Prva pomoć', year: 2022 },
    ],
    digitalSkills: 'MS Excel (osnovno), digitalni tahograf',
    availability: 'Odmah · smene · teren',
  }),
};
