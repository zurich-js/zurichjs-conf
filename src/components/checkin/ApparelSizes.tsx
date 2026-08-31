import React from 'react';
import { Shirt } from 'lucide-react';

export interface ApparelSizesProps {
  tshirtSize: string | null;
  hoodieSize: string | null;
  /** Hoodies are part of the VIP package only. */
  isVip?: boolean;
  className?: string;
}

/**
 * Apparel sizes for the swag table.
 *
 * "Never provided" is rendered differently from a size on purpose. A blank where
 * a size should be reads as a loading state or a bug; an explicit "not given"
 * tells the volunteer to ask, which is the actual next action.
 *
 * The hoodie row only appears for VIP tickets, matching the rule enforced in
 * src/pages/api/tickets/[id]/apparel.ts.
 */
export const ApparelSizes: React.FC<ApparelSizesProps> = ({
  tshirtSize,
  hoodieSize,
  isVip = false,
  className = '',
}) => (
  <div className={className}>
    <div className="mb-2 flex items-center gap-2">
      <Shirt className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        Apparel
      </h3>
    </div>

    <dl className="grid grid-cols-2 gap-3">
      <SizeCell label="T-shirt" size={tshirtSize} />
      {isVip ? <SizeCell label="Hoodie" size={hoodieSize} /> : null}
    </dl>
  </div>
);

interface SizeCellProps {
  label: string;
  size: string | null;
}

const SizeCell: React.FC<SizeCellProps> = ({ label, size }) => (
  <div className="rounded-xl bg-surface-elevated px-4 py-3">
    <dt className="text-xs font-medium uppercase tracking-wide text-text-tertiary">{label}</dt>
    {size ? (
      <dd className="mt-0.5 text-2xl font-bold leading-none text-text-primary">
        {size.toUpperCase()}
      </dd>
    ) : (
      <dd className="mt-1 text-sm font-medium italic text-warning">Not given — ask</dd>
    )}
  </div>
);
