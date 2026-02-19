import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const SPRITES = [
  '/sprites/front_1_in.png',
  '/sprites/front_2_transition_in.png',
  '/sprites/front_3_finished.png',
  '/sprites/front_4_transition_out.png',
  '/sprites/front_5_transition_out_2.png',
  '/sprites/front_6_out.png',
] as const;

// Timing in ms
const FRAME_DURATION = 180;
const HOLD_DURATION = 1500;
const SCALE_DURATION = 1.2;
const SCALE_MIN = 0.3;

interface DuckieZMoveProps {
  position: { x: number; y: number };
  onComplete: () => void;
  onClick: () => void;
}

type Phase =
  | 'scale-in'
  | 'frame-2'
  | 'hold'
  | 'frame-4'
  | 'frame-5'
  | 'frame-6'
  | 'scale-out';

export function DuckieZMove({ position, onComplete, onClick }: DuckieZMoveProps) {
  const [phase, setPhase] = useState<Phase>('scale-in');
  const [currentSprite, setCurrentSprite] = useState<string>(SPRITES[0]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    switch (phase) {
      case 'frame-2':
        timer = setTimeout(() => {
          setCurrentSprite(SPRITES[1]);
          setTimeout(() => {
            setCurrentSprite(SPRITES[2]);
            setPhase('hold');
          }, FRAME_DURATION);
        }, FRAME_DURATION);
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
        timer = setTimeout(() => setPhase('frame-6'), FRAME_DURATION);
        break;
      case 'frame-6':
        setCurrentSprite(SPRITES[5]);
        timer = setTimeout(() => setPhase('scale-out'), FRAME_DURATION);
        break;
      default:
        break;
    }

    return () => clearTimeout(timer);
  }, [phase]);

  const scaleTarget = phase === 'scale-out' ? SCALE_MIN : 1;

  return (
    <motion.div
      initial={{ scale: SCALE_MIN, opacity: 0 }}
      animate={{
        scale: scaleTarget,
        opacity: phase === 'scale-out' ? 0 : 1,
      }}
      transition={{ duration: SCALE_DURATION, ease: 'easeInOut' }}
      onAnimationComplete={() => {
        if (phase === 'scale-in') setPhase('frame-2');
        if (phase === 'scale-out') onComplete();
      }}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 50,
        pointerEvents: 'none',
        transformOrigin: 'center 80%',
        translate: '-50% -80%',
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
