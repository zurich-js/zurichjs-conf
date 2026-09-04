/**
 * VIP Perks Card
 * Shows VIP ticket holders their benefits, including their personal
 * workshop discount voucher (with copy-to-clipboard) once issued.
 */

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Check, CheckCircle2, Copy, Crown, Gift, Mail, PartyPopper, Percent, type LucideIcon } from 'lucide-react';
import { VIP_BENEFITS, type VipBenefitId } from '@/data/vip-benefits';
import { VIP_CARD, VIP_EMPHASIS, VIP_ICON, VIP_ICON_CHIP, VIP_PANEL, VIP_PILL, VIP_RAIL } from './vip-theme';
import type { VipPerkSummary } from './types';

const BENEFIT_ICONS: Record<VipBenefitId, LucideIcon> = {
  'workshop-discount': Percent,
  afterparty: PartyPopper,
  goodies: Gift,
};

interface VipPerksCardProps {
  isVip: boolean;
  vipPerk?: VipPerkSummary | null;
}

export function VipPerksCard({ isVip, vipPerk }: VipPerksCardProps) {
  if (!isVip) return null;

  return (
    <section aria-labelledby="vip-benefits-heading" className={VIP_CARD}>
      {/* VIP accent edge */}
      <div className={VIP_RAIL} aria-hidden="true" />

      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${VIP_ICON_CHIP}`}>
              <Crown className={`w-5 h-5 ${VIP_ICON}`} aria-hidden="true" />
            </span>
            <div>
              <h2 id="vip-benefits-heading" className="text-xl font-bold text-brand-black">
                Your VIP Benefits
              </h2>
              <p className="text-sm text-brand-gray-darkest">Included with your VIP ticket</p>
            </div>
          </div>
          <span className={VIP_PILL}>VIP</span>
        </div>

        <ul className="space-y-3">
          {VIP_BENEFITS.map((benefit) => {
            const Icon = BENEFIT_ICONS[benefit.id];
            return (
              <li key={benefit.id} className="flex gap-4 bg-brand-white border border-brand-gray-light rounded-xl p-4">
                <span className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 mt-0.5 ${VIP_ICON_CHIP}`}>
                  <Icon className={`w-4.5 h-4.5 ${VIP_ICON}`} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-brand-black">{benefit.title}</h3>
                  <p className="text-sm text-brand-gray-darkest mt-0.5">{benefit.description}</p>
                  {benefit.id === 'workshop-discount' && <WorkshopVoucher vipPerk={vipPerk} />}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function WorkshopVoucher({ vipPerk }: { vipPerk?: VipPerkSummary | null }) {
  if (!vipPerk) {
    return (
      <p className="flex items-start gap-2 mt-3 text-sm text-brand-gray-darkest bg-brand-gray-lightest border border-brand-gray-light rounded-lg p-3">
        <Mail className={`w-4 h-4 shrink-0 mt-0.5 ${VIP_ICON}`} aria-hidden="true" />
        <span>
          Your personal voucher code will be emailed to you when workshops are released — or within 48 hours of purchase
          if they&apos;re already on sale.
        </span>
      </p>
    );
  }

  if (vipPerk.isRedeemed) {
    return (
      <p className="flex items-center gap-2 mt-3 text-sm text-brand-gray-darkest bg-brand-green/10 border border-brand-green/40 rounded-lg p-3">
        <CheckCircle2 className="w-4 h-4 shrink-0 text-brand-green" aria-hidden="true" />
        Voucher redeemed — enjoy your workshop!
      </p>
    );
  }

  return (
    <div className={`mt-3 p-3 ${VIP_PANEL}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${VIP_EMPHASIS}`}>
        Your {vipPerk.discountPercent}% voucher code
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="font-mono font-bold text-brand-primary bg-brand-black rounded-md px-3 py-1.5 text-sm">
          {vipPerk.code}
        </code>
        <CopyCodeButton code={vipPerk.code} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
        <Link
          href="/workshops"
          className={`inline-flex items-center gap-1.5 text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange rounded ${VIP_EMPHASIS}`}
        >
          Browse workshops
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
        {vipPerk.expiresAt && <p className="text-xs text-brand-gray-darkest">Valid until {formatExpiry(vipPerk.expiresAt)}</p>}
      </div>
    </div>
  );
}

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy your voucher code:', code);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? 'Voucher code copied' : 'Copy voucher code'}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-white bg-brand-black hover:bg-brand-gray-dark rounded-md px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" aria-hidden="true" />
          Copied
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" aria-hidden="true" />
          Copy
        </>
      )}
    </button>
  );
}

function formatExpiry(dateString: string): string {
  // Pinned timezone keeps server-rendered HTML and client hydration in sync
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Europe/Zurich',
  });
}
