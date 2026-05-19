import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  companies,
  employers,
  invoices,
  proformas,
  subscriptions,
  users,
} from 'database';
import {
  getCachedNbsMiddleRateOrFetch,
  type RedisStringCache,
} from 'server-billing';
import { renderBillingFormToBuffer } from 'server-pdf';

import {
  BillingContentService,
  type BillingContentLocale,
} from './billing-content.service';
import { BillingStorageService } from './billing-storage.service';
import { getDb } from '../database';
import { getRedis } from '../redis';

function billingRedisCache(): RedisStringCache | undefined {
  const redis = getRedis();
  if (!redis) {
    return undefined;
  }
  return {
    get: (key) => redis.get(key),
    setex: (key, sec, value) => redis.setex(key, sec, value),
  };
}

function isBillingTestMode(): boolean {
  return process.env.BILLING_TEST_MODE?.trim() === '1';
}

function billingPdfLocale(lang: unknown): BillingContentLocale {
  return lang === 'en' ? 'en' : 'sr';
}

function intlForBillingPdf(locale: BillingContentLocale): string {
  return locale === 'en' ? 'en-US' : 'sr-Latn-RS';
}

function billingDocTitle(
  kind: 'proforma' | 'invoice',
  locale: BillingContentLocale,
): string {
  if (locale === 'en') {
    return kind === 'proforma' ? 'Pro forma invoice' : 'Invoice';
  }
  return kind === 'proforma' ? 'Predračun' : 'Račun';
}

function formatMinor(minor: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

function eurToRsdLabel(
  totalMinor: number,
  rateStr: string,
  locale: BillingContentLocale,
): string {
  const eur = totalMinor / 100;
  const rate = Number.parseFloat(rateStr);
  if (!Number.isFinite(rate) || rate <= 0) {
    return '';
  }
  const rsd = eur * rate;
  try {
    const rsdMinor = Math.round(rsd * 100);
    const intlLocale = intlForBillingPdf(locale);
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 2,
    }).format(rsdMinor / 100);
  } catch {
    return `${rsd.toFixed(2)} RSD`;
  }
}

function rsClientRsdLine(opts: {
  locale: BillingContentLocale;
  rsdFmt: string;
  nbsRate: string | null;
  variant: 'proforma' | 'invoice';
}): string | null {
  if (!opts.rsdFmt) {
    return null;
  }
  if (opts.variant === 'proforma' && opts.nbsRate && opts.locale === 'sr') {
    return `RSD (obavezno): ${opts.rsdFmt} (srednji kurs NBS ${opts.nbsRate}, informativno EUR iznad)`;
  }
  if (opts.variant === 'proforma' && opts.nbsRate && opts.locale === 'en') {
    return `RSD (binding): ${opts.rsdFmt} (NBS middle rate ${opts.nbsRate}; EUR above is informative only)`;
  }
  if (opts.variant === 'invoice' && opts.locale === 'en') {
    return `RSD (binding amount): ${opts.rsdFmt}`;
  }
  return `RSD (obavezno): ${opts.rsdFmt}`;
}

@Injectable()
export class BillingPdfService {
  private readonly log = new Logger(BillingPdfService.name);

  constructor(
    private readonly storage: BillingStorageService,
    private readonly content: BillingContentService,
  ) {}

  private storageKeyProforma(companyId: string, proformaId: string): string {
    return `companies/${companyId}/billing/proforma-${proformaId}.pdf`;
  }

  private storageKeyInvoice(companyId: string, invoiceId: string): string {
    return `companies/${companyId}/billing/invoice-${invoiceId}.pdf`;
  }

