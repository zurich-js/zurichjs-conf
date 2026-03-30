import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TicketOrderContext } from '@/lib/types/ticket-invoice';

const ticketInvoiceKey = (ticketId: string) => ['admin', 'ticket-invoice', ticketId] as const;

async function fetchOrderContext(ticketId: string): Promise<TicketOrderContext> {
  const res = await fetch(`/api/admin/tickets/${ticketId}/invoice`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? 'Failed to fetch order context');
  }
  const data = await res.json() as { orderContext: TicketOrderContext };
  return data.orderContext;
}

async function deleteInvoice(ticketId: string): Promise<void> {
  const res = await fetch(`/api/admin/tickets/${ticketId}/invoice`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? 'Failed to delete invoice');
  }
}

async function generateInvoicePDF(ticketId: string): Promise<{ pdfUrl: string; invoiceNumber: string }> {
  const res = await fetch(`/api/admin/tickets/${ticketId}/invoice/pdf/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? 'Failed to generate PDF');
  }
  return res.json() as Promise<{ pdfUrl: string; invoiceNumber: string }>;
}

export function useTicketOrderContext(ticketId: string | null) {
  return useQuery({
    queryKey: ticketId ? ticketInvoiceKey(ticketId) : ['ticket-invoice-disabled'],
    queryFn: () => fetchOrderContext(ticketId!),
    enabled: !!ticketId,
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function useDeleteTicketInvoice(ticketId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!ticketId) throw new Error('No ticket ID');
      return deleteInvoice(ticketId);
    },
    onSuccess: () => {
      if (ticketId) {
        void queryClient.invalidateQueries({ queryKey: ticketInvoiceKey(ticketId) });
      }
    },
  });
}

export function useGenerateTicketInvoice(ticketId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!ticketId) throw new Error('No ticket ID');
      return generateInvoicePDF(ticketId);
    },
    onSuccess: () => {
      if (ticketId) {
        void queryClient.invalidateQueries({ queryKey: ticketInvoiceKey(ticketId) });
      }
    },
  });
}
