import React from 'react';
import { Modal, ModalBody } from '@/components/atoms/Modal';
import { SpeakerCard } from '@/components/molecules/SpeakerCard';
import { Button } from '@/components/atoms';

type SpeakerCardVariant = 'compact' | 'default' | 'full';

export interface PreviewCardData {
  name: string;
  title?: string;
  header?: string | null;
  avatar?: string | null;
  footer: string;
}

interface SpeakerCardPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: SpeakerCardVariant;
  onVariantChange: (variant: SpeakerCardVariant) => void;
  speaker: PreviewCardData;
  neighboringSpeakers?: PreviewCardData[];
}

const PREVIEW_VARIANTS: SpeakerCardVariant[] = ['compact', 'default', 'full'];
const FALLBACK_NEIGHBORING_SPEAKERS: PreviewCardData[] = [
  {
    name: 'ZurichJS Speaker',
    title: 'JavaScript practitioner',
    footer: 'To be announced',
  },
  {
    name: 'Community Guest',
    title: 'Building with the web platform',
    footer: 'To be announced',
  },
];

export function SpeakerCardPreviewModal({
  isOpen,
  onClose,
  variant,
  onVariantChange,
  speaker,
  neighboringSpeakers = [],
}: SpeakerCardPreviewModalProps) {
  const previewNeighbors = [...neighboringSpeakers, ...FALLBACK_NEIGHBORING_SPEAKERS].slice(0, 2);
  const cards = [
    {
      ...previewNeighbors[0],
      isSpeaker: false,
    },
    {
      ...speaker,
      isSpeaker: true,
    },
    {
      ...previewNeighbors[1],
      isSpeaker: false,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Preview your speaker card"
      subtitle="Switch between card layouts to see how your public profile will look."
      size="3xl"
    >
      <ModalBody className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          {PREVIEW_VARIANTS.map((option) => {
            const isActive = option === variant;

            return (
              <Button
                variant={isActive ? 'dark' : 'ghost'}
                key={option}
                size="sm"
                onClick={() => onVariantChange(option)}
                className="capitalize"
                forceDark={!isActive}
              >
                {option}
              </Button>
            );
          })}
        </div>

        <div className="overflow-x-auto pb-2 [scrollbar-width:thin]">
          <div className="grid grid-cols-3 gap-4">
            {cards.map((card, index) => (
              <SpeakerCard
                variant={variant}
                key={`${card.name}-${index}`}
                name={card.name}
                title={card.title ?? 'ZurichJS fan @developer'}
                header={card.header}
                avatar={card.avatar}
                footer={card.footer}
                onClick={() => undefined}
                className={card.isSpeaker ? 'opacity-100' : 'opacity-50'}
              />
            ))}
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
