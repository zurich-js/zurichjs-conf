/**
 * IssueTicketTab - Form for manually issuing tickets
 */

import { useState } from 'react';
import type { StripePaymentDetails } from './types';

export function IssueTicketTab() {
  const [paymentType, setPaymentType] = useState<'complimentary' | 'stripe' | 'bank_transfer'>('complimentary');
  const [stripePaymentId, setStripePaymentId] = useState('');
  const [stripePayment, setStripePayment] = useState<StripePaymentDetails | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [bankTransferAmount, setBankTransferAmount] = useState('');
  const [bankTransferCurrency, setBankTransferCurrency] = useState('CHF');
  const [bankTransferReference, setBankTransferReference] = useState('');
  const [ticketCategory, setTicketCategory] = useState<string>('standard');
  const [ticketStage, setTicketStage] = useState<string>('general_admission');
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

  const handleLookupPayment = async () => {
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
      if (data.payment.customerName) {
        const nameParts = data.payment.customerName.split(' ');
        setFirstName(nameParts[0] || '');
        setLastName(nameParts.slice(1).join(' ') || '');
      }
      if (data.payment.customerEmail) setEmail(data.payment.customerEmail);
    } catch {
      setLookupError('Failed to lookup payment');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);
    try {
      const response = await fetch('/api/admin/issue-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketCategory, ticketStage, firstName, lastName, email,
          company: company || undefined, jobTitle: jobTitle || undefined, paymentType,
          stripePaymentId: paymentType === 'stripe' ? stripePaymentId : undefined,
          amountPaid: paymentType === 'stripe' && stripePayment ? stripePayment.amount
            : paymentType === 'bank_transfer' ? Math.round(parseFloat(bankTransferAmount) * 100) : 0,
          currency: paymentType === 'stripe' && stripePayment ? stripePayment.currency
            : paymentType === 'bank_transfer' ? bankTransferCurrency : 'CHF',
          bankTransferReference: paymentType === 'bank_transfer' ? bankTransferReference : undefined,
          complimentaryReason: paymentType === 'complimentary' ? complimentaryReason : undefined,
          sendEmail,
        }),
      });
      const data = await response.json();
      if (!response.ok) { setSubmitError(data.error || 'Failed to issue ticket'); return; }
      setSubmitSuccess(true);
      setStripePaymentId(''); setStripePayment(null); setBankTransferAmount('');
      setBankTransferCurrency('CHF'); setBankTransferReference('');
      setFirstName(''); setLastName(''); setEmail(''); setCompany(''); setJobTitle(''); setComplimentaryReason('');
    } catch { setSubmitError('Failed to issue ticket'); }
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
          <SuccessMessage sendEmail={sendEmail} onReset={resetForm} />
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
        <PaymentTypeSelector paymentType={paymentType} setPaymentType={setPaymentType} />
        {paymentType === 'stripe' && (
          <StripePaymentLookup
            stripePaymentId={stripePaymentId} setStripePaymentId={setStripePaymentId}
            stripePayment={stripePayment} lookupLoading={lookupLoading} lookupError={lookupError}
            onLookup={handleLookupPayment}
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
          <ComplimentaryReason reason={complimentaryReason} setReason={setComplimentaryReason} />
        )}
        <TicketTypeSelector
          category={ticketCategory} setCategory={setTicketCategory}
          stage={ticketStage} setStage={setTicketStage}
        />
        <AttendeeDetails
          firstName={firstName} setFirstName={setFirstName}
          lastName={lastName} setLastName={setLastName}
          email={email} setEmail={setEmail}
          company={company} setCompany={setCompany}
          jobTitle={jobTitle} setJobTitle={setJobTitle}
        />
        <EmailOption sendEmail={sendEmail} setSendEmail={setSendEmail} />
        {submitError && <ErrorMessage message={submitError} />}
        <SubmitButton
          isSubmitting={isSubmitting} paymentType={paymentType}
          stripePayment={stripePayment} bankTransferAmount={bankTransferAmount}
        />
      </form>
    </div>
  );
}

// Sub-components
function Header() {
  return (
    <div className="flex items-center space-x-2 sm:space-x-3">
      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center">
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-black">Issue Ticket</h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Manually issue a ticket for a customer</p>
      </div>
    </div>
  );
}

function SuccessMessage({ sendEmail, onReset }: { sendEmail: boolean; onReset: () => void }) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-green-800 mb-2">Ticket Issued Successfully!</h3>
      <p className="text-sm text-green-700 mb-4">
        {sendEmail ? 'A confirmation email has been sent to the customer.' : 'The ticket has been created without sending an email.'}
      </p>
      <button onClick={onReset} className="px-6 py-2.5 bg-green-600 text-brand-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors cursor-pointer">
        Issue Another Ticket
      </button>
    </div>
  );
}

