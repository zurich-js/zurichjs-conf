/**
 * Get Ticket Counts
 * Fetch ticket sales counts by stage and category for stock tracking
 */

import { createServiceRoleClient } from '@/lib/supabase';
import type { PriceStage, TicketCategory, StageStockCounts } from '@/config/pricing-stages';

/**
 * Map database ticket_stage values to PriceStage
 */
const mapDbStageToStage = (dbStage: string): PriceStage => {
  switch (dbStage) {
    case 'blind_bird':
      return 'blind_bird';
    case 'early_bird':
      return 'early_bird';
    case 'general_admission':
      return 'standard';
    case 'late_bird':
      return 'late_bird';
    default:
      return 'standard';
  }
};

/**
 * Map database ticket_category values to TicketCategory
 */
const mapDbCategoryToCategory = (dbCategory: string): TicketCategory => {
  switch (dbCategory) {
    case 'student':
    case 'unemployed':
      return 'standard_student_unemployed';
    case 'standard':
      return 'standard';
    case 'vip':
      return 'vip';
    default:
      return 'standard';
  }
};

/**
 * Fetch ticket counts by stage and category from database
 * Only counts confirmed (paid) tickets
 */
export async function getTicketCounts(): Promise<{
  success: boolean;
  counts?: StageStockCounts;
  error?: string;
}> {
  const supabase = createServiceRoleClient();

  try {
    // Fetch all confirmed tickets
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('ticket_stage, ticket_category')
      .eq('status', 'confirmed');

    if (error) {
      console.error('Error fetching ticket counts:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Initialize counts
    const counts: StageStockCounts = {
      byStage: {
        blind_bird: 0,
        early_bird: 0,
        standard: 0,
        late_bird: 0,
      },
      byCategory: {
        standard_student_unemployed: 0,
        standard: 0,
        vip: 0,
      },
    };

    // Count tickets
    for (const ticket of tickets || []) {
      if (ticket.ticket_stage) {
        const stage = mapDbStageToStage(ticket.ticket_stage);
        counts.byStage[stage]++;
      }
      if (ticket.ticket_category) {
        const category = mapDbCategoryToCategory(ticket.ticket_category);
        counts.byCategory[category]++;
      }
    }

    return {
      success: true,
      counts,
    };
  } catch (error) {
    console.error('Error in getTicketCounts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
