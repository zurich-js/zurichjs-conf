/**
 * Hoodie Allocation Admin Types
 */

import type {
  HoodieAllocationResponse,
  HoodieEntry,
  HoodieExcludedEntry,
  HoodieExclusion,
  HoodieReason,
  HoodieStats,
} from '@/lib/types/hoodies';

export type { HoodieAllocationResponse, HoodieEntry, HoodieExcludedEntry, HoodieExclusion, HoodieReason, HoodieStats };

export type HoodieFilter = 'all' | HoodieReason | 'missing_size' | 'not_handed' | 'excluded';
