/**
 * Hoodie Allocation Admin Types
 */

import type { HoodieAllocationResponse } from '@/pages/api/admin/hoodies';
import type { HoodieEntry, HoodieExcludedEntry, HoodieExclusion, HoodieReason, HoodieStats } from '@/lib/hoodies';

export type { HoodieAllocationResponse, HoodieEntry, HoodieExcludedEntry, HoodieExclusion, HoodieReason, HoodieStats };

export type HoodieFilter = 'all' | HoodieReason | 'missing_size' | 'not_handed' | 'excluded';
