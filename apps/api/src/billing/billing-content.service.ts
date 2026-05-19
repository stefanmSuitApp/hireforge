import { Injectable } from '@nestjs/common';
import { createClient, type SanityClient } from '@sanity/client';

export type BillingContentLocale = 'sr' | 'en';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pickLocale(
  loc: BillingContentLocale,
  sr?: string | null,
  en?: string | null,
): string {
  if (loc === 'en' && en && en.trim()) {
    return en.trim();
  }
  return (sr ?? en ?? '').trim();
}

type WireFields = {
  accountHolder: string;
  bankName: string;
  iban: string;
  swift: string;
  refLine: string;
};

@Injectable()
export class BillingContentService {
  private sanity(): SanityClient | null {
    const projectId =
      process.env.SANITY_PROJECT_ID?.trim() ||
      process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
    const dataset =
      process.env.SANITY_DATASET?.trim() ||
      process.env.NEXT_PUBLIC_SANITY_DATASET?.trim();
    const token = process.env.SANITY_API_READ_TOKEN?.trim();
    if (!projectId || !dataset || !token) {
      return null;
    }
    return createClient({
      projectId,
      dataset,
      apiVersion: '2024-01-01',
      useCdn: false,
      token,
    });
  }

  /**
   * Plain-text refund excerpt for proforma HTML / PDF footer (CMS `refundPolicy.summary` or env).
   */
  async refundExcerpt(locale: BillingContentLocale): Promise<string | null> {
    const c = this.sanity();
    if (c) {
      try {
        const doc = await c.fetch<{
          summary?: { sr?: string; en?: string };
        }>(`*[_type == "refundPolicy"] | order(_updatedAt desc)[0]{ summary }`);
        const s = doc?.summary;
        const text = pickLocale(locale, s?.sr, s?.en);
        if (text) {
          return text;
        }
      } catch {
        /* fall through */
      }
    }
    const fb =
      locale === 'en'
        ? process.env.BILLING_REFUND_EXCERPT_EN?.trim()
        : process.env.BILLING_REFUND_EXCERPT_SR?.trim();
    return fb && fb.length > 0 ? fb : null;
  }

  private async loadWireTransferFields(
    locale: BillingContentLocale,
    proformaNumber: string,
  ): Promise<WireFields | null> {
    const c = this.sanity();
    let accountHolder = '';
    let bankName = '';
    let iban = '';
    let swift = '';
    let hint = '';

    if (c) {
      try {
        const doc = await c.fetch<{
          wireTransfer?: {
            accountHolderSr?: string;
            accountHolderEn?: string;
            bankNameSr?: string;
            bankNameEn?: string;
            iban?: string;
            swiftBic?: string;
            paymentReferenceHintSr?: string;
            paymentReferenceHintEn?: string;
          };
        }>(`*[_id == "siteSettings"][0]{ wireTransfer }`);
        const w = doc?.wireTransfer;
        if (w) {
          accountHolder = pickLocale(
            locale,
            w.accountHolderSr,
            w.accountHolderEn,
          );
          bankName = pickLocale(locale, w.bankNameSr, w.bankNameEn);
          iban = (w.iban ?? '').trim();
          swift = (w.swiftBic ?? '').trim();
          hint = pickLocale(
            locale,
            w.paymentReferenceHintSr,
            w.paymentReferenceHintEn,
          );
        }
      } catch {
        /* env fallback */
      }
    }

    if (!accountHolder) {
      accountHolder = pickLocale(
        locale,
        process.env.BILLING_WIRE_ACCOUNT_HOLDER_SR?.trim(),
        process.env.BILLING_WIRE_ACCOUNT_HOLDER_EN?.trim(),
      );
    }
    if (!bankName) {
      bankName = pickLocale(
        locale,
        process.env.BILLING_WIRE_BANK_SR?.trim(),
        process.env.BILLING_WIRE_BANK_EN?.trim(),
      );
    }
    if (!iban) {
      iban = process.env.BILLING_IBAN?.trim() ?? '';
    }
    if (!swift) {
      swift = process.env.BILLING_SWIFT_BIC?.trim() ?? '';
    }
    if (!hint) {
      hint = pickLocale(
        locale,
        process.env.BILLING_PAYMENT_REFERENCE_HINT_SR?.trim(),
        process.env.BILLING_PAYMENT_REFERENCE_HINT_EN?.trim(),
      );
    }

    if (!accountHolder && !bankName && !iban) {
      return null;
    }

    const refLine =
      hint ||
      (locale === 'en'
        ? `Reference: proforma ${proformaNumber}`
        : `Poziv na broj / svrha: predračun ${proformaNumber}`);

    return { accountHolder, bankName, iban, swift, refLine };
  }

