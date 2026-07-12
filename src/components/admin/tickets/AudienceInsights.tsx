import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import type { Ticket } from '@/components/admin/dashboard/types';
import { AudienceInsightsModal } from './AudienceInsightsModal';

interface AudienceInsightsProps {
  tickets: Ticket[];
}

/**
 * Self-contained audience insights entry point for any admin surface with ticket data.
 */
export function AudienceInsights({ tickets }: AudienceInsightsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-brand-primary/80"
      >
        <BarChart3 className="size-4" aria-hidden="true" />
        Audience insights
      </button>
      {isOpen ? <AudienceInsightsModal tickets={tickets} onClose={() => setIsOpen(false)} /> : null}
    </>
  );
}

export type { AudienceInsightsProps };
