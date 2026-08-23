import type { NextApiRequest } from 'next';
import { afterEach, describe, expect, it } from 'vitest';
import { verifyMcpAccess } from '../auth';

const originalKey = process.env.ZURICHJS_MCP_API_KEY;
const originalOrigins = process.env.ZURICHJS_MCP_ALLOWED_ORIGINS;

function request(headers: NextApiRequest['headers']): NextApiRequest {
  return { headers } as NextApiRequest;
}

afterEach(() => {
  if (originalKey === undefined) delete process.env.ZURICHJS_MCP_API_KEY;
  else process.env.ZURICHJS_MCP_API_KEY = originalKey;

  if (originalOrigins === undefined) delete process.env.ZURICHJS_MCP_ALLOWED_ORIGINS;
  else process.env.ZURICHJS_MCP_ALLOWED_ORIGINS = originalOrigins;
});

describe('verifyMcpAccess', () => {
  it('accepts the configured bearer token', () => {
    process.env.ZURICHJS_MCP_API_KEY = 'test-secret';

    expect(verifyMcpAccess(request({ authorization: 'Bearer test-secret' }))).toEqual({
      authorized: true,
      reason: 'authorized',
    });
  });

  it('rejects an invalid bearer token', () => {
    process.env.ZURICHJS_MCP_API_KEY = 'test-secret';

    expect(verifyMcpAccess(request({ authorization: 'Bearer wrong-secret' }))).toEqual({
      authorized: false,
      reason: 'invalid_key',
    });
  });

  it('rejects an untrusted browser origin', () => {
    process.env.ZURICHJS_MCP_API_KEY = 'test-secret';
    process.env.ZURICHJS_MCP_ALLOWED_ORIGINS = 'https://chatgpt.com';

    expect(verifyMcpAccess(request({
      authorization: 'Bearer test-secret',
      origin: 'https://malicious.example',
    }))).toEqual({
      authorized: false,
      reason: 'invalid_origin',
    });
  });
});