  async generateProformaPdf(proformaId: string): Promise<void> {
    const database = getDb();
    if (!database) {
      return;
    }
    const [row] = await database.db
      .select({
        prof: proformas,
        sub: subscriptions,
        company: companies,
      })
      .from(proformas)
      .innerJoin(subscriptions, eq(proformas.subscriptionId, subscriptions.id))
      .innerJoin(companies, eq(subscriptions.companyId, companies.id))
      .where(eq(proformas.id, proformaId))
      .limit(1);

    if (!row || row.prof.pdfStorageKey) {
      return;
    }

    const rs = row.company.countryCode === 'RS';
    const locale = billingPdfLocale(row.company.invoiceLanguage);
    const intlLc = intlForBillingPdf(locale);
    const redis = billingRedisCache();
    let rsdLine: string | null = null;
    const primary = formatMinor(row.prof.totalMinor, row.prof.currency, intlLc);
    if (rs && row.prof.currency === 'EUR') {
      try {
        const nbs = await getCachedNbsMiddleRateOrFetch(redis);
        const rsdFmt = eurToRsdLabel(row.prof.totalMinor, nbs.rate, locale);
        rsdLine = rsClientRsdLine({
          locale,
          rsdFmt,
          nbsRate: nbs.rate,
          variant: 'proforma',
        });
      } catch (e) {
        this.log.warn(
          `NBS fetch failed for proforma ${proformaId}: ${String(e)}`,
        );
      }
    }

    const wireLines = await this.content.wireTransferPlainLines(locale, {
      proformaNumber: row.prof.number,
    });
    const refundFooter = await this.content.refundExcerpt(locale);
    const title = billingDocTitle('proforma', locale);
    const issued = row.prof.issuedAt.toISOString().slice(0, 10);
    const displayNumber = isBillingTestMode()
      ? `TEST-${row.prof.number}`
      : row.prof.number;

    const buf = await renderBillingFormToBuffer({
      locale,
      title,
      displayNumber,
      companyLegalName: row.company.legalName,
      issuedAtLabel: issued,
      amountPrimaryLabel: primary,
      amountSecondaryLabel: rsdLine,
      wireLines,
      refundFooter: refundFooter ?? undefined,
      testModeWatermark: isBillingTestMode(),
    });

    const key = this.storageKeyProforma(row.company.id, proformaId);
    await this.storage.put(key, buf);
    await database.db
      .update(proformas)
      .set({ pdfStorageKey: key, updatedAt: new Date() })
      .where(eq(proformas.id, proformaId));
  }

  async generateInvoicePdf(invoiceId: string): Promise<void> {
    const database = getDb();
    if (!database) {
      return;
    }
    const [row] = await database.db
      .select({
        inv: invoices,
        sub: subscriptions,
        company: companies,
      })
      .from(invoices)
      .innerJoin(subscriptions, eq(invoices.subscriptionId, subscriptions.id))
      .innerJoin(companies, eq(subscriptions.companyId, companies.id))
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!row || row.inv.pdfStorageKey) {
      return;
    }

    const rs = row.company.countryCode === 'RS';
    const locale = billingPdfLocale(row.company.invoiceLanguage);
    const intlLc = intlForBillingPdf(locale);
    const primary = formatMinor(row.inv.totalMinor, row.inv.currency, intlLc);
    let rsdLine: string | null = null;
    if (rs && row.inv.currency === 'EUR' && row.inv.nbsRate) {
      const rate =
        typeof row.inv.nbsRate === 'object' &&
        row.inv.nbsRate !== null &&
        'rate' in row.inv.nbsRate
          ? String((row.inv.nbsRate as { rate?: unknown }).rate ?? '')
          : '';
      if (rate) {
        const rsdFmt = eurToRsdLabel(row.inv.totalMinor, rate, locale);
        rsdLine = rsClientRsdLine({
          locale,
          rsdFmt,
          nbsRate: rate,
          variant: 'invoice',
        });
      }
    }

    let referenceNumber = row.inv.number;
    if (row.inv.proformaId) {
      const [pr] = await database.db
        .select({ n: proformas.number })
        .from(proformas)
        .where(eq(proformas.id, row.inv.proformaId))
        .limit(1);
      if (pr?.n) {
        referenceNumber = pr.n;
      }
    }

    const wireLines = await this.content.wireTransferPlainLines(locale, {
      proformaNumber: referenceNumber,
    });
    const refundFooter = await this.content.refundExcerpt(locale);
    const title = billingDocTitle('invoice', locale);
    const issued = row.inv.issuedAt.toISOString().slice(0, 10);
    const displayNumber = isBillingTestMode()
      ? `TEST-${row.inv.number}`
      : row.inv.number;

    const buf = await renderBillingFormToBuffer({
      locale,
      title,
      displayNumber,
      companyLegalName: row.company.legalName,
      issuedAtLabel: issued,
      amountPrimaryLabel: primary,
      amountSecondaryLabel: rsdLine,
      wireLines,
      refundFooter: refundFooter ?? undefined,
      testModeWatermark: isBillingTestMode(),
    });

    const key = this.storageKeyInvoice(row.company.id, invoiceId);
    await this.storage.put(key, buf);
    await database.db
      .update(invoices)
      .set({ pdfStorageKey: key, updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId));
  }

  async readPdf(storageKey: string): Promise<Buffer | null> {
    return this.storage.get(storageKey);
  }

  /** Employer user email for billing notifications. */
  async employerEmailForCompany(companyId: string): Promise<string | null> {
    const database = getDb();
    if (!database) {
      return null;
    }
    const [row] = await database.db
      .select({ email: users.email })
      .from(employers)
      .innerJoin(users, eq(employers.userId, users.id))
      .where(eq(employers.companyId, companyId))
      .limit(1);
    return row?.email?.trim() ?? null;
  }
}
