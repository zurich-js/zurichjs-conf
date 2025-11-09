/**
 * Get Tickets
 * Fetch tickets for a user or all tickets (admin)
 */

import { createServiceRoleClient } from '@/lib/supabase';
import type { Ticket } from '@/lib/types/database';

export interface GetTicketsResult {
  success: boolean;
  tickets?: Ticket[];
  error?: string;
}

/**
 * Get all tickets for a specific user
 */
export async function getTicketsByUserId(userId: string): Promise<GetTicketsResult> {
  const supabase = createServiceRoleClient();

  try {
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tickets:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      tickets: (tickets || []) as Ticket[],
    };
  } catch (error) {
    console.error('Error in getTicketsByUserId:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get a single ticket by ID
 */
export async function getTicketById(ticketId: string): Promise<{
  success: boolean;
  ticket?: Ticket;
  error?: string;
}> {
  const supabase = createServiceRoleClient();

  try {
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (error) {
      console.error('Error fetching ticket:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    if (!ticket) {
      return {
        success: false,
        error: 'Ticket not found',
      };
    }

    return {
      success: true,
      ticket: ticket as Ticket,
    };
  } catch (error) {
    console.error('Error in getTicketById:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get ticket by Stripe session ID
 */
export async function getTicketBySessionId(sessionId: string): Promise<{
  success: boolean;
  ticket?: Ticket;
  error?: string;
}> {
  const supabase = createServiceRoleClient();

  try {
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .single();

    if (error) {
      console.error('Error fetching ticket by session ID:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    if (!ticket) {
      return {
        success: false,
        error: 'Ticket not found',
      };
    }

    return {
      success: true,
      ticket: ticket as Ticket,
    };
  } catch (error) {
    console.error('Error in getTicketBySessionId:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
