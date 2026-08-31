/**
 * Information Card Components
 * Event info, quick actions, and important information
 */

import Link from 'next/link';
import { ArrowRightLeft, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/atoms';

export function EventInfoCard() {
  return (
    <div className="rounded-2xl border border-brand-gray-light bg-brand-gray-lightest p-8 mb-8">
      <h2 className="text-xl font-bold text-brand-black mb-6">Event Information</h2>
      <div className="space-y-4 text-brand-gray-darkest">
        <div>
          <h3 className="text-brand-black font-semibold mb-1 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-blue" aria-hidden="true" />
            Date &amp; Time
          </h3>
          <p>September 11, 2026</p>
        </div>
        <div>
          <h3 className="text-brand-black font-semibold mb-1 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-blue" aria-hidden="true" />
            Venue
          </h3>
          <p>
            Technopark Zürich
            <br />
            Technoparkstrasse 1
            <br />
            8005 Zürich, Switzerland
          </p>
        </div>
      </div>
    </div>
  );
}

interface QuickActionsCardProps {
  ticketId: string;
}

export function QuickActionsCard({ ticketId }: QuickActionsCardProps) {
  return (
    <div className="rounded-2xl border border-brand-gray-light bg-brand-gray-lightest p-8 mb-8">
      <h2 className="text-xl font-bold text-brand-black mb-6">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a
          href={`/api/calendar/${ticketId}`}
          className="flex items-center justify-center gap-2 bg-brand-primary text-black font-semibold py-3 px-6 rounded-lg hover:bg-brand-primary/90 transition-colors"
        >
          <Calendar className="w-4 h-4" aria-hidden="true" />
          Add to Calendar
        </a>
        <a
          href="https://maps.google.com/?q=Technopark+Zürich"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-brand-black text-brand-white font-semibold py-3 px-6 rounded-lg hover:bg-brand-gray-darkest transition-colors"
        >
          <MapPin className="w-4 h-4" aria-hidden="true" />
          View Map
        </a>
      </div>
    </div>
  );
}

interface TransferSectionProps {
  onTransferClick: () => void;
}

export function TransferSection({ onTransferClick }: TransferSectionProps) {
  return (
    <div className="rounded-2xl border border-brand-gray-light bg-brand-gray-lightest p-8 mb-8">
      <h2 className="text-xl font-bold text-brand-black mb-6">Transfer Ticket</h2>
      <p className="text-brand-gray-darkest mb-6">
        Can&apos;t attend? You can transfer your ticket to someone else. Once transferred, you will no longer have access
        to this ticket and the action cannot be undone.
      </p>
      <Button variant="primary" onClick={onTransferClick} className="w-full md:w-auto">
        <ArrowRightLeft className="w-4 h-4" aria-hidden="true" />
        Transfer to Someone Else
      </Button>
    </div>
  );
}

export function ImportantInfoCard() {
  return (
    <div className="rounded-2xl border border-brand-gray-light bg-brand-gray-lightest p-8 mb-8">
      <h2 className="text-xl font-bold text-brand-black mb-4">Important Information</h2>
      <ul className="space-y-2 text-brand-gray-darkest">
        <li className="flex items-start gap-2">
          <span className="text-brand-blue mt-1">•</span>
          <span>Bring this QR code (digital or printed) to the venue for check-in</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-brand-blue mt-1">•</span>
          <span>Please bring a valid photo ID matching the name on your ticket</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-brand-blue mt-1">•</span>
          <span>
            Review our{' '}
            <Link href="/info/refund-policy" className="text-brand-blue hover:underline">
              refund policy
            </Link>{' '}
            for cancellation terms
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-brand-blue mt-1">•</span>
          <span>Contact us at hello@zurichjs.com for any questions</span>
        </li>
      </ul>
    </div>
  );
}
