/**
 * TicketDetailsModal - Detailed modal showing comprehensive ticket information
 */

import { useState, useMemo } from 'react';
import type { Ticket } from './types';

export interface TicketDetailsModalProps {
  ticket: Ticket;
  onClose: () => void;
  onResend: () => void;
  onReassign: () => void;
  onRefund: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onUpgrade: () => void;
  onTicketUpdate?: () => void;
}

// Common countries for the dropdown
const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  'Bahrain', 'Bangladesh', 'Belarus', 'Belgium', 'Bolivia', 'Bosnia and Herzegovina', 'Brazil', 'Bulgaria',
  'Cambodia', 'Canada', 'Chile', 'China', 'Colombia', 'Costa Rica', 'Croatia', 'Cyprus', 'Czech Republic',
  'Denmark', 'Dominican Republic', 'Ecuador', 'Egypt', 'Estonia', 'Ethiopia', 'Finland', 'France',
  'Georgia', 'Germany', 'Ghana', 'Greece', 'Guatemala', 'Hong Kong', 'Hungary',
  'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kosovo', 'Kuwait', 'Latvia', 'Lebanon', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Macedonia', 'Malaysia', 'Malta', 'Mexico', 'Moldova', 'Monaco', 'Montenegro', 'Morocco',
  'Nepal', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway',
  'Oman', 'Pakistan', 'Panama', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar', 'Romania', 'Russia', 'Rwanda',
  'Saudi Arabia', 'Serbia', 'Singapore', 'Slovakia', 'Slovenia', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sweden', 'Switzerland',
  'Taiwan', 'Thailand', 'Tunisia', 'Turkey',
  'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan',
  'Venezuela', 'Vietnam', 'Zimbabwe',
];

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const formatComplimentaryReason = (reason?: string) => {
  if (!reason) return 'Not specified';
  const reasonLabels: Record<string, string> = {
    speaker: 'Speaker',
    sponsor: 'Sponsor',
    organizer: 'Organizer / Staff',
    volunteer: 'Volunteer',
    media: 'Media / Press',
    partner: 'Partner',
    contest_winner: 'Contest Winner',
    other: 'Other',
  };
  return reasonLabels[reason] || reason;
};

