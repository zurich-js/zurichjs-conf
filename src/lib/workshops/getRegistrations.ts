/**
 * Get Workshop Registrations
 * Fetch registrations for users or workshops
 */

import { createServiceRoleClient } from '@/lib/supabase';
import type { WorkshopRegistration } from '@/lib/types/database';

export interface GetRegistrationsResult {
  success: boolean;
  registrations?: WorkshopRegistration[];
  error?: string;
}

/**
 * Get all registrations for a specific user
 */
export async function getRegistrationsByUserId(userId: string): Promise<GetRegistrationsResult> {
  const supabase = createServiceRoleClient();

  try {
    const { data: registrations, error } = await supabase
      .from('workshop_registrations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user registrations:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      registrations: (registrations || []) as WorkshopRegistration[],
    };
  } catch (error) {
    console.error('Error in getRegistrationsByUserId:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all registrations for a specific workshop
 */
export async function getRegistrationsByWorkshopId(
  workshopId: string
): Promise<GetRegistrationsResult> {
  const supabase = createServiceRoleClient();

  try {
    const { data: registrations, error } = await supabase
      .from('workshop_registrations')
      .select('*')
      .eq('workshop_id', workshopId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching workshop registrations:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      registrations: (registrations || []) as WorkshopRegistration[],
    };
  } catch (error) {
    console.error('Error in getRegistrationsByWorkshopId:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get a single registration by ID
 */
export async function getRegistrationById(registrationId: string): Promise<{
  success: boolean;
  registration?: WorkshopRegistration;
  error?: string;
}> {
  const supabase = createServiceRoleClient();

  try {
    const { data: registration, error } = await supabase
      .from('workshop_registrations')
      .select('*')
      .eq('id', registrationId)
      .single();

    if (error) {
      console.error('Error fetching registration:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    if (!registration) {
      return {
        success: false,
        error: 'Registration not found',
      };
    }

    return {
      success: true,
      registration: registration as WorkshopRegistration,
    };
  } catch (error) {
    console.error('Error in getRegistrationById:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
