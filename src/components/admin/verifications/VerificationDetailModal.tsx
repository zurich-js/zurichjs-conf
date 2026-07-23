/**
 * Verification detail modal
 * Full detail view for a single verification request, including its ticket
 * purchase status and a follow-up action when the purchase is outstanding.
 */

import { Copy, ExternalLink, Mail, Ticket } from 'lucide-react';
import { AdminModal } from '@/components/admin/AdminModal';
import { StatusPill, TicketStatusPill } from './badges';
import { buildFollowUpMailto } from './followUp';
import { countryFlag } from './country';
import type { VerificationWithTicket } from './types';

interface VerificationDetailModalProps {
  verification: VerificationWithTicket;
  isLoading: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCopy: (text: string) => void;
}

export function VerificationDetailModal({
  verification: v,
  isLoading,
  onClose,
  onApprove,
  onReject,
  onCopy,
}: VerificationDetailModalProps) {
  return (
    <AdminModal
      isOpen
      onClose={onClose}
      title={v.name}
      subtitle={`${v.verification_type === 'student' ? 'Student' : 'Unemployed'} Verification`}
      size="lg"
      footer={
        v.status === 'pending' ? (
          <>
            <button
              onClick={() => onReject(v.id)}
              disabled={isLoading}
              className="cursor-pointer rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={() => onApprove(v.id)}
              disabled={isLoading}
              className="cursor-pointer rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-black hover:bg-[#E5D665] disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Approve & Send Payment Link'}
            </button>
          </>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Status */}
        <div className="flex items-center gap-3">
          <StatusPill status={v.status} />
          <TicketStatusPill status={v.follow_up_status} />
          <span className="text-sm text-gray-500">
            ID: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{v.verification_id}</code>
          </span>
        </div>

        {/* Ticket purchase status */}
        <TicketPurchaseSection verification={v} />

        {/* Contact info */}
        <Section title="Contact Information">
          <DetailRow label="Name" value={v.name} />
          <DetailRow label="Email" value={v.email} />
        </Section>

        {/* Verification details */}
        <Section title="Verification Details">
          <DetailRow label="Type" value={v.verification_type === 'student' ? 'Student' : 'Unemployed'} />
          {v.university && <DetailRow label="University" value={v.university} />}
          {v.student_id && <DetailRow label="Student ID" value={v.student_id} />}
          {v.linkedin_url && (
            <DetailRow
              label="LinkedIn"
              value={
                <a
                  href={v.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  {v.linkedin_url}
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              }
            />
          )}
          {v.rav_registration_date && (
            <DetailRow
              label="RAV Registration"
              value={new Date(v.rav_registration_date).toLocaleDateString('en-CH')}
            />
          )}
        </Section>

        {/* Pricing info */}
        {(v.country_code || v.currency) && (
          <Section title="Pricing">
            {v.country_code && (
              <DetailRow label="Country" value={`${countryFlag(v.country_code)} ${v.country_code}`} />
            )}
            {v.currency && <DetailRow label="Currency" value={v.currency} />}
            <DetailRow
              label="Price ID"
              value={<code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{v.price_id}</code>}
            />
          </Section>
        )}

        {/* Additional info */}
        {v.additional_info && (
          <Section title="Additional Information">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{v.additional_info}</p>
          </Section>
        )}

        {/* Payment link (if approved) */}
        {v.status === 'approved' && v.stripe_payment_link_url && (
          <Section title="Payment Link">
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg text-xs text-gray-700 truncate">
                {v.stripe_payment_link_url}
              </code>
              <button
                onClick={() => onCopy(v.stripe_payment_link_url!)}
                className="shrink-0 p-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                title="Copy link"
              >
                <Copy className="w-4 h-4 text-gray-500" aria-hidden="true" />
                <span className="sr-only">Copy payment link</span>
              </button>
              <a
                href={v.stripe_payment_link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Open link"
              >
                <ExternalLink className="w-4 h-4 text-gray-500" aria-hidden="true" />
                <span className="sr-only">Open payment link</span>
              </a>
            </div>
          </Section>
        )}

        {/* Timestamps */}
        <Section title="Timeline">
          <DetailRow
            label="Submitted"
            value={new Date(v.created_at).toLocaleString('en-CH', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          />
          {v.reviewed_at && (
            <DetailRow
              label="Reviewed"
              value={new Date(v.reviewed_at).toLocaleString('en-CH', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            />
          )}
        </Section>
      </div>
    </AdminModal>
  );
}

function TicketPurchaseSection({ verification: v }: { verification: VerificationWithTicket }) {
  if (v.follow_up_status === 'purchased') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Ticket className="w-4 h-4 text-green-700" aria-hidden="true" />
          <h4 className="text-sm font-semibold text-green-800">Ticket purchased</h4>
        </div>
        <div className="space-y-1 text-sm text-green-900">
          {v.ticket_match.ticket_category && (
            <p>
              Category: <span className="font-medium capitalize">{v.ticket_match.ticket_category}</span>
            </p>
          )}
          {v.ticket_match.purchased_at && (
            <p>
              Purchased:{' '}
              {new Date(v.ticket_match.purchased_at).toLocaleString('en-CH', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          )}
          <p className="text-xs text-green-700">
            {v.ticket_match.matched_by === 'session'
              ? 'Matched via Stripe checkout session'
              : 'Matched via email address'}
          </p>
        </div>
      </div>
    );
  }

  if (v.follow_up_status === 'needs_follow_up') {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Ticket className="w-4 h-4 text-amber-700" aria-hidden="true" />
          <h4 className="text-sm font-semibold text-amber-800">No ticket purchase found</h4>
        </div>
        <p className="text-sm text-amber-900 mb-3">
          This request was approved{v.reviewed_at
            ? ` on ${new Date(v.reviewed_at).toLocaleDateString('en-CH', { day: 'numeric', month: 'short', year: 'numeric' })}`
            : ''}{' '}
          but no matching confirmed ticket exists yet.
        </p>
        <a
          href={buildFollowUpMailto(v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
        >
          <Mail className="w-3.5 h-3.5" aria-hidden="true" />
          Send follow-up email
        </a>
      </div>
    );
  }

  return null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-black mb-3 border-b border-gray-100 pb-2">
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-sm text-gray-500 w-32 shrink-0">{label}</span>
      <span className="text-sm text-black">{value}</span>
    </div>
  );
}
