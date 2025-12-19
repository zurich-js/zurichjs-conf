/**
 * CFP Speaker Reimbursements Page
 * Submit and track expense reimbursements
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { SEO } from '@/components/SEO';
import { Button, Input } from '@/components/atoms';
import { createSupabaseServerClient, getSpeakerByUserId } from '@/lib/cfp/auth';
import { getSpeakerReimbursements } from '@/lib/cfp/travel';
import type { CfpSpeaker, CfpSpeakerReimbursement, CfpReimbursementType } from '@/lib/types/cfp';

interface ReimbursementsPageProps {
  speaker: CfpSpeaker;
  reimbursements: CfpSpeakerReimbursement[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-300',
  approved: 'bg-green-500/20 text-green-300',
  rejected: 'bg-red-500/20 text-red-300',
  paid: 'bg-blue-500/20 text-blue-300',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  paid: 'Paid',
};

const EXPENSE_TYPES: { value: CfpReimbursementType; label: string }[] = [
  { value: 'flight', label: 'Flight' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'transport', label: 'Local Transport' },
  { value: 'other', label: 'Other' },
];

export default function ReimbursementsPage({ reimbursements }: ReimbursementsPageProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [expenseType, setExpenseType] = useState<CfpReimbursementType>('flight');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('CHF');
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [iban, setIban] = useState('');
  const [swiftBic, setSwiftBic] = useState('');

  const pendingTotal = reimbursements
    .filter((r) => r.status === 'pending' || r.status === 'approved')
    .reduce((sum, r) => sum + r.amount, 0);

  const paidTotal = reimbursements
    .filter((r) => r.status === 'paid')
    .reduce((sum, r) => sum + r.amount, 0);

  const resetForm = () => {
    setExpenseType('flight');
    setDescription('');
    setAmount('');
    setCurrency('CHF');
    setBankName('');
    setAccountHolder('');
    setIban('');
    setSwiftBic('');
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const amountCents = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      setError('Please enter a valid amount');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/cfp/travel/reimbursements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense_type: expenseType,
          description,
          amount: amountCents,
          currency,
          bank_name: bankName || undefined,
          bank_account_holder: accountHolder || undefined,
          iban: iban || undefined,
          swift_bic: swiftBic || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit');
      }

      resetForm();
      router.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEO title="Reimbursements | Travel | CFP" description="Submit expense reimbursements" noindex />

      <div className="min-h-screen bg-brand-gray-darkest">
        {/* Header */}
        <header className="border-b border-brand-gray-dark">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/cfp/travel" className="flex items-center gap-3">
              <img src="/images/logo/zurichjs-square.png" alt="ZurichJS" className="h-10 w-10" />
              <span className="text-white font-semibold">Reimbursements</span>
            </Link>
            <Link
              href="/cfp/travel"
              className="text-brand-gray-light hover:text-white text-sm transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Travel
            </Link>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* Summary */}
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-brand-gray-dark rounded-xl p-4">
              <div className="text-sm text-brand-gray-light mb-1">Pending/Approved</div>
              <div className="text-2xl font-bold text-yellow-400">
                CHF {(pendingTotal / 100).toFixed(2)}
              </div>
            </div>
            <div className="bg-brand-gray-dark rounded-xl p-4">
              <div className="text-sm text-brand-gray-light mb-1">Paid</div>
              <div className="text-2xl font-bold text-green-400">
                CHF {(paidTotal / 100).toFixed(2)}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          {!showForm && (
            <div className="mb-6">
              <Button variant="primary" onClick={() => setShowForm(true)}>
                Submit New Expense
              </Button>
            </div>
          )}

          {/* Submit Form */}
          {showForm && (
            <section className="bg-brand-gray-dark rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-bold text-white mb-6">Submit Expense</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Expense Type <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {EXPENSE_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setExpenseType(type.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                          expenseType === type.value
                            ? 'bg-brand-primary text-black'
                            : 'bg-brand-gray-darkest text-brand-gray-light hover:bg-brand-gray-medium'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-semibold text-white mb-2">
                    Description <span className="text-red-400">*</span>
                  </label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Round-trip flight from London to Zurich"
                    required
                    fullWidth
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="amount" className="block text-sm font-semibold text-white mb-2">
                      Amount <span className="text-red-400">*</span>
                    </label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      fullWidth
                    />
                  </div>
                  <div>
                    <label htmlFor="currency" className="block text-sm font-semibold text-white mb-2">
                      Currency
                    </label>
                    <select
                      id="currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-brand-gray-darkest text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      <option value="CHF">CHF</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-brand-gray-medium pt-6">
                  <h3 className="text-sm font-semibold text-white mb-4">
                    Banking Details <span className="text-brand-gray-medium">(for payment)</span>
                  </h3>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="bankName" className="block text-sm font-semibold text-white mb-2">
                        Bank Name
                      </label>
                      <Input
                        id="bankName"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g., UBS, Credit Suisse"
                        fullWidth
                      />
                    </div>
                    <div>
                      <label htmlFor="accountHolder" className="block text-sm font-semibold text-white mb-2">
                        Account Holder
                      </label>
                      <Input
                        id="accountHolder"
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                        placeholder="Name on account"
                        fullWidth
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label htmlFor="iban" className="block text-sm font-semibold text-white mb-2">
                        IBAN
                      </label>
                      <Input
                        id="iban"
                        value={iban}
                        onChange={(e) => setIban(e.target.value)}
                        placeholder="e.g., CH93 0076 2011 6238 5295 7"
                        fullWidth
                      />
                    </div>
                    <div>
                      <label htmlFor="swiftBic" className="block text-sm font-semibold text-white mb-2">
                        SWIFT/BIC
                      </label>
                      <Input
                        id="swiftBic"
                        value={swiftBic}
                        onChange={(e) => setSwiftBic(e.target.value)}
                        placeholder="e.g., UBSWCHZH80A"
                        fullWidth
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    Submit Request
                  </Button>
                </div>
              </form>
            </section>
          )}

          {/* Reimbursements List */}
          <section className="bg-brand-gray-dark rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-6">Your Requests</h2>

            {reimbursements.length === 0 ? (
              <p className="text-brand-gray-light text-center py-8">
                No reimbursement requests yet.
              </p>
            ) : (
              <div className="space-y-4">
                {reimbursements.map((r) => (
                  <div
                    key={r.id}
                    className="bg-brand-gray-darkest rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-white font-medium">{r.description}</div>
                        <div className="text-sm text-brand-gray-light capitalize mt-1">
                          {r.expense_type}
                        </div>
                        <div className="text-xs text-brand-gray-medium mt-2">
                          Submitted {new Date(r.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-white">
                          {r.currency} {(r.amount / 100).toFixed(2)}
                        </div>
                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${STATUS_COLORS[r.status]}`}>
                          {STATUS_LABELS[r.status]}
                        </span>
                      </div>
                    </div>
                    {r.admin_notes && (
                      <div className="mt-3 pt-3 border-t border-brand-gray-medium">
                        <p className="text-sm text-brand-gray-light">
                          <span className="text-brand-gray-medium">Note:</span> {r.admin_notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<ReimbursementsPageProps> = async (ctx) => {
  const supabase = createSupabaseServerClient(ctx);

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return {
      redirect: { destination: '/cfp/login', permanent: false },
    };
  }

  const speaker = await getSpeakerByUserId(session.user.id);

  if (!speaker) {
    return {
      redirect: { destination: '/cfp/login', permanent: false },
    };
  }

  const reimbursements = await getSpeakerReimbursements(speaker.id);

  return {
    props: {
      speaker,
      reimbursements,
    },
  };
};
