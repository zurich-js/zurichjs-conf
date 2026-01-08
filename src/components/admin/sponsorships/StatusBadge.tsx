/**
 * Sponsorship Status Badge Component
 * Displays deal status with appropriate styling
 */

import React from 'react';
import type { SponsorshipDealStatus } from './types';
import { DEAL_STATUS_CONFIG } from '@/lib/types/sponsorship';

interface StatusBadgeProps {
  status: SponsorshipDealStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = DEAL_STATUS_CONFIG[status];

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-sm px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${config.bgColor} ${config.color}`}
    >
      {config.label}
    </span>
  );
}
