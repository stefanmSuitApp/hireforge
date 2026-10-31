// CV templates (docs/plans/CV_TEMPLATES.md): a candidate builds a CV in the
// app, and the PDF a scanner reads has what they entered, in Serbian.
import { expect, test, type Page } from '@playwright/test';
import { extractText, getDocumentProxy } from 'unpdf';

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

/** The text a scanner reads out of the candidate's generated CV. */
async function generatedCvText(cand: Candidate): Promise<string> {
  const list = await cand.api.get('candidate/resumes');
  const resumes = (await list.json()) as { id: string; source: string }[];
  const generated = resumes.find((r) => r.source === 'generated');
  expect(generated).toBeDefined();
  const pdf = await cand.api.get(`candidate/resumes/${generated!.id}/download`);
  expect(pdf.ok()).toBeTruthy();
  const doc = await getDocumentProxy(new Uint8Array(await pdf.body()));
  const { text } = await extractText(doc, { mergePages: true });
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
  await expect(page.getByText('Generisan (klasican)')).toBeVisible();

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
