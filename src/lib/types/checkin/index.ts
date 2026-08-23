/**
 * Door check-in domain types.
 *
 * These mirror the JSON returned by the `door_resolve`, `door_check_in` and
 * `door_goodie_handover` Postgres functions. They are hand-written on purpose:
 * those functions return `jsonb`, so the generated database types describe the
 * call signature but say nothing about the payload shape. This module is the
 * single place that shape is described, so a change to the SQL has exactly one
 * TypeScript counterpart to update.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Occasions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The two check-in occasions. The event also has a community day (9 Sep) and a
 * post-conference day (12 Sep), but neither has sessions and neither is checked
 * in — see src/data/public-program.ts.
 */
export const DOOR_OCCASIONS = ['workshop_day', 'conference_day'] as const;
export type DoorOccasion = (typeof DOOR_OCCASIONS)[number];

export const DOOR_OCCASION_LABELS: Record<DoorOccasion, string> = {
  workshop_day: 'Workshop day',
  conference_day: 'Conference day',
};

/** Calendar date of each occasion, for display only. */
export const DOOR_OCCASION_DATES: Record<DoorOccasion, string> = {
  workshop_day: '2026-09-10',
  conference_day: '2026-09-11',
};

// ─────────────────────────────────────────────────────────────────────────────
// Staff
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Door roles. Three, not five: the problem desk IS a lead, because separating
 * them would mean a volunteer who cannot resolve anything having to fetch
 * someone who can, which is exactly what stops a queue.
 */
export const DOOR_ROLES = ['door_lead', 'scanner', 'goodie'] as const;
export type DoorRole = (typeof DOOR_ROLES)[number];

export const DOOR_ROLE_LABELS: Record<DoorRole, string> = {
  door_lead: 'Door lead',
  scanner: 'Scanner',
  goodie: 'Goodie bag',
};

export const DOOR_ROLE_DESCRIPTIONS: Record<DoorRole, string> = {
  door_lead:
    'Everything a scanner can do, plus the problem desk: look people up by name, admit someone without a working QR, and see contact details.',
  scanner: 'Scan a QR and check someone in. Cannot admit anyone without a QR.',
  goodie: 'Hand over t-shirts and hoodies. Cannot check anyone in.',
};

/**
 * Which roles may perform which action. Mirrors the authorization branches in
 * `door_check_in` and `door_goodie_handover` — the database is the enforcement
 * point, and this exists so the UI can hide what would be refused rather than
 * offering a button that fails.
 */
export const DOOR_ROLE_ABILITIES = {
  door_lead: ['check_in', 'goodie', 'manual_admit', 'lookup', 'view_contact'],
  scanner: ['check_in', 'lookup'],
  goodie: ['goodie', 'lookup'],
} as const satisfies Record<DoorRole, readonly DoorAbility[]>;

export const DOOR_ABILITIES = [
  'check_in',
  'goodie',
  'manual_admit',
  'lookup',
  'view_contact',
] as const;
export type DoorAbility = (typeof DOOR_ABILITIES)[number];

export function roleCan(role: DoorRole, ability: DoorAbility): boolean {
  return (DOOR_ROLE_ABILITIES[role] as readonly DoorAbility[]).includes(ability);
}

export interface DoorStaff {
  id: string;
  email: string;
  name: string | null;
  role: DoorRole;
  isActive: boolean;
  invitedAt: string;
  invitedBy: string | null;
  acceptedAt: string | null;
}

