/**
 * Sponsorship Line Items Business Logic
 * Operations for managing deal pricing breakdown
 */

import { createServiceRoleClient } from '@/lib/supabase';
import type {
  SponsorshipLineItem,
  AddLineItemRequest,
  UpdateLineItemRequest,
  SponsorshipCurrency,
} from '@/lib/types/sponsorship';
import { getTier } from './tiers';

/**
 * Add a line item to a deal
 *
 * @param dealId - UUID of the deal
 * @param data - Line item data
 * @returns Created line item
 */
export async function addLineItem(
  dealId: string,
  data: AddLineItemRequest
): Promise<SponsorshipLineItem> {
  const supabase = createServiceRoleClient();

  // Get the next display order
  const { data: existingItems } = await supabase
    .from('sponsorship_line_items')
    .select('display_order')
    .eq('deal_id', dealId)
    .order('display_order', { ascending: false })
    .limit(1);

  const nextOrder = existingItems?.[0]?.display_order
    ? existingItems[0].display_order + 1
    : 0;

  const { data: lineItem, error } = await supabase
    .from('sponsorship_line_items')
    .insert({
      deal_id: dealId,
      type: data.type,
      description: data.description,
      quantity: data.quantity || 1,
      unit_price: data.unitPrice,
      uses_credit: data.usesCredit || false,
      display_order: nextOrder,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding line item:', error);
    throw new Error(`Failed to add line item: ${error.message}`);
  }

  return lineItem as SponsorshipLineItem;
}

/**
 * Update a line item
 *
 * @param lineItemId - UUID of the line item
 * @param data - Update data
 * @returns Updated line item
 */
export async function updateLineItem(
  lineItemId: string,
  data: UpdateLineItemRequest
): Promise<SponsorshipLineItem> {
  const supabase = createServiceRoleClient();

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {};

  if (data.description !== undefined) updateData.description = data.description;
  if (data.quantity !== undefined) updateData.quantity = data.quantity;
  if (data.unitPrice !== undefined) updateData.unit_price = data.unitPrice;
  if (data.usesCredit !== undefined) updateData.uses_credit = data.usesCredit;

  const { data: lineItem, error } = await supabase
    .from('sponsorship_line_items')
    .update(updateData)
    .eq('id', lineItemId)
    .select()
    .single();

  if (error) {
    console.error('Error updating line item:', error);
    throw new Error(`Failed to update line item: ${error.message}`);
  }

  return lineItem as SponsorshipLineItem;
}

/**
 * Remove a line item
 * Tier base line items cannot be removed
 *
 * @param lineItemId - UUID of the line item
 */
export async function removeLineItem(lineItemId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  // Check if it's a tier_base item
  const { data: lineItem, error: fetchError } = await supabase
    .from('sponsorship_line_items')
    .select('type')
    .eq('id', lineItemId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch line item: ${fetchError.message}`);
  }

  if (lineItem.type === 'tier_base') {
    throw new Error('Cannot remove tier base line item');
  }

  const { error } = await supabase
    .from('sponsorship_line_items')
    .delete()
    .eq('id', lineItemId);

  if (error) {
    console.error('Error removing line item:', error);
    throw new Error(`Failed to remove line item: ${error.message}`);
  }
}

/**
 * Get all line items for a deal
 *
 * @param dealId - UUID of the deal
 * @returns Array of line items sorted by display order
 */
export async function getLineItemsForDeal(
  dealId: string
): Promise<SponsorshipLineItem[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('sponsorship_line_items')
    .select('*')
    .eq('deal_id', dealId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching line items:', error);
    throw new Error(`Failed to fetch line items: ${error.message}`);
  }

  return data as SponsorshipLineItem[];
}

/**
 * Initialize the tier base line item for a deal
 * Called when creating a new deal to set up the base pricing
 *
 * @param dealId - UUID of the deal
 * @param tierId - ID of the tier
 * @param currency - Currency for the deal
 * @returns Created tier base line item
 */
export async function initializeTierBaseLineItem(
  dealId: string,
  tierId: string,
  currency: SponsorshipCurrency
): Promise<SponsorshipLineItem> {
  const tier = await getTier(tierId);

  if (!tier) {
    throw new Error(`Tier not found: ${tierId}`);
  }

  const basePrice = currency === 'CHF' ? tier.price_chf : tier.price_eur;

  return addLineItem(dealId, {
    type: 'tier_base',
    description: `${tier.name} Sponsorship Package`,
    quantity: 1,
    unitPrice: basePrice,
    usesCredit: false,
  });
}

/**
 * Update tier base line item when tier or currency changes
 *
 * @param dealId - UUID of the deal
 * @param tierId - ID of the new tier
 * @param currency - Currency for the deal
 * @returns Updated tier base line item
 */
export async function updateTierBaseLineItem(
  dealId: string,
  tierId: string,
  currency: SponsorshipCurrency
): Promise<SponsorshipLineItem> {
  const supabase = createServiceRoleClient();

  const tier = await getTier(tierId);

  if (!tier) {
    throw new Error(`Tier not found: ${tierId}`);
  }

  const basePrice = currency === 'CHF' ? tier.price_chf : tier.price_eur;

  // Find and update the tier_base line item
  const { data: existingItem, error: fetchError } = await supabase
    .from('sponsorship_line_items')
    .select('id')
    .eq('deal_id', dealId)
    .eq('type', 'tier_base')
    .single();

  if (fetchError) {
    // If no tier_base exists, create one
    if (fetchError.code === 'PGRST116') {
      return initializeTierBaseLineItem(dealId, tierId, currency);
    }
    throw new Error(`Failed to fetch tier base line item: ${fetchError.message}`);
  }

  return updateLineItem(existingItem.id, {
    description: `${tier.name} Sponsorship Package`,
    unitPrice: basePrice,
  });
}
