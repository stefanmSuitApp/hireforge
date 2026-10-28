import { createServer, type IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface RecordedRequest {
  method: string;
  path: string;
  headers: IncomingHttpHeaders;
  body: string;
}

export interface StubReply {
  status: number;
  body?: string;
  headers?: Record<string, string>;
}

export interface StubServer {
  /** Base URL, always 127.0.0.1 (on this Mac `localhost` can resolve to ::1). */
  readonly url: string;
  readonly requests: RecordedRequest[];
  /** Change the reply for every following request. */
  reply(next: StubReply | ((req: RecordedRequest) => StubReply)): void;
  close(): Promise<void>;
}

/**
 * A local HTTP endpoint that records what it receives. Third parties (Resend,
 * NBS) are reached over HTTP, so pointing their URL here stubs them.
 */
export async function startStubServer(
  initial: StubReply = { status: 200 },
): Promise<StubServer> {
  let replyWith: (req: RecordedRequest) => StubReply = () => initial;
  const requests: RecordedRequest[] = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const recorded: RecordedRequest = {
        method: req.method ?? 'GET',
        path: req.url ?? '/',
        headers: req.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      };
      requests.push(recorded);
      const { status, body = '', headers = {} } = replyWith(recorded);
      res.writeHead(status, headers).end(body);
    });
  });
  await new Promise<void>((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve()),
  );
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    reply(next) {
      replyWith = typeof next === 'function' ? next : () => next;
    },
    close: () =>
      new Promise((resolve, reject) => {
        server.closeAllConnections();
        server.close((e) => (e ? reject(e) : resolve()));
      }),
  };
}

export interface SentEmail {
  id: string;
  from?: string;
  to: string[];
  subject?: string;
  html?: string;
  text?: string;
  idempotencyKey: string | null;
}

/**
 * Resend's `POST /emails`, with the same behaviour as e2e/support/fake-resend.mjs:
 * a repeated `Idempotency-Key` is accepted but not stored again. Point
 * `RESEND_API_URL` at `url` and set any `RESEND_API_KEY`.
 */
export async function startResendStub() {
  const stub = await startStubServer();
  const emails: SentEmail[] = [];
  const seen = new Set<string>();
  stub.reply((req) => {
    if (req.method !== 'POST' || !req.path.startsWith('/emails')) {
      return { status: 404, body: '{"error":"not_found"}' };
    }
    const key = req.headers['idempotency-key'];
    if (typeof key === 'string' && seen.has(key)) {
      return { status: 200, body: '{"id":"fake_dedup"}' };
    }
    if (typeof key === 'string') seen.add(key);
    const body = JSON.parse(req.body || '{}') as Omit<SentEmail, 'id'> & {
      to: string | string[];
    };
    const id = `fake_${emails.length + 1}`;
    emails.push({
      ...body,
      id,
      to: ([] as string[]).concat(body.to ?? []),
      idempotencyKey: typeof key === 'string' ? key : null,
    });
    return {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    };
  });
  return {
    ...stub,
    emails,
    /** What one address received, oldest first. */
    to: (address: string) => emails.filter((e) => e.to.includes(address)),
    /** Env for the API / worker under test. */
    env: { RESEND_API_KEY: 're_test_fake', RESEND_API_URL: stub.url },
  };
}

/** The NBS official middle-rate page, reduced to the EUR row the parser reads. */
export function nbsMiddleRateHtml(rsdPerEur = '117,1234'): string {
  return `<html><body><table><tr><td>EUR</td><td>978</td><td>EMU</td><td>1</td><td>${rsdPerEur}</td></tr></table></body></html>`;
}

/** An NBS page that answers `rsdPerEur` until told otherwise (`fail()` → 503). */
export async function startNbsStub(rsdPerEur = '117,1234') {
  const stub = await startStubServer({
    status: 200,
    headers: { 'content-type': 'text/html' },
    body: nbsMiddleRateHtml(rsdPerEur),
  });
  return {
    ...stub,
    pageUrl: `${stub.url}/ExchangeRateWebApp/ExchangeRate/CurrentMiddleRate`,
    fail: () => stub.reply({ status: 503, body: 'down' }),
  };
}

/**
 * Sanity client stand-in: `fetch(query, params)` answers from `docs` (by `_id`
 * in params, else by `_type` in the query) and records every call.
 */
export function fakeSanityClient(docs: Array<Record<string, unknown>>) {
  const calls: Array<{ query: string; params?: Record<string, unknown> }> = [];
  return {
    calls,
    async fetch<T = unknown>(
      query: string,
      params?: Record<string, unknown>,
    ): Promise<T> {
      calls.push({ query, params });
      const id = params?.['id'];
      if (typeof id === 'string') {
        return (docs.find((d) => d['_id'] === id) ?? null) as T;
      }
      const type = /_type\s*==\s*["']([^"']+)["']/.exec(query)?.[1];
      return docs.filter((d) => !type || d['_type'] === type) as T;
    },
  };
}
