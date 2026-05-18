/**
 * Hook for fetching ticket holder spend breakdown (upgrades, workshops, totals)
 */

import { useQuery } from '@tanstack/react-query';
import type { TicketUpgrade } from '@/lib/types/ticket-upgrade';

export interface WorkshopBooking {
  id: string;
  workshop_id: string;
  workshop_title: string;
  workshop_date: string | null;
  workshop_start_time: string | null;
  workshop_end_time: string | null;
  amount_paid: number;
  discount_amount: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface SpendBreakdown {
  ticketCost: number;
  ticketCurrency: string;
  upgradeCost: number;
  upgradeCurrency: string | null;
  workshopCosts: { currency: string; amount: number }[];
  totalByCurrency: { currency: string; amount: number }[];
}

export interface TicketSpendData {
  upgrades: TicketUpgrade[];
  workshopBookings: WorkshopBooking[];
  spendBreakdown: SpendBreakdown;
}

const spendBreakdownKey = (ticketId: string) => ['admin', 'ticket-spend', ticketId] as const;

async function fetchSpendBreakdown(ticketId: string): Promise<TicketSpendData> {
  const res = await fetch(`/api/admin/tickets/${ticketId}/spend-breakdown`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? 'Failed to fetch spend breakdown');
  }
  const data = await res.json() as TicketSpendData;
  return data;
}

export function useTicketSpendBreakdown(ticketId: string | null) {
  return useQuery({
    queryKey: ticketId ? spendBreakdownKey(ticketId) : ['ticket-spend-disabled'],
    queryFn: () => fetchSpendBreakdown(ticketId!),
    enabled: !!ticketId,
    staleTime: 30 * 1000,
    retry: false,
  });
}
