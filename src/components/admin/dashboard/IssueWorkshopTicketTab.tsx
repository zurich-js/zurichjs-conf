/**
 * IssueWorkshopTicketTab - Form for manually issuing workshop seats.
 * Mirrors IssueTicketTab but targets a workshop offering and the
 * workshop registration + confirmation email flow.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap } from 'lucide-react';
import type { AdminWorkshopListItem } from '@/pages/api/admin/workshops';
import { adminFetch } from '@/lib/admin/api-fetch';
import { adminKeys } from '@/lib/admin/query-keys';
import {
  AttendeeDetails,
  BankTransferDetails,
  ComplimentaryReason,
  EmailOption,
  ErrorMessage,
  PaymentTypeSelector,
  StripePaymentLookup,
  SubmitButton,
  SuccessMessage,
  useStripePaymentLookup,
  type IssuePaymentType,
} from './IssueFormShared';

interface WorkshopOption {
  id: string;
  title: string;
  speakerName: string | null;
  date: string | null;
  capacity: number;
  enrolledCount: number;
  status: string;
}

/**
 * Canonical fetcher for the shared `adminKeys.workshopList()` cache entry.
 * The cached value is always the raw `AdminWorkshopListItem[]` from the API
 * (same as WorkshopsDashboard / WorkshopsRegistrantsTab); the narrower
 * `WorkshopOption` view is derived via the `select` option.
 */
async function fetchWorkshopList(signal?: AbortSignal): Promise<AdminWorkshopListItem[]> {
  const data = await adminFetch<{ items: AdminWorkshopListItem[] }>('/api/admin/workshops', {
    signal,
  });
  return data.items;
}

function toWorkshopOptions(items: AdminWorkshopListItem[]): WorkshopOption[] {
  return items.flatMap((item) => {
    const offering = item.offering;
    if (!offering) return [];
    return [{
      id: offering.id,
      title: offering.title || item.submissionTitle,
      speakerName: item.speakerName,
      date: offering.date,
      capacity: offering.capacity,
      enrolledCount: offering.enrolled_count,
      status: offering.status,
    }];
  });
}

export function IssueWorkshopTicketTab() {
  const [workshopId, setWorkshopId] = useState('');
  const [paymentType, setPaymentType] = useState<IssuePaymentType>('complimentary');
  const [bankTransferAmount, setBankTransferAmount] = useState('');
  const [bankTransferCurrency, setBankTransferCurrency] = useState('CHF');
  const [bankTransferReference, setBankTransferReference] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [complimentaryReason, setComplimentaryReason] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const { data: workshops, isLoading: workshopsLoading, error: workshopsError } = useQuery({
    queryKey: adminKeys.workshopList(),
    queryFn: ({ signal }) => fetchWorkshopList(signal),
    select: toWorkshopOptions,
    staleTime: 60_000,
  });

  const stripeLookup = useStripePaymentLookup((payment) => {
    if (payment.customerName) {
      const nameParts = payment.customerName.split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
    }
    if (payment.customerEmail) setEmail(payment.customerEmail);
  });
  const { stripePayment } = stripeLookup;

  const selectedWorkshop = workshops?.find((w) => w.id === workshopId) ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);
    try {
      const response = await fetch('/api/admin/issue-workshop-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshopId, firstName, lastName, email,
          company: company || undefined, jobTitle: jobTitle || undefined, paymentType,
          stripePaymentId: paymentType === 'stripe' ? stripeLookup.stripePaymentId : undefined,
          amountPaid: paymentType === 'stripe' && stripePayment ? stripePayment.amount
            : paymentType === 'bank_transfer' ? Math.round(parseFloat(bankTransferAmount) * 100) : 0,
          currency: paymentType === 'stripe' && stripePayment ? stripePayment.currency.toUpperCase()
            : paymentType === 'bank_transfer' ? bankTransferCurrency : 'CHF',
          bankTransferReference: paymentType === 'bank_transfer' ? bankTransferReference : undefined,
          complimentaryReason: paymentType === 'complimentary' ? complimentaryReason : undefined,
          sendEmail,
        }),
      });
      const data = await response.json();
      if (!response.ok) { setSubmitError(data.error || 'Failed to issue workshop seat'); return; }
      setSubmitSuccess(true);
      stripeLookup.reset();
      setBankTransferAmount(''); setBankTransferCurrency('CHF'); setBankTransferReference('');
      setFirstName(''); setLastName(''); setEmail(''); setCompany(''); setJobTitle(''); setComplimentaryReason('');
    } catch { setSubmitError('Failed to issue workshop seat'); }
    finally { setIsSubmitting(false); }
  };

  const resetForm = () => { setSubmitSuccess(false); setSubmitError(''); };

  if (submitSuccess) {
    return (
      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <Header />
        </div>
        <div className="p-4 sm:p-6">
          <SuccessMessage
            title="Workshop Seat Issued Successfully!"
            message={sendEmail ? 'A confirmation email has been sent to the attendee.' : 'The seat has been registered without sending an email.'}
            buttonLabel="Issue Another Seat"
            onReset={resetForm}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <Header />
      </div>
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
        <WorkshopSelector
          workshops={workshops ?? []} isLoading={workshopsLoading} loadError={Boolean(workshopsError)}
          workshopId={workshopId} setWorkshopId={setWorkshopId} selectedWorkshop={selectedWorkshop}
        />
        <PaymentTypeSelector paymentType={paymentType} setPaymentType={setPaymentType} complimentaryDesc="Free seat (speaker, etc.)" />
        {paymentType === 'stripe' && (
          <StripePaymentLookup
            stripePaymentId={stripeLookup.stripePaymentId} setStripePaymentId={stripeLookup.setStripePaymentId}
            stripePayment={stripePayment} lookupLoading={stripeLookup.lookupLoading} lookupError={stripeLookup.lookupError}
            onLookup={stripeLookup.lookup}
          />
        )}
        {paymentType === 'bank_transfer' && (
          <BankTransferDetails
            amount={bankTransferAmount} setAmount={setBankTransferAmount}
            currency={bankTransferCurrency} setCurrency={setBankTransferCurrency}
            reference={bankTransferReference} setReference={setBankTransferReference}
          />
        )}
        {paymentType === 'complimentary' && (
          <ComplimentaryReason reason={complimentaryReason} setReason={setComplimentaryReason} label="Reason for Complimentary Seat" />
        )}
        <AttendeeDetails
          firstName={firstName} setFirstName={setFirstName}
          lastName={lastName} setLastName={setLastName}
          email={email} setEmail={setEmail}
          company={company} setCompany={setCompany}
          jobTitle={jobTitle} setJobTitle={setJobTitle}
        />
        <EmailOption sendEmail={sendEmail} setSendEmail={setSendEmail} description="Send workshop seat confirmation with QR code and details to the attendee" />
        {submitError && <ErrorMessage message={submitError} />}
        <SubmitButton
          isSubmitting={isSubmitting} paymentType={paymentType}
          stripePayment={stripePayment} bankTransferAmount={bankTransferAmount}
          label="Issue Workshop Seat" loadingLabel="Issuing Seat..."
          extraDisabled={!workshopId} extraHint={!workshopId ? 'Please select a workshop' : null}
        />
      </form>
    </div>
  );
}

