/**
 * Seebad Enge Modal
 * Showcases the private VIP after-party venue at Seebad Enge
 */

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Modal, ModalBody, ModalFooter, Button } from '@/components/atoms';
import { Clock, ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react';

export interface SeebadEngeModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
}

const SEEBAD_ENGE_URL = 'https://www.seebadenge.ch/wp/';

const SEEBAD_IMAGES: { src: string; alt: string }[] = [
  {
    src: '/images/seebad-enge/seebad-enge-1.jpg',
    alt: 'Seebad Enge — lakeside swimming deck on Lake Zürich',
  },
  {
    src: '/images/seebad-enge/seebad-enge-2.jpg',
    alt: 'Seebad Enge — evening atmosphere at the lakeside venue',
  },
];

export const SeebadEngeModal: React.FC<SeebadEngeModalProps> = ({ isOpen, onClose }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const hasMultiple = SEEBAD_IMAGES.length > 1;

  const goToPrev = () =>
    setActiveIndex((prev) => (prev - 1 + SEEBAD_IMAGES.length) % SEEBAD_IMAGES.length);
  const goToNext = () => setActiveIndex((prev) => (prev + 1) % SEEBAD_IMAGES.length);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" variant="dark" showCloseButton={false}>
      <ModalBody>
        <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-brand-gray-darkest">
        {SEEBAD_IMAGES.map((img, i) => (
            <Image
              key={img.src}
              src={img.src}
              alt={img.alt}
              fill
              sizes="(max-width: 512px) 100vw, 512px"
              className={`rounded-lg object-cover transition-opacity duration-500 ${i === activeIndex ? 'opacity-100' : 'opacity-0'}`}
              quality={90}
              unoptimized
              priority={i === 0}
            />
          ))}

          <div className="absolute inset-0 bg-gradient-to-b from-brand-black/30 via-transparent to-brand-black/40 pointer-events-none" />

          <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-3 right-3 size-9 rounded-full bg-brand-black/60 hover:bg-brand-black/80 text-brand-white flex items-center justify-center transition-colors cursor-pointer z-10"
        >
          <X size={18} />
        </button>

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={goToPrev}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-brand-black/60 hover:bg-brand-black/80 text-brand-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={goToNext}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-brand-black/60 hover:bg-brand-black/80 text-brand-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>

                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {SEEBAD_IMAGES.map((img, i) => (
                      <button
                          key={img.src}
                          type="button"
                          onClick={() => setActiveIndex(i)}
                          aria-label={`Go to photo ${i + 1}`}
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${
                              i === activeIndex
                                  ? 'w-6 bg-brand-yellow-main'
                                  : 'w-1.5 bg-brand-white/50 hover:bg-brand-white/80'
                          }`}
                      />
                  ))}
                </div>
              </>
          )}
        </div>

        <div className="space-y-4 my-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-brand-white">
              After Party @ Seebad Enge
            </h2>
            <p className="flex items-center gap-1.5 text-sm text-brand-yellow-main mt-1.5">
              <Clock size={14} />
              19:00 – 23:00, after the conference
            </p>
          </div>

          <p className="text-brand-gray-light leading-relaxed text-sm">
            We've booked <Link href={SEEBAD_ENGE_URL} target="_blank" className="font-bold text-brand-white inline-flex items-center gap-1 hover:text-brand-yellow-main decoration-dotted underline underline-offset-4">Seebad Enge <ExternalLink size={12} /></Link> as our private after-party venue! <br/>
            Right on the shores of Lake Zürich, it's a great place to wind down with fellow VIPs and speakers, enjoy a barbecue, have a drink, and maybe take a dip in the lake if you're feeling brave.
          </p>
        </div>

        <div className="flex justify-between">
          <Button variant="primary" size="sm" onClick={onClose}>
            Get your ticket
          </Button>
        </div>
      </ModalBody>
    </Modal>
  );
};
