/**
 * Shared building blocks for the admin "Issue" forms
 * (conference tickets and workshop seats).
 */

import { useState } from 'react';
import { Check, CreditCard, Gift, Landmark, type LucideIcon } from 'lucide-react';
import type { StripePaymentDetails } from './types';

export type IssuePaymentType = 'complimentary' | 'stripe' | 'bank_transfer';

export interface StripePaymentLookupState {
  stripePaymentId: string;
  setStripePaymentId: (v: string) => void;
  stripePayment: StripePaymentDetails | null;
  lookupLoading: boolean;
  lookupError: string;
  lookup: () => Promise<void>;
  reset: () => void;
}

/**
 * Lookup a Stripe payment (pi_/ch_/cs_) via /api/admin/stripe-payment and
 * expose its details for pre-filling attendee info + amount/currency.
 */
export function useStripePaymentLookup(
  onFound?: (payment: StripePaymentDetails) => void
): StripePaymentLookupState {
  const [stripePaymentId, setStripePaymentId] = useState('');
  const [stripePayment, setStripePayment] = useState<StripePaymentDetails | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  const lookup = async () => {
    if (!stripePaymentId.trim()) {
      setLookupError('Please enter a payment ID');
      return;
    }
    setLookupLoading(true);
    setLookupError('');
    setStripePayment(null);
    try {
      const response = await fetch(`/api/admin/stripe-payment?id=${encodeURIComponent(stripePaymentId.trim())}`);
      const data = await response.json();
      if (!response.ok) {
        setLookupError(data.error || 'Failed to lookup payment');
        return;
      }
      setStripePayment(data.payment);
      onFound?.(data.payment);
    } catch {
      setLookupError('Failed to lookup payment');
    } finally {
      setLookupLoading(false);
    }
  };

  const reset = () => {
    setStripePaymentId('');
    setStripePayment(null);
    setLookupError('');
  };

  return { stripePaymentId, setStripePaymentId, stripePayment, lookupLoading, lookupError, lookup, reset };
}

export function SuccessMessage({ title, message, buttonLabel, onReset }: {
  title: string; message: string; buttonLabel: string; onReset: () => void;
}) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Check className="w-8 h-8 text-green-600" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-bold text-green-800 mb-2">{title}</h3>
      <p className="text-sm text-green-700 mb-4">{message}</p>
      <button onClick={onReset} className="px-6 py-2.5 bg-green-600 text-brand-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors cursor-pointer">
        {buttonLabel}
      </button>
    </div>
  );
}

export function PaymentTypeSelector({ paymentType, setPaymentType, complimentaryDesc = 'Free ticket (speaker, etc.)' }: {
  paymentType: IssuePaymentType; setPaymentType: (t: IssuePaymentType) => void; complimentaryDesc?: string;
}) {
  const types: Array<{ id: IssuePaymentType; label: string; desc: string; icon: LucideIcon }> = [
    { id: 'complimentary', label: 'Complimentary', desc: complimentaryDesc, icon: Gift },
    { id: 'stripe', label: 'Stripe Payment', desc: 'Link to existing payment', icon: CreditCard },
    { id: 'bank_transfer', label: 'Bank Transfer', desc: 'Manual payment received', icon: Landmark },
  ];
  return (
    <div>
      <label className="block text-sm font-bold text-black mb-3">Payment Type *</label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {types.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} type="button" onClick={() => setPaymentType(t.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${paymentType === t.id ? 'border-brand-primary bg-brand-primary/10' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${paymentType === t.id ? 'bg-brand-primary' : 'bg-gray-100'}`}>
                  <Icon className="w-5 h-5 text-black" aria-hidden="true" />
                </div>
                <div><p className="font-bold text-black">{t.label}</p><p className="text-xs text-gray-600">{t.desc}</p></div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StripePaymentLookup({ stripePaymentId, setStripePaymentId, stripePayment, lookupLoading, lookupError, onLookup }: {
  stripePaymentId: string; setStripePaymentId: (v: string) => void;
  stripePayment: StripePaymentDetails | null; lookupLoading: boolean; lookupError: string; onLookup: () => void;
}) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <label className="block text-sm font-bold text-black mb-2">Stripe Payment ID *</label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input type="text" value={stripePaymentId} onChange={(e) => setStripePaymentId(e.target.value)} placeholder="pi_xxx, ch_xxx, or cs_xxx"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent" />
        <button type="button" onClick={onLookup} disabled={lookupLoading}
          className="px-4 py-2.5 bg-blue-600 text-brand-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap">
          {lookupLoading ? 'Looking up...' : 'Lookup Payment'}
        </button>
      </div>
      {lookupError && <p className="mt-2 text-sm text-red-600">{lookupError}</p>}
      {stripePayment && (
        <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Payment Found</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-600">Amount:</span><span className="ml-1 font-bold text-black">{(stripePayment.amount / 100).toFixed(2)} {stripePayment.currency}</span></div>
            <div><span className="text-gray-600">Status:</span><span className={`ml-1 font-bold ${stripePayment.status === 'succeeded' || stripePayment.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>{stripePayment.status}</span></div>
            {stripePayment.customerName && <div className="col-span-2"><span className="text-gray-600">Customer:</span><span className="ml-1 text-black">{stripePayment.customerName}</span></div>}
            {stripePayment.customerEmail && <div className="col-span-2"><span className="text-gray-600">Email:</span><span className="ml-1 text-black">{stripePayment.customerEmail}</span></div>}
          </div>
        </div>
      )}
    </div>
  );
}

export function BankTransferDetails({ amount, setAmount, currency, setCurrency, reference, setReference }: {
  amount: string; setAmount: (v: string) => void; currency: string; setCurrency: (v: string) => void; reference: string; setReference: (v: string) => void;
}) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
      <label className="block text-sm font-bold text-black mb-3">Bank Transfer Details</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Amount Received *</label>
          <input type="number" step="0.01" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="150.00"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Currency *</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent">
            <option value="CHF">CHF</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="USD">USD</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Reference / Notes (optional)</label>
          <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. Bank reference, invoice number, company name"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent" />
        </div>
      </div>
      {amount && (
        <div className="mt-3 p-3 bg-white rounded-lg border border-emerald-200">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Payment Summary</p>
          <p className="text-lg font-bold text-black">{parseFloat(amount).toFixed(2)} {currency}</p>
        </div>
      )}
    </div>
  );
}

