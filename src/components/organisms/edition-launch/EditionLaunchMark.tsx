import { motion } from 'framer-motion';
import Image from 'next/image';

interface EditionLaunchMarkProps {
  shouldAnimate: boolean;
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

// Matching commands let the dot grow into one circle, then split into the
// exact two white paths supplied for the final mark.
const WHITE_DOT =
  'M255 256 L255 256 C255 254.9 257 254.9 257 256 L257 256 L255 256 L255 256 Z M257 256 L257 256 C257 257.1 255 257.1 255 256 L255 256 L257 256 L257 256 Z';
const WHITE_CIRCLE =
  'M90 256 L90 256 C90 35 422 35 422 256 L422 256 L90 256 L90 256 Z M422 256 L422 256 C422 477 90 477 90 256 L90 256 L422 256 L422 256 Z';
const WHITE_FINAL =
  'M266.301 252.99 L316.901 252.99 C399.761 252.99 466.931 185.81 466.931 102.95 L466.931 45.0703 L266.301 45.0703 L266.301 252.99 Z M232.41 258.42 L194.89 258.42 C112.02 258.42 45.0703 325.6 45.0703 408.46 L45.0703 466.93 L232.41 466.93 L232.41 258.42 Z';

const BLUE_TOP_LINE =
  'M232.62 184.07 L232.62 45.0703 L232.2 45.0703 L231.8 45.0703 L231.62 45.0703 L231.62 184.07 L232.62 184.07 Z';
const BLUE_TOP_FINAL =
  'M232.62 184.07 L232.62 45.0703 L172.8 45.0703 L46.4403 45.0703 L45.0703 45.0703 L45.0703 184.07 L232.62 184.07 Z';
const BLUE_BOTTOM_LINE =
  'M266.301 466.93 L266.6 466.93 L267.301 466.93 L267.301 327.93 L266.301 327.93 L266.301 466.93 Z';
const BLUE_BOTTOM_FINAL =
  'M266.301 466.93 L339.201 466.93 L466.931 466.93 L466.931 327.93 L266.301 327.93 L266.301 466.93 Z';

/** Animates the original vector paths on the same timeline as the overlay. */
export function EditionLaunchMark({ shouldAnimate }: EditionLaunchMarkProps) {
  return (
    <div
      role="img"
      aria-label="ZurichJS Conf logo"
      className="relative aspect-square w-[clamp(11rem,40vw,26rem)] shrink-0"
    >
      {shouldAnimate ? (
        <svg viewBox="0 0 512 512" className="h-full w-full" aria-hidden="true">
          <motion.path
            fill="white"
            initial={{ d: WHITE_DOT }}
            animate={{ d: [WHITE_DOT, WHITE_CIRCLE, WHITE_FINAL] }}
            transition={{ d: { delay: 3.05, duration: 2.2, times: [0, 0.45, 1], ease: EASE_OUT } }}
          />
          <motion.path
            fill="#258BCC"
            initial={{ d: BLUE_TOP_LINE, opacity: 0 }}
            animate={{ d: BLUE_TOP_FINAL, opacity: 1 }}
            transition={{
              d: { delay: 5.05, duration: 0.6, ease: EASE_OUT },
              opacity: { delay: 5.05, duration: 0.12 },
            }}
          />
          <motion.path
            fill="#258BCC"
            initial={{ d: BLUE_BOTTOM_LINE, opacity: 0 }}
            animate={{ d: BLUE_BOTTOM_FINAL, opacity: 1 }}
            transition={{
              d: { delay: 5.05, duration: 0.6, ease: EASE_OUT },
              opacity: { delay: 5.05, duration: 0.12 },
            }}
          />
        </svg>
      ) : (
        <Image src="/images/2027/launch-mark.svg" alt="" fill sizes="(max-width: 650px) 40vw, 26rem" priority />
      )}
    </div>
  );
}
