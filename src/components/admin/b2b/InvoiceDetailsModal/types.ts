/**
 * Invoice Details Modal - Shared types
 */

import type { B2BInvoiceWithAttendees, B2BInvoiceStatus } from '@/lib/types/b2b';

export interface InvoiceDetailsModalProps {
  invoice: B2BInvoiceWithAttendees;
  onClose: () => void;
  onUpdate: () => void;
}

export type ActiveSection = 'details' | 'attendees' | 'actions';

export interface EditFormData {
  contactName: string;
  contactEmail: string;
  companyName: string;
  vatId: string;
  billingAddressStreet: string;
  billingAddressCity: string;
  billingAddressPostalCode: string;
  billingAddressCountry: string;
  dueDate: string;
  notes: string;
  invoiceNotes: string;
  ticketQuantity: number;
  unitPrice: number;
}

export interface AttendeeFormData {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
}

export function getFormValuesFromInvoice(invoice: B2BInvoiceWithAttendees): EditFormData {
  return {
    contactName: invoice.contact_name,
    contactEmail: invoice.contact_email,
    companyName: invoice.company_name,
    vatId: invoice.vat_id || '',
    billingAddressStreet: invoice.billing_address_street,
    billingAddressCity: invoice.billing_address_city,
    billingAddressPostalCode: invoice.billing_address_postal_code,
    billingAddressCountry: invoice.billing_address_country,
    dueDate: invoice.due_date,
    notes: invoice.notes || '',
    invoiceNotes: invoice.invoice_notes || '',
    ticketQuantity: invoice.ticket_quantity,
    unitPrice: invoice.unit_price,
  };
}

export interface StatusUpdateHandler {
  (newStatus: B2BInvoiceStatus): Promise<void>;
}
