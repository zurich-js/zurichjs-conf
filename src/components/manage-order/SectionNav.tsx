/**
 * Section Quick Links
 * Anchor navigation at the top of the manage-order page so attendees can
 * jump to (and discover) every section of their ticket management page.
 */

import {
  ArrowRightLeft,
  CalendarDays,
  Crown,
  Info,
  QrCode,
  Shirt,
  Sparkles,
  Ticket,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/** Anchor ids shared between the nav and the section wrappers on the page */
export const MANAGE_ORDER_SECTIONS = {
  entryPass: 'entry-pass',
  ticketDetails: 'ticket-details',
  vipBenefits: 'vip-benefits',
  apparel: 'apparel',
  vipUpgrade: 'vip-upgrade',
  eventInfo: 'event-info',
  quickActions: 'quick-actions',
  transfer: 'transfer',
  importantInfo: 'important-info',
} as const;

interface SectionLink {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SectionNavProps {
  isVip: boolean;
  hasPendingUpgrade: boolean;
}

export function SectionNav({ isVip, hasPendingUpgrade }: SectionNavProps) {
  const sections: SectionLink[] = [
    { id: MANAGE_ORDER_SECTIONS.entryPass, label: 'Entry Pass', icon: QrCode },
    { id: MANAGE_ORDER_SECTIONS.ticketDetails, label: 'Ticket Details', icon: Ticket },
    ...(isVip ? [{ id: MANAGE_ORDER_SECTIONS.vipBenefits, label: 'VIP Benefits', icon: Crown }] : []),
    { id: MANAGE_ORDER_SECTIONS.apparel, label: 'Apparel', icon: Shirt },
    ...(hasPendingUpgrade || !isVip
      ? [{ id: MANAGE_ORDER_SECTIONS.vipUpgrade, label: 'VIP Upgrade', icon: Sparkles }]
      : []),
    { id: MANAGE_ORDER_SECTIONS.eventInfo, label: 'Event Info', icon: CalendarDays },
    { id: MANAGE_ORDER_SECTIONS.quickActions, label: 'Quick Actions', icon: Zap },
    { id: MANAGE_ORDER_SECTIONS.transfer, label: 'Transfer Ticket', icon: ArrowRightLeft },
    { id: MANAGE_ORDER_SECTIONS.importantInfo, label: 'Important Info', icon: Info },
  ];

  return (
    <nav aria-label="Ticket management sections" className="mb-10">
      <ul className="flex flex-wrap justify-center gap-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="inline-flex items-center gap-2 bg-black text-brand-white text-sm font-semibold rounded-full px-4 py-2 hover:bg-brand-gray-darkest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              >
                <Icon className="w-4 h-4 text-brand-primary" aria-hidden="true" />
                {section.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
