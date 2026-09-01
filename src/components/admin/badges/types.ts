import type { BadgeCategory } from '@/lib/badges/export';
import type { AttendeeNetworkingProfile } from '@/lib/types/networking';

export interface BadgeReviewRow {
  selectionId: string;
  source: 'attendee' | 'speaker' | 'sponsor' | 'manual';
  category: BadgeCategory;
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  company: string;
  logoUrl: string | null;
  publicId: string | null;
  shareUrl: string | null;
  badgeCode: string | null;
  qrUrl: string | null;
  networkingEnabled: boolean;
  networkingProfile: AttendeeNetworkingProfile | null;
}

export interface BadgeReviewResponse {
  rows: BadgeReviewRow[];
}
