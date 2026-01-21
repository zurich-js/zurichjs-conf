/**
 * VIP Cards Components
 * VIP perks display and pending upgrade section
 */

import { Sparkles, CreditCard, Building2 } from 'lucide-react';
import { VIP_PERKS, BANK_TRANSFER_DETAILS } from '@/lib/types/ticket-upgrade';
import type { PendingUpgrade } from './types';

interface VipPerksCardProps {
  isVip: boolean;
}

export function VipPerksCard({ isVip }: VipPerksCardProps) {
  if (!isVip) return null;

  return (
    <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-500/50 rounded-2xl p-8 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="w-6 h-6 text-amber-400" />
        <h2 className="text-xl font-bold text-amber-400">Your VIP Benefits</h2>
      </div>
      <ul className="space-y-3">
        {VIP_PERKS.map((perk, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="text-amber-400 mt-0.5">✨</span>
            <span className="text-gray-200">{perk}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface PendingUpgradeCardProps {
  upgrade: PendingUpgrade;
}

export function PendingUpgradeCard({ upgrade }: PendingUpgradeCardProps) {
  return (
    <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/50 rounded-2xl p-8 mb-8">
      <div className="flex items-center gap-3 mb-4">
        {upgrade.upgradeMode === 'stripe' ? (
          <CreditCard className="w-6 h-6 text-blue-400" />
        ) : (
          <Building2 className="w-6 h-6 text-blue-400" />
        )}
        <h2 className="text-xl font-bold text-blue-400">VIP Upgrade Pending</h2>
      </div>
      <p className="text-gray-200 mb-6">
        Complete your payment to unlock VIP benefits and enhance your conference experience.
      </p>

      {/* VIP Perks Preview */}
      <div className="bg-black/30 rounded-lg p-4 mb-6">
        <h3 className="text-amber-400 font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          VIP Benefits You&apos;ll Receive
        </h3>
        <ul className="space-y-2">
          {VIP_PERKS.map((perk, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
              <span className="text-amber-400 mt-0.5">✨</span>
              <span>{perk}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Payment Details */}
      {upgrade.amount != null && upgrade.currency && (
        <div className="bg-black/30 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Upgrade Amount</span>
            <span className="text-brand-white font-bold text-lg">
              {upgrade.currency} {(upgrade.amount / 100).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Stripe Payment Button */}
      {upgrade.upgradeMode === 'stripe' && upgrade.stripePaymentLinkUrl && (
        <a
          href={upgrade.stripePaymentLinkUrl}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors w-full"
        >
          <CreditCard className="w-5 h-5" />
          Complete Payment Now
        </a>
      )}

      {/* Bank Transfer Instructions */}
      {upgrade.upgradeMode === 'bank_transfer' && <BankTransferDetails upgrade={upgrade} />}
    </div>
  );
}

function BankTransferDetails({ upgrade }: { upgrade: PendingUpgrade }) {
  return (
    <div className="space-y-4">
      <div className="bg-black/30 rounded-lg p-4">
        <h4 className="text-brand-white font-semibold mb-3">Bank Transfer Details</h4>
        <div className="space-y-2 text-sm">
          <TransferRow label="Bank" value={BANK_TRANSFER_DETAILS.bank} />
          <TransferRow label="Account Holder" value={BANK_TRANSFER_DETAILS.accountHolder} />
          <TransferRow label="Address" value={BANK_TRANSFER_DETAILS.address} />
          <TransferRow label="IBAN" value={BANK_TRANSFER_DETAILS.iban} mono />
          {upgrade.bankTransferReference && (
            <div className="flex justify-between pt-2 border-t border-gray-700">
              <span className="text-gray-400">Reference</span>
              <span className="text-amber-400 font-mono font-bold">{upgrade.bankTransferReference}</span>
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
        </div>
      </div>
      <p className="text-yellow-400 text-sm">
        ⚠️ Please include the reference number in your transfer. Your ticket will be upgraded once payment is confirmed.
      </p>
    </div>
  );
}

function TransferRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className={`text-brand-white ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}

interface UpgradeCtaProps {
  ticketId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export function UpgradeCta({ ticketId, firstName, lastName, email }: UpgradeCtaProps) {
  const mailtoLink = `mailto:hello@zurichjs.com?subject=VIP%20Upgrade%20Request&body=Hi%2C%0A%0AI%20would%20like%20to%20upgrade%20my%20ticket%20to%20VIP.%0A%0ATicket%20ID%3A%20${ticketId}%0AName%3A%20${firstName}%20${lastName}%0AEmail%3A%20${email}%0A%0AThank%20you!`;

  return (
    <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-6 mb-8">
      <div className="flex items-start gap-3">
        <span className="text-2xl">✨</span>
        <div>
          <h3 className="text-blue-300 font-semibold mb-2">Want to upgrade to VIP?</h3>
          <p className="text-gray-300 text-sm mb-3">
            Get 20% off all workshops, an exclusive speaker tour invitation, and limited edition goodies. Email us to
            upgrade your ticket.
          </p>
          <a href={mailtoLink} className="inline-flex items-center gap-2 text-brand-primary hover:underline font-semibold">
            Contact us at hello@zurichjs.com →
          </a>
        </div>
      </div>
    </div>
  );
}
