/**
 * Unit Tests for Ticket Invoice Business Logic
 * Tests for: extractPurchaserInfo, buildLineItems, resolveOrderContext, createTicketInvoice
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Ticket } from '@/lib/types/database';
import type { TicketInvoice, TicketOrderContext } from '@/lib/types/ticket-invoice';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  // We build a chainable Supabase query builder mock.
  // Each call to .from() returns a fresh chain that can be configured per test.
  const makeChain = () => {
    const chain: Record<string, unknown> = {};
    // Terminal promise – tests override this via mockResolvedValueOnce on the
    // chain functions that need to return data.
    const terminal = vi.fn().mockResolvedValue({ data: null, error: null });
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.insert = vi.fn().mockReturnValue(chain);
    chain.update = vi.fn().mockReturnValue(chain);
    chain.single = terminal;
    // Make the chain itself thenable so `await supabase.from(...).select().eq()` works
    // when tests don't end with .single()
    (chain as Record<string, unknown>).then = terminal;
    return { chain, terminal };
  };

  const { chain: defaultChain, terminal: defaultTerminal } = makeChain();

  const mockFrom = vi.fn().mockReturnValue(defaultChain);

  const mockCreateServiceRoleClient = vi.fn().mockReturnValue({ from: mockFrom });

  return {
    mockCreateServiceRoleClient,
    mockFrom,
    defaultChain,
    defaultTerminal,
    makeChain,
  };
});

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: mocks.mockCreateServiceRoleClient,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    scope: vi.fn().mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import {
  extractPurchaserInfo,
  buildLineItems,
  resolveOrderContext,
  createTicketInvoice,
} from '../invoices';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'ticket-001',
    user_id: 'user-001',
    ticket_type: 'early_bird',
    ticket_category: 'standard',
    ticket_stage: 'early_bird',
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane.doe@example.com',
    company: null,
    job_title: null,
    stripe_customer_id: 'cus_abc123',
    stripe_session_id: 'cs_test_abc123',
    stripe_payment_intent_id: 'pi_abc123',
    amount_paid: 9900,
    currency: 'chf',
    status: 'confirmed',
    checked_in: false,
    checked_in_at: null,
    qr_code_url: null,
    transferred_from_name: null,
    transferred_from_email: null,
    transferred_at: null,
    coupon_code: null,
    partnership_coupon_id: null,
    partnership_voucher_id: null,
    partnership_id: null,
    discount_amount: 0,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeInvoice(overrides: Partial<TicketInvoice> = {}): TicketInvoice {
  return {
    id: 'inv-001',
    invoice_number: 'INV-2026-001',
    stripe_session_id: 'cs_test_abc123',
    ticket_ids: ['ticket-001'],
    primary_ticket_id: 'ticket-001',
    billing_name: 'Jane Doe',
    billing_email: 'jane.doe@example.com',
    billing_company: null,
    billing_address_line1: null,
    billing_address_line2: null,
    billing_city: null,
    billing_state: null,
    billing_postal_code: null,
    billing_country: null,
    currency: 'chf',
    subtotal_amount: 9900,
    discount_amount: 0,
    total_amount: 9900,
    pdf_url: null,
    pdf_source: null,
    line_items: null,
    notes: null,
    generated_by: null,
    generated_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ─── Helper: build a fresh chainable Supabase mock for each test ───────────────

/**
 * Creates a fresh mock Supabase client and configures it so calls to
 * .from(table).select().eq().single()  (and multi-row queries) return the
 * provided data in order.
 *
 * resolvedValues: array of { data, error } objects returned in sequence,
 * one per `.single()` (or `await chain`) call.
 */
