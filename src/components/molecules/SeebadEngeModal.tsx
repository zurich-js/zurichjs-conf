/**
 * Seebad Enge Modal
 * Showcases the private VIP after-party venue at Seebad Enge
 */

import React from 'react';
import Link from 'next/link';
import { Modal, ModalBody, ModalFooter, Button } from '@/components/atoms';
import { Clock, MapPin, Sunset, Wine, Waves, ExternalLink } from 'lucide-react';

export interface SeebadEngeModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
}

const SEEBAD_ENGE_IMAGE =
  'https://www.seebadenge.ch/wp/wp-content/uploads/2017/08/page-img-1.jpg';
const SEEBAD_ENGE_URL = 'https://www.seebadenge.ch/wp/';

const HIGHLIGHTS: { icon: React.ComponentType<{ className?: string; size?: number }>; label: string }[] = [
  { icon: Sunset, label: 'Swiss September sunset over the lake' },
  { icon: Waves, label: 'Optional swim in Lake Zürich' },
  { icon: Wine, label: 'Drinks & apéro included' },
  { icon: Clock, label: '19:00 – 23:00, after the conference' },
];

export const SeebadEngeModal: React.FC<SeebadEngeModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" variant="dark" showCloseButton>
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-brand-gray-darkest">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={SEEBAD_ENGE_IMAGE}
          alt="Seebad Enge — lakeside venue in Zürich"
          className="size-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black/95 via-brand-black/60 to-brand-black/30" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          <p className="text-xs uppercase tracking-widest font-medium text-brand-yellow-main mb-1">
            VIP Exclusive
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-brand-white">
            After Party @ Seebad Enge
          </h2>
          <p className="flex items-center gap-1.5 text-sm text-brand-gray-light mt-1">
            <MapPin size={14} />
            Mythenquai 9, 8002 Zürich
          </p>
        </div>
      </div>

      <ModalBody className="space-y-5">
        <p className="text-brand-gray-light leading-relaxed text-sm">
          We&apos;ve booked{' '}
          <strong className="text-brand-white">Seebad Enge</strong> as our private after-party venue
          — a beautiful taste of Swiss scenery, right on the shores of Lake Zürich. Wind down with
          fellow VIPs, take in the September summer sunset, and enjoy drinks and apéro in one of
          Zürich&apos;s most iconic lakeside spots.
        </p>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="list">
          {HIGHLIGHTS.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-start gap-2.5 bg-brand-gray-dark/50 rounded-xl p-3 text-sm text-brand-white"
            >
              <Icon size={18} className="text-brand-yellow-main shrink-0 mt-0.5" />
              <span>{label}</span>
            </li>
          ))}
        </ul>

        <p className="text-xs text-brand-gray-light leading-relaxed">
          Exclusive to VIP ticket holders. Limited to 15 seats.
        </p>
      </ModalBody>

      <ModalFooter variant="dark" className="flex flex-col sm:flex-row gap-3 sm:justify-end">
        <Link href={SEEBAD_ENGE_URL} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" asChild>
            Visit Seebad Enge
            <ExternalLink size={14} />
          </Button>
        </Link>
        <Button variant="accent" onClick={onClose}>
          Save me a sundowner
        </Button>
      </ModalFooter>
    </Modal>
  );
};
