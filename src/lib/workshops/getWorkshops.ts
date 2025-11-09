/**
 * Get Workshops
 * Fetch workshops with various filters
 */

import { createServiceRoleClient } from '@/lib/supabase';
import type { Workshop, WorkshopStatus } from '@/lib/types/database';

export interface GetWorkshopsResult {
  success: boolean;
  workshops?: Workshop[];
  error?: string;
}

/**
 * Get all published workshops
 */
export async function getPublishedWorkshops(): Promise<GetWorkshopsResult> {
  const supabase = createServiceRoleClient();

  try {
    const { data: workshops, error } = await supabase
      .from('workshops')
      .select('*')
      .eq('status', 'published' as WorkshopStatus)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching published workshops:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      workshops: (workshops || []) as Workshop[],
    };
  } catch (error) {
    console.error('Error in getPublishedWorkshops:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get a single workshop by ID
 */
export async function getWorkshopById(workshopId: string): Promise<{
  success: boolean;
  workshop?: Workshop;
  error?: string;
}> {
  const supabase = createServiceRoleClient();

  try {
    const { data: workshop, error } = await supabase
      .from('workshops')
      .select('*')
      .eq('id', workshopId)
      .single();

    if (error) {
      console.error('Error fetching workshop:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    if (!workshop) {
      return {
        success: false,
        error: 'Workshop not found',
      };
    }

    return {
      success: true,
      workshop: workshop as Workshop,
    };
  } catch (error) {
    console.error('Error in getWorkshopById:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all workshops (admin only)
 */
export async function getAllWorkshops(): Promise<GetWorkshopsResult> {
  const supabase = createServiceRoleClient();

  try {
    const { data: workshops, error } = await supabase
      .from('workshops')
      .select('*')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching all workshops:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      workshops: (workshops || []) as Workshop[],
    };
  } catch (error) {
    console.error('Error in getAllWorkshops:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
