import React from 'react';
import { Modal, ModalBody } from '@/components/atoms/Modal';
import { SpeakerCard } from '@/components/molecules/SpeakerCard';
import {Button} from "@/components/atoms";

type SpeakerCardVariant = 'compact' | 'default' | 'full';

interface PreviewCardData {
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
}

const PREVIEW_VARIANTS: SpeakerCardVariant[] = ['compact', 'default', 'full'];

export function SpeakerCardPreviewModal({
  isOpen,
  onClose,
  variant,
  onVariantChange,
  speaker,
}: SpeakerCardPreviewModalProps) {
  // TODO(feature/speakers-grid): Replace placeholder neighboring cards with seeded public speaker previews when that data exists.
  const cards = [
      {
          name: 'Amet Consectetur',
          title: 'Staff Engineer @ Placeholder Labs',
          footer: 'Consectetur adipiscing',
          isSpeaker: false,
      },
      {
          ...speaker,
          isSpeaker: true,
      },
      {
          name: 'Adipiscing Elit',
          title: 'Building community around JavaScript',
          footer: 'Sed do eiusmod',
          isSpeaker: false,
      }
  ]

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