export function ComplimentaryReason({ reason, setReason, label = 'Reason for Complimentary Ticket' }: {
  reason: string; setReason: (v: string) => void; label?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-black mb-2">{label}</label>
      <select value={reason} onChange={(e) => setReason(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent">
        <option value="">Select a reason...</option>
        <option value="speaker">Speaker</option><option value="sponsor">Sponsor</option>
        <option value="organizer">Organizer / Staff</option><option value="volunteer">Volunteer</option>
        <option value="media">Media / Press</option><option value="partner">Partner</option>
        <option value="contest_winner">Contest Winner</option><option value="other">Other</option>
      </select>
    </div>
  );
}

export function AttendeeDetails({ firstName, setFirstName, lastName, setLastName, email, setEmail, company, setCompany, jobTitle, setJobTitle }: {
  firstName: string; setFirstName: (v: string) => void; lastName: string; setLastName: (v: string) => void;
  email: string; setEmail: (v: string) => void; company: string; setCompany: (v: string) => void; jobTitle: string; setJobTitle: (v: string) => void;
}) {
  return (
    <div className="border-t border-gray-200 pt-6">
      <h3 className="text-sm font-bold text-black mb-4">Attendee Details</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-black mb-2">First Name *</label>
          <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-bold text-black mb-2">Last Name *</label>
          <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-bold text-black mb-2">Email *</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-bold text-black mb-2">Company</label>
          <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Inc."
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-bold text-black mb-2">Job Title</label>
          <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Software Engineer"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent" />
        </div>
      </div>
    </div>
  );
}

export function EmailOption({ sendEmail, setSendEmail, description = 'Send ticket with QR code and details to the attendee' }: {
  sendEmail: boolean; setSendEmail: (v: boolean) => void; description?: string;
}) {
  return (
    <div className="border-t border-gray-200 pt-6">
      <label className="flex items-center space-x-3 cursor-pointer">
        <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary cursor-pointer" />
        <div>
          <span className="font-bold text-black">Send confirmation email</span>
          <p className="text-xs text-gray-600">{description}</p>
        </div>
      </label>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
      <p className="text-sm text-red-800 font-medium">{message}</p>
    </div>
  );
}

export function SubmitButton({ isSubmitting, paymentType, stripePayment, bankTransferAmount, label, loadingLabel, extraDisabled = false, extraHint }: {
  isSubmitting: boolean; paymentType: IssuePaymentType; stripePayment: StripePaymentDetails | null; bankTransferAmount: string;
  label: string; loadingLabel: string; extraDisabled?: boolean; extraHint?: string | null;
}) {
  const disabled = isSubmitting || extraDisabled || (paymentType === 'stripe' && !stripePayment) ||
    (paymentType === 'bank_transfer' && (!bankTransferAmount || parseFloat(bankTransferAmount) <= 0));
  return (
    <div className="border-t border-gray-200 pt-6">
      <button type="submit" disabled={disabled}
        className="w-full sm:w-auto px-8 py-3 bg-brand-primary text-black rounded-lg text-base font-medium hover:bg-[#e8d95e] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer">
        {isSubmitting ? loadingLabel : label}
      </button>
      {extraHint && <p className="mt-2 text-xs text-gray-500">{extraHint}</p>}
      {paymentType === 'stripe' && !stripePayment && <p className="mt-2 text-xs text-gray-500">Please lookup the Stripe payment first</p>}
      {paymentType === 'bank_transfer' && (!bankTransferAmount || parseFloat(bankTransferAmount) <= 0) && <p className="mt-2 text-xs text-gray-500">Please enter the bank transfer amount</p>}
    </div>
  );
}
