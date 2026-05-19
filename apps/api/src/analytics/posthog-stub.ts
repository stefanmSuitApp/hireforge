import { Logger } from '@nestjs/common';

const log = new Logger('Analytics');

/**
 * Stub analytics hook until cookie-consent–gated PostHog ships (SSOT Step 16/17).
 * Set `POSTHOG_CAPTURE=true` to log structured debug lines locally.
 */
export function captureSubscriptionPurchasePromo(props: {
  promo_code: string;
  subscription_id: string;
  company_id: string;
}): void {
  if (process.env['POSTHOG_CAPTURE']?.trim() !== 'true') {
    return;
  }
  log.debug(`capture subscription_purchase_promo ${JSON.stringify(props)}`);
}
