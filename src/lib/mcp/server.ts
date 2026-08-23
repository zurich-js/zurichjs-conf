import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ConferenceReportingClient } from './conference-reporting';

const sinceInputSchema = {
  since: z.string().datetime({ offset: true }).optional().describe(
    'Only include daily ticket-sales points at or after this ISO-8601 timestamp.',
  ),
};

function result(data: Record<string, unknown>) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data) }],
    structuredContent: data,
  };
}

export function createZurichJsMcpServer(
  reporting = new ConferenceReportingClient(),
): McpServer {
  const server = new McpServer(
    { name: 'zurichjs-conference-2026', version: '1.0.0' },
    {
      instructions: [
        'Read-only operational data for ZurichJS Conference 2026.',
        'Use get_conference_snapshot for daily status briefings.',
        'Treat timestamps and database aggregates as authoritative.',
        'Never infer personal attendee information that is not returned.',
      ].join(' '),
    },
  );

  const readOnlyAnnotations = {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
  } as const;

  server.registerTool(
    'get_conference_snapshot',
    {
      title: 'Get conference snapshot',
      description: 'Get the complete ZurichJS 2026 operational snapshot for a daily status briefing.',
      inputSchema: sinceInputSchema,
      annotations: readOnlyAnnotations,
    },
    async ({ since }) => result(await reporting.getConferenceSnapshot(since)),
  );

  server.registerTool(
    'get_ticket_sales',
    {
      title: 'Get ticket sales',
      description: 'Get ticket totals, revenue aggregates, sales mix, and the daily sales time series.',
      inputSchema: sinceInputSchema,
      annotations: readOnlyAnnotations,
    },
    async ({ since }) => result(await reporting.getTicketSales(since)),
  );

  server.registerTool(
    'get_sponsor_progress',
    {
      title: 'Get sponsor progress',
      description: 'Get sponsorship totals and sanitized deal status, tier, value, and update timestamps.',
      inputSchema: {},
      annotations: readOnlyAnnotations,
    },
    async () => result(await reporting.getSponsorProgress()),
  );

  server.registerTool(
    'get_speaker_logistics',
    {
      title: 'Get speaker logistics',
      description: 'Get speaker logistics completion totals and named operational follow-up lists without contact details.',
      inputSchema: {},
      annotations: readOnlyAnnotations,
    },
    async () => result(await reporting.getSpeakerLogistics()),
  );

  server.registerTool(
    'get_workshop_status',
    {
      title: 'Get workshop status',
      description: 'Get workshop publishing, scheduling, capacity, enrollment, and revenue status.',
      inputSchema: {},
      annotations: readOnlyAnnotations,
    },
    async () => result(await reporting.getWorkshopStatus()),
  );

  server.registerTool(
    'get_event_milestones',
    {
      title: 'Get event milestones',
      description: 'Get the warm-up, workshop, conference, and after-party milestones with days remaining.',
      inputSchema: {},
      annotations: readOnlyAnnotations,
    },
    async () => result(reporting.getMilestones()),
  );

  return server;
}