/** A staff member's own view of their session, used to gate the door UI. */
export interface DoorSession {
  staff: DoorStaff;
  /** Occasion the server currently considers active, derived from its clock. */
  occasion: DoorOccasion;
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolve payload
// ─────────────────────────────────────────────────────────────────────────────

export type DoorSubjectKind = 'ticket' | 'workshop_registration';

export interface DoorPerson {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  company: string | null;
  jobTitle: string | null;
}

export interface DoorTicketInfo {
  type: string;
  category: string;
  stage: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  isVip: boolean;
  transferredFromName: string | null;
  transferredFromEmail: string | null;
}

export interface DoorCheckInState {
  workshopDayAt: string | null;
  conferenceDayAt: string | null;
}

export interface DoorGoodieState {
  /**
   * Entitlement follows the conference ticket. A workshop-only attendee is not
   * entitled to a goodie bag, so this is false for them by construction.
   */
  entitled: boolean;
  handedAt: string | null;
  /** Set when only part of the entitlement was handed over. */
  note: string | null;
}

export interface DoorApparel {
  tshirtSize: string | null;
  hoodieSize: string | null;
}

/**
 * Why a workshop seat was attributed to this person.
 *
 * `own_email` is the strong signal. `own_ticket` means the seat carries their
 * ticket_id and names nobody else — necessary because one ticket_id is stamped
 * on every seat of a Stripe session, so a purchaser's ticket would otherwise
 * absorb their colleagues' seats.
 */
export type DoorSeatMatch = 'own_email' | 'own_ticket';

export interface DoorHeldWorkshop {
  registrationId: string;
  workshopId: string;
  title: string;
  room: string | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  seatIndex: number;
  checkedInAt: string | null;
  matchedBy: DoorSeatMatch;
}

/** A seat this person paid for but is not attending — a colleague's seat. */
export interface DoorPurchasedForOther {
  registrationId: string;
  title: string;
  attendeeEmail: string | null;
}

export interface DoorWorkshops {
  held: DoorHeldWorkshop[];
  purchasedForOthers: DoorPurchasedForOther[];
}

/** A scanned UUID that matched neither id space. */
export interface DoorResolveMiss {
  found: false;
  subjectKind: null;
}

export interface DoorResolveHit {
  found: true;
  subjectKind: DoorSubjectKind;
  subjectId: string;
  person: DoorPerson;
  /** Null for a workshop-only attendee, who has no conference ticket at all. */
  ticket: DoorTicketInfo | null;
  /** False for a refunded, cancelled or unpaid subject. */
  admissible: boolean;
  /** Machine-readable reason when `admissible` is false, e.g. ticket_refunded. */
  refusalReason: string | null;
  checkIn: DoorCheckInState;
  goodie: DoorGoodieState;
  apparel: DoorApparel;
  doorNote: string | null;
  workshops: DoorWorkshops;
}

export type DoorResolveResult = DoorResolveHit | DoorResolveMiss;

export function isDoorResolveHit(result: DoorResolveResult): result is DoorResolveHit {
  return result.found;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutation outcomes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `duplicate` is a first-class outcome, not an error. The door must be able to
 * say "already checked in at 09:14" rather than reporting a second success —
 * the response is what authorises releasing a goodie bag.
 */
export const DOOR_OUTCOMES = ['applied', 'duplicate', 'denied', 'not_found'] as const;
export type DoorOutcome = (typeof DOOR_OUTCOMES)[number];

export interface DoorCheckInResult {
  outcome: DoorOutcome;
  occasion?: DoorOccasion;
  subjectKind?: DoorSubjectKind;
  /** Present when the outcome is `duplicate`. */
  alreadyCheckedInAt?: string | null;
  /** Present when the outcome is `denied` or `not_found`. */
  failureReason?: string;
}

export interface DoorGoodieResult {
  outcome: DoorOutcome;
  alreadyHandedAt?: string | null;
  failureReason?: string;
}

/**
 * Human-facing text for every refusal the functions can return. Keyed on the
 * machine reason so a volunteer never sees a raw enum, and so an unmapped
 * reason is obvious in review rather than rendering as a blank.
 */
export const DOOR_FAILURE_MESSAGES: Record<string, string> = {
  staff_not_active: 'Your access has been revoked. Ask a lead to re-enable it.',
  role_may_not_check_in: 'Your role cannot check people in. Ask a scanner or a lead.',
  manual_admit_requires_lead: 'Only a door lead can admit someone without a QR code.',
  manual_admit_requires_reason: 'A manual admission needs a reason.',
  subject_not_found: 'This code is not in the roster. Try the desk lookup.',
  not_entitled: 'No goodie bag for this attendee.',
  ticket_pending: 'Payment has not settled yet. Send them to the desk.',
  ticket_cancelled: 'This ticket was cancelled. Send them to the desk.',
  ticket_refunded: 'This ticket was refunded. Send them to the desk.',
  registration_pending: 'This workshop payment has not settled. Send them to the desk.',
  registration_cancelled: 'This workshop seat was cancelled. Send them to the desk.',
  registration_refunded: 'This workshop seat was refunded. Send them to the desk.',
};

export function doorFailureMessage(reason: string | undefined): string {
  if (!reason) return 'Something went wrong. Try again, or use the desk.';
  return DOOR_FAILURE_MESSAGES[reason] ?? `Refused: ${reason}`;
}
