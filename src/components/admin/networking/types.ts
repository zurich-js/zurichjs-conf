/**
 * Admin Networking Directory Types
 */

import type {
  NetworkingDirectoryEntry,
  NetworkingDirectoryResponse,
  NetworkingDirectorySource,
  NetworkingDirectoryStats,
} from '@/lib/types/networking';

export type {
  NetworkingDirectoryEntry,
  NetworkingDirectoryResponse,
  NetworkingDirectorySource,
  NetworkingDirectoryStats,
};

export type NetworkingStatusFilter = 'enabled' | 'disabled' | 'all';
export type NetworkingSourceFilter = 'all' | NetworkingDirectorySource;