// Sub-components
function Header() {
  return (
    <div className="flex items-center space-x-2 sm:space-x-3">
      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center">
        <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-purple-700" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-black">Issue Workshop Seat</h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Manually register an attendee for a workshop</p>
      </div>
    </div>
  );
}

function formatWorkshopDate(date: string | null): string {
  if (!date) return 'Date TBD';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date + 'T00:00:00'));
}

function WorkshopSelector({ workshops, isLoading, loadError, workshopId, setWorkshopId, selectedWorkshop }: {
  workshops: WorkshopOption[]; isLoading: boolean; loadError: boolean;
  workshopId: string; setWorkshopId: (v: string) => void; selectedWorkshop: WorkshopOption | null;
}) {
  const seatsLeft = selectedWorkshop ? selectedWorkshop.capacity - selectedWorkshop.enrolledCount : 0;
  return (
    <div>
      <label htmlFor="issue-workshop-select" className="block text-sm font-bold text-black mb-2">Workshop *</label>
      <select id="issue-workshop-select" value={workshopId} onChange={(e) => setWorkshopId(e.target.value)} required disabled={isLoading}
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent disabled:opacity-50">
        <option value="">{isLoading ? 'Loading workshops...' : 'Select a workshop...'}</option>
        {workshops.map((w) => (
          <option key={w.id} value={w.id}>
            {w.title}{w.speakerName ? ` — ${w.speakerName}` : ''}
          </option>
        ))}
      </select>
      {loadError && <p className="mt-2 text-sm text-red-600">Failed to load workshops. Refresh and try again.</p>}
      {!isLoading && !loadError && workshops.length === 0 && (
        <p className="mt-2 text-sm text-gray-500">No workshop offerings exist yet. Create one from the Workshops admin first.</p>
      )}
      {selectedWorkshop && (
        <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Workshop Details</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-600">Date:</span><span className="ml-1 font-bold text-black">{formatWorkshopDate(selectedWorkshop.date)}</span></div>
            <div><span className="text-gray-600">Status:</span><span className="ml-1 font-bold text-black capitalize">{selectedWorkshop.status}</span></div>
            <div className="col-span-2">
              <span className="text-gray-600">Seats:</span>
              <span className={`ml-1 font-bold ${seatsLeft > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {selectedWorkshop.enrolledCount} / {selectedWorkshop.capacity} filled{seatsLeft <= 0 ? ' — full' : ''}
              </span>
            </div>
          </div>
          {seatsLeft <= 0 && (
            <p className="mt-2 text-xs text-red-600">
              This workshop is at capacity — issuing will fail unless you increase its capacity first.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
