/**
 * VIP Upgrade CTA
 * Shown to non-VIP ticket holders without a pending upgrade.
 */

import { Check, Crown, Mail } from 'lucide-react';
import { VIP_BENEFITS } from '@/data/vip-benefits';
import { VIP_CARD, VIP_CTA, VIP_ICON, VIP_ICON_CHIP, VIP_RAIL } from './vip-theme';

interface UpgradeCtaProps {
  ticketId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export function UpgradeCta({ ticketId, firstName, lastName, email }: UpgradeCtaProps) {
  const mailtoLink = `mailto:hello@zurichjs.com?subject=VIP%20Upgrade%20Request&body=Hi%2C%0A%0AI%20would%20like%20to%20upgrade%20my%20ticket%20to%20VIP.%0A%0ATicket%20ID%3A%20${ticketId}%0AName%3A%20${encodeURIComponent(firstName)}%20${encodeURIComponent(lastName)}%0AEmail%3A%20${encodeURIComponent(email)}%0A%0AThank%20you!`;

  return (
    <section aria-labelledby="vip-upgrade-cta-heading" className={VIP_CARD}>
      <div className={VIP_RAIL} aria-hidden="true" />

      <div className="p-6 md:p-8">
        <div className="flex items-center gap-3 mb-4">
          <span className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${VIP_ICON_CHIP}`}>
            <Crown className={`w-5 h-5 ${VIP_ICON}`} aria-hidden="true" />
          </span>
          <h2 id="vip-upgrade-cta-heading" className="text-xl font-bold text-brand-black">
            Want to upgrade to VIP?
          </h2>
        </div>

        <ul className="space-y-2 mb-6">
          {VIP_BENEFITS.map((benefit) => (
            <li key={benefit.id} className="flex items-start gap-2 text-sm text-brand-gray-darkest">
              <Check className={`w-4 h-4 shrink-0 mt-0.5 ${VIP_ICON}`} aria-hidden="true" />
              {benefit.title}
            </li>
          ))}
        </ul>

        <a
          href={mailtoLink}
          className={`inline-flex items-center justify-center gap-2 py-3 px-6 rounded-lg w-full sm:w-auto ${VIP_CTA}`}
        >
          <Mail className="w-4 h-4" aria-hidden="true" />
          Email us to upgrade
        </a>
        <p className="text-xs text-brand-gray-darkest mt-3">
          We&apos;ll reply with a payment link — no forms, no hassle.
        </p>
      </div>
    </section>
  );
}
