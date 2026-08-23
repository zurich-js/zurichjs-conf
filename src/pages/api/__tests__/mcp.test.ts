import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/mcp';

/**
 * Drives the MCP handler over a real HTTP server so the Streamable HTTP
 * transport writes to a genuine socket, as it does in production. Covers the
 * auth gate, the JSON-RPC handshake, and one full tool call.
 */
let server: http.Server;
let base: string;

process.env.ZURICHJS_MCP_API_KEY = 'smoke-secret';
process.env.ADMIN_READONLY_API_KEY = 'admin-key';
process.env.ZURICHJS_INTERNAL_API_BASE_URL = 'https://conf.example.test';

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString();
      const nextReq = req as unknown as NextApiRequest;
      nextReq.body = raw ? JSON.parse(raw) : undefined;
      const nextRes = res as unknown as NextApiResponse;
      // Minimal Next res sugar used by the handler's error paths.
      nextRes.status = ((code: number) => { res.statusCode = code; return nextRes; }) as NextApiResponse['status'];
      nextRes.json = ((body: unknown) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(body));
        return nextRes;
      }) as NextApiResponse['json'];
      void handler(nextReq, nextRes);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const MCP_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
};

function rpc(method: string, params: Record<string, unknown> = {}, id: number | string = 1) {
  return JSON.stringify({ jsonrpc: '2.0', id, method, params });
}

const INIT = rpc('initialize', {
  protocolVersion: '2025-06-18',
  capabilities: {},
  clientInfo: { name: 'smoke', version: '1.0.0' },
});

describe('POST /api/mcp', () => {
  it('rejects a missing bearer token with 401', async () => {
    const res = await fetch(`${base}/`, { method: 'POST', headers: MCP_HEADERS, body: INIT });
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toContain('Bearer');
  });

  it('rejects a disallowed origin with 403', async () => {
    const res = await fetch(`${base}/`, {
      method: 'POST',
      headers: { ...MCP_HEADERS, Authorization: 'Bearer smoke-secret', Origin: 'https://evil.example' },
      body: INIT,
    });
    expect(res.status).toBe(403);
  });

  it('rejects non-POST with 405', async () => {
    const res = await fetch(`${base}/`, { method: 'GET', headers: MCP_HEADERS });
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST, OPTIONS');
  });

  it('initializes and lists all six read-only tools', async () => {
    const auth = { ...MCP_HEADERS, Authorization: 'Bearer smoke-secret' };

    const initRes = await fetch(`${base}/`, { method: 'POST', headers: auth, body: INIT });
    expect(initRes.status).toBe(200);
    const initBody = await initRes.json();
    expect(initBody.result.serverInfo.name).toBe('zurichjs-conference-2026');

    const listRes = await fetch(`${base}/`, {
      method: 'POST',
      headers: auth,
      body: rpc('tools/list', {}, 2),
    });
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(listBody.result.tools.map((t: { name: string }) => t.name)).toEqual([
      'get_conference_snapshot',
      'get_ticket_sales',
      'get_sponsor_progress',
      'get_speaker_logistics',
      'get_workshop_status',
      'get_event_milestones',
    ]);
  });

  it('serves a tool call end to end against stubbed admin APIs', async () => {
    const realFetch = globalThis.fetch;
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockImplementation(async (input, init) => {
      const url = String(input instanceof URL ? input : input instanceof Request ? input.url : input);
      if (url.includes('conf.example.test/api/admin/tickets')) {
        return new Response(JSON.stringify({
          tickets: [{
            status: 'confirmed', amount_paid: 29500, currency: 'CHF',
            ticket_type: 'standard', ticket_category: 'standard', ticket_stage: 'late_bird',
            stripe_session_id: 'cs_1', metadata: null, created_at: '2026-08-20T09:00:00Z',
            email: 'attendee@example.com',
          }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return realFetch(input as RequestInfo, init);
    });

    try {
      const res = await fetch(`${base}/`, {
        method: 'POST',
        headers: { ...MCP_HEADERS, Authorization: 'Bearer smoke-secret' },
        body: rpc('tools/call', { name: 'get_ticket_sales', arguments: {} }, 3),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.result.isError).not.toBe(true);
      expect(body.result.structuredContent.summary.confirmedTickets).toBe(1);
      expect(JSON.stringify(body)).not.toContain('attendee@example.com');
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
