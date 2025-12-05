/**
 * B2B Invoice Attendees Business Logic
 * Core operations for managing attendees linked to B2B invoices
 */

import { createServiceRoleClient } from '@/lib/supabase';
import type {
  B2BInvoiceAttendee,
  AttendeeInput,
  UpdateAttendeeRequest,
} from '@/lib/types/b2b';
import { getInvoice } from './invoices';

/**
 * Add attendees to an invoice
 *
 * @param invoiceId - UUID of the invoice
 * @param attendees - Array of attendee data to add
 * @returns Array of created attendee records
 * @throws Error if invoice is paid/cancelled or doesn't exist
 */
export async function addAttendees(
  invoiceId: string,
  attendees: AttendeeInput[]
): Promise<B2BInvoiceAttendee[]> {
  const supabase = createServiceRoleClient();

  // Verify invoice exists and is modifiable
  const invoice = await getInvoice(invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (invoice.status === 'paid' || invoice.status === 'cancelled') {
    throw new Error(`Cannot add attendees to invoice with status: ${invoice.status}`);
  }

  // Check current attendee count
  const { count: currentCount } = await supabase
    .from('b2b_invoice_attendees')
    .select('*', { count: 'exact', head: true })
    .eq('invoice_id', invoiceId);

  const newTotal = (currentCount || 0) + attendees.length;
  if (newTotal > invoice.ticket_quantity) {
    throw new Error(
      `Cannot add ${attendees.length} attendees. ` +
        `Current: ${currentCount || 0}, Max: ${invoice.ticket_quantity}`
    );
  }

  // Insert attendees
  const { data, error } = await supabase
    .from('b2b_invoice_attendees')
    .insert(
      attendees.map((a) => ({
        invoice_id: invoiceId,
        first_name: a.firstName,
        last_name: a.lastName,
        email: a.email,
        company: a.company || null,
        job_title: a.jobTitle || null,
      }))
    )
    .select();

  if (error) {
    console.error('Error adding attendees:', error);
    throw new Error(`Failed to add attendees: ${error.message}`);
  }

  return data as B2BInvoiceAttendee[];
}

/**
 * Get all attendees for an invoice
 *
 * @param invoiceId - UUID of the invoice
 * @returns Array of attendee records
 */
export async function getAttendees(invoiceId: string): Promise<B2BInvoiceAttendee[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('b2b_invoice_attendees')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching attendees:', error);
    throw new Error(`Failed to fetch attendees: ${error.message}`);
  }

  return (data || []) as B2BInvoiceAttendee[];
}

/**
 * Get a single attendee by ID
 *
 * @param attendeeId - UUID of the attendee
 * @returns Attendee record or null if not found
 */
export async function getAttendee(attendeeId: string): Promise<B2BInvoiceAttendee | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('b2b_invoice_attendees')
    .select('*')
    .eq('id', attendeeId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching attendee:', error);
    throw new Error(`Failed to fetch attendee: ${error.message}`);
  }

  return data as B2BInvoiceAttendee;
}

/**
 * Update an attendee's details
 *
 * @param attendeeId - UUID of the attendee
 * @param data - Fields to update
 * @returns Updated attendee record
 * @throws Error if attendee not found or invoice is paid/cancelled
 */
export async function updateAttendee(
  attendeeId: string,
  data: UpdateAttendeeRequest
): Promise<B2BInvoiceAttendee> {
  const supabase = createServiceRoleClient();

  // Get attendee and verify invoice status
  const attendee = await getAttendee(attendeeId);
  if (!attendee) {
    throw new Error('Attendee not found');
  }

  const invoice = await getInvoice(attendee.invoice_id);
  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (invoice.status === 'paid' || invoice.status === 'cancelled') {
    throw new Error(`Cannot update attendee on invoice with status: ${invoice.status}`);
  }

  // Build update object
  const updateData: Record<string, unknown> = {};
  if (data.firstName !== undefined) updateData.first_name = data.firstName;
  if (data.lastName !== undefined) updateData.last_name = data.lastName;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.company !== undefined) updateData.company = data.company || null;
  if (data.jobTitle !== undefined) updateData.job_title = data.jobTitle || null;

  const { data: updated, error } = await supabase
    .from('b2b_invoice_attendees')
    .update(updateData)
    .eq('id', attendeeId)
    .select()
    .single();

  if (error) {
    console.error('Error updating attendee:', error);
    throw new Error(`Failed to update attendee: ${error.message}`);
  }

  return updated as B2BInvoiceAttendee;
}

/**
 * Delete an attendee from an invoice
 *
 * @param attendeeId - UUID of the attendee
 * @throws Error if attendee not found or invoice is paid/cancelled
 */
export async function deleteAttendee(attendeeId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  // Get attendee and verify invoice status
  const attendee = await getAttendee(attendeeId);
  if (!attendee) {
    throw new Error('Attendee not found');
  }

  const invoice = await getInvoice(attendee.invoice_id);
  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (invoice.status === 'paid' || invoice.status === 'cancelled') {
    throw new Error(`Cannot delete attendee from invoice with status: ${invoice.status}`);
  }

  const { error } = await supabase
    .from('b2b_invoice_attendees')
    .delete()
    .eq('id', attendeeId);

  if (error) {
    console.error('Error deleting attendee:', error);
    throw new Error(`Failed to delete attendee: ${error.message}`);
  }
}

