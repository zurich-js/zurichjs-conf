import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const SPRITES = [
  '/sprites/side_1_in.png',
  '/sprites/side_2_transition_in.png',
  '/sprites/side_3_finished.png',
  '/sprites/side_4_transition_out.png',
  '/sprites/side_5_out.png',
] as const;

// Timing in ms
const FRAME_DURATION = 180;
const HOLD_DURATION = 1500;
const SLIDE_DURATION = 0.6;

interface DuckieSideEntranceProps {
  onComplete: () => void;
  onClick: () => void;
}

type Phase =
  | 'slide-in'
  | 'frame-1'
  | 'frame-2'
  | 'hold'
  | 'frame-4'
  | 'frame-5'
  | 'slide-out';

export function DuckieSideEntrance({ onComplete, onClick }: DuckieSideEntranceProps) {
  const [phase, setPhase] = useState<Phase>('slide-in');
  const [currentSprite, setCurrentSprite] = useState<string>(SPRITES[0]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    switch (phase) {
      case 'frame-1':
        setCurrentSprite(SPRITES[1]);
        timer = setTimeout(() => setPhase('frame-2'), FRAME_DURATION);
        break;
      case 'frame-2':
        setCurrentSprite(SPRITES[2]);
        timer = setTimeout(() => setPhase('hold'), FRAME_DURATION);
        break;
      case 'hold':
        timer = setTimeout(() => setPhase('frame-4'), HOLD_DURATION);
        break;
      case 'frame-4':
        setCurrentSprite(SPRITES[3]);
        timer = setTimeout(() => setPhase('frame-5'), FRAME_DURATION);
        break;
      case 'frame-5':
        setCurrentSprite(SPRITES[4]);
        timer = setTimeout(() => setPhase('slide-out'), FRAME_DURATION);
        break;
      default:
        break;
    }

    return () => clearTimeout(timer);
  }, [phase]);

  const xTarget = phase === 'slide-out' ? '100%' : '0%';

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: xTarget }}
      transition={{ duration: SLIDE_DURATION, ease: 'easeInOut' }}
      onAnimationComplete={() => {
        if (phase === 'slide-in') setPhase('frame-1');
        if (phase === 'slide-out') onComplete();
      }}
      style={{
        position: 'fixed',
        right: 0,
        bottom: '33vh',
        zIndex: 50,
        pointerEvents: 'none',
        transformOrigin: 'center bottom',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={currentSprite}
        alt=""
        onClick={onClick}
        className="w-[10rem] h-[10rem] sm:w-[8rem] sm:h-[8rem] md:w-[10rem] md:h-[10rem] lg:w-[12rem] lg:h-[12rem]"
        style={{ objectFit: 'contain', pointerEvents: 'auto', cursor: 'pointer' }}
        draggable={false}
      />
    </motion.div>
  );
}
