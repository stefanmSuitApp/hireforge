// CV templates PR 1 (docs/plans/CV_TEMPLATES.md): a candidate builds a CV in
// the app and the PDF speaks Serbian (titles, "danas") and carries the email.
import { expect, test } from '@playwright/test';
import { extractText, getDocumentProxy } from 'unpdf';

import { readyCandidate } from './support/candidate';
import { gotoHydrated } from './support/ui';

test('a candidate builds a CV that is in Serbian and has their email', async ({
  page,
}) => {
  const cand = await readyCandidate();
  await gotoHydrated(page, '/sr/candidate/login', '#candidate-email');
  await page.locator('#candidate-email').fill(cand.email);
  await page.locator('#candidate-password').fill(cand.password);
  await page.locator('#candidate-password').press('Enter');
  await expect(page).toHaveURL(/\/sr\/candidate$/);

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

  const list = await cand.api.get('candidate/resumes');
  const resumes = (await list.json()) as {
    id: string;
    source: string;
  }[];
  const generated = resumes.find((r) => r.source === 'generated');
  expect(generated).toBeDefined();
  const pdf = await cand.api.get(`candidate/resumes/${generated!.id}/download`);
  expect(pdf.ok()).toBeTruthy();
  const doc = await getDocumentProxy(new Uint8Array(await pdf.body()));
  const { text } = await extractText(doc, { mergePages: true });
  expect(text).toContain('Jelena Jović');
  expect(text).toContain('Veštine');
  expect(text).toContain(cand.email);
  expect(text).not.toContain('Skills');
});
