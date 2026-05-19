import { z } from 'zod';

import { currencyCodeSchema } from './companies';
import {
  entitlementsBlobSchema,
  packageCodeSchema,
} from './packages';
import { promoCodeStringSchema } from './promo-codes';

// --- Lifecycle -------------------------------------------------------------

/** Subscription lifecycle (matches Postgres `subscription_status` enum). */
export const subscriptionStatuses = [
  'pending_payment',
  'active',
  'expired',
  'cancelled',
] as const;

export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

export const subscriptionStatusSchema = z.enum(subscriptionStatuses);

/**
 * Allowed state-machine transitions. Encoded as a `Set` of `from -> to` pairs
 * so the lookup is O(1) without a switch in service code (the service / Step 9
 * just checks `canTransition(...)` before calling `UPDATE … SET status = …`).
 */
const allowedTransitions =
  new Set<`${SubscriptionStatus}->${SubscriptionStatus}`>([
    // Payment marked → activate.
    'pending_payment->active',
    // Operator (employer / admin) abandons before paying.
    'pending_payment->cancelled',
    // Auto-expiry worker (per SSOT §7.3).
    'active->expired',
    // Manual cancellation while active (rare; see SSOT §10.5).
    'active->cancelled',
  ]);

export function canTransition(
  from: SubscriptionStatus,
  to: SubscriptionStatus,
): boolean {
  return allowedTransitions.has(`${from}->${to}`);
}

/** Normalize optional promo: omit empty strings; uppercase for matching DB `code`. */
const subscriptionPurchasePromoCodeSchema = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'string') return val.trim().toUpperCase();
  return val;
}, promoCodeStringSchema.optional());

// --- Purchase request ------------------------------------------------------

/**
 * Body posted by employer (or moderator on behalf of employer) when buying a
 * subscription. Service-side resolves `package_prices` by `(packageCode,
 * durationDays, currency)` and snapshots the row into the new subscription.
 */
export const subscriptionPurchaseRequestSchema = z.object({
  companyId: z.uuid(),
  packageCode: packageCodeSchema,
  durationDays: z.number().int().positive(),
  currency: currencyCodeSchema,
  /** Optional marketing code (Step 14). */
  promoCode: subscriptionPurchasePromoCodeSchema.optional(),
});

export type SubscriptionPurchaseRequest = z.infer<
  typeof subscriptionPurchaseRequestSchema
>;

// --- Response shape --------------------------------------------------------

export const subscriptionResponseSchema = z.object({
  id: z.uuid(),
  companyId: z.uuid(),
  packageCode: packageCodeSchema,
  packageNameSnapshot: z.string(),
  durationDaysSnapshot: z.number().int().positive(),
  priceMinorSnapshot: z.number().int().nonnegative(),
  currencySnapshot: currencyCodeSchema,
  entitlementsJsonSnapshot: entitlementsBlobSchema,
  status: subscriptionStatusSchema,
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  enabledByUserId: z.uuid().nullable(),
  enterpriseAdminUnlocked: z.boolean(),
  proformaId: z.uuid().nullable(),
  invoiceId: z.uuid().nullable(),
  /** SEF/GAZDA listing-cap override; null = use entitlements snapshot only. */
  maxActiveJobsOverride: z.number().int().positive().nullable(),
  /** Snapshot of promo code text when purchase used Step 14 promo; null otherwise. */
  appliedPromoCode: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>;

export const subscriptionProformaSummarySchema = z.object({
  id: z.uuid(),
  number: z.string(),
  totalMinor: z.number().int().nonnegative(),
  currency: currencyCodeSchema,
});

export const employerSubscriptionPurchaseResponseSchema = z.object({
  subscription: subscriptionResponseSchema,
  proforma: subscriptionProformaSummarySchema,
});

export type EmployerSubscriptionPurchaseResponse = z.infer<
  typeof employerSubscriptionPurchaseResponseSchema
>;

export const moderatorMarkSubscriptionPaidBodySchema = z.object({
  /** Optional bank reference / note (not persisted in MVP schema; reserved). */
  paymentReference: z.string().max(500).optional(),
});

export type ModeratorMarkSubscriptionPaidBody = z.infer<
  typeof moderatorMarkSubscriptionPaidBodySchema
>;

export const subscriptionInvoiceSummarySchema = z.object({
  id: z.uuid(),
  number: z.string(),
  totalMinor: z.number().int().nonnegative(),
  currency: currencyCodeSchema,
});

export const subscriptionMarkPaidResponseSchema = z.object({
  subscription: subscriptionResponseSchema,
  invoice: subscriptionInvoiceSummarySchema,
});

export type SubscriptionMarkPaidResponse = z.infer<
  typeof subscriptionMarkPaidResponseSchema
>;

export const adminSubscriptionMaxActiveJobsPatchBodySchema = z.object({
  maxActiveJobsOverride: z.number().int().positive().nullable(),
});

export type AdminSubscriptionMaxActiveJobsPatchBody = z.infer<
  typeof adminSubscriptionMaxActiveJobsPatchBodySchema
>;

export const adminSubscriptionCancelBodySchema = z.object({
  reason: z.string().max(1000).optional(),
});

export type AdminSubscriptionCancelBody = z.infer<
  typeof adminSubscriptionCancelBodySchema
>;

// --- Staff billing queues (Step 9.6) ---------------------------------------

export const pendingSubscriptionQueueItemSchema = z.object({
  subscriptionId: z.uuid(),
  companyId: z.uuid(),
  companyLegalName: z.string(),
  packageCode: packageCodeSchema,
  packageNameSnapshot: z.string(),
  priceMinor: z.number().int().nonnegative(),
  currency: currencyCodeSchema,
  proformaId: z.uuid().nullable(),
  proformaNumber: z.string().nullable(),
  proformaTotalMinor: z.number().int().nonnegative().nullable(),
  createdAt: z.string(),
});

export type PendingSubscriptionQueueItem = z.infer<
  typeof pendingSubscriptionQueueItemSchema
>;

export const pendingSubscriptionQueueResponseSchema = z.object({
  items: z.array(pendingSubscriptionQueueItemSchema),
});

export type PendingSubscriptionQueueResponse = z.infer<
  typeof pendingSubscriptionQueueResponseSchema
>;
