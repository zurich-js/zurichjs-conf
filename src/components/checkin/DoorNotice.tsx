import React from 'react';
import { AlertCircle, AlertTriangle, Radio } from 'lucide-react';

export type DoorNoticeTone = 'error' | 'warning' | 'info';

export interface DoorNoticeProps {
  tone: DoorNoticeTone;
  title: string;
  children?: React.ReactNode;
  /** Label for the single inline action, if any. */
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const TONE_STYLES: Record<DoorNoticeTone, string> = {
  error: 'border-error/40 bg-error/10',
  warning: 'border-warning/40 bg-warning/10',
  info: 'border-info/40 bg-info/10',
};

const TONE_ICONS: Record<DoorNoticeTone, React.ComponentType<{ className?: string }>> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Radio,
};

const TONE_ICON_COLOURS: Record<DoorNoticeTone, string> = {
  error: 'text-error',
  warning: 'text-warning',
  info: 'text-info',
};

/**
 * One shape for everything the station has to tell a volunteer that is not a
 * verdict about an attendee.
 *
 * Kept visually distinct from `DoorStateBanner`, which is the loud full-width
 * verdict. These are quieter on purpose: a stuck queue matters, but not more than
 * the person standing in front of them.
 *
 * `role="alert"` on error and warning, `status` on info, so a screen reader
 * interrupts for a problem and waits for a hint.
 */
export const DoorNotice: React.FC<DoorNoticeProps> = ({
  tone,
  title,
  children,
  actionLabel,
  onAction,
  className = '',
}) => {
  const Icon = TONE_ICONS[tone];

  return (
    <div
      role={tone === 'info' ? 'status' : 'alert'}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${TONE_STYLES[tone]} ${className}`}
    >
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${TONE_ICON_COLOURS[tone]}`}
        aria-hidden="true"
      />
      <div className="min-w-0 text-sm text-text-secondary">
        <p className="font-medium text-text-primary">{title}</p>
        {children ? <div className="mt-1">{children}</div> : null}
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-2 min-h-9 font-medium text-brand-primary underline focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
};
