/**
 * Checking someone in from a workshop's attendee list, rather than from a scan.
 *
 * Nobody verified a code on this path, so the write is a MANUAL admission with
 * a fixed reason — the same audit distinction the lookup desk makes, and the
 * same door-lead requirement the database enforces for it. The canned phrasing
 * makes every roll-call entry greppable in the log afterwards.
 */
export const ROLL_CALL_REASON = 'Checked in from the workshop attendee list';
