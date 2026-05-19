import { Injectable } from '@nestjs/common';

import { BillingContentService } from '../billing/billing-content.service';

function parseCommaHosts(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Cached merge of Sanity `siteSettings.jobDescriptionLinkHostBlocklist`
 * (`BillingContentService`) with `EDITOR_LINK_HOST_BLOCKLIST` (env).
 */
@Injectable()
export class EditorLinkPolicyService {
  private cache: { exp: number; hosts: string[] } | null = null;
  private readonly ttlMs = 90_000;

  constructor(private readonly billingContent: BillingContentService) {}

  async mergedJobDescriptionHostBlocklist(): Promise<string[]> {
    const now = Date.now();
    if (this.cache && this.cache.exp > now) {
      return this.cache.hosts;
    }
    const cms =
      await this.billingContent.jobDescriptionHostBlocklistFromSanity();
    const env = parseCommaHosts(process.env.EDITOR_LINK_HOST_BLOCKLIST);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const h of [...cms, ...env]) {
      const k = h.trim().toLowerCase();
      if (!k || seen.has(k)) {
        continue;
      }
      seen.add(k);
      out.push(k);
    }
    this.cache = { exp: now + this.ttlMs, hosts: out };
    return out;
  }
}
