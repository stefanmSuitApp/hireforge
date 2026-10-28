// Generates the "B can't reach A's record" tests for one resource (T2.3),
// after autofind's describeTenantIsolation. Hireforge routes are not uniform
// CRUD, so a resource lists the calls that exist for it.
import type { INestApplication } from '@nestjs/common';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Headers } from './test-app';
import { http } from './test-app';

type Method = 'get' | 'post' | 'patch' | 'delete';

export interface IsolatedCall {
  /** Shown in test names, e.g. 'submit for moderation'. */
  name: string;
  method: Method;
  path: (id: string) => string;
  body?: Record<string, unknown>;
  /** What the owner gets. Default 200 for get, 201 for post, 200 otherwise. */
  okStatus?: number;
  /** What the other party gets. Default 404 (don't even confirm it exists). */
  deniedStatus?: readonly number[];
  /** Skip the owner's positive call (e.g. it needs a file that isn't there). */
  ownerSkip?: boolean;
}

export interface Party {
  headers: Headers;
  /** Ids a careless handler might trust from the client: the forged values. */
  companyId?: string;
  candidateId?: string;
  userId: string;
}

export interface IsolatedResource {
  name: string;
  app: () => INestApplication;
  /** The owner (A) and the other party (B), both signed in. */
  parties: () => Promise<{ a: Party; b: Party }>;
  /** Creates A's record and returns its id. */
  create: (a: Party) => Promise<string>;
  /** The row as the database has it, to prove B's attempt changed nothing. */
  snapshot: (id: string) => Promise<unknown>;
  /** A list endpoint of B that must never show A's record, and of A that must. */
  list?: string;
  /** Calls on one record. B's denied attempts run before A's own. */
  calls: readonly IsolatedCall[];
}

const okFor = (call: IsolatedCall) =>
  call.okStatus ?? (call.method === 'post' ? 201 : 200);

/**
 * B gets 404 (or the listed status) on every call to A's record, also when it
 * sends A's company or candidate id in query, header and body, and the row
 * stays exactly as it was. Positive controls prove A still can.
 */
export function describeIsolation(resource: IsolatedResource): void {
  describe(`${resource.name}: the other party can't reach the owner's record`, () => {
    let a: Party;
    let b: Party;
    let id = '';
    const request = () => http(resource.app());

    beforeAll(async () => {
      ({ a, b } = await resource.parties());
      id = await resource.create(a);
    });

    if (resource.list) {
      const list = resource.list;
      it(`B's ${list} doesn't include A's record`, async () => {
        const res = await request().get(list).set(b.headers).expect(200);
        expect(JSON.stringify(res.body)).not.toContain(id);
      });

      it(`B's ${list} ignores A's ids sent in query and headers`, async () => {
        const forged = new URLSearchParams({
          ...(a.companyId && { companyId: a.companyId }),
          ...(a.candidateId && { candidateId: a.candidateId }),
          userId: a.userId,
        });
        const res = await request()
          .get(`${list}?${forged}`)
          .set(b.headers)
          .set('x-company-id', a.companyId ?? '')
          .expect(200);
        expect(JSON.stringify(res.body)).not.toContain(id);
      });

      it(`A's ${list} includes its record`, async () => {
        const res = await request().get(list).set(a.headers).expect(200);
        expect(JSON.stringify(res.body)).toContain(id);
      });
    }

    for (const call of resource.calls) {
      const denied = call.deniedStatus ?? [404];

      it(`${call.name}: B gets ${denied.join('/')} for A's record and it stays unchanged`, async () => {
        const before = await resource.snapshot(id);
        const res = await request()
          [call.method](call.path(id))
          .set(b.headers)
          .send(call.body ?? {});
        expect(denied, JSON.stringify(res.body)).toContain(res.status);
        expect(await resource.snapshot(id)).toEqual(before);
      });

      it(`${call.name}: B is still refused when it sends A's ids in query, header and body`, async () => {
        const before = await resource.snapshot(id);
        const forged = {
          ...(a.companyId && { companyId: a.companyId }),
          ...(a.candidateId && { candidateId: a.candidateId }),
          userId: a.userId,
        };
        const res = await request()
          [call.method](`${call.path(id)}?${new URLSearchParams(forged)}`)
          .set(b.headers)
          .set('x-company-id', a.companyId ?? '')
          .send({ ...call.body, ...forged });
        expect(denied, JSON.stringify(res.body)).toContain(res.status);
        expect(await resource.snapshot(id)).toEqual(before);
      });

      it(`${call.name}: a request without a session is refused`, async () => {
        const res = await request()
          [call.method](call.path(id))
          .send(call.body ?? {});
        expect(res.status).toBe(401);
      });
    }

    for (const call of resource.calls) {
      if (call.ownerSkip) continue;
      // Positive control: without it, a route answering 404 to everyone passes.
      it(`${call.name}: A can do it to its own record`, async () => {
        const res = await request()
          [call.method](call.path(id))
          .set(a.headers)
          .send(call.body ?? {});
        expect(res.status, JSON.stringify(res.body)).toBe(okFor(call));
      });
    }
  });
}
