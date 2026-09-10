import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CircleSlash,
  Clock,
  HelpCircle,
  IdCard,
} from 'lucide-react';
import { useMotion } from '@/contexts/MotionContext';

/**
 * `pickup` / `handed` / `picked_up` are the warm-up meetup's trio — that day
 * has no check-ins, so the badge is the verdict; `handed` is its `admitted`.
 * `nothing_today` is the workshop-only attendee on badge day: legitimate, but
 * nothing to record for them.
 */
export type DoorState =
  | 'admit'
  | 'admitted'
  | 'already'
  | 'pickup'
  | 'handed'
  | 'picked_up'
  | 'nothing_today'
  | 'refused'
  | 'unknown';

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
 *
 * MOTION
 * The state change is the moment that matters at a door — "Ready to admit"
 * becoming "Checked in" is the confirmation the volunteer acts on — so the
 * banner re-enters on every state change with a short pop, and the icon gets a
 * spring so the tick visibly lands. Both collapse to a plain swap under
 * prefers-reduced-motion via useMotion().
 */
const STATE_STYLES: Record<DoorState, string> = {
  admit: 'bg-success text-brand-black',
  admitted: 'bg-success text-brand-black',
  already: 'bg-warning text-brand-black',
  pickup: 'bg-success text-brand-black',
  handed: 'bg-success text-brand-black',
  picked_up: 'bg-warning text-brand-black',
  nothing_today: 'bg-surface-elevated text-text-primary',
  refused: 'bg-error text-brand-white',
  unknown: 'bg-surface-elevated text-text-primary',
};

const STATE_LABELS: Record<DoorState, string> = {
  admit: 'Verified',
  admitted: 'Checked in',
  already: 'Already checked in',
  pickup: 'Verified',
  handed: 'Badge handed over',
  picked_up: 'Badge already picked up',
  nothing_today: 'Nothing to record today',
  refused: 'Do not admit',
  unknown: 'Not in the roster',
};

/**
 * The two "verified" states are deliberately QUIET. They are not the verdict —
 * the check-in has not happened yet — and a loud green bar was being read as
 * "done" and tapped, when the real action is the button under the name. So they
 * render half-height, say one word, and point at the button.
 */
const COMPACT_STATES: ReadonlySet<DoorState> = new Set<DoorState>(['admit', 'pickup']);

const STATE_ICONS: Record<DoorState, React.ComponentType<{ className?: string }>> = {
  admit: Check,
  admitted: Check,
  already: Clock,
  pickup: IdCard,
  handed: IdCard,
  picked_up: Clock,
  nothing_today: CalendarClock,
  refused: CircleSlash,
  unknown: HelpCircle,
};

export const DoorStateBanner: React.FC<DoorStateBannerProps> = ({
  state,
  detail,
  className = '',
}) => {
  const { shouldAnimate } = useMotion();
  const Icon = STATE_ICONS[state];
  const compact = COMPACT_STATES.has(state);
  const iconClassName = compact ? 'h-5 w-5' : 'h-8 w-8';

  const content = (
    <>
      {shouldAnimate ? (
        <motion.span
          // Keyed on the state so the icon springs in again on every verdict
          // change, not only on mount.
          key={state}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          className="shrink-0"
        >
          <Icon className={iconClassName} aria-hidden="true" />
        </motion.span>
      ) : (
        <Icon className={`${iconClassName} shrink-0`} aria-hidden="true" />
      )}
      <div className="min-w-0">
        <p className={compact ? 'text-sm font-bold leading-tight' : 'text-xl font-bold leading-tight'}>
          {STATE_LABELS[state]}
        </p>
        {detail ? (
          <p className={compact ? 'text-xs font-medium opacity-90' : 'mt-0.5 text-sm font-medium opacity-90'}>
            {detail}
          </p>
        ) : null}
      </div>
    </>
  );

  const baseClassName = `flex items-center rounded-2xl ${
    compact ? 'gap-3 px-4 py-2.5' : 'gap-4 px-5 py-4'
  } ${STATE_STYLES[state]} ${className}`;

  if (!shouldAnimate) {
    return (
      <div role="status" aria-live="assertive" className={baseClassName}>
        {content}
      </div>
    );
  }

  return (
    <motion.div
      // Announced to screen readers as soon as it changes: the state is the
      // whole point of the screen, and assertive is right for a door queue.
      role="status"
      aria-live="assertive"
      key={state}
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={baseClassName}
    >
      {content}
    </motion.div>
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
