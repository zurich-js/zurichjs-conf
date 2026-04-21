/**
 * Get Workshop Registrations
 * Fetch registrations for users or workshops
 */

import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { WorkshopRegistration } from '@/lib/types/database';

const log = logger.scope('Workshop Registrations');

export interface GetRegistrationsResult {
  success: boolean;
  registrations?: WorkshopRegistration[];
  error?: string;
}

export interface WorkshopRegistrantRow extends WorkshopRegistration {
  profile_first_name: string | null;
  profile_last_name: string | null;
  profile_email: string | null;
  partnership_coupon_code: string | null;
  partnership_voucher_code: string | null;
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
      log.error('Error fetching user registrations', error, { userId });
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
    log.error('Exception in getRegistrationsByUserId', error instanceof Error ? error : new Error(String(error)), { userId });
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
      log.error('Error fetching workshop registrations', error, { workshopId });
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
    log.error('Exception in getRegistrationsByWorkshopId', error instanceof Error ? error : new Error(String(error)), { workshopId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get registrations for a workshop enriched with profile + coupon/voucher context.
 * Used by the admin registrants view.
 */
export async function getRegistrantsForAdmin(workshopId: string): Promise<{
  success: boolean;
  registrants?: WorkshopRegistrantRow[];
  error?: string;
}> {
  const supabase = createServiceRoleClient();

  try {
    const { data, error } = await supabase
      .from('workshop_registrations')
      .select(`
        *,
        profile:profiles!workshop_registrations_user_id_fkey(first_name,last_name,email),
        coupon:partnership_coupons(code),
        voucher:partnership_vouchers(code)
      `)
      .eq('workshop_id', workshopId)
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Error fetching workshop registrants', error, { workshopId });
      return { success: false, error: error.message };
    }

    const rows: WorkshopRegistrantRow[] = (data ?? []).map((row) => {
      const { profile, coupon, voucher, ...rest } = row as typeof row & {
        profile?: { first_name: string | null; last_name: string | null; email: string | null } | null;
        coupon?: { code: string | null } | null;
        voucher?: { code: string | null } | null;
      };
      return {
        ...(rest as unknown as WorkshopRegistration),
        profile_first_name: profile?.first_name ?? null,
        profile_last_name: profile?.last_name ?? null,
        profile_email: profile?.email ?? null,
        partnership_coupon_code: coupon?.code ?? null,
        partnership_voucher_code: voucher?.code ?? null,
      };
    });

    return { success: true, registrants: rows };
  } catch (error) {
    log.error('Exception in getRegistrantsForAdmin', error instanceof Error ? error : new Error(String(error)), { workshopId });
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
      log.error('Error fetching registration', error, { registrationId });
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
    log.error('Exception in getRegistrationById', error instanceof Error ? error : new Error(String(error)), { registrationId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
