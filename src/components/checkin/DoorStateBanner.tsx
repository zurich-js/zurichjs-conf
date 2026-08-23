import React from 'react';
import { AlertTriangle, Check, CircleSlash, Clock, HelpCircle } from 'lucide-react';

export type DoorState = 'admit' | 'admitted' | 'already' | 'refused' | 'unknown';

export interface DoorStateBannerProps {
  state: DoorState;
  /** Shown under the headline: a refusal reason, or when they were checked in. */
  detail?: string;
  className?: string;
}

/**
 * The loudest thing on the door screen.
 *
 * A volunteer reads COLOUR before text — they are looking at the attendee, not
 * the phone. So the banner fills the width, uses a saturated semantic surface,
 * and states the verdict in one or two words. The detail line is for the person
 * who then looks down.
 *
 * Colour is never the only signal: every state also carries an icon and a word,
 * so it survives colour-blindness and a washed-out screen in direct sun.
 */
const STATE_STYLES: Record<DoorState, string> = {
  admit: 'bg-success text-brand-black',
  admitted: 'bg-success text-brand-black',
  already: 'bg-warning text-brand-black',
  refused: 'bg-error text-brand-white',
  unknown: 'bg-surface-elevated text-text-primary',
};

const STATE_LABELS: Record<DoorState, string> = {
  admit: 'Ready to admit',
  admitted: 'Checked in',
  already: 'Already checked in',
  refused: 'Do not admit',
  unknown: 'Not in the roster',
};

const STATE_ICONS: Record<DoorState, React.ComponentType<{ className?: string }>> = {
  admit: Check,
  admitted: Check,
  already: Clock,
  refused: CircleSlash,
  unknown: HelpCircle,
};

export const DoorStateBanner: React.FC<DoorStateBannerProps> = ({
  state,
  detail,
  className = '',
}) => {
  const Icon = STATE_ICONS[state];

  return (
    <div
      // Announced to screen readers as soon as it changes: the state is the
      // whole point of the screen, and assertive is right for a door queue.
      role="status"
      aria-live="assertive"
      className={`flex items-center gap-4 rounded-2xl px-5 py-4 ${STATE_STYLES[state]} ${className}`}
    >
      <Icon className="h-8 w-8 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xl font-bold leading-tight">{STATE_LABELS[state]}</p>
        {detail ? <p className="mt-0.5 text-sm font-medium opacity-90">{detail}</p> : null}
      </div>
    </div>
  );
};

export interface DoorRefusalHintProps {
  message: string;
  className?: string;
}

/** What to DO about a refusal, kept visually distinct from the verdict itself. */
export const DoorRefusalHint: React.FC<DoorRefusalHintProps> = ({ message, className = '' }) => (
  <div
    className={`flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 ${className}`}
  >
    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
    <p className="text-sm font-medium text-text-secondary">{message}</p>
  </div>
);
