import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConferenceReportingClient } from '../conference-reporting';
import { createZurichJsMcpServer } from '../server';

const reporting = {
  getConferenceSnapshot: vi.fn(async () => ({ asOf: '2026-08-23T12:00:00Z' })),
  getTicketSales: vi.fn(async () => ({ asOf: '2026-08-23T12:00:00Z', total: 300 })),
  getSponsorProgress: vi.fn(async () => ({ asOf: '2026-08-23T12:00:00Z' })),
  getSpeakerLogistics: vi.fn(async () => ({ asOf: '2026-08-23T12:00:00Z' })),
  getWorkshopStatus: vi.fn(async () => ({ asOf: '2026-08-23T12:00:00Z' })),
  getMilestones: vi.fn(() => ({ asOf: '2026-08-23T12:00:00Z' })),
} as unknown as ConferenceReportingClient;

afterEach(() => {
  vi.clearAllMocks();
});

describe('ZurichJS MCP server', () => {
  it('advertises only the focused read-only reporting tools', async () => {
    const server = createZurichJsMcpServer(reporting);
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toEqual([
      'get_conference_snapshot',
      'get_ticket_sales',
      'get_sponsor_progress',
      'get_speaker_logistics',
      'get_workshop_status',
      'get_event_milestones',
    ]);
    expect(tools.tools.every((tool) => tool.annotations?.readOnlyHint === true)).toBe(true);

    await client.close();
    await server.close();
  });

  it('calls the complete snapshot workflow with the requested cutoff', async () => {
    const server = createZurichJsMcpServer(reporting);
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const response = await client.callTool({
      name: 'get_conference_snapshot',
      arguments: { since: '2026-08-22T00:00:00+02:00' },
    });

    expect(reporting.getConferenceSnapshot).toHaveBeenCalledWith('2026-08-22T00:00:00+02:00');
    expect(response.structuredContent).toEqual({ asOf: '2026-08-23T12:00:00Z' });

    await client.close();
    await server.close();
  });
});
