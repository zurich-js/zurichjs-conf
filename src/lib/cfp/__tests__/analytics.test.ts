import { describe, expect, it, vi } from 'vitest';

vi.mock('@/config/env', () => ({
  env: {
    supabase: {
      url: 'https://example.supabase.co',
      secretKey: 'test-service-role-key',
    },
  },
}));

import { buildContentInsights } from '../analytics';

describe('buildContentInsights', () => {
  it('detects explicit AI tag variants in content and tags', () => {
    const submissions = [
      {
        id: 's1',
        status: 'submitted',
        title: 'Building with the AI SDK',
        abstract: 'Using MCP and Generative UI with Web AI',
        additional_notes: null,
        outline: null,
        slides_url: null,
        previous_recording_url: null,
      },
      {
        id: 's2',
        status: 'submitted',
        title: 'Search with vectors',
        abstract: 'A practical talk about semantic retrieval',
        additional_notes: null,
        outline: null,
        slides_url: null,
        previous_recording_url: null,
      },
      {
        id: 's3',
        status: 'draft',
        title: 'Draft about AI Agents',
        abstract: 'Should not count because it is a draft',
        additional_notes: null,
        outline: null,
        slides_url: null,
        previous_recording_url: null,
      },
      {
        id: 's4',
        status: 'submitted',
        title: 'Frontend ergonomics',
        abstract: 'Component architecture and developer experience',
        additional_notes: null,
        outline: null,
        slides_url: null,
        previous_recording_url: null,
      },
    ];

    const tagJoins = [
      { submission_id: 's1', tag_id: 't1' },
      { submission_id: 's1', tag_id: 't2' },
      { submission_id: 's1', tag_id: 't3' },
      { submission_id: 's2', tag_id: 't4' },
      { submission_id: 's2', tag_id: 't5' },
      { submission_id: 's2', tag_id: 't6' },
      { submission_id: 's2', tag_id: 't7' },
      { submission_id: 's3', tag_id: 't8' },
    ];

    const tagNameMap = new Map([
      ['t1', 'AI-assisted development'],
      ['t2', 'WebMCP'],
      ['t3', 'AI Interfaces'],
      ['t4', 'Semantic Search'],
      ['t5', 'Vector Databases'],
      ['t6', 'Embeddings'],
      ['t7', 'LangChain.js'],
      ['t8', 'AI-Agents'],
    ]);

    const result = buildContentInsights(submissions, tagJoins, tagNameMap);
    const keywordCounts = new Map(result.aiKeywords.map(({ keyword, count }) => [keyword, count]));

    expect(result.totalAnalyzed).toBe(3);
    expect(result.aiTopicCount).toBe(2);
    expect(keywordCounts.get('AI SDK')).toBe(1);
    expect(keywordCounts.get('MCP')).toBe(1);
    expect(keywordCounts.get('Generative UI')).toBe(1);
    expect(keywordCounts.get('Web AI')).toBe(1);
    expect(keywordCounts.get('AI-Assisted Development')).toBe(1);
    expect(keywordCounts.get('WebMCP')).toBe(1);
    expect(keywordCounts.get('AI Interfaces')).toBe(1);
    expect(keywordCounts.get('Semantic Search')).toBe(1);
    expect(keywordCounts.get('Vector Databases')).toBe(1);
    expect(keywordCounts.get('Embeddings')).toBe(1);
    expect(keywordCounts.get('LangChain.js')).toBe(1);
    expect(keywordCounts.get('AI Agents')).toBe(1);
  });

  it('counts AI Agents variants under a single label', () => {
    const submissions = [
      {
        id: 's1',
        status: 'submitted',
        title: 'Building AI Agents in the browser',
        abstract: 'Agentic workflows with MCP',
        additional_notes: null,
        outline: null,
        slides_url: null,
        previous_recording_url: null,
      },
      {
        id: 's2',
        status: 'submitted',
        title: 'Tooling',
        abstract: 'Nothing special here',
        additional_notes: 'Uses AI agent patterns and AI-Agents tags',
        outline: null,
        slides_url: null,
        previous_recording_url: null,
      },
    ];

    const tagJoins = [
      { submission_id: 's1', tag_id: 't1' },
      { submission_id: 's2', tag_id: 't2' },
      { submission_id: 's2', tag_id: 't3' },
    ];

    const tagNameMap = new Map([
      ['t1', 'ai agents'],
      ['t2', 'AI-Agents'],
      ['t3', 'AI agent'],
    ]);

    const result = buildContentInsights(submissions, tagJoins, tagNameMap);
    const keywordCounts = new Map(result.aiKeywords.map(({ keyword, count }) => [keyword, count]));

    expect(result.aiTopicCount).toBe(2);
    expect(keywordCounts.get('AI Agents')).toBe(2);
  });
});