export function TicketDetailsModal({
  ticket,
  onClose,
  onResend,
  onReassign,
  onRefund,
  onCancel,
  onDelete,
  onUpgrade,
  onTicketUpdate,
}: TicketDetailsModalProps) {
  const isComplimentary = ticket.metadata?.paymentType === 'complimentary' || ticket.amount_paid === 0;

  // Country editing state
  const [isEditingCountry, setIsEditingCountry] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(ticket.metadata?.session_metadata?.country || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSavingCountry, setIsSavingCountry] = useState(false);

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRIES;
    const search = countrySearch.toLowerCase();
    return COUNTRIES.filter(c => c.toLowerCase().includes(search));
  }, [countrySearch]);

  const handleSaveCountry = async () => {
    if (!selectedCountry.trim()) return;
    setIsSavingCountry(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: selectedCountry }),
      });
      if (res.ok) {
        setIsEditingCountry(false);
        onTicketUpdate?.();
      }
    } catch (error) {
      console.error('Failed to update country:', error);
    } finally {
      setIsSavingCountry(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-black">Ticket Details</h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                  {ticket.first_name} {ticket.last_name}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-4 py-1.5 text-sm font-bold rounded-full ${
                ticket.status === 'confirmed'
                  ? 'bg-green-100 text-green-800'
                  : ticket.status === 'refunded'
                  ? 'bg-red-100 text-red-800'
                  : ticket.status === 'cancelled'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
            </span>
            {ticket.metadata?.issuedManually && (
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">Manually Issued</span>
            )}
            {isComplimentary && (
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">Complimentary</span>
            )}
          </div>

          {/* Ticket Info */}
          <InfoSection title="Ticket Information">
            <InfoGrid>
              <InfoField label="Ticket ID" description="Unique identifier for this ticket" className="sm:col-span-2">
                <span className="font-mono break-all">{ticket.id}</span>
              </InfoField>
              <InfoField label="Category" description="Ticket type (standard, VIP, student, etc.)">
                <span className="capitalize font-medium">{ticket.ticket_category}</span>
              </InfoField>
              <InfoField label="Stage" description="Pricing tier when purchased">
                <span className="capitalize">{ticket.ticket_stage.replace('_', ' ')}</span>
              </InfoField>
            </InfoGrid>
          </InfoSection>

          {/* Attendee Info */}
          <InfoSection title="Attendee Information">
            <InfoGrid>
              <InfoField label="Name">
                <span className="font-medium">{ticket.first_name} {ticket.last_name}</span>
              </InfoField>
              <InfoField label="Email">
                <span className="break-all">{ticket.email}</span>
              </InfoField>
              {ticket.company && <InfoField label="Company">{ticket.company}</InfoField>}
              {ticket.job_title && <InfoField label="Job Title">{ticket.job_title}</InfoField>}
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-500 mb-0.5">Country</p>
                <p className="text-xs text-gray-400 mb-1">Billing country from checkout</p>
                {isEditingCountry ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={countrySearch}
                        onChange={(e) => { setCountrySearch(e.target.value); setShowDropdown(true); }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Type to search countries..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      {showDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredCountries.map((country) => (
                            <button
                              key={country}
                              onClick={() => { setSelectedCountry(country); setCountrySearch(country); setShowDropdown(false); }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer ${
                                selectedCountry === country ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                              }`}
                            >
                              {country}
                            </button>
                          ))}
                          {filteredCountries.length === 0 && (
                            <div className="px-3 py-2 text-sm text-gray-500">No countries found</div>
                          )}
                        </div>
                      )}
                    </div>
                    {selectedCountry && !showDropdown && (
                      <p className="text-sm text-blue-700 font-medium">Selected: {selectedCountry}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveCountry}
                        disabled={isSavingCountry || !selectedCountry.trim()}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                      >
                        {isSavingCountry ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => { setIsEditingCountry(false); setCountrySearch(''); setSelectedCountry(ticket.metadata?.session_metadata?.country || ''); setShowDropdown(false); }}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-black font-medium">{ticket.metadata?.session_metadata?.country || 'Not set'}</span>
                    {ticket.metadata?.session_metadata?.city && (
                      <span className="text-sm text-gray-500">({ticket.metadata.session_metadata.city})</span>
                    )}
                    <button
                      onClick={() => { setIsEditingCountry(true); setCountrySearch(''); setShowDropdown(true); }}
                      className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                      title="Edit country"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </InfoGrid>
          </InfoSection>

          {/* Payment Info */}
          <InfoSection title="Payment Information">
            <InfoGrid>
              <InfoField label="Amount" description="Total paid for this ticket">
                <span className="font-bold">
                  {isComplimentary ? (
                    <span className="text-purple-600">Complimentary</span>
                  ) : (
                    `${(ticket.amount_paid / 100).toFixed(2)} ${ticket.currency}`
                  )}
                </span>
              </InfoField>
              <InfoField label="Payment Type" description="How this ticket was acquired">
                <span className="capitalize">
                  {ticket.metadata?.paymentType === 'bank_transfer'
                    ? 'Bank Transfer'
                    : ticket.metadata?.paymentType || (ticket.amount_paid === 0 ? 'Complimentary' : 'Stripe')}
                </span>
              </InfoField>
              {ticket.metadata?.paymentType === 'bank_transfer' && ticket.metadata?.bankTransferReference && (
                <InfoField label="Bank Transfer Reference" description="Reference or notes for the bank transfer" className="sm:col-span-2">
                  <span className="text-emerald-700 font-medium">{ticket.metadata.bankTransferReference}</span>
                </InfoField>
              )}
              {isComplimentary && ticket.metadata?.complimentaryReason && (
                <InfoField label="Complimentary Reason" description="Why ticket was given for free" className="sm:col-span-2">
                  <span className="text-purple-700 font-medium">{formatComplimentaryReason(ticket.metadata.complimentaryReason)}</span>
                </InfoField>
              )}
              {ticket.stripe_payment_intent_id && (
                <InfoField label="Stripe Payment ID" description="Unique identifier for the Stripe payment transaction" className="sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono break-all">{ticket.stripe_payment_intent_id}</span>
                    <a
                      href={`https://dashboard.stripe.com/payments/${ticket.stripe_payment_intent_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 flex-shrink-0"
                      title="View in Stripe"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </InfoField>
              )}
            </InfoGrid>
          </InfoSection>

          {/* Timestamps */}
          <InfoSection title="Timestamps">
            <InfoGrid>
              <InfoField label="Created">{formatDate(ticket.created_at)}</InfoField>
              <InfoField label="Last Updated">{formatDate(ticket.updated_at)}</InfoField>
              {ticket.metadata?.issuedAt && (
                <InfoField label="Manually Issued At" className="sm:col-span-2">{formatDate(ticket.metadata.issuedAt)}</InfoField>
              )}
            </InfoGrid>
          </InfoSection>

          {/* QR Code */}
          {ticket.qr_code_url && (
            <InfoSection title="QR Code">
              <div className="flex justify-center">
                <img src={ticket.qr_code_url} alt="Ticket QR Code" className="w-32 h-32 border border-gray-200 rounded-lg" />
              </div>
            </InfoSection>
          )}
        </div>

        {/* Actions Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Actions</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ticket.stripe_payment_intent_id && (
              <ActionLink href={`https://dashboard.stripe.com/payments/${ticket.stripe_payment_intent_id}`} color="blue" icon="external">
                Stripe
              </ActionLink>
            )}
            <ActionButton onClick={onResend} color="indigo" icon="mail">Resend</ActionButton>
            <ActionButton onClick={onReassign} color="purple" icon="reassign">Reassign</ActionButton>
            {ticket.status === 'confirmed' && ticket.ticket_category !== 'vip' && (
              <ActionButton onClick={onUpgrade} color="amber" icon="upgrade">Upgrade VIP</ActionButton>
            )}
            {ticket.status === 'confirmed' && (
              <>
                <ActionButton onClick={onRefund} color="orange" icon="refund">Refund</ActionButton>
                <ActionButton onClick={onCancel} color="gray" icon="cancel">Cancel</ActionButton>
              </>
            )}
            <ActionButton onClick={onDelete} color="red" icon="delete">Delete</ActionButton>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button onClick={onClose} className="w-full px-6 py-2.5 bg-gray-200 text-black rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors cursor-pointer">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper components for cleaner JSX
function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">{title}</h4>
      {children}
    </div>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function InfoField({ label, description, className, children }: { label: string; description?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      {description && <p className="text-xs text-gray-400 mb-1">{description}</p>}
      <p className="text-sm text-black">{children}</p>
    </div>
  );
}

const iconPaths: Record<string, string> = {
  external: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14',
  mail: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  reassign: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
  upgrade: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
  refund: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6',
  cancel: 'M6 18L18 6M6 6l12 12',
  delete: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
};

const colorClasses: Record<string, string> = {
  blue: 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100',
  indigo: 'border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100',
  purple: 'border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100',
  amber: 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100',
  orange: 'border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100',
  gray: 'border-gray-300 text-gray-700 bg-gray-100 hover:bg-gray-200',
  red: 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100',
};

function ActionButton({ onClick, color, icon, children }: { onClick: () => void; color: string; icon: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex items-center justify-center px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors cursor-pointer ${colorClasses[color]}`}>
      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPaths[icon]} />
      </svg>
      {children}
    </button>
  );
}

function ActionLink({ href, color, icon, children }: { href: string; color: string; icon: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-center px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors ${colorClasses[color]}`}>
      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPaths[icon]} />
      </svg>
      {children}
    </a>
  );
}
