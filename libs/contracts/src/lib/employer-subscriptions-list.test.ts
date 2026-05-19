import { describe, expect, it } from 'vitest';

import {
  employerSubscriptionsListResponseSchema,
  type EmployerSubscriptionsListResponse,
} from './employer-subscriptions-list';

describe('employerSubscriptionsListResponseSchema', () => {
  it('parses a minimal list', () => {
    const raw: EmployerSubscriptionsListResponse = {
      items: [
        {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          packageCode: 'tezga',
          packageNameSnapshot: 'Tezga',
          status: 'active',
          startsAt: '2026-01-01T00:00:00.000Z',
          endsAt: '2027-01-01T00:00:00.000Z',
          proformaId: null,
        },
      ],
    };
    const parsed = employerSubscriptionsListResponseSchema.parse(raw);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].packageCode).toBe('tezga');
  });
});
