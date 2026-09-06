import React from 'react';
import Link from 'next/link';
import { DoorNotice } from './DoorNotice';

export type StationAccessPhase =
  /** Session query still in flight. */
  | 'loading'
  /** 401 — the redirect to sign-in is already underway. */
  | 'sign_in'
  /** 403 — signed in, but not on the crew. */
  | 'forbidden'
  /** Any other failure: the server or the network. */
  | 'error'
  /** The session resolved to nothing without erroring. */
  | 'empty';

export interface StationAccessStateProps {
  phase: StationAccessPhase;
  /** The server's own words for a 403, when it gave any. */
  errorMessage?: string | null;
  onRetry?: () => void;
  className?: string;
}

/**
 * Everything the station shows BEFORE it has a staff identity.
 *
 * Only a 401 means "go sign in". A 403 (signed in but not on the crew) or a 500
 * (the server fell over) must NOT bounce the volunteer to the login page: they
 * ARE signed in, and re-authenticating cannot fix it. That redirect is how a
 * server bug reads as "I keep getting kicked out" — so each case says what
 * will actually help.
 */
export const StationAccessState: React.FC<StationAccessStateProps> = ({
  phase,
  errorMessage,
  onRetry,
  className = '',
}) => {
  if (phase === 'sign_in') {
    // The page is already redirecting; this is the frame before it lands, and a
    // link in case the replace is blocked.
    return (
      <p className={`py-16 text-center text-text-muted ${className}`}>
        Taking you to{' '}
        <Link href="/checkin/login" className="text-brand-primary underline">
          sign-in
        </Link>
        …
      </p>
    );
  }

  if (phase === 'forbidden') {
    return (
      <div className={`py-16 ${className}`}>
        <DoorNotice tone="warning" title="No door access on this account">
          {errorMessage || 'This account is not active door staff.'} Ask a door lead to invite or
          re-enable you, or{' '}
          <Link href="/checkin/login" className="text-brand-primary underline">
            sign in with a different address
          </Link>
          .
        </DoorNotice>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className={`py-16 ${className}`}>
        <DoorNotice
          tone="error"
          title="Could not start the door session"
          actionLabel="Try again"
          onAction={onRetry}
        >
          This is a problem on our side, not with your sign-in. Retry in a moment, and wave a
          lead over if it keeps failing.
        </DoorNotice>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <p className={`py-16 text-center text-text-muted ${className}`} aria-live="polite">
        Checking your access…
      </p>
    );
  }

  // A blank screen at a door is the worst possible answer, so say something.
  return (
    <p className={`py-16 text-center text-text-muted ${className}`}>
      Could not read your door access. Reload, and ask a lead if it persists.
    </p>
  );
};
