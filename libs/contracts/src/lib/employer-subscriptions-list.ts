import { z } from 'zod';

import { packageCodeSchema } from './packages';
import { subscriptionStatusSchema } from './subscriptions';

/** Company-scoped subscriptions for employer UI (billing + posting eligibility). */
export const employerSubscriptionListItemSchema = z.object({
  id: z.uuid(),
  packageCode: packageCodeSchema,
  packageNameSnapshot: z.string(),
  status: subscriptionStatusSchema,
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  proformaId: z.uuid().nullable(),
});

export type EmployerSubscriptionListItem = z.infer<
  typeof employerSubscriptionListItemSchema
>;

export const employerSubscriptionsListResponseSchema = z.object({
  items: z.array(employerSubscriptionListItemSchema),
});

export type EmployerSubscriptionsListResponse = z.infer<
  typeof employerSubscriptionsListResponseSchema
>;
