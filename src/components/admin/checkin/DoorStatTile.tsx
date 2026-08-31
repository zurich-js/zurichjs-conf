import React from 'react';

export type DoorStatTone = 'neutral' | 'ok' | 'warn';

export interface DoorStatTileProps {
  label: string;
  value: number;
  /** Context under the figure — a denominator, or why it matters. */
  secondary?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: DoorStatTone;
  className?: string;
}

const TONE_STYLES: Record<DoorStatTone, string> = {
  neutral: 'border-gray-200 bg-white',
  ok: 'border-green-200 bg-green-50',
  warn: 'border-orange-300 bg-orange-50',
};

const TONE_VALUE_STYLES: Record<DoorStatTone, string> = {
  neutral: 'text-black',
  ok: 'text-green-800',
  warn: 'text-orange-800',
};

/**
 * One figure on the live dashboard.
 *
 * Tone is semantic, not decorative: warn means a lead should look now. It is
 * paired with the secondary line rather than used alone, so the reason is on
 * screen and colour is never the only signal.
 *
 * tabular-nums so a figure ticking from 99 to 100 does not shift the layout on
 * every poll.
 */
export const DoorStatTile: React.FC<DoorStatTileProps> = ({
  label,
  value,
  secondary,
  icon: Icon,
  tone = 'neutral',
  className = '',
}) => (
  <div className={`rounded-xl border p-4 ${TONE_STYLES[tone]} ${className}`}>
    <div className="flex items-center gap-2">
      {Icon ? <Icon className="h-4 w-4 text-gray-500" aria-hidden="true" /> : null}
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">{label}</p>
    </div>
    <p
      className={`mt-1 text-3xl font-bold tabular-nums leading-none ${TONE_VALUE_STYLES[tone]}`}
    >
      {value}
    </p>
    {secondary ? <p className="mt-1 text-xs text-gray-600">{secondary}</p> : null}
  </div>
);