function PaymentTypeSelector({ paymentType, setPaymentType }: { paymentType: string; setPaymentType: (t: 'complimentary' | 'stripe' | 'bank_transfer') => void }) {
  const types = [
    { id: 'complimentary', label: 'Complimentary', desc: 'Free ticket (speaker, etc.)', icon: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7' },
    { id: 'stripe', label: 'Stripe Payment', desc: 'Link to existing payment', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { id: 'bank_transfer', label: 'Bank Transfer', desc: 'Manual payment received', icon: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z' },
  ] as const;
  return (
    <div>
      <label className="block text-sm font-bold text-black mb-3">Payment Type *</label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {types.map((t) => (
          <button key={t.id} type="button" onClick={() => setPaymentType(t.id)}
            className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${paymentType === t.id ? 'border-[#F1E271] bg-[#F1E271]/10' : 'border-gray-200 hover:border-gray-300'}`}>
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${paymentType === t.id ? 'bg-[#F1E271]' : 'bg-gray-100'}`}>
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} />
                </svg>
              </div>
              <div><p className="font-bold text-black">{t.label}</p><p className="text-xs text-gray-600">{t.desc}</p></div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StripePaymentLookup({ stripePaymentId, setStripePaymentId, stripePayment, lookupLoading, lookupError, onLookup }: {
  stripePaymentId: string; setStripePaymentId: (v: string) => void;
  stripePayment: StripePaymentDetails | null; lookupLoading: boolean; lookupError: string; onLookup: () => void;
}) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <label className="block text-sm font-bold text-black mb-2">Stripe Payment ID *</label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input type="text" value={stripePaymentId} onChange={(e) => setStripePaymentId(e.target.value)} placeholder="pi_xxx, ch_xxx, or cs_xxx"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent" />
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

function BankTransferDetails({ amount, setAmount, currency, setCurrency, reference, setReference }: {
  amount: string; setAmount: (v: string) => void; currency: string; setCurrency: (v: string) => void; reference: string; setReference: (v: string) => void;
}) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
      <label className="block text-sm font-bold text-black mb-3">Bank Transfer Details</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Amount Received *</label>
          <input type="number" step="0.01" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="150.00"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Currency *</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent">
            <option value="CHF">CHF</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="USD">USD</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Reference / Notes (optional)</label>
          <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. Bank reference, invoice number, company name"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent" />
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

function ComplimentaryReason({ reason, setReason }: { reason: string; setReason: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-bold text-black mb-2">Reason for Complimentary Ticket</label>
      <select value={reason} onChange={(e) => setReason(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent">
        <option value="">Select a reason...</option>
        <option value="speaker">Speaker</option><option value="sponsor">Sponsor</option>
        <option value="organizer">Organizer / Staff</option><option value="volunteer">Volunteer</option>
        <option value="media">Media / Press</option><option value="partner">Partner</option>
        <option value="contest_winner">Contest Winner</option><option value="other">Other</option>
      </select>
    </div>
  );
}

function TicketTypeSelector({ category, setCategory, stage, setStage }: {
  category: string; setCategory: (v: string) => void; stage: string; setStage: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-bold text-black mb-2">Ticket Category *</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} required
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent">
          <option value="standard">Standard</option><option value="vip">VIP</option><option value="student">Student</option><option value="unemployed">Unemployed</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-bold text-black mb-2">Ticket Stage *</label>
        <select value={stage} onChange={(e) => setStage(e.target.value)} required
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent">
          <option value="blind_bird">Blind Bird</option><option value="early_bird">Early Bird</option>
          <option value="general_admission">General Admission</option><option value="late_bird">Late Bird</option>
        </select>
      </div>
    </div>
  );
}

function AttendeeDetails({ firstName, setFirstName, lastName, setLastName, email, setEmail, company, setCompany, jobTitle, setJobTitle }: {
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
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-bold text-black mb-2">Last Name *</label>
          <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-bold text-black mb-2">Email *</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-bold text-black mb-2">Company</label>
          <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Inc."
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-bold text-black mb-2">Job Title</label>
          <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Software Engineer"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent" />
        </div>
      </div>
    </div>
  );
}

function EmailOption({ sendEmail, setSendEmail }: { sendEmail: boolean; setSendEmail: (v: boolean) => void }) {
  return (
    <div className="border-t border-gray-200 pt-6">
      <label className="flex items-center space-x-3 cursor-pointer">
        <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 text-[#F1E271] focus:ring-[#F1E271] cursor-pointer" />
        <div>
          <span className="font-bold text-black">Send confirmation email</span>
          <p className="text-xs text-gray-600">Send ticket with QR code and details to the attendee</p>
        </div>
      </label>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
      <p className="text-sm text-red-800 font-medium">{message}</p>
    </div>
  );
}

function SubmitButton({ isSubmitting, paymentType, stripePayment, bankTransferAmount }: {
  isSubmitting: boolean; paymentType: string; stripePayment: StripePaymentDetails | null; bankTransferAmount: string;
}) {
  const disabled = isSubmitting || (paymentType === 'stripe' && !stripePayment) ||
    (paymentType === 'bank_transfer' && (!bankTransferAmount || parseFloat(bankTransferAmount) <= 0));
  return (
    <div className="border-t border-gray-200 pt-6">
      <button type="submit" disabled={disabled}
        className="w-full sm:w-auto px-8 py-3 bg-[#F1E271] text-black rounded-lg text-base font-medium hover:bg-[#e8d95e] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer">
        {isSubmitting ? 'Issuing Ticket...' : 'Issue Ticket'}
      </button>
      {paymentType === 'stripe' && !stripePayment && <p className="mt-2 text-xs text-gray-500">Please lookup the Stripe payment first</p>}
      {paymentType === 'bank_transfer' && (!bankTransferAmount || parseFloat(bankTransferAmount) <= 0) && <p className="mt-2 text-xs text-gray-500">Please enter the bank transfer amount</p>}
    </div>
  );
}
