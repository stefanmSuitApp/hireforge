import { afterEach, describe, expect, it, vi } from 'vitest';

import { runWithCorrelationId } from './correlation-context';
import { workerLog } from './worker-log';

function captureLog(): () => Record<string, unknown> {
  const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  return () => JSON.parse(String(spy.mock.calls.at(-1)?.[0]));
}

describe('workerLog', () => {
  afterEach(() => vi.restoreAllMocks());

  it('carries the correlation id of the job it runs in', async () => {
    const last = captureLog();
    await runWithCorrelationId('req-123', async () => {
      workerLog('info', 'outbox_event_handled', { eventType: 'job_published' });
    });
    expect(last()).toMatchObject({
      level: 'info',
      msg: 'outbox_event_handled',
      eventType: 'job_published',
      correlationId: 'req-123',
    });
  });

  it('generates a correlation id when the job has none', async () => {
    for (const given of [undefined, '  ']) {
      const last = captureLog();
      await runWithCorrelationId(given, async () => {
        workerLog('info', 'probe');
      });
      expect(last()['correlationId']).toMatch(/^[0-9a-f-]{36}$/);
    }
  });
});
