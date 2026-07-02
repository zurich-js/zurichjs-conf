/**
 * Markdown-for-Agents catch-all
 *
 * Receives rewrites from `src/middleware.ts` when an AI agent requests an
 * allowlisted page with `Accept: text/markdown`. Looks up the right serializer,
 * renders markdown directly from the typed Supabase data, and tracks each
 * request to PostHog so we can measure agent adoption.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '@/lib/logger';
import { serverAnalytics } from '@/lib/analytics/server';
import {
  CONTENT_SIGNAL,
  botDistinctId,
  estimateTokenCount,
  identifyBot,
  resolveAgentResource,
} from '@/lib/markdown-for-agents';
import type { AgentResource } from '@/lib/analytics/events/agent-events';

const log = logger.scope('Agent Markdown API');

const NOT_FOUND_MD = '# Not found\n\nThis resource is not available as markdown.\n';

function asSegments(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function sendMarkdown(
  res: NextApiResponse,
  status: number,
  body: string,
  options: { cacheSeconds: number }
) {
  const bytes = Buffer.byteLength(body, 'utf8');
  const tokens = estimateTokenCount(body);
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Vary', 'Accept');
  res.setHeader('Content-Signal', CONTENT_SIGNAL);
  res.setHeader('x-markdown-tokens', String(tokens));
  res.setHeader('x-agent-rendered', '1');
  if (status === 200) {
    res.setHeader(
      'Cache-Control',
      `public, s-maxage=${options.cacheSeconds}, stale-while-revalidate=${options.cacheSeconds * 2}`
    );
  } else {
    res.setHeader('Cache-Control', 'no-store');
  }
  res.status(status).send(body);
  return { bytes, tokens };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const segments = asSegments(req.query.path);
  const path = `/${segments.join('/')}`;
  const userAgent = req.headers['user-agent'] ?? null;
  const acceptHeader = (req.headers['accept'] as string | undefined) ?? null;
  const identity = identifyBot(userAgent);
  const distinctId = botDistinctId(identity);
  const start = Date.now();

  const match = resolveAgentResource(segments);

  if (!match) {
    const { bytes, tokens } = sendMarkdown(res, 404, NOT_FOUND_MD, { cacheSeconds: 0 });
    void serverAnalytics.track('agent_markdown_requested', distinctId, {
      path,
      resource: 'unknown',
      bot_name: identity.name,
      bot_category: identity.category,
      accept_header: acceptHeader,
      status_code: 404,
      token_estimate: tokens,
      response_bytes: bytes,
      duration_ms: Date.now() - start,
    });
    return;
  }

  try {
    const result = await match.serve();
    const cacheSeconds = match.resource === 'schedule' ? 300 : 300;
    const { bytes, tokens } = sendMarkdown(res, result.status, result.markdown, {
      cacheSeconds,
    });
    void serverAnalytics.track('agent_markdown_requested', distinctId, {
      path,
      resource: match.resource,
      bot_name: identity.name,
      bot_category: identity.category,
      accept_header: acceptHeader,
      status_code: result.status,
      token_estimate: tokens,
      response_bytes: bytes,
      duration_ms: Date.now() - start,
    });
  } catch (err) {
    log.error('Failed to render markdown for agent', err, {
      path,
      resource: match.resource,
      bot_name: identity.name,
    });
    const errorBody = '# Error\n\nFailed to render markdown for this resource.\n';
    sendMarkdown(res, 500, errorBody, { cacheSeconds: 0 });
    void serverAnalytics.track('agent_markdown_errored', distinctId, {
      path,
      resource: match.resource as AgentResource,
      bot_name: identity.name,
      bot_category: identity.category,
      status_code: 500,
      error_message: err instanceof Error ? err.message : String(err),
    });
  }
}
