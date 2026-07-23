/**
 * IssueTicketTab - Form for manually issuing conference tickets
 */

import { useState } from 'react';
import { TicketPlus } from 'lucide-react';
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

export function IssueTicketTab() {
  const [paymentType, setPaymentType] = useState<IssuePaymentType>('complimentary');
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

  const stripeLookup = useStripePaymentLookup((payment) => {
    if (payment.customerName) {
      const nameParts = payment.customerName.split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
    }
    if (payment.customerEmail) setEmail(payment.customerEmail);
  });
  const { stripePayment } = stripeLookup;

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
          stripePaymentId: paymentType === 'stripe' ? stripeLookup.stripePaymentId : undefined,
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
      stripeLookup.reset();
      setBankTransferAmount(''); setBankTransferCurrency('CHF'); setBankTransferReference('');
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
          <SuccessMessage
            title="Ticket Issued Successfully!"
            message={sendEmail ? 'A confirmation email has been sent to the customer.' : 'The ticket has been created without sending an email.'}
            buttonLabel="Issue Another Ticket"
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
        <PaymentTypeSelector paymentType={paymentType} setPaymentType={setPaymentType} />
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
          label="Issue Ticket" loadingLabel="Issuing Ticket..."
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
        <TicketPlus className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-black">Issue Ticket</h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Manually issue a conference ticket for a customer</p>
      </div>
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
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent">
          <option value="standard">Standard</option><option value="vip">VIP</option><option value="student">Student</option><option value="unemployed">Unemployed</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-bold text-black mb-2">Ticket Stage *</label>
        <select value={stage} onChange={(e) => setStage(e.target.value)} required
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent">
          <option value="blind_bird">Blind Bird</option><option value="early_bird">Early Bird</option>
          <option value="general_admission">General Admission</option><option value="late_bird">Late Bird</option>
        </select>
      </div>
    </div>
  );
}
