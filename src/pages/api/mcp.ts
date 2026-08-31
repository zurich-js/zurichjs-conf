import type { NextApiRequest, NextApiResponse } from 'next';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { getAllowedOrigins, verifyMcpAccess } from '@/lib/mcp/auth';
import { createZurichJsMcpServer } from '@/lib/mcp/server';
import { logger } from '@/lib/logger';

const log = logger.scope('ZurichJS MCP');

function sendJsonRpcError(
  res: NextApiResponse,
  status: number,
  code: number,
  message: string,
): void {
  res.status(status).json({
    jsonrpc: '2.0',
    error: { code, message },
    id: null,
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  // Handle OPTIONS preflight before bearer-token authentication
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    const allowedOrigins = getAllowedOrigins();

    if (typeof origin === 'string' && allowedOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Max-Age', '86400');
      res.status(204).end();
      return;
    }

    // Reject disallowed origins
    res.status(403).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    sendJsonRpcError(res, 405, -32000, 'Method not allowed');
    return;
  }

  // Set CORS headers for browser callers
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();
  if (typeof origin === 'string' && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  const access = verifyMcpAccess(req);
  if (!access.authorized) {
    if (access.reason === 'missing_key') {
      log.error('ZURICHJS_MCP_API_KEY is not configured');
      sendJsonRpcError(res, 503, -32603, 'MCP server is not configured');
      return;
    }

    res.setHeader('WWW-Authenticate', 'Bearer realm="ZurichJS MCP"');
    sendJsonRpcError(res, access.reason === 'invalid_origin' ? 403 : 401, -32001, 'Unauthorized');
    return;
  }

  const server = createZurichJsMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    log.error('Failed to handle MCP request', error);
    if (!res.headersSent) {
      sendJsonRpcError(res, 500, -32603, 'Internal server error');
    }
  } finally {
    await transport.close().catch(() => undefined);
    await server.close().catch(() => undefined);
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