/**
 * Delete all attendees from an invoice
 *
 * @param invoiceId - UUID of the invoice
 * @throws Error if invoice is paid/cancelled
 */
export async function deleteAllAttendees(invoiceId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  // Verify invoice status
  const invoice = await getInvoice(invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (invoice.status === 'paid' || invoice.status === 'cancelled') {
    throw new Error(`Cannot delete attendees from invoice with status: ${invoice.status}`);
  }

  const { error } = await supabase
    .from('b2b_invoice_attendees')
    .delete()
    .eq('invoice_id', invoiceId);

  if (error) {
    console.error('Error deleting all attendees:', error);
    throw new Error(`Failed to delete attendees: ${error.message}`);
  }
}

/**
 * Result of CSV parsing with validation
 */
export interface ParseCSVResult {
  attendees: AttendeeInput[];
  errors: string[];
  warnings: string[];
}

/**
 * Parse attendees from CSV content
 *
 * Expected CSV format:
 * firstName,lastName,email,company,jobTitle
 * John,Doe,john@example.com,Acme Corp,Developer
 *
 * @param csvContent - Raw CSV string
 * @returns Parsed attendees with any validation errors
 */
export function parseAttendeesFromCSV(csvContent: string): ParseCSVResult {
  const result: ParseCSVResult = {
    attendees: [],
    errors: [],
    warnings: [],
  };

  const lines = csvContent.trim().split('\n');
  if (lines.length === 0) {
    result.errors.push('CSV file is empty');
    return result;
  }

  // Parse header
  const headerLine = lines[0].toLowerCase().trim();
  const headers = headerLine.split(',').map((h) => h.trim());

  // Map headers to expected fields
  const fieldMap: Record<string, string> = {
    firstname: 'firstName',
    first_name: 'firstName',
    'first name': 'firstName',
    lastname: 'lastName',
    last_name: 'lastName',
    'last name': 'lastName',
    email: 'email',
    company: 'company',
    jobtitle: 'jobTitle',
    job_title: 'jobTitle',
    'job title': 'jobTitle',
    title: 'jobTitle',
    role: 'jobTitle',
  };

  const columnIndexes: Record<string, number> = {};
  headers.forEach((header, index) => {
    const normalizedHeader = header.replace(/"/g, '').trim();
    const mappedField = fieldMap[normalizedHeader];
    if (mappedField) {
      columnIndexes[mappedField] = index;
    }
  });

  // Validate required columns
  const requiredFields = ['firstName', 'lastName', 'email'];
  const missingFields = requiredFields.filter((f) => columnIndexes[f] === undefined);
  if (missingFields.length > 0) {
    result.errors.push(`Missing required columns: ${missingFields.join(', ')}`);
    return result;
  }

  // Parse data rows
  const seenEmails = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const values = parseCSVLine(line);
    const rowNum = i + 1;

    // Extract values
    const firstName = values[columnIndexes.firstName]?.trim();
    const lastName = values[columnIndexes.lastName]?.trim();
    const email = values[columnIndexes.email]?.trim().toLowerCase();
    const company = columnIndexes.company !== undefined ? values[columnIndexes.company]?.trim() : undefined;
    const jobTitle = columnIndexes.jobTitle !== undefined ? values[columnIndexes.jobTitle]?.trim() : undefined;

    // Validate row
    const rowErrors: string[] = [];

    if (!firstName) {
      rowErrors.push('firstName is required');
    }
    if (!lastName) {
      rowErrors.push('lastName is required');
    }
    if (!email) {
      rowErrors.push('email is required');
    } else if (!isValidEmail(email)) {
      rowErrors.push(`invalid email format: ${email}`);
    } else if (seenEmails.has(email)) {
      rowErrors.push(`duplicate email: ${email}`);
    }

    if (rowErrors.length > 0) {
      result.errors.push(`Row ${rowNum}: ${rowErrors.join(', ')}`);
      continue;
    }

    // Add to results
    seenEmails.add(email);
    result.attendees.push({
      firstName: firstName!,
      lastName: lastName!,
      email: email!,
      company: company || undefined,
      jobTitle: jobTitle || undefined,
    });
  }

  if (result.attendees.length === 0 && result.errors.length === 0) {
    result.errors.push('No valid attendees found in CSV');
  }

  return result;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Basic email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate that attendee count matches invoice ticket quantity
 *
 * @param invoiceId - UUID of the invoice
 * @returns Validation result with current and expected counts
 */
export async function validateAttendeeCount(invoiceId: string): Promise<{
  isValid: boolean;
  currentCount: number;
  expectedCount: number;
  message: string;
}> {
  const invoice = await getInvoice(invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const attendees = await getAttendees(invoiceId);
  const currentCount = attendees.length;
  const expectedCount = invoice.ticket_quantity;
  const isValid = currentCount === expectedCount;

  return {
    isValid,
    currentCount,
    expectedCount,
    message: isValid
      ? `All ${expectedCount} attendees provided`
      : `Expected ${expectedCount} attendees, but found ${currentCount}`,
  };
}
