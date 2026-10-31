// CV templates (docs/plans/CV_TEMPLATES.md): a candidate builds a CV in the
// app, and the PDF a scanner reads has what they entered, in Serbian.
import { expect, test, type Page } from '@playwright/test';
import { extractText, getDocumentProxy, getResolvedPDFJS } from 'unpdf';

import { readyCandidate } from './support/candidate';
import { gotoHydrated } from './support/ui';

type Candidate = Awaited<ReturnType<typeof readyCandidate>>;

async function signIn(page: Page): Promise<Candidate> {
  const cand = await readyCandidate();
  await gotoHydrated(page, '/sr/candidate/login', '#candidate-email');
  await page.locator('#candidate-email').fill(cand.email);
  await page.locator('#candidate-password').fill(cand.password);
  await page.locator('#candidate-password').press('Enter');
  await expect(page).toHaveURL(/\/sr\/candidate$/);
  return cand;
}

/** The candidate's newest generated CV, as a pdf.js document. */
async function newestGeneratedCv(cand: Candidate) {
  const list = await cand.api.get('candidate/resumes');
  const resumes = (await list.json()) as {
    id: string;
    source: string;
    createdAt: string;
  }[];
  const generated = resumes
    .filter((r) => r.source === 'generated')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  expect(generated).toBeDefined();
  const pdf = await cand.api.get(`candidate/resumes/${generated!.id}/download`);
  expect(pdf.ok()).toBeTruthy();
  return getDocumentProxy(new Uint8Array(await pdf.body()));
}

/** The text a scanner reads out of the candidate's newest generated CV. */
async function generatedCvText(cand: Candidate): Promise<string> {
  const { text } = await extractText(await newestGeneratedCv(cand), {
    mergePages: true,
  });
  return text;
}

// PR 1: CV words follow the builder language; the account email is on it.
test('a candidate builds a CV that is in Serbian and has their email', async ({
  page,
}) => {
  const cand = await signIn(page);
  await gotoHydrated(page, '/sr/candidate/cv/build', '#cv-fullName');
  await page.getByLabel('Ime i prezime').fill('Jelena Jović');
  await page.getByLabel('Telefon').fill('+381 64 123 4567');
  await page.getByLabel('Naslov').fill('Knjigovođa');
  const next = page.getByRole('button', { name: 'Dalje' });
  await next.click(); // experience
  await next.click(); // education
  await next.click(); // skills
  await page.getByRole('button', { name: 'Dodaj veštinu' }).click();
  await page.getByRole('textbox').last().fill('Excel');
  await next.click(); // languages, licences, certificates
  await next.click(); // template
  // The live preview draws with the same bundled font as the server.
  const previewFont = page.waitForResponse((r) =>
    r.url().endsWith('/fonts/pdf/NotoSans-Regular.ttf'),
  );
  await page.getByRole('button', { name: /Klasičan/ }).click();
  expect((await previewFont).status()).toBe(200);
  await next.click(); // generate
  await page
    .getByRole('button', { name: 'Sačuvaj profil i generiši CV' })
    .click();

  await expect(page).toHaveURL(/\/sr\/candidate\/profile$/);
  await expect(page.getByText('Generisan (Klasičan)')).toBeVisible();

  const text = await generatedCvText(cand);
  expect(text).toContain('Jelena Jović');
  expect(text).toContain('Veštine');
  expect(text).toContain(cand.email);
  expect(text).not.toContain('Skills');
});

