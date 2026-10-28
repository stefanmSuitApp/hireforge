// T5.1 the shared helpers every app uses: the API client, structured logs,
// BullMQ failure logs and prefix, the Sanity read client.
import type { Job } from 'bullmq';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { startStubServer, type StubServer } from 'testing';
import { ApiError, createApiClient } from './api-client';
import {
  bullmqJobCorrelationIdFromData,
  logBullmqEnqueueFailed,
  logBullmqJobFailed,
} from './bullmq/job-logging';
import { bullmqPrefixFromEnv } from './bullmq/redis-connection';
import {
  CORRELATION_ID_HEADER,
  createRequestId,
  REQUEST_ID_HEADER,
} from './correlation';
import { createSanityReadClient } from './sanity';
import { writeLog } from './structured-log';

let api: StubServer;
beforeAll(async () => {
  api = await startStubServer({ status: 200, body: '{"ok":true}' });
});
afterAll(() => api.close());
afterEach(() => {
  vi.restoreAllMocks();
  delete process.env['BULLMQ_PREFIX'];
});

describe('the API client', () => {
  it('joins base and path, sends JSON headers, the caller headers and a request id', async () => {
    const client = createApiClient({
      baseUrl: `${api.url}/`,
      getHeaders: () => ({ authorization: 'Bearer t', skip: undefined }),
    });
    expect(await client.getJson('api/x')).toEqual({ ok: true });
    const req = api.requests.at(-1);
    expect(req?.path).toBe('/api/x');
    expect(req?.headers['content-type']).toBe('application/json');
    expect(req?.headers['authorization']).toBe('Bearer t');
    expect(req?.headers[REQUEST_ID_HEADER]).toMatch(/^[0-9a-f-]{36}$/);
    expect(req?.headers).not.toHaveProperty('skip');
  });

  it('keeps a request id the caller already has (either header, any header shape)', async () => {
    const client = createApiClient({ baseUrl: api.url });
    await client.getJson('/a', {
      headers: new Headers({ [CORRELATION_ID_HEADER]: 'corr-1' }),
    });
    expect(api.requests.at(-1)?.headers[REQUEST_ID_HEADER]).toBe('corr-1');
    await client.getJson('/b', { headers: [[REQUEST_ID_HEADER, 'req-2']] });
    expect(api.requests.at(-1)?.headers[REQUEST_ID_HEADER]).toBe('req-2');
    await client.getJson('/c', { headers: { [REQUEST_ID_HEADER]: 'req-3' } });
    expect(api.requests.at(-1)?.headers[REQUEST_ID_HEADER]).toBe('req-3');
  });

  it('accepts an absolute URL as the path', async () => {
    const client = createApiClient({ baseUrl: 'http://unused.invalid' });
    await client.getJson(`${api.url}/abs`);
    expect(api.requests.at(-1)?.path).toBe('/abs');
  });

  it('an empty body is undefined; an error status throws ApiError with the body', async () => {
    const client = createApiClient({ baseUrl: api.url });
    api.reply({ status: 204 });
    expect(await client.getJson('/empty')).toBeUndefined();
    api.reply({ status: 409, body: '{"error":{"code":"CONFLICT"}}' });
    const error = await client.getJson('/conflict').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      body: '{"error":{"code":"CONFLICT"}}',
      name: 'ApiError',
    });
    api.reply({ status: 200, body: '{"ok":true}' });
  });

  it('request ids are fresh UUIDs', () => {
    expect(createRequestId()).not.toBe(createRequestId());
  });
});

describe('structured logs', () => {
  it('info goes to stdout and warn/error to stderr, as one JSON line with ts, level and fields', () => {
    const out = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    writeLog('info', 'hello', { service: 'api' });
    writeLog('warn', 'careful');
    writeLog('error', 'boom', { code: 1 });
    expect(JSON.parse(String(out.mock.calls[0]?.[0]))).toMatchObject({
      level: 'info',
      msg: 'hello',
      service: 'api',
      ts: expect.any(String),
    });
    expect(err.mock.calls.map((c) => JSON.parse(String(c[0])).level)).toEqual([
      'warn',
      'error',
    ]);
  });
});

describe('BullMQ logs and prefix', () => {
  const job = (data: unknown) =>
    ({
      id: '7',
      name: 'outbox-dispatch',
      attemptsMade: 5,
      failedReason: 'x',
      data,
    }) as unknown as Job;

  it('a failed job logs its id, name, attempts and the correlation id when there is one', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logBullmqJobFailed(job({}), new Error('boom'), {
      service: 'worker',
      queueName: 'platform',
      correlationId: 'c-1',
    });
    logBullmqJobFailed(undefined, 'plain', {
      service: 'worker',
      queueName: 'platform',
    });
    const [first, second] = err.mock.calls.map((c) => JSON.parse(String(c[0])));
    expect(first).toMatchObject({
      jobId: '7',
      jobName: 'outbox-dispatch',
      attemptsMade: 5,
      err: 'boom',
      correlationId: 'c-1',
    });
    expect(second).toMatchObject({
      jobId: '',
      jobName: '',
      attemptsMade: 0,
      err: 'plain',
    });
    expect(second).not.toHaveProperty('correlationId');
  });

  it('an enqueue failure is logged with the job name', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logBullmqEnqueueFailed('integration-ping', new Error('redis down'));
    logBullmqEnqueueFailed('integration-ping', 'x', {
      service: 'api',
      correlationId: 'c-2',
    });
    expect(JSON.parse(String(err.mock.calls[0]?.[0]))).toMatchObject({
      msg: 'bullmq_enqueue_failed',
      err: 'redis down',
    });
    expect(JSON.parse(String(err.mock.calls[1]?.[0]))).toMatchObject({
      correlationId: 'c-2',
    });
  });

  it('reads the correlation id from a job payload, trimmed, or gives ""', () => {
    expect(
      bullmqJobCorrelationIdFromData(job({ correlationId: ' c-3 ' })),
    ).toBe('c-3');
    expect(bullmqJobCorrelationIdFromData(job({ correlationId: '  ' }))).toBe(
      '',
    );
    expect(bullmqJobCorrelationIdFromData(job(null))).toBe('');
    expect(bullmqJobCorrelationIdFromData(undefined)).toBe('');
  });

  it('the queue prefix comes from BULLMQ_PREFIX, else {hireforge} (API and worker must agree)', () => {
    expect(bullmqPrefixFromEnv()).toBe('{hireforge}');
    process.env['BULLMQ_PREFIX'] = '  ';
    expect(bullmqPrefixFromEnv()).toBe('{hireforge}');
    process.env['BULLMQ_PREFIX'] = '{staging}';
    expect(bullmqPrefixFromEnv()).toBe('{staging}');
  });
});

describe('Sanity read client', () => {
  it('is null without a project id, and a client with defaults otherwise', () => {
    expect(
      createSanityReadClient({ projectId: '', dataset: 'production' }),
    ).toBeNull();
    const client = createSanityReadClient({
      projectId: 'abc123',
      dataset: 'production',
    });
    expect(client?.config()).toMatchObject({
      projectId: 'abc123',
      dataset: 'production',
      apiVersion: '2024-01-01',
      useCdn: true,
    });
  });
});
