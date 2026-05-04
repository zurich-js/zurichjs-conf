import Stripe from 'stripe';
import { createCfpServiceClient } from '@/lib/supabase/cfp-client';
import { env } from '@/config/env';
import { buildRequiredLookupKeys } from '@/config/currency';
import type { Workshop, WorkshopStatus } from '@/lib/types/database';
import type { StripeValidationResult, WorkshopOfferingInput } from '@/lib/types/program';

async function getSessionSource(sessionId: string) {
  const supabase = createCfpServiceClient();
  const { data, error } = await supabase
    .from('program_sessions')
    .select('id, cfp_submission_id, title, abstract, workshop_capacity, workshop_duration_minutes')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) return { session: null, error: error.message };
  if (!data) return { session: null, error: 'Program session not found' };
  return { session: data as {
    id: string;
    cfp_submission_id: string | null;
    title: string;
    abstract: string | null;
    workshop_capacity: number | null;
    workshop_duration_minutes: number | null;
  } };
}

export async function getWorkshopOfferingBySessionId(
  sessionId: string
): Promise<{ offering: Workshop | null; error?: string }> {
  const supabase = createCfpServiceClient();
  const { data, error } = await supabase
    .from('workshops')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error) return { offering: null, error: error.message };
  return { offering: (data as Workshop | null) ?? null };
}

export async function createWorkshopOfferingForSession(
  input: WorkshopOfferingInput
): Promise<{ offering: Workshop | null; error?: string }> {
  const supabase = createCfpServiceClient();
  const source = await getSessionSource(input.session_id);
  if (source.error || !source.session) return { offering: null, error: source.error };

  const { data: existing, error: existingError } = await supabase
    .from('workshops')
    .select('*')
    .eq('session_id', input.session_id)
    .maybeSingle();

  if (existingError) return { offering: null, error: existingError.message };
  if (existing) return { offering: null, error: 'Offering already exists for this program session' };

  const { data, error } = await supabase
    .from('workshops')
    .insert({
      session_id: input.session_id,
      cfp_submission_id: source.session.cfp_submission_id,
      title: input.title ?? source.session.title,
      description: input.description ?? source.session.abstract ?? '',
      capacity: input.capacity ?? source.session.workshop_capacity ?? 20,
      duration_minutes: input.duration_minutes ?? source.session.workshop_duration_minutes,
      room: input.room ?? null,
      stripe_product_id: input.stripe_product_id ?? null,
      stripe_price_lookup_key: input.stripe_price_lookup_key ?? null,
      status: input.status ?? 'draft',
      date: input.date ?? null,
      start_time: input.start_time ?? null,
      end_time: input.end_time ?? null,
      metadata: input.stripe_validation ? { stripeValidation: input.stripe_validation } : {},
    })
    .select('*')
    .single();

  if (error || !data) return { offering: null, error: error?.message ?? 'Failed to create offering' };
  return { offering: data as Workshop };
}

export async function updateWorkshopOfferingForSession(
  sessionId: string,
  input: Partial<Omit<WorkshopOfferingInput, 'session_id'>>
): Promise<{ offering: Workshop | null; error?: string }> {
  const supabase = createCfpServiceClient();
  const { offering: current, error: currentError } = await getWorkshopOfferingBySessionId(sessionId);
  if (currentError) return { offering: null, error: currentError };
  if (!current) return { offering: null, error: 'Workshop offering not found' };

  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.capacity !== undefined) updates.capacity = input.capacity;
  if (input.room !== undefined) updates.room = input.room;
  if (input.duration_minutes !== undefined) updates.duration_minutes = input.duration_minutes;
  if (input.stripe_product_id !== undefined) updates.stripe_product_id = input.stripe_product_id;
  if (input.stripe_price_lookup_key !== undefined) updates.stripe_price_lookup_key = input.stripe_price_lookup_key;
  if (input.status !== undefined) updates.status = input.status;
  if (input.date !== undefined) updates.date = input.date;
  if (input.start_time !== undefined) updates.start_time = input.start_time;
  if (input.end_time !== undefined) updates.end_time = input.end_time;
  if (input.stripe_validation !== undefined) {
    updates.metadata = {
      ...current.metadata,
      stripeValidation: input.stripe_validation,
    };
  }

  if (Object.keys(updates).length === 0) return { offering: current };

  const { data, error } = await supabase
    .from('workshops')
    .update(updates)
    .eq('session_id', sessionId)
    .select('*')
    .maybeSingle();

  if (error) return { offering: null, error: error.message };
  return { offering: data as Workshop };
}

export async function archiveWorkshopOfferingForSession(
  sessionId: string
): Promise<{ offering: Workshop | null; error?: string }> {
  return updateWorkshopOfferingForSession(sessionId, {
    status: 'archived' satisfies WorkshopStatus,
  });
}

export async function validateWorkshopStripeLookup(params: {
  lookupKey: string;
  stripeProductId?: string | null;
}): Promise<{ validation: StripeValidationResult | null; error?: string }> {
  try {
    const stripe = new Stripe(env.stripe.secretKey, { apiVersion: '2025-10-29.clover' });
    const keys = buildRequiredLookupKeys(params.lookupKey);
    const results = await Promise.all(
      keys.map(async (key) => {
        const { data } = await stripe.prices.list({
          lookup_keys: [key],
          active: true,
          limit: 1,
        });
        const price = data[0] ?? null;
        const productId = price
          ? typeof price.product === 'string'
            ? price.product
            : price.product.id
          : null;

        return {
          lookupKey: key,
          priceId: price?.id ?? null,
          unitAmount: price?.unit_amount ?? null,
          currency: price?.currency?.toUpperCase() ?? null,
          productId,
        };
      })
    );

    const missing = results.filter((result) => !result.priceId).map((result) => result.lookupKey);
    const productIds = new Set(results.map((result) => result.productId).filter(Boolean));
    const productMismatch = productIds.size > 1;
    const productMismatchWithExpected =
      Boolean(params.stripeProductId) &&
      results.some((result) => result.productId && result.productId !== params.stripeProductId);

    return {
      validation: {
        valid: missing.length === 0 && !productMismatch && !productMismatchWithExpected,
        lookupKey: params.lookupKey,
        stripeProductId: params.stripeProductId ?? null,
        validatedAt: new Date().toISOString(),
        results,
        missing,
        productMismatch,
        productMismatchWithExpected,
      },
    };
  } catch (error) {
    return {
      validation: null,
      error: error instanceof Error ? error.message : 'Failed to validate Stripe lookup key',
    };
  }
}
