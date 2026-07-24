/**
 * VIP Upgrade CTA
 * Shown to non-VIP ticket holders without a pending upgrade.
 */

import { Check, Crown, Mail } from 'lucide-react';
import { VIP_BENEFITS } from '@/data/vip-benefits';

interface UpgradeCtaProps {
  ticketId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export function UpgradeCta({ ticketId, firstName, lastName, email }: UpgradeCtaProps) {
  const mailtoLink = `mailto:hello@zurichjs.com?subject=VIP%20Upgrade%20Request&body=Hi%2C%0A%0AI%20would%20like%20to%20upgrade%20my%20ticket%20to%20VIP.%0A%0ATicket%20ID%3A%20${ticketId}%0AName%3A%20${encodeURIComponent(firstName)}%20${encodeURIComponent(lastName)}%0AEmail%3A%20${encodeURIComponent(email)}%0A%0AThank%20you!`;

  return (
    <section aria-labelledby="vip-upgrade-cta-heading" className="bg-black border border-amber-500/40 rounded-2xl mb-8 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-amber-600 via-amber-300 to-amber-600" aria-hidden="true" />

      <div className="p-6 md:p-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-400/10 border border-amber-400/40 shrink-0">
            <Crown className="w-5 h-5 text-amber-400" aria-hidden="true" />
          </span>
          <h2 id="vip-upgrade-cta-heading" className="text-xl font-bold text-brand-white">
            Want to upgrade to VIP?
          </h2>
        </div>

        <ul className="space-y-2 mb-6">
          {VIP_BENEFITS.map((benefit) => (
            <li key={benefit.id} className="flex items-start gap-2 text-sm text-gray-200">
              <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              {benefit.title}
            </li>
          ))}
        </ul>

        <a
          href={mailtoLink}
          className="inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-black font-semibold py-3 px-6 rounded-lg transition-colors w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
        >
          <Mail className="w-4 h-4" aria-hidden="true" />
          Email us to upgrade
        </a>
        <p className="text-xs text-gray-400 mt-3">
          We&apos;ll reply with a payment link — no forms, no hassle.
        </p>
      </div>
    </section>
  );
}
