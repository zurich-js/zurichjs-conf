/**
 * WorkshopWaitlistModal
 * Sold-out workshop waitlist modal. Wraps the generic `WaitlistModal` with the
 * workshop copy and posts to /api/workshops/waitlist.
 */

import { useMemo } from 'react';
import { WaitlistModal } from '@/components/molecules';
import { buildWorkshopWaitlistConfig } from '@/data/workshop-waitlist';

export interface WorkshopWaitlistModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Workshop offering row id — sent to the waitlist API */
  workshopId: string;
  /** Human-readable workshop title, used as the modal heading */
  workshopTitle: string;
  /** Callback to close the modal */
  onClose: () => void;
}

export function WorkshopWaitlistModal({
  isOpen,
  workshopId,
  workshopTitle,
  onClose,
}: WorkshopWaitlistModalProps) {
  const config = useMemo(
    () => buildWorkshopWaitlistConfig({ workshopId, workshopTitle }),
    [workshopId, workshopTitle]
  );

  return <WaitlistModal isOpen={isOpen} onClose={onClose} isSoldOut config={config} />;
}
