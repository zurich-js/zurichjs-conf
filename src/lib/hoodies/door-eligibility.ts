/**
 * Hoodie eligibility as the DOOR needs it: one verdict per ticket, decided on
 * the server from data that never leaves it.
 *
 * SERVER ONLY. Deliberately not exported from the `@/lib/hoodies` barrel, which
 * the admin UI imports for its labels: this module reaches for the service-role
 * client and the CFP speaker list, neither of which belongs in a browser bundle.
 *
 * The rule itself lives in `./allocation` (classifyTicketHoodie), shared with the
 * fulfilment view, so the hoodie count and the door can never disagree about one
 * person. This module only gathers its inputs.
 */

import { createServiceRoleClient } from '@/lib/supabase';
import { getAdminSpeakersWithSubmissions } from '@/lib/cfp/admin';
import { logger } from '@/lib/logger';
import type { HoodieUpgradeInput, HoodieVerdict } from '@/lib/types/hoodies';
import { classifyTicketHoodie } from './allocation';

const log = logger.scope('Hoodie Door Eligibility');

/** The two inputs the rule needs beyond the ticket row itself. */
export interface HoodieEligibilityInputs {
  upgradesById: ReadonlyMap<string, HoodieUpgradeInput>;
  speakerEmails: ReadonlySet<string>;
}

/** The ticket columns the verdict reads. `metadata` is untyped JSON. */
export interface HoodieTicketRow {
  email: string;
  ticket_category: string;
  amount_paid: number;
  metadata: unknown;
}

/** The `select` fragment for {@link HoodieTicketRow}, so callers cannot drift from it. */
export const HOODIE_TICKET_COLUMNS = 'email, ticket_category, amount_paid, metadata';

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

/** One metadata field, or null. */
function readMetadataString(metadata: unknown, field: string): string | null {
  if (typeof metadata !== 'object' || metadata === null) return null;
  const value = (metadata as Record<string, unknown>)[field];
  return typeof value === 'string' && value ? value : null;
}

/**
 * Load the speaker list and the VIP upgrade records.
 *
 * Best-effort: resolves null when either fails, so a caller can fall back to
 * the pre-eligibility behaviour (owed iff VIP) instead of refusing to serve. A
 * door with no roster is a far worse outcome than a hoodie handed to a comp VIP.
 * The failure is logged so it does not pass silently.
 */
export async function loadHoodieEligibilityInputs(
  supabase: ServiceClient = createServiceRoleClient()
): Promise<HoodieEligibilityInputs | null> {
  try {
    const [speakers, upgrades] = await Promise.all([
      getAdminSpeakersWithSubmissions('program'),
      supabase
        .from('ticket_upgrades')
        .select('id, upgrade_mode, status, admin_note')
        .eq('to_tier', 'vip'),
    ]);
    if (upgrades.error) throw new Error(upgrades.error.message);
    return {
      upgradesById: new Map(
        ((upgrades.data ?? []) as HoodieUpgradeInput[]).map((upgrade) => [upgrade.id, upgrade])
      ),
      speakerEmails: new Set(speakers.map((speaker) => speaker.email.trim().toLowerCase())),
    };
  } catch (error) {
    log.error('Hoodie eligibility inputs unavailable; falling back to the VIP tier', error);
    return null;
  }
}

/** The verdict for one ticket row, given the loaded inputs. Pure. */
export function hoodieVerdictForTicketRow(
  row: HoodieTicketRow,
  inputs: HoodieEligibilityInputs
): HoodieVerdict {
  return classifyTicketHoodie(
    {
      email: row.email,
      is_vip: row.ticket_category === 'vip',
      amount_paid: row.amount_paid,
      payment_type: readMetadataString(row.metadata, 'paymentType'),
      complimentary_reason: readMetadataString(row.metadata, 'complimentaryReason'),
      upgrade_id: readMetadataString(row.metadata, 'upgrade_id'),
      upgraded_from: readMetadataString(row.metadata, 'upgraded_from'),
    },
    inputs.upgradesById,
    inputs.speakerEmails
  );
}

/**
 * Whether ONE ticket is owed a hoodie, for the goodie handover route.
 *
 * Resolves null — "unknown" — when the ticket or the inputs cannot be loaded,
 * so the caller can leave the decision to the database's tier-based default
 * rather than fail a handover that is happening at a table right now.
 */
export async function isHoodieOwed(ticketId: string): Promise<boolean | null> {
  const supabase = createServiceRoleClient();
  const [ticket, inputs] = await Promise.all([
    supabase.from('tickets').select(HOODIE_TICKET_COLUMNS).eq('id', ticketId).maybeSingle(),
    loadHoodieEligibilityInputs(supabase),
  ]);
  if (ticket.error || !ticket.data || !inputs) {
    if (ticket.error) {
      log.error('Could not load the ticket for a hoodie verdict', ticket.error, { ticketId });
    }
    return null;
  }
  return hoodieVerdictForTicketRow(ticket.data as HoodieTicketRow, inputs).eligible;
}
