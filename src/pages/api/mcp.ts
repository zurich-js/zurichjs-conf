import type { NextApiRequest, NextApiResponse } from 'next';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { verifyMcpAccess } from '@/lib/mcp/auth';
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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJsonRpcError(res, 405, -32000, 'Method not allowed');
    return;
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
