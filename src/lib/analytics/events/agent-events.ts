/**
 * Agent / Markdown-for-Agents Analytics Events
 * Track AI agent and crawler consumption of markdown-rendered conference content.
 */

import type { BaseEventProperties } from './base';

export type AgentResource =
  | 'speakers_list'
  | 'speaker_detail'
  | 'talks_list'
  | 'talk_detail'
  | 'schedule'
  | 'unknown';

export type AgentBotCategory = 'ai-agent' | 'ai-crawler' | 'browser' | 'unknown';

export interface AgentMarkdownRequestedEvent {
  event: 'agent_markdown_requested';
  properties: BaseEventProperties & {
    path: string;
    resource: AgentResource;
    bot_name: string;
    bot_category: AgentBotCategory;
    accept_header: string | null;
    status_code: number;
    token_estimate: number;
    response_bytes: number;
    duration_ms: number;
  };
}

export interface AgentMarkdownErroredEvent {
  event: 'agent_markdown_errored';
  properties: BaseEventProperties & {
    path: string;
    resource: AgentResource;
    bot_name: string;
    bot_category: AgentBotCategory;
    status_code: number;
    error_message: string;
  };
}
