import { describe, it, expect } from 'vitest';
import {
  getBadgeLabel,
  formatRoleCompany,
  ticketToBadgeRow,
  ticketsToBadgeCsv,
} from '../badge-export';
import type { Ticket } from '@/components/admin/dashboard/types';

const mockTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: 'test-123',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  ticket_type: 'standard',
  ticket_category: 'standard',
  ticket_stage: 'early_bird',
  amount_paid: 19900,
  currency: 'CHF',
  status: 'confirmed',
  company: 'Acme Corp',
  job_title: 'Developer',
  qr_code_url: 'https://example.com/qr.png',
  ...overrides,
});

describe('badge-export', () => {
  describe('getBadgeLabel', () => {
    it('returns "VIP" for vip ticket category', () => {
      const ticket = mockTicket({ ticket_category: 'vip' });
      expect(getBadgeLabel(ticket)).toBe('VIP');
    });

    it('returns "Attendee" for standard ticket category', () => {
      const ticket = mockTicket({ ticket_category: 'standard' });
      expect(getBadgeLabel(ticket)).toBe('Attendee');
    });

    it('returns "Attendee" for student ticket category', () => {
      const ticket = mockTicket({ ticket_category: 'student' });
      expect(getBadgeLabel(ticket)).toBe('Attendee');
    });

    it('returns "Attendee" for unemployed ticket category', () => {
      const ticket = mockTicket({ ticket_category: 'unemployed' });
      expect(getBadgeLabel(ticket)).toBe('Attendee');
    });

    it('is case-insensitive for VIP', () => {
      const ticket = mockTicket({ ticket_category: 'VIP' });
      expect(getBadgeLabel(ticket)).toBe('VIP');
    });
  });

  describe('formatRoleCompany', () => {
    it('formats role @ company when both present', () => {
      const ticket = mockTicket({ job_title: 'Engineer', company: 'TechCo' });
      expect(formatRoleCompany(ticket)).toBe('Engineer @ TechCo');
    });

    it('returns just role when company is missing', () => {
      const ticket = mockTicket({ job_title: 'Engineer', company: undefined });
      expect(formatRoleCompany(ticket)).toBe('Engineer');
    });

    it('returns @ company when role is missing', () => {
      const ticket = mockTicket({ job_title: undefined, company: 'TechCo' });
      expect(formatRoleCompany(ticket)).toBe('@ TechCo');
    });

    it('returns empty string when both are missing', () => {
      const ticket = mockTicket({ job_title: undefined, company: undefined });
      expect(formatRoleCompany(ticket)).toBe('');
    });

    it('uses metadata fallback for company', () => {
      const ticket = mockTicket({
        company: undefined,
        job_title: 'Developer',
        metadata: { session_metadata: { company: 'Metadata Co' } },
      });
      expect(formatRoleCompany(ticket)).toBe('Developer @ Metadata Co');
    });

    it('uses metadata fallback for role', () => {
      const ticket = mockTicket({
        job_title: undefined,
        company: 'Direct Co',
        metadata: { session_metadata: { jobTitle: 'Metadata Role' } },
      });
      expect(formatRoleCompany(ticket)).toBe('Metadata Role @ Direct Co');
    });
  });

  describe('ticketToBadgeRow', () => {
    it('creates a complete badge row', () => {
      const ticket = mockTicket({
        id: 'badge-test-456',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@test.com',
        job_title: 'CTO',
        company: 'StartupX',
        ticket_category: 'vip',
        qr_code_url: 'https://qr.example.com/jane.png',
      });

      const row = ticketToBadgeRow(ticket);

      expect(row).toEqual({
        ticket_id: 'badge-test-456',
        full_name: 'Jane Smith',
        role_company: 'CTO @ StartupX',
        badge_label: 'VIP',
        qr_code_url: 'https://qr.example.com/jane.png',
        email: 'jane@test.com',
      });
    });

    it('handles missing qr_code_url', () => {
      const ticket = mockTicket({ qr_code_url: undefined });
      const row = ticketToBadgeRow(ticket);
      expect(row.qr_code_url).toBe('');
    });
  });

  describe('ticketsToBadgeCsv', () => {
    it('generates CSV with headers', () => {
      const tickets = [mockTicket()];
      const csv = ticketsToBadgeCsv(tickets);

      const lines = csv.split('\r\n');
      expect(lines[0]).toBe('ticket_id,full_name,role_company,badge_label,qr_code_url,email');
    });

    it('filters to confirmed tickets by default', () => {
      const tickets = [
        mockTicket({ id: '1', status: 'confirmed' }),
        mockTicket({ id: '2', status: 'cancelled' }),
        mockTicket({ id: '3', status: 'refunded' }),
        mockTicket({ id: '4', status: 'confirmed' }),
      ];

      const csv = ticketsToBadgeCsv(tickets);
      const lines = csv.split('\r\n');

      expect(lines.length).toBe(3);
      expect(lines[1]).toContain('1,');
      expect(lines[2]).toContain('4,');
    });

    it('includes all tickets when confirmedOnly is false', () => {
      const tickets = [
        mockTicket({ id: '1', status: 'confirmed' }),
        mockTicket({ id: '2', status: 'cancelled' }),
      ];

      const csv = ticketsToBadgeCsv(tickets, false);
      const lines = csv.split('\r\n');

      expect(lines.length).toBe(3);
    });

    it('escapes CSV special characters', () => {
      const ticket = mockTicket({
        first_name: 'John',
        last_name: 'Doe, Jr.',
        company: 'Tech "Company"',
      });

      const csv = ticketsToBadgeCsv([ticket]);
      expect(csv).toContain('"John Doe, Jr."');
      expect(csv).toContain('"Developer @ Tech ""Company"""');
    });

    it('prevents formula injection', () => {
      const ticket = mockTicket({
        first_name: '=SUM(A1)',
        company: '+1234',
      });

      const csv = ticketsToBadgeCsv([ticket]);
      expect(csv).toContain("'=SUM(A1)");
    });
  });
});
