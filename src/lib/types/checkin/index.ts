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
 * The three door occasions, in calendar order. The warm-up meetup (9 Sep) is
 * the early badge pickup desk — it has no sessions and therefore NO check-ins:
 * `door_check_in` refuses the occasion outright. The post-conference day
 * (12 Sep) has no door at all — see src/data/public-program.ts.
 */
export const DOOR_OCCASIONS = ['community_day', 'workshop_day', 'conference_day'] as const;
export type DoorOccasion = (typeof DOOR_OCCASIONS)[number];

export const DOOR_OCCASION_LABELS: Record<DoorOccasion, string> = {
  community_day: 'Warm-up meetup',
  workshop_day: 'Workshop day',
  conference_day: 'Conference day',
};

/** Calendar date of each occasion, for display only. */
export const DOOR_OCCASION_DATES: Record<DoorOccasion, string> = {
  community_day: '2026-09-09',
  workshop_day: '2026-09-10',
  conference_day: '2026-09-11',
};

/**
 * What a volunteer actually DOES on each occasion, for the start screen. One
 * plain sentence each: the day choice is the highest-stakes tap of the shift,
 * and a label alone ("Workshop day") does not say what the station will and
 * will not offer.
 */
export const DOOR_OCCASION_TASKS: Record<DoorOccasion, string> = {
  community_day: 'Early badge pickup only — nobody is checked in on this day.',
  workshop_day:
    'Check people into their workshop. Conference ticket holders can also collect their badge.',
  conference_day: 'Check people in and hand over badges and goodies.',
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
  goodie: 'Goodies',
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
  door_lead: ['check_in', 'goodie', 'manual_admit', 'lookup', 'view_contact', 'badge_pickup'],
  scanner: ['check_in', 'lookup', 'badge_pickup'],
  goodie: ['goodie', 'lookup', 'badge_pickup'],
} as const satisfies Record<DoorRole, readonly DoorAbility[]>;

export const DOOR_ABILITIES = [
  'check_in',
  'goodie',
  'manual_admit',
  'lookup',
  'view_contact',
  'badge_pickup',
] as const;
export type DoorAbility = (typeof DOOR_ABILITIES)[number];

export function roleCan(role: DoorRole, ability: DoorAbility): boolean {
  return (DOOR_ROLE_ABILITIES[role] as readonly DoorAbility[]).includes(ability);
}

/**
 * What each ability is, and what it CHANGES ON THE VOLUNTEER'S SCREEN.
 *
 * The second half is the part an organiser actually needs when choosing a role.
 * "Cannot manually admit" says nothing about the experience; "the reason box and
 * the Admit button are absent, so they have to fetch a lead" does. Everything
 * here is phrased as a difference the volunteer will notice, because the whole
 * point of picking a role is deciding what someone can get done alone.
 */
export const DOOR_ABILITY_GUIDE: Record<
  DoorAbility,
  { label: string; withIt: string; withoutIt: string }
> = {
  check_in: {
    label: 'Check people in',
    withIt: 'Scanning a badge shows a green "Check in" button. One tap admits them.',
    withoutIt:
      'Scanning still shows who the person is and whether they are admissible, but there is no button to admit them.',
  },
  goodie: {
    label: 'Hand over t-shirts and hoodies',
    withIt:
      'The goodie panel shows their sizes and a "Handed over" button, so the handover is recorded against their ticket.',
    withoutIt:
      'Sizes are still visible, but the handover cannot be recorded — someone on the goodie lane does that.',
  },
  manual_admit: {
    label: 'Admit without a working code',
    withIt:
      'A person found by name can be admitted after typing a reason. Recorded separately from a scan, so the log shows nobody verified a code.',
    withoutIt:
      'They can find the person and read their details, but the screen tells them a door lead has to do the admitting.',
  },
  lookup: {
    label: 'Find someone by name',
    withIt:
      '"Find by name" searches the roster in memory — name, company or email — for anyone whose badge has no code.',
    withoutIt: 'Scanning is the only way to bring up an attendee.',
  },
  view_contact: {
    label: 'See contact details',
    withIt: 'Email addresses appear on the attendee panel and in lookup results.',
    withoutIt:
      'Names and companies show, email addresses do not. Enough to confirm who someone is without handing a volunteer the attendee list.',
  },
  badge_pickup: {
    label: 'Hand over badges',
    withIt:
      'A "Badge handed over" button records the pickup — including early pickup the day before — without touching any day\'s check-in.',
    withoutIt: 'Badge pickups cannot be recorded from this account.',
  },
};

/** One line on where this role stands at the door. */
export const DOOR_ROLE_LANE: Record<DoorRole, string> = {
  door_lead: 'The problem desk, and anywhere else. Give this to whoever is running the door.',
  scanner: 'The scanning lane. This is the role most of the crew should have.',
  goodie: 'The goodie table, after people are already through the door.',
};

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

/**
 * Mirrors the `payment_status` Postgres enum. Named so the roster projection and
 * the RPC payload cannot drift apart.
 */
export type DoorTicketStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded';

export interface DoorTicketInfo {
  type: string;
  category: string;
  stage: string;
  status: DoorTicketStatus;
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
  /** Set when the FULL entitlement (t-shirt and, for VIPs, hoodie) was handed. */
  handedAt: string | null;
  /** Set when only part of the entitlement was handed over. */
  note: string | null;
  /** When the t-shirt was physically handed over (null = not yet). */
  tshirtHandedAt: string | null;
  /** When the hoodie was physically handed over (null = not yet, VIPs only). */
  hoodieHandedAt: string | null;
}

export interface DoorApparel {
  tshirtSize: string | null;
  hoodieSize: string | null;
}

/**
 * Whether the physical badge has been handed over yet.
 *
 * Deliberately separate from check-in: badges can be collected early (the
 * community day before the workshops), and picking one up must not consume the
 * next morning's arrival. The state lives in `door_events` — the applied
 * `badge_pickup` row IS the pickup — so it needs no ticket column.
 */
export interface DoorBadgeState {
  pickedUpAt: string | null;
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
  badge: DoorBadgeState;
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

export interface DoorBadgePickupResult {
  outcome: DoorOutcome;
  subjectKind?: DoorSubjectKind;
  /** Present when the outcome is `duplicate`: when the badge actually left the desk. */
  alreadyPickedUpAt?: string | null;
  failureReason?: string;
}

/** `duplicate` means nothing was handed, so there was nothing to take back. */
export interface DoorGoodieUndoResult {
  outcome: DoorOutcome;
  tshirtUndone?: boolean;
  hoodieUndone?: boolean;
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
  workshop_registration_wrong_day:
    'Workshop badges cannot be checked in on conference day. Scan their conference ticket instead.',
  community_day_badge_only:
    'The warm-up meetup has no check-ins — hand over their badge instead.',
};

export function doorFailureMessage(reason: string | undefined): string {
  if (!reason) return 'Something went wrong. Try again, or use the desk.';
  return DOOR_FAILURE_MESSAGES[reason] ?? `Refused: ${reason}`;
}
