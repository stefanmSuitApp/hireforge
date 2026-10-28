#!/usr/bin/env node
/**
 * Minimal stand-in for the Resend API used by e2e (RESEND_API_URL points
 * here). POST /emails stores the message (deduped by Idempotency-Key, like
 * Resend); GET /emails?to=<address> lists what that address received.
 */
import { createServer } from 'node:http';

const port = Number(process.env.FAKE_RESEND_PORT ?? 4300);
const emails = [];
const seenKeys = new Set();

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, 200, { ok: true });
  }
  if (req.method === 'GET' && url.pathname === '/emails') {
    const to = url.searchParams.get('to');
    return json(
      res,
      200,
      emails.filter((e) => !to || e.to.includes(to)),
    );
  }
  if (req.method === 'POST' && url.pathname === '/emails') {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      const key = req.headers['idempotency-key'];
      const id = `fake_${emails.length + 1}`;
      if (typeof key === 'string' && seenKeys.has(key)) {
        return json(res, 200, { id: 'fake_dedup' });
      }
      if (typeof key === 'string') {
        seenKeys.add(key);
      }
      const body = JSON.parse(raw || '{}');
      emails.push({ id, ...body, idempotencyKey: key ?? null });
      return json(res, 200, { id });
    });
    return undefined;
  }
  return json(res, 404, { error: 'not_found' });
}).listen(port, '127.0.0.1');
