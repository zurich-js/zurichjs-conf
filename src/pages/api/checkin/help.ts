/**
 * Door Help API
 * POST /api/checkin/help — a volunteer needs a core team member at the door
 *
 * The old Help button only showed a note ("wave a lead over in person"), which
 * at a busy door is the same as no button. This one tells the core team on
 * Slack, with everything they need to arrive prepared: who is asking, who is
 * standing in front of them, and what the station already knows about that
 * person — or, for a code that matched nothing, the code itself.
 *
 * The attendee is RE-RESOLVED HERE from the id, never taken from the client:
 * the message is read by someone who will act on it, so it must describe the
 * database's view of the person, not a stale roster's. A resolve failure does
 * not block the ping — a volunteer with a broken lookup needs help more, not
 * less — it just sends what there is.
 *
 * Delivery is reported honestly. The station tells the volunteer either "the
 * team has been pinged" or "find someone in person", and only the server knows
 * which is true.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireDoorStaff } from '@/lib/checkin/guard';
import { doorCurrentOccasion, doorResolve } from '@/lib/checkin/rpc';
import { formatDoorTime } from '@/lib/checkin/panel-state';
import { doorHelpRequestSchema } from '@/lib/validations/checkin';
import { createRateLimiter } from '@/lib/rate-limit';
import { notifyDoorHelpRequested, type DoorHelpRequestedData } from '@/lib/platform-notifications';
import { logger } from '@/lib/logger';
import {
  DOOR_OCCASION_LABELS,
  DOOR_ROLE_LABELS,
  isDoorResolveHit,
  type DoorOccasion,
  type DoorResolveHit,
} from '@/lib/types/checkin';

const log = logger.scope('Door Help API');

/**
 * Per volunteer, not per IP: a whole door shares one venue network. Generous
 * enough for a bad five minutes at the desk, tight enough that a stuck button
 * or a bored thumb cannot flood the core team's channel.
 */
const HELP_RATE_LIMIT = { windowMs: 60_000, maxRequests: 10 } as const;
const helpLimiter = createRateLimiter(HELP_RATE_LIMIT);

export interface DoorHelpResponse {
  /** True only when Slack accepted the message. */
  delivered: boolean;
  /** Short handle the volunteer can read out to whoever arrives. */
  reference: string | null;
}

function timeOrNot(at: string | null, notYet: string): string {
  return at ? `at ${formatDoorTime(at)}` : notYet;
}

/** Flatten the resolve payload into the lines a human reads on their phone. */
function describeAttendee(
  hit: DoorResolveHit,
  fromLookup: boolean
): NonNullable<DoorHelpRequestedData['attendee']> {
  const name =
    [hit.person.firstName, hit.person.lastName].filter(Boolean).join(' ').trim() || 'Unnamed seat';

  const ticket = hit.ticket;
  const ticketSummary = ticket
    ? [
        ticket.category.toUpperCase(),
        ticket.type.replace(/_/g, ' '),
        ticket.status,
        ticket.transferredFromName ? `transferred from ${ticket.transferredFromName}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Workshop only — no conference ticket';

  const checkedInSummary = [
    `Workshop day ${timeOrNot(hit.checkIn.workshopDayAt, 'not yet')}`,
    `Conference day ${timeOrNot(hit.checkIn.conferenceDayAt, 'not yet')}`,
  ].join(' · ');

  const badgeSummary = ticket
    ? hit.badge.pickedUpAt
      ? `Picked up ${timeOrNot(hit.badge.pickedUpAt, '')}`
      : 'Not picked up'
    : 'No badge — workshop only';

  const goodieSummary = !hit.goodie.entitled
    ? 'Not entitled — workshop only'
    : hit.goodie.handedAt
      ? `All handed ${timeOrNot(hit.goodie.handedAt, '')}`
      : [
          `T-shirt ${hit.goodie.tshirtHandedAt ? 'handed' : 'not handed'}`,
          // Owed per the database verdict, not the tier — the same answer the
          // volunteer's screen gives, so the team never contradicts it.
          hit.goodie.hoodieEligible
            ? `Hoodie ${hit.goodie.hoodieHandedAt ? 'handed' : 'not handed'}`
            : null,
          hit.goodie.note ? `note: ${hit.goodie.note}` : null,
        ]
          .filter(Boolean)
          .join(' · ');

  const workshops = hit.workshops.held.map((seat) =>
    [
      seat.title,
      seat.room,
      seat.startTime ? seat.startTime.slice(0, 5) : null,
      seat.checkedInAt ? `in ${timeOrNot(seat.checkedInAt, '')}` : 'not checked in',
    ]
      .filter(Boolean)
      .join(' · ')
  );

  return {
    name,
    email: hit.person.email,
    company: hit.person.company,
    ticketSummary,
    admissible: hit.admissible,
    refusalReason: hit.refusalReason,
    checkedInSummary,
    badgeSummary,
    goodieSummary,
    workshops,
    doorNote: hit.doorNote,
    fromLookup,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DoorHelpResponse | { error: string; issues?: unknown }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Every role may call for help — that is rather the point of the button.
  const guard = await requireDoorStaff(req, res);
  if (!guard.ok) {
    return res.status(guard.status).json({ error: guard.error });
  }

  const parsed = doorHelpRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
  }

  const { scannedId = null, rawCode = null, station, note, fromLookup } = parsed.data;
  const { staff } = guard;

  if (!helpLimiter.check(staff.id).allowed) {
    log.warn('Help requests rate-limited', { staffId: staff.id });
    return res
      .status(429)
      .json({ error: 'Too many help requests — find a core team member in person' });
  }

  try {
    const occasion: DoorOccasion = parsed.data.occasion ?? (await doorCurrentOccasion());

    let attendee: DoorHelpRequestedData['attendee'] = null;
    if (scannedId) {
      try {
        const resolved = await doorResolve(scannedId);
        if (isDoorResolveHit(resolved)) attendee = describeAttendee(resolved, fromLookup);
      } catch (error) {
        // Send the ping anyway: the id alone lets the team look the person up.
        log.warn('Could not resolve the attendee for a help request', {
          staffId: staff.id,
          scannedId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const delivered = await notifyDoorHelpRequested({
      staffName: staff.name ?? staff.email,
      staffEmail: staff.email,
      staffRole: DOOR_ROLE_LABELS[staff.role],
      occasionLabel: DOOR_OCCASION_LABELS[occasion],
      station: station ?? null,
      attendee,
      scannedId,
      rawCode,
      note: note ?? null,
    });

    log.info('Help requested', {
      staffId: staff.id,
      occasion,
      known: attendee !== null,
      delivered,
    });

    return res.status(200).json({
      delivered,
      reference: scannedId ? scannedId.slice(0, 8) : null,
    });
  } catch (error) {
    log.error('Help request failed', error, { staffId: staff.id });
    return res.status(500).json({ error: 'Could not send the help request' });
  }
}