function buildSupabaseMock(resolvedValues: Array<{ data: unknown; error: unknown }>) {
  let callIndex = 0;

  const single = vi.fn().mockImplementation(() => {
    const result = resolvedValues[callIndex] ?? { data: null, error: null };
    callIndex++;
    return Promise.resolve(result);
  });

  // For multi-row results (no .single()) – the chain itself needs to be thenable
  const chainThen = vi.fn().mockImplementation((resolve: (v: unknown) => unknown) => {
    const result = resolvedValues[callIndex] ?? { data: null, error: null };
    callIndex++;
    return Promise.resolve(resolve(result));
  });

  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single,
    then: chainThen,
  };

  // Make chain return itself for all builder methods
  (chain.select as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  (chain.eq as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  (chain.order as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  (chain.insert as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  (chain.update as ReturnType<typeof vi.fn>).mockReturnValue(chain);

  const from = vi.fn().mockReturnValue(chain);
  const client = { from };

  mocks.mockCreateServiceRoleClient.mockReturnValue(client);

  return { client, from, chain, single, chainThen };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. extractPurchaserInfo
// ─────────────────────────────────────────────────────────────────────────────

describe('extractPurchaserInfo', () => {
  it('uses session_metadata firstName + lastName for name when available', () => {
    const ticket = makeTicket({
      metadata: {
        session_metadata: {
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@example.com',
        },
      },
    });
    const result = extractPurchaserInfo(ticket);
    expect(result.name).toBe('Alice Smith');
  });

  it('falls back to metadata.purchaserName when session_metadata has no firstName', () => {
    const ticket = makeTicket({
      metadata: {
        purchaserName: 'Bob Jones',
        session_metadata: {
          email: 'bob@example.com',
        },
      },
    });
    const result = extractPurchaserInfo(ticket);
    expect(result.name).toBe('Bob Jones');
  });

  it('falls back to ticket first_name + last_name when no metadata name', () => {
    const ticket = makeTicket({
      first_name: 'Jane',
      last_name: 'Doe',
      metadata: {},
    });
    const result = extractPurchaserInfo(ticket);
    expect(result.name).toBe('Jane Doe');
  });

  it('uses session_metadata.email for email when available', () => {
    const ticket = makeTicket({
      email: 'ticket@example.com',
      metadata: {
        session_metadata: {
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'session@example.com',
        },
      },
    });
    const result = extractPurchaserInfo(ticket);
    expect(result.email).toBe('session@example.com');
  });

  it('falls back to ticket.email when session_metadata has no email', () => {
    const ticket = makeTicket({
      email: 'ticket@example.com',
      metadata: {},
    });
    const result = extractPurchaserInfo(ticket);
    expect(result.email).toBe('ticket@example.com');
  });

  it('uses ticket.company when set', () => {
    const ticket = makeTicket({
      company: 'ACME Corp',
      metadata: {
        session_metadata: {
          company: 'Other Corp',
        },
      },
    });
    const result = extractPurchaserInfo(ticket);
    expect(result.company).toBe('ACME Corp');
  });

  it('uses session_metadata.company when ticket.company is null', () => {
    const ticket = makeTicket({
      company: null,
      metadata: {
        session_metadata: {
          company: 'Session Corp',
        },
      },
    });
    const result = extractPurchaserInfo(ticket);
    expect(result.company).toBe('Session Corp');
  });

  it('returns address fields from session_metadata', () => {
    const ticket = makeTicket({
      metadata: {
        session_metadata: {
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@example.com',
          addressLine1: '123 Main St',
          addressLine2: 'Apt 4',
          city: 'Zurich',
          state: 'ZH',
          postalCode: '8001',
          country: 'CH',
        },
      },
    });
    const result = extractPurchaserInfo(ticket);
    expect(result.addressLine1).toBe('123 Main St');
    expect(result.addressLine2).toBe('Apt 4');
    expect(result.city).toBe('Zurich');
    expect(result.state).toBe('ZH');
    expect(result.postalCode).toBe('8001');
    expect(result.country).toBe('CH');
  });

  it('returns null for address fields when session_metadata has none', () => {
    const ticket = makeTicket({ metadata: {} });
    const result = extractPurchaserInfo(ticket);
    expect(result.addressLine1).toBeNull();
    expect(result.addressLine2).toBeNull();
    expect(result.city).toBeNull();
    expect(result.state).toBeNull();
    expect(result.postalCode).toBeNull();
    expect(result.country).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. buildLineItems
// ─────────────────────────────────────────────────────────────────────────────

describe('buildLineItems', () => {
  it('single ticket → 1 line item with correct description, qty=1, amounts', () => {
    const ticket = makeTicket({
      ticket_category: 'standard',
      ticket_stage: 'early_bird',
      amount_paid: 9900,
    });
    const items = buildLineItems([ticket]);
    expect(items).toHaveLength(1);
    expect(items[0].description).toBe(
      'ZurichJS Conference 2026 – Standard Ticket (Early Bird)'
    );
    expect(items[0].quantity).toBe(1);
    expect(items[0].unitAmount).toBe(9900);
    expect(items[0].totalAmount).toBe(9900);
  });

  it('two tickets of same category + stage → grouped into 1 line item with qty=2', () => {
    const t1 = makeTicket({ id: 'ticket-001', ticket_category: 'standard', ticket_stage: 'early_bird', amount_paid: 9900 });
    const t2 = makeTicket({ id: 'ticket-002', ticket_category: 'standard', ticket_stage: 'early_bird', amount_paid: 9900 });
    const items = buildLineItems([t1, t2]);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
    expect(items[0].totalAmount).toBe(19800);
    expect(items[0].unitAmount).toBe(9900);
  });

  it('two tickets of different category → 2 separate line items', () => {
    const t1 = makeTicket({ id: 'ticket-001', ticket_category: 'standard', ticket_stage: 'early_bird', amount_paid: 9900 });
    const t2 = makeTicket({ id: 'ticket-002', ticket_category: 'student', ticket_stage: 'early_bird', amount_paid: 4900 });
    const items = buildLineItems([t1, t2]);
    expect(items).toHaveLength(2);
    const categories = items.map((i) => i.ticketCategory);
    expect(categories).toContain('standard');
    expect(categories).toContain('student');
  });

  it('description format is correct for standard/early_bird', () => {
    const ticket = makeTicket({ ticket_category: 'standard', ticket_stage: 'early_bird' });
    const items = buildLineItems([ticket]);
    expect(items[0].description).toBe(
      'ZurichJS Conference 2026 – Standard Ticket (Early Bird)'
    );
  });

  it('description format is correct for student/general_admission', () => {
    const ticket = makeTicket({ ticket_category: 'student', ticket_stage: 'general_admission' });
    const items = buildLineItems([ticket]);
    expect(items[0].description).toBe(
      'ZurichJS Conference 2026 – Student Ticket (General Admission)'
    );
  });

  it('includes ticketCategory and ticketStage on the line item', () => {
    const ticket = makeTicket({ ticket_category: 'vip', ticket_stage: 'blind_bird', amount_paid: 19900 });
    const items = buildLineItems([ticket]);
    expect(items[0].ticketCategory).toBe('vip');
    expect(items[0].ticketStage).toBe('blind_bird');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. resolveOrderContext
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveOrderContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('B2B ticket (stripe_session_id starts with b2b_invoice_) → canGenerateInvoice: false', async () => {
    const b2bTicket = makeTicket({
      id: 'ticket-b2b',
      stripe_session_id: 'b2b_invoice_xyz',
    });

    // resolveOrderContext fetches the ticket by ID first → .single()
    buildSupabaseMock([
      { data: b2bTicket, error: null }, // fetch ticket by id
    ]);

    const ctx = await resolveOrderContext('ticket-b2b');
    expect(ctx.canGenerateInvoice).toBe(false);
    expect(ctx.isGroupPurchase).toBe(false);
    expect(ctx.ticketCount).toBe(1);
    expect(ctx.invoiceWarning).toContain('B2B');
  });

  it('individual ticket → isGroupPurchase: false, ticketCount: 1, canGenerateInvoice: true', async () => {
    const ticket = makeTicket({ id: 'ticket-001', stripe_session_id: 'cs_test_solo' });

    buildSupabaseMock([
      { data: ticket, error: null },       // fetch ticket by ID
      { data: [ticket], error: null },     // fetch all tickets for session
      { data: null, error: { code: 'PGRST116' } }, // getInvoiceBySessionId → not found
    ]);

    const ctx = await resolveOrderContext('ticket-001');
    expect(ctx.isGroupPurchase).toBe(false);
    expect(ctx.ticketCount).toBe(1);
    expect(ctx.canGenerateInvoice).toBe(true);
    expect(ctx.existingInvoice).toBeNull();
  });

  it('group purchase (2 tickets same session) → isGroupPurchase: true, ticketCount: 2', async () => {
    const t1 = makeTicket({ id: 'ticket-001', stripe_session_id: 'cs_test_group', metadata: { isPrimary: true } });
    const t2 = makeTicket({ id: 'ticket-002', stripe_session_id: 'cs_test_group' });

    buildSupabaseMock([
      { data: t1, error: null },           // fetch ticket by ID
      { data: [t1, t2], error: null },     // fetch all tickets for session
      { data: null, error: { code: 'PGRST116' } }, // getInvoiceBySessionId → not found
    ]);

    const ctx = await resolveOrderContext('ticket-001');
    expect(ctx.isGroupPurchase).toBe(true);
    expect(ctx.ticketCount).toBe(2);
    expect(ctx.primaryTicket.id).toBe('ticket-001'); // isPrimary: true
    expect(ctx.canGenerateInvoice).toBe(true);
  });

  it('group purchase purchaserInfo comes from primary ticket', async () => {
    const t1 = makeTicket({
      id: 'ticket-001',
      stripe_session_id: 'cs_test_group',
      first_name: 'Primary',
      last_name: 'Purchaser',
      metadata: { isPrimary: true },
    });
    const t2 = makeTicket({ id: 'ticket-002', stripe_session_id: 'cs_test_group', first_name: 'Other', last_name: 'Person' });

    buildSupabaseMock([
      { data: t1, error: null },
      { data: [t1, t2], error: null },
      { data: null, error: { code: 'PGRST116' } },
    ]);

    const ctx = await resolveOrderContext('ticket-001');
    expect(ctx.purchaserInfo.name).toBe('Primary Purchaser');
  });

  it('throws when ticket is not found', async () => {
    buildSupabaseMock([
      { data: null, error: { message: 'Not found' } }, // ticket fetch fails
    ]);

    await expect(resolveOrderContext('nonexistent')).rejects.toThrow('Ticket not found: nonexistent');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. createTicketInvoice
// ─────────────────────────────────────────────────────────────────────────────

describe('createTicketInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeContext(overrides: Partial<TicketOrderContext> = {}): TicketOrderContext {
    const ticket = makeTicket();
    return {
      isGroupPurchase: false,
      allTickets: [ticket],
      primaryTicket: ticket,
      purchaserInfo: extractPurchaserInfo(ticket),
      stripeSessionId: 'cs_test_abc123',
      totalAmount: 9900,
      discountAmount: 0,
      subtotalAmount: 9900,
      currency: 'chf',
      ticketCount: 1,
      lineItems: buildLineItems([ticket]),
      existingInvoice: null,
      canGenerateInvoice: true,
      ...overrides,
    };
  }

  it('if invoice already exists for session → returns it without inserting (idempotent)', async () => {
    const existingInvoice = makeInvoice();

    // createTicketInvoice calls getInvoiceBySessionId first
    buildSupabaseMock([
      { data: existingInvoice, error: null }, // getInvoiceBySessionId → found
    ]);

    const result = await createTicketInvoice(makeContext());
    expect(result).toEqual(existingInvoice);
  });

  it('if no invoice exists → calls insert with invoice_number: empty string', async () => {
    const newInvoice = makeInvoice({ invoice_number: '' });

    buildSupabaseMock([
      { data: null, error: { code: 'PGRST116' } }, // getInvoiceBySessionId → not found
      { data: newInvoice, error: null },             // insert → returns new invoice
    ]);

    const ctx = makeContext();
    const result = await createTicketInvoice(ctx);

    // Verify the result is the newly created invoice
    expect(result.id).toBe(newInvoice.id);
    expect(result.stripe_session_id).toBe(newInvoice.stripe_session_id);
  });

  it('insert payload includes invoice_number as empty string (DB trigger generates it)', async () => {
    const newInvoice = makeInvoice();

    // Capture what gets passed to insert
    let capturedInsertPayload: unknown = null;

    // Build a custom chain where we inspect the insert call
    const single = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // first call: check existing
      .mockResolvedValueOnce({ data: newInvoice, error: null });           // second call: after insert

    const chain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockImplementation((payload: unknown) => {
        capturedInsertPayload = payload;
        return chain;
      }),
      update: vi.fn().mockReturnThis(),
      single,
      then: vi.fn().mockImplementation((resolve: (v: unknown) => unknown) =>
        Promise.resolve(resolve({ data: null, error: { code: 'PGRST116' } }))
      ),
    };

    // Make builder methods chainable
    (chain.select as ReturnType<typeof vi.fn>).mockReturnValue(chain);
    (chain.eq as ReturnType<typeof vi.fn>).mockReturnValue(chain);
    (chain.order as ReturnType<typeof vi.fn>).mockReturnValue(chain);
    (chain.update as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    mocks.mockCreateServiceRoleClient.mockReturnValue({ from: vi.fn().mockReturnValue(chain) });

    const ctx = makeContext();
    await createTicketInvoice(ctx);

    expect(capturedInsertPayload).not.toBeNull();
    expect((capturedInsertPayload as Record<string, unknown>).invoice_number).toBe('');
  });

  it('throws when insert fails', async () => {
    buildSupabaseMock([
      { data: null, error: { code: 'PGRST116' } },                          // getInvoiceBySessionId → not found
      { data: null, error: { message: 'DB constraint violation' } },         // insert fails
    ]);

    await expect(createTicketInvoice(makeContext())).rejects.toThrow(
      'Failed to create ticket invoice'
    );
  });
});