  /**
   * Lines for PDF / plain email (no HTML).
   */
  async wireTransferPlainLines(
    locale: BillingContentLocale,
    opts: { proformaNumber: string },
  ): Promise<string[]> {
    const w = await this.loadWireTransferFields(locale, opts.proformaNumber);
    if (!w) {
      return [];
    }
    const lines: string[] = [];
    const ahLabel = locale === 'en' ? 'Account holder' : 'Primalac';
    const bankLabel = locale === 'en' ? 'Bank' : 'Banka';
    if (w.accountHolder) {
      lines.push(`${ahLabel}: ${w.accountHolder}`);
    }
    if (w.bankName) {
      lines.push(`${bankLabel}: ${w.bankName}`);
    }
    if (w.iban) {
      lines.push(`IBAN: ${w.iban}`);
    }
    if (w.swift) {
      lines.push(`SWIFT/BIC: ${w.swift}`);
    }
    lines.push(w.refLine);
    return lines;
  }

  /**
   * Short HTML fragment with wire-transfer instructions (CMS `siteSettings.wireTransfer` or env).
   */
  async paymentInstructionsHtml(
    locale: BillingContentLocale,
    opts: { proformaNumber: string },
  ): Promise<string | null> {
    const w = await this.loadWireTransferFields(locale, opts.proformaNumber);
    if (!w) {
      return null;
    }
    const ahLabel = locale === 'en' ? 'Account holder' : 'Primalac';
    const bankLabel = locale === 'en' ? 'Bank' : 'Banka';
    const parts: string[] = [];
    if (w.accountHolder) {
      parts.push(
        `<p><strong>${esc(ahLabel)}</strong>: ${esc(w.accountHolder)}</p>`,
      );
    }
    if (w.bankName) {
      parts.push(
        `<p><strong>${esc(bankLabel)}</strong>: ${esc(w.bankName)}</p>`,
      );
    }
    if (w.iban) {
      parts.push(`<p><strong>IBAN</strong>: ${esc(w.iban)}</p>`);
    }
    if (w.swift) {
      parts.push(`<p><strong>SWIFT/BIC</strong>: ${esc(w.swift)}</p>`);
    }
    parts.push(`<p>${esc(w.refLine)}</p>`);
    return parts.join('');
  }

  /**
   * Sanity `siteSettings.jobDescriptionLinkHostBlocklist`: comma-separated hostnames
   * to forbid in TipTap hyperlink `href`s. Merged server-side with
   * `EDITOR_LINK_HOST_BLOCKLIST`.
   */
  async jobDescriptionHostBlocklistFromSanity(): Promise<string[]> {
    const c = this.sanity();
    if (!c) {
      return [];
    }
    try {
      const doc = await c.fetch<{ jobDescriptionLinkHostBlocklist?: string }>(
        `*[_id == "siteSettings"][0]{ jobDescriptionLinkHostBlocklist }`,
      );
      const raw = doc?.jobDescriptionLinkHostBlocklist?.trim();
      if (!raw) {
        return [];
      }
      return raw
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
    } catch {
      return [];
    }
  }
}
