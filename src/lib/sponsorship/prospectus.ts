/**
 * Sponsorship prospectus storage helpers.
 */

import { createServiceRoleClient } from '@/lib/supabase';
import {
  isSponsorshipDisplayCurrency,
  SPONSORSHIP_CURRENCIES,
  type SponsorshipDisplayCurrency,
} from '@/lib/sponsorship/currency-types';

export const PROSPECTUS_CATEGORIES = ['compact', 'full'] as const;
export type ProspectusCategory = typeof PROSPECTUS_CATEGORIES[number];
export const PROSPECTUS_CURRENCIES = SPONSORSHIP_CURRENCIES;
export type ProspectusCurrency = SponsorshipDisplayCurrency;

const BUCKET = 'sponsorship-assets';
const MAX_AGE_SECONDS = 60 * 60;

export interface ProspectusAsset {
  category: ProspectusCategory;
  currency: ProspectusCurrency;
  exists: boolean;
  path: string;
  url: string | null;
  size: number | null;
  updatedAt: string | null;
}

export function isProspectusCategory(value: unknown): value is ProspectusCategory {
  return PROSPECTUS_CATEGORIES.includes(value as ProspectusCategory);
}

export function isProspectusCurrency(value: unknown): value is ProspectusCurrency {
  return isSponsorshipDisplayCurrency(value);
}

export function getProspectusPath(currency: ProspectusCurrency, category: ProspectusCategory): string {
  return `prospectus/${currency.toLowerCase()}/${category}.pdf`;
}

export async function listProspectusAssets(): Promise<ProspectusAsset[]> {
  return Promise.all(
    PROSPECTUS_CURRENCIES.flatMap((currency) =>
      PROSPECTUS_CATEGORIES.map((category) => getProspectusAsset(currency, category)),
    ),
  );
}

export async function getProspectusAsset(
  currency: ProspectusCurrency,
  category: ProspectusCategory,
): Promise<ProspectusAsset> {
  const supabase = createServiceRoleClient();
  const path = getProspectusPath(currency, category);
  const directory = `prospectus/${currency.toLowerCase()}`;
  const { data: files, error } = await supabase.storage
    .from(BUCKET)
    .list(directory, { search: `${category}.pdf` });

  if (error) {
    throw new Error(`Failed to list prospectus files: ${error.message}`);
  }

  const file = files?.find((item) => item.name === `${category}.pdf`);
  if (!file) {
    return {
      category,
      currency,
      exists: false,
      path,
      url: null,
      size: null,
      updatedAt: null,
    };
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return {
    category,
    currency,
    exists: true,
    path,
    url: publicUrl,
    size: file.metadata?.size ?? null,
    updatedAt: file.updated_at ?? file.created_at ?? null,
  };
}

export async function uploadProspectusAsset(
  currency: ProspectusCurrency,
  category: ProspectusCategory,
  fileBuffer: Buffer,
): Promise<ProspectusAsset> {
  const supabase = createServiceRoleClient();
  const path = getProspectusPath(currency, category);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, fileBuffer, {
      contentType: 'application/pdf',
      cacheControl: String(MAX_AGE_SECONDS),
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload prospectus: ${error.message}`);
  }

  return getProspectusAsset(currency, category);
}

export async function createProspectusUploadToken(
  currency: ProspectusCurrency,
  category: ProspectusCategory,
): Promise<{
  path: string;
  token: string;
  signedUrl: string;
}> {
  const supabase = createServiceRoleClient();
  const path = getProspectusPath(currency, category);
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path, { upsert: true });

  if (error) {
    throw new Error(`Failed to create prospectus upload URL: ${error.message}`);
  }

  return data;
}

export async function deleteProspectusAsset(
  currency: ProspectusCurrency,
  category: ProspectusCategory,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.storage.from(BUCKET).remove([getProspectusPath(currency, category)]);
  if (error) {
    throw new Error(`Failed to delete prospectus: ${error.message}`);
  }
}

export async function downloadProspectusAsset(
  currency: ProspectusCurrency,
  category: ProspectusCategory,
): Promise<{
  bytes: Buffer;
  path: string;
}> {
  const supabase = createServiceRoleClient();
  const path = getProspectusPath(currency, category);
  const { data, error } = await supabase.storage.from(BUCKET).download(path);

  if (error) {
    throw new Error(`Failed to download prospectus: ${error.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return {
    bytes: Buffer.from(arrayBuffer),
    path,
  };
}
