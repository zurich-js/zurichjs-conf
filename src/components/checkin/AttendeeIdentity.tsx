import React from 'react';
import { Building2, Mail } from 'lucide-react';
import { Pill } from '@/components/atoms/Pill';

export interface AttendeeIdentityProps {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  company: string | null;
  /** Ticket tier, e.g. "vip". Omitted for a workshop-only attendee. */
  ticketCategory?: string | null;
  ticketType?: string | null;
  /** Whether this role may see contact details. Leads only. */
  showContact?: boolean;
  /** Provenance when the ticket was transferred, so a name mismatch is explained. */
  transferredFromName?: string | null;
  className?: string;
}

/**
 * Who is standing at the door.
 *
 * The name is the largest text on the screen because the volunteer says it out
 * loud to confirm — that spoken confirmation is the actual identity check, not
 * the QR. `break-words` because a long name must wrap rather than overflow a
 * phone held in one hand.
 *
 * Contact details are gated on role: a scanner does not need an email address to
 * admit someone, so PII stays off the highest-traffic screen.
 */
export const AttendeeIdentity: React.FC<AttendeeIdentityProps> = ({
  firstName,
  lastName,
  email,
  company,
  ticketCategory,
  ticketType,
  showContact = false,
  transferredFromName,
  className = '',
}) => {
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  return (
    <div className={className}>
      <h2 className="text-3xl font-bold leading-tight text-text-primary break-words sm:text-4xl">
        {fullName || 'Name not on this seat'}
      </h2>

      {!fullName ? (
        <p className="mt-1 text-sm text-text-tertiary">
          An unnamed seat — confirm who they are and add the name at the desk.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {ticketCategory ? (
          <Pill variant={ticketCategory === 'vip' ? 'accent' : 'default'} size="sm">
            {ticketCategory.toUpperCase()}
          </Pill>
        ) : (
          <Pill variant="default" size="sm">
            WORKSHOP ONLY
          </Pill>
        )}
        {ticketType && ticketType !== ticketCategory ? (
          <Pill variant="default" size="sm">
            {ticketType.replace(/_/g, ' ')}
          </Pill>
        ) : null}
      </div>

      {transferredFromName ? (
        <p className="mt-3 text-sm text-text-tertiary">
          Transferred from <span className="font-medium">{transferredFromName}</span> — a different
          name on the badge is expected.
        </p>
      ) : null}

      {showContact && (email || company) ? (
        <dl className="mt-4 space-y-1.5">
          {email ? (
            <div className="flex items-center gap-2">
              <dt className="sr-only">Email</dt>
              <Mail className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
              <dd className="text-sm text-text-secondary break-all">{email}</dd>
            </div>
          ) : null}
          {company ? (
            <div className="flex items-center gap-2">
              <dt className="sr-only">Company</dt>
              <Building2 className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
              <dd className="text-sm text-text-secondary">{company}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
};
