import type { AgentBotCategory } from '@/lib/analytics/events/agent-events';

interface BotSignature {
  match: RegExp;
  name: string;
  category: AgentBotCategory;
}

/**
 * Ordered list of well-known AI agent / crawler user-agents.
 * Patterns are matched case-insensitively against the raw UA.
 * Order matters — first match wins (more specific names before generic).
 */
const BOT_SIGNATURES: BotSignature[] = [
  { match: /claudebot/i, name: 'claudebot', category: 'ai-crawler' },
  { match: /claude-user/i, name: 'claude-user', category: 'ai-agent' },
  { match: /claude-web/i, name: 'claude-web', category: 'ai-agent' },
  { match: /anthropic-ai/i, name: 'anthropic-ai', category: 'ai-agent' },
  { match: /oai-searchbot/i, name: 'oai-searchbot', category: 'ai-crawler' },
  { match: /chatgpt-user/i, name: 'chatgpt-user', category: 'ai-agent' },
  { match: /gptbot/i, name: 'gptbot', category: 'ai-crawler' },
  { match: /perplexitybot/i, name: 'perplexitybot', category: 'ai-crawler' },
  { match: /perplexity-user/i, name: 'perplexity-user', category: 'ai-agent' },
  { match: /google-extended/i, name: 'google-extended', category: 'ai-crawler' },
  { match: /googleother/i, name: 'googleother', category: 'ai-crawler' },
  { match: /bingbot/i, name: 'bingbot', category: 'ai-crawler' },
  { match: /cohere-ai/i, name: 'cohere-ai', category: 'ai-agent' },
  { match: /mistralai-user/i, name: 'mistralai-user', category: 'ai-agent' },
  { match: /meta-externalagent/i, name: 'meta-externalagent', category: 'ai-agent' },
  { match: /facebookbot/i, name: 'facebookbot', category: 'ai-crawler' },
  { match: /applebot-extended/i, name: 'applebot-extended', category: 'ai-crawler' },
  { match: /bytespider/i, name: 'bytespider', category: 'ai-crawler' },
  { match: /diffbot/i, name: 'diffbot', category: 'ai-crawler' },
  { match: /amazonbot/i, name: 'amazonbot', category: 'ai-crawler' },
  { match: /opencode/i, name: 'opencode', category: 'ai-agent' },
  { match: /\bccbot\b/i, name: 'ccbot', category: 'ai-crawler' },
  // Browsers — checked last so we don't shadow bots that masquerade with a browser UA suffix
  { match: /\b(chrome|firefox|safari|edge|opera)\//i, name: 'browser', category: 'browser' },
];

export interface BotIdentity {
  name: string;
  category: AgentBotCategory;
}

export function identifyBot(userAgent: string | null | undefined): BotIdentity {
  if (!userAgent) return { name: 'unknown', category: 'unknown' };
  for (const sig of BOT_SIGNATURES) {
    if (sig.match.test(userAgent)) {
      return { name: sig.name, category: sig.category };
    }
  }
  return { name: 'unknown', category: 'unknown' };
}

/**
 * Stable distinct_id for PostHog. Keeping it derived from the bot name lets
 * dashboards group sessions cleanly without storing IPs.
 */
export function botDistinctId(identity: BotIdentity): string {
  return `agent:${identity.name}`;
}
