// T5.2 the proforma / invoice PDF: the text a customer or accountant copies
// out of it carries the right number, buyer, amounts and payment details.
import { describe, expect, it } from 'vitest';
import { pdfText } from 'testing/pdf';
import {
  renderBillingFormToBuffer,
  type BillingFormPdfProps,
} from './billing-form-document';

const PROFORMA: BillingFormPdfProps = {
  locale: 'sr',
  title: 'Predračun',
  displayNumber: 'PR-2026/000042',
  companyLegalName: 'Građevina Šćepanović d.o.o.',
  issuedAtLabel: '2026-01-15',
  amountPrimaryLabel: '37,00 EUR',
  amountSecondaryLabel: 'Za plaćanje: 4.333,16 RSD (srednji kurs NBS 117,1234)',
  wireLines: [
    'Primalac: Šljakam d.o.o.',
    'Račun: 160-0000000000000-00',
    'Poziv na broj: PR-2026/000042',
  ],
  refundFooter: 'Povraćaj u roku od 14 dana.',
  testModeWatermark: false,
};

describe('billing PDF', () => {
  it('a Serbian proforma shows number, buyer (with Serbian letters), amounts, wire details and refund policy', async () => {
    const buf = await renderBillingFormToBuffer(PROFORMA);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    const text = await pdfText(buf);
    for (const expected of [
      'Predračun',
      'PR-2026/000042',
      'Kupac',
      'Građevina Šćepanović d.o.o.',
      'Datum',
      '2026-01-15',
      'Iznos',
      '37,00 EUR',
      '4.333,16 RSD',
      'Plaćanje (prenos)',
      'Račun: 160-0000000000000-00',
      'Politika povraćaja',
      'Povraćaj u roku od 14 dana.',
      'Šljakam — sljakam.com',
    ]) {
      expect(text, expected).toContain(expected);
    }
    expect(text).not.toContain('TEST');
  });

  it('an English invoice uses English labels and leaves out empty sections', async () => {
    const text = await pdfText(
      await renderBillingFormToBuffer({
        ...PROFORMA,
        locale: 'en',
        title: 'Invoice',
        displayNumber: 'RA-2026/000007',
        amountSecondaryLabel: null,
        wireLines: [],
        refundFooter: null,
      }),
    );
    expect(text).toContain('Bill to');
    expect(text).toContain('Issued');
    expect(text).toContain('Amount');
    expect(text).toContain('RA-2026/000007');
    expect(text).not.toContain('Payment (wire)');
    expect(text).not.toContain('Refund policy');
  });

  it('an English proforma labels the wire and refund sections in English', async () => {
    const text = await pdfText(
      await renderBillingFormToBuffer({
        ...PROFORMA,
        locale: 'en',
        title: 'Proforma',
      }),
    );
    expect(text).toContain('Payment (wire)');
    expect(text).toContain('Refund policy');
    expect(text).not.toContain('Plaćanje (prenos)');
  });

  it('test mode stamps TEST on the page', async () => {
    const text = await pdfText(
      await renderBillingFormToBuffer({ ...PROFORMA, testModeWatermark: true }),
    );
    expect(text).toContain('TEST');
  });
});
