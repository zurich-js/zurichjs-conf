import React from 'react';
import { Shirt } from 'lucide-react';

/** Copy shape for the apparel availability notice — lives in `@/data/apparel`. */
export interface ApparelAvailabilityCopy {
  title: string;
  /** Main body, rendered as separate paragraphs. */
  paragraphs: readonly string[];
  /** Extra line shown only when the order includes a VIP hoodie. */
  hoodieNote: string;
  /** Closing line making clear the buyer is accepting the caveat. */
  acknowledgement: string;
}

export interface ApparelAvailabilityNoticeProps {
  copy: ApparelAvailabilityCopy;
  /** Adds the hoodie line for VIP orders. */
  includesHoodie?: boolean;
  className?: string;
}

/**
 * Explains, at checkout, that a requested apparel size may already be spoken
 * for and that ordering confirms the buyer accepts that.
 */
export const ApparelAvailabilityNotice: React.FC<ApparelAvailabilityNoticeProps> = ({
  copy,
  includesHoodie = false,
  className = '',
}) => (
  <aside
    className={`rounded-xl border border-brand-yellow-main/30 bg-brand-yellow-main/10 p-4 ${className}`}
  >
    <div className="flex items-start gap-3">
      <Shirt
        className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-yellow-main"
        aria-hidden="true"
      />
      <div className="space-y-2 text-sm leading-relaxed text-brand-gray-lightest">
        <p className="font-semibold text-brand-white">{copy.title}</p>
        {copy.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {includesHoodie && <p>{copy.hoodieNote}</p>}
        <p className="text-brand-gray-light">{copy.acknowledgement}</p>
      </div>
    </div>
  </aside>
);
