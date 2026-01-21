/**
 * Partnership Admin API
 * API functions for partnership management
 */

import type {
  Partnership,
  PartnershipType,
  PartnershipStatus,
  PartnershipCoupon,
  PartnershipVoucher,
  StripeProductInfo,
} from './types';
import type { PartnershipStats } from './types';

export interface PartnershipListResponse {
  partnerships: Partnership[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PartnershipListParams {
  type?: PartnershipType;
  status?: PartnershipStatus;
  search?: string;
}

export async function fetchPartnerships(params: PartnershipListParams): Promise<PartnershipListResponse> {
  const queryParams = new URLSearchParams();
  if (params.type) queryParams.set('type', params.type);
  if (params.status) queryParams.set('status', params.status);
  if (params.search) queryParams.set('search', params.search);

  const res = await fetch(`/api/admin/partnerships?${queryParams.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch partnerships');
  return res.json();
}

export async function fetchPartnershipStats(): Promise<PartnershipStats> {
  const res = await fetch('/api/admin/partnerships/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export type PartnershipWithDetails = Partnership & {
  coupons: PartnershipCoupon[];
  vouchers: PartnershipVoucher[];
};

export async function fetchPartnershipDetails(id: string): Promise<PartnershipWithDetails> {
  const res = await fetch(`/api/admin/partnerships/${id}`);
  if (!res.ok) throw new Error('Failed to fetch partnership');
  return res.json();
}

export async function fetchProducts(): Promise<{ products: StripeProductInfo[] }> {
  const res = await fetch('/api/admin/partnerships/products');
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export const partnershipQueryKeys = {
  all: ['partnerships'] as const,
  lists: () => [...partnershipQueryKeys.all, 'list'] as const,
  list: (params: PartnershipListParams) => [...partnershipQueryKeys.lists(), params] as const,
  stats: () => [...partnershipQueryKeys.all, 'stats'] as const,
  details: () => [...partnershipQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...partnershipQueryKeys.details(), id] as const,
  products: () => [...partnershipQueryKeys.all, 'products'] as const,
};
