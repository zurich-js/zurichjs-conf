/**
 * Seebad Enge Modal
 * Showcases the private VIP after-party venue at Seebad Enge
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { Modal, ModalBody, ModalFooter, Button } from '@/components/atoms';
import { Clock, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

export interface SeebadEngeModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
}

const SEEBAD_ENGE_URL = 'https://www.seebadenge.ch/wp/';

const SEEBAD_IMAGES: { src: string; alt: string }[] = [
  {
    src: 'https://www.seebadenge.ch/wp/wp-content/uploads/2017/08/page-img-1.jpg',
    alt: 'Seebad Enge — lakeside swimming deck on Lake Zürich',
  },
];

export const SeebadEngeModal: React.FC<SeebadEngeModalProps> = ({ isOpen, onClose }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const validImages = SEEBAD_IMAGES.filter((img) => !failedImages.has(img.src));
  const safeIndex = Math.min(activeIndex, Math.max(0, validImages.length - 1));
  const hasMultiple = validImages.length > 1;

  const goToPrev = () =>
    setActiveIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  const goToNext = () => setActiveIndex((prev) => (prev + 1) % validImages.length);

  const handleImageError = (src: string) => {
    setFailedImages((prev) => {
      const next = new Set(prev);
      next.add(src);
      return next;
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" variant="dark" showCloseButton>
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-brand-gray-darkest">
        {SEEBAD_IMAGES.map((img, i) => {
          const isFailed = failedImages.has(img.src);
          if (isFailed) return null;
          const visibleIndex = validImages.findIndex((v) => v.src === img.src);
          return (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={img.src}
              src={img.src}
              alt={img.alt}
              onError={() => handleImageError(img.src)}
              loading={i === 0 ? 'eager' : 'lazy'}
              className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${
                visibleIndex === safeIndex ? 'opacity-100' : 'opacity-0'
              }`}
            />
          );
        })}

        <div className="absolute inset-0 bg-gradient-to-b from-brand-black/30 via-transparent to-brand-black/40 pointer-events-none" />

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
              {validImages.map((img, i) => (
                <button
                  key={img.src}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  aria-label={`Go to photo ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    i === safeIndex
                      ? 'w-6 bg-brand-yellow-main'
                      : 'w-1.5 bg-brand-white/50 hover:bg-brand-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <ModalBody className="space-y-4">
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
          {`We've booked `}
          <strong className="text-brand-white">Seebad Enge</strong>
          {` as our private after-party venue — a beautiful taste of Swiss scenery, right on the shores of Lake Zürich. Wind down with fellow VIPs and speakers, tuck into a barbecue and drinks as the September sun sets, and take a dip in the lake if you're feeling brave.`}
        </p>
      </ModalBody>

      <ModalFooter variant="dark" className="flex justify-end">
        <Link href={SEEBAD_ENGE_URL} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" asChild>
            Visit Seebad Enge
            <ExternalLink size={14} />
          </Button>
        </Link>
      </ModalFooter>
    </Modal>
  );
};