// PR 2: languages and the driving licence go from the builder onto the PDF.
test('a language and a driving licence added in the builder are on the CV', async ({
  page,
}) => {
  const cand = await signIn(page);
  await gotoHydrated(page, '/sr/candidate/cv/build', '#cv-fullName');
  await page.getByLabel('Ime i prezime').fill('Nikola Petrović');
  const next = page.getByRole('button', { name: 'Dalje' });
  for (let i = 0; i < 4; i++) await next.click();
  await expect(
    page.getByRole('heading', { name: 'Jezici, dozvole i sertifikati' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Dodaj jezik' }).click();
  await page.getByRole('button', { name: 'Dodaj jezik' }).click();
  await page.getByLabel('Jezik', { exact: true }).first().fill('Srpski');
  await page.getByLabel('Jezik', { exact: true }).last().fill('Engleski');
  await expect(page.getByLabel('Nivo').last()).toHaveValue('B1');
  await page
    .getByRole('group', { name: 'Vozačka dozvola' })
    .getByRole('button', { name: 'C', exact: true })
    .click();
  await next.click(); // template
  await page.getByRole('button', { name: /Klasičan/ }).click();
  await next.click(); // generate
  await page
    .getByRole('button', { name: 'Sačuvaj profil i generiši CV' })
    .click();
  await expect(page).toHaveURL(/\/sr\/candidate\/profile$/);

  const text = await generatedCvText(cand);
  expect(text).toContain('Srpski — maternji');
  expect(text).toContain('Engleski — B1 (srednji)');
  expect(text).toContain('Vozačka dozvola');
});

// PR 4: the two new templates are in the picker and generate a CV.
test('a candidate picks the Practical template and gets that CV', async ({
  page,
}) => {
  const cand = await signIn(page);
  await gotoHydrated(page, '/sr/candidate/cv/build', '#cv-fullName');
  await page.getByLabel('Ime i prezime').fill('Marko Marković');
  await page.getByLabel('Telefon').fill('+381 64 765 4321');
  const next = page.getByRole('button', { name: 'Dalje' });
  for (let i = 0; i < 4; i++) await next.click();
  await page
    .getByRole('group', { name: 'Vozačka dozvola' })
    .getByRole('button', { name: 'C', exact: true })
    .click();
  await page.getByLabel('Kada možeš da počneš').fill('Odmah');
  await next.click(); // template
  await expect(
    page.getByRole('button', { name: /Evropski format/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Praktičan/ }).click();
  await next.click(); // generate
  await page
    .getByRole('button', { name: 'Sačuvaj profil i generiši CV' })
    .click();
  await expect(page).toHaveURL(/\/sr\/candidate\/profile$/);
  await expect(page.getByText('Generisan (Praktičan)')).toBeVisible();

  const text = (await generatedCvText(cand)).toLowerCase();
  expect(text).toContain('pozovite me');
  expect(text).toContain('+381 64 765 4321');
  expect(text).toContain('mogu da počnem');
  expect(text).toContain('odmah');
});

/** Picks `iso` (YYYY-MM-DD) in an IsoDatePicker: year, month, then the day. */
async function pickDate(
  page: Page,
  trigger: ReturnType<Page['locator']>,
  iso: string,
) {
  const [year, month] = iso.split('-');
  await trigger.click();
  const calendar = page.getByRole('dialog');
  await calendar.getByRole('combobox').last().click();
  await page.getByRole('option', { name: year, exact: true }).click();
  await calendar.getByRole('combobox').first().click();
  await page
    .getByRole('option')
    .nth(Number(month) - 1)
    .click();
  await calendar.locator(`[data-day="${iso}"] button`).click();
  await expect(calendar).toBeHidden();
}

// Stefan, 2026-10-31: "some information from the forms is missing on the
// PDFs". Every field filled in the builder must be on the CV, in every template.
test('everything typed in the builder is on the CV, in all five templates', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const cand = await signIn(page);
  await gotoHydrated(page, '/sr/candidate/cv/build', '#cv-fullName');
  await page.getByLabel('Ime i prezime').fill('Ime Prezimić');
  await page.getByLabel('Telefon').fill('+381 11 222 3333');
  await page.getByLabel('Naslov').fill('Naslov Polje');
  await page.getByLabel('O meni (nije obavezno)').fill('Sažetak polje.');
  await page.getByRole('button', { name: 'Dodaj link' }).click();
  await page.getByLabel('Naziv', { exact: true }).fill('Portfolio');
  await page.getByLabel('Adresa (https://…)').fill('https://primer.rs/radovi');
  const next = page.getByRole('button', { name: 'Dalje' });

  await next.click(); // experience
  await page.getByRole('button', { name: 'Dodaj iskustvo' }).click();
  await page.getByLabel('Poslodavac').fill('Firma Polje');
  await page.getByLabel('Pozicija').fill('Pozicija Polje');
  await pickDate(page, page.locator('#cv-ex-start-0'), '2020-01-01');
  await pickDate(page, page.locator('#cv-ex-end-0'), '2021-02-01');
  await page.getByLabel('Opis').fill('Opis polje.');

  await next.click(); // education
  await page.getByRole('button', { name: 'Dodaj obrazovanje' }).click();
  await page.locator('#cv-ed-institution-0').fill('Škola Polje');
  await page.locator('#cv-ed-degree-0').fill('Zvanje Polje');
  await page.locator('#cv-ed-field-0').fill('Smer Polje');
  await pickDate(page, page.locator('#cv-ed-start-0'), '2014-09-01');

  await next.click(); // skills
  await page.getByRole('button', { name: 'Dodaj veštinu' }).click();
  await page.getByRole('textbox').last().fill('Veština Polje');

  await next.click(); // languages, licences, certificates
  await page.getByRole('button', { name: 'Dodaj jezik' }).click();
  await page.getByLabel('Jezik', { exact: true }).fill('Jezik Polje');
  await page.getByLabel('Nivo').selectOption('B2');
  await page
    .getByRole('group', { name: 'Vozačka dozvola' })
    .getByRole('button', { name: 'CE', exact: true })
    .click();
  await page.getByRole('button', { name: 'Dodaj sertifikat' }).click();
  await page.locator('#cv-cert-name-0').fill('Sertifikat Polje');
  await page.locator('#cv-cert-issuer-0').fill('Izdavač Polje');
  await page.locator('#cv-cert-year-0').fill('2020');
  await page.getByLabel('Digitalne veštine').fill('Digitalno Polje');
  await page.getByLabel('Kada možeš da počneš').fill('Dostupnost Polje');

  const expected = [
    'Ime Prezimić',
    cand.email,
    '+381 11 222 3333',
    'Naslov Polje',
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
    'Portfolio',
    'https://primer.rs/radovi',
    'Digitalno Polje',
    'Dostupnost Polje',
  ];
  for (const name of [
    'Klasičan',
    'Moderan',
    'Minimalan',
    'Evropski format',
    'Praktičan',
  ]) {
    if (!page.url().endsWith('/cv/build')) {
      await gotoHydrated(page, '/sr/candidate/cv/build', '#cv-fullName');
      for (let i = 0; i < 5; i++) await next.click();
    } else {
      await next.click(); // template
    }
    await page.getByRole('button', { name: new RegExp(name) }).click();
    await next.click(); // generate
    await page
      .getByRole('button', { name: 'Sačuvaj profil i generiši CV' })
      .click();
    await expect(page.getByText(`Generisan (${name})`).first()).toBeVisible();
    const text = (await generatedCvText(cand)).toLowerCase();
    for (const value of expected) {
      expect(text, `${name}: ${value}`).toContain(value.toLowerCase());
    }
  }
});

// PR 5a: the colour picked in the builder is the colour of the CV.
test('the colour picked in the builder is the colour on the CV', async ({
  page,
}) => {
  const cand = await signIn(page);
  await gotoHydrated(page, '/sr/candidate/cv/build', '#cv-fullName');
  await page.getByLabel('Ime i prezime').fill('Ana Bojić');
  const next = page.getByRole('button', { name: 'Dalje' });
  for (let i = 0; i < 5; i++) await next.click();
  await page.getByRole('button', { name: /Moderan/ }).click();
  await page.getByRole('radio', { name: 'Šljiva' }).click();
  await expect(page.getByRole('radio', { name: 'Šljiva' })).toBeChecked();
  await next.click(); // generate
  await page
    .getByRole('button', { name: 'Sačuvaj profil i generiši CV' })
    .click();
  await expect(page.getByText('Generisan (Moderan)')).toBeVisible();

  const pdf = await newestGeneratedCv(cand);
  const { OPS } = await getResolvedPDFJS();
  const ops = await (await pdf.getPage(1)).getOperatorList();
  const fills = ops.fnArray.flatMap((fn, i) =>
    fn === OPS.setFillRGBColor ? [String(ops.argsArray[i]?.[0])] : [],
  );
  expect(fills).toContain('#5b2a55');
  expect(fills).not.toContain('#0b6e65');
});
