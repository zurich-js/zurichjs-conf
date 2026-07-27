/**
 * Pending VIP Upgrade Card
 * Payment instructions (Stripe or bank transfer) for an in-flight VIP upgrade,
 * with a preview of the benefits that unlock once payment is confirmed.
 */

import { AlertTriangle, Building2, Check, Clock, CreditCard } from 'lucide-react';
import { BANK_TRANSFER_DETAILS } from '@/lib/types/ticket-upgrade';
import { VIP_BENEFITS } from '@/data/vip-benefits';
import type { PendingUpgrade } from './types';

interface PendingUpgradeCardProps {
  upgrade: PendingUpgrade;
}

export function PendingUpgradeCard({ upgrade }: PendingUpgradeCardProps) {
  const isStripe = upgrade.upgradeMode === 'stripe';
  const ModeIcon = isStripe ? CreditCard : Building2;

  return (
    <section aria-labelledby="pending-upgrade-heading" className="bg-black border border-blue-500/40 rounded-2xl mb-8 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-blue-600 via-blue-300 to-blue-600" aria-hidden="true" />

      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-400/10 border border-blue-400/40 shrink-0">
              <ModeIcon className="w-5 h-5 text-blue-400" aria-hidden="true" />
            </span>
            <div>
              <h2 id="pending-upgrade-heading" className="text-xl font-bold text-brand-white">
                VIP Upgrade
              </h2>
              <p className="text-sm text-gray-400">{isStripe ? 'Pay online by card' : 'Pay by bank transfer'}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-blue-300 bg-blue-400/10 border border-blue-400/40 rounded-full px-3 py-1">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            Pending
          </span>
        </div>

        <p className="text-gray-200 mb-6">
          Complete your payment and your ticket is upgraded to VIP, unlocking:
        </p>

        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
          {VIP_BENEFITS.map((benefit) => (
            <li key={benefit.id} className="flex items-start gap-2 text-sm text-gray-200 bg-white/5 border border-white/10 rounded-lg p-3">
              <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              {benefit.title}
            </li>
          ))}
        </ul>

        {upgrade.amount != null && upgrade.currency && (
          <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
            <span className="text-gray-400">Upgrade amount</span>
            <span className="text-brand-white font-bold text-lg">
              {upgrade.currency} {(upgrade.amount / 100).toFixed(2)}
            </span>
          </div>
        )}

        {isStripe && upgrade.stripePaymentLinkUrl && (
          <a
            href={upgrade.stripePaymentLinkUrl}
            className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            <CreditCard className="w-5 h-5" aria-hidden="true" />
            Complete Payment Now
          </a>
        )}

        {upgrade.upgradeMode === 'bank_transfer' && <BankTransferDetails upgrade={upgrade} />}
      </div>
    </section>
  );
}

function BankTransferDetails({ upgrade }: { upgrade: PendingUpgrade }) {
  return (
    <div className="space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <h3 className="text-brand-white font-semibold mb-3">Bank Transfer Details</h3>
        <dl className="space-y-2 text-sm">
          <TransferRow label="Bank" value={BANK_TRANSFER_DETAILS.bank} />
          <TransferRow label="Account Holder" value={BANK_TRANSFER_DETAILS.accountHolder} />
          <TransferRow label="Address" value={BANK_TRANSFER_DETAILS.address} />
          <TransferRow label="IBAN" value={BANK_TRANSFER_DETAILS.iban} mono />
          {upgrade.bankTransferReference && (
            <div className="flex justify-between gap-4 pt-2 border-t border-white/10">
              <dt className="text-gray-400">Reference</dt>
              <dd className="text-amber-400 font-mono font-bold">{upgrade.bankTransferReference}</dd>
            </div>
          )}
          {upgrade.bankTransferDueDate && (
            <TransferRow
              label="Due Date"
              value={new Date(upgrade.bankTransferDueDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            />
          )}
        </dl>
      </div>
      <p className="flex items-start gap-2 text-sm text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-3">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        Please include the reference number in your transfer. Your ticket will be upgraded once payment is confirmed.
      </p>
    </div>
  );
}

function TransferRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-400 shrink-0">{label}</dt>
      <dd className={`text-brand-white text-right ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}
