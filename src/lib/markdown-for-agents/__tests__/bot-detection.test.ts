import { describe, expect, it } from 'vitest';
import { botDistinctId, identifyBot } from '../bot-detection';

describe('identifyBot', () => {
  it('returns unknown for null/empty UA', () => {
    expect(identifyBot(null)).toEqual({ name: 'unknown', category: 'unknown' });
    expect(identifyBot('')).toEqual({ name: 'unknown', category: 'unknown' });
  });

  it('recognises ClaudeBot as an AI crawler', () => {
    const ua = 'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)';
    expect(identifyBot(ua)).toEqual({ name: 'claudebot', category: 'ai-crawler' });
  });

  it('recognises ChatGPT-User as an AI agent', () => {
    const ua = 'Mozilla/5.0 AppleWebKit/537.36 (compatible; ChatGPT-User/1.0)';
    expect(identifyBot(ua)).toEqual({ name: 'chatgpt-user', category: 'ai-agent' });
  });

  it('recognises GPTBot as an AI crawler', () => {
    expect(identifyBot('Mozilla/5.0 (compatible; GPTBot/1.0)').name).toBe('gptbot');
  });

  it('recognises PerplexityBot as an AI crawler', () => {
    expect(identifyBot('PerplexityBot/1.0 (+perplexity.ai)').name).toBe('perplexitybot');
  });

  it('treats regular browser UAs as browser', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
    expect(identifyBot(ua)).toEqual({ name: 'browser', category: 'browser' });
  });

  it('matches more specific bot signatures before the browser fallback', () => {
    // ClaudeBot UA also contains "Mozilla" — we must still classify it as a crawler.
    const ua = 'Mozilla/5.0 (compatible; ClaudeBot/1.0)';
    expect(identifyBot(ua).category).toBe('ai-crawler');
  });
});

describe('botDistinctId', () => {
  it('namespaces bot names so PostHog can group them cleanly', () => {
    expect(botDistinctId({ name: 'claudebot', category: 'ai-crawler' })).toBe('agent:claudebot');
    expect(botDistinctId({ name: 'unknown', category: 'unknown' })).toBe('agent:unknown');
  });
});
