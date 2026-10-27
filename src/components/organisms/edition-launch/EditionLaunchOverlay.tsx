import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NewsletterForm } from '@/components/molecules';
import { useMotion } from '@/contexts/MotionContext';
import { EditionLaunchMark } from '@/components/organisms/edition-launch/EditionLaunchMark';

interface EditionLaunchOverlayProps {
  onSubscribe: (email: string) => Promise<void>;
}

interface Jumper {
  alt: string;
  className: string;
  height: number;
  name: string;
  src: string;
  startX: string;
  width: number;
}

const JUMPERS: readonly Jumper[] = [
  {
    name: 'Nadja',
    alt: 'Nadja jumping in celebration',
    src: '/images/2027/jump-nadja.png',
    width: 375,
    height: 744,
    startX: '-24vw',
    className: 'left-[-6%] z-10 w-[29%] md:left-[5%] md:w-[23%]',
  },
  {
    name: 'Faris',
    alt: 'Faris jumping in celebration',
    src: '/images/2027/jump-faris.png',
    width: 560,
    height: 560,
    startX: '-16vw',
    className: 'left-[15%] z-20 w-[45%] md:left-[22%] md:w-[34%]',
  },
  {
    name: 'Bogdan',
    alt: 'Bogdan jumping in celebration',
    src: '/images/2027/jump-bogdan.png',
    width: 308,
    height: 581,
    startX: '16vw',
    className: 'right-[14%] z-30 w-[30%] md:right-[21%] md:w-[24%]',
  },
  {
    name: 'Colin',
    alt: 'Colin jumping in celebration',
    src: '/images/2027/jump-colin.png',
    width: 288,
    height: 717,
    startX: '24vw',
    className: 'right-[-5%] z-40 w-[25%] md:right-[4%] md:w-[19%]',
  },
] as const;

const LAUNCH_DELAY_MS = 1000;
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/**
 * Full-screen launch moment for the second ZurichJS Conf edition.
 * Mounted in a body portal so it always sits above the site's other dialogs.
 */
export function EditionLaunchOverlay({ onSubscribe }: EditionLaunchOverlayProps) {
  const { shouldAnimate } = useMotion();
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasIntroFinished, setHasIntroFinished] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsMounted(true);
    const launchTimer = window.setTimeout(() => setIsOpen(true), LAUNCH_DELAY_MS);

    return () => window.clearTimeout(launchTimer);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousActiveElement = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const appRoot = document.getElementById('__next');
    const previousAriaHidden = appRoot?.getAttribute('aria-hidden');
    const wasInert = appRoot?.hasAttribute('inert');

    document.body.style.overflow = 'hidden';
    appRoot?.setAttribute('aria-hidden', 'true');
    appRoot?.setAttribute('inert', '');
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        return;
      }

      if (event.key !== 'Tab') return;

      const dialog = closeButtonRef.current?.closest('[role="dialog"]');
      const focusableElements = dialog?.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])'
      );

      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      if (appRoot) {
        if (!wasInert) appRoot.removeAttribute('inert');
        if (previousAriaHidden === null || previousAriaHidden === undefined) {
          appRoot.removeAttribute('aria-hidden');
        } else {
          appRoot.setAttribute('aria-hidden', previousAriaHidden);
        }
      }
      window.removeEventListener('keydown', handleKeyDown);

      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    };
  }, [isOpen]);

  if (!isMounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.section
          key="edition-launch"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edition-launch-title"
          className="fixed inset-0 z-[2147483647] overflow-y-auto bg-brand-black text-brand-white print:hidden"
          initial={shouldAnimate ? { opacity: 0, backgroundColor: '#FFFFFF' } : false}
          animate={{ opacity: 1, backgroundColor: '#000000' }}
          exit={shouldAnimate ? { opacity: 0 } : undefined}
          transition={{ opacity: { duration: shouldAnimate ? 0.55 : 0 }, backgroundColor: { delay: shouldAnimate ? 2.55 : 0, duration: shouldAnimate ? 0.95 : 0, ease: EASE_OUT } }}
        >
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setIsOpen(false)}
            className="fixed right-4 top-4 z-50 flex size-11 items-center justify-center rounded-full border border-brand-white/20 bg-brand-black/90 text-brand-white shadow-sm backdrop-blur-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 sm:right-7 sm:top-7"
            aria-label="Close the 2027 announcement and explore the 2026 website"
          >
            <X className="size-5" aria-hidden="true" />
          </button>

          <div className="relative mx-auto min-h-dvh w-full max-w-[100rem] overflow-hidden px-3 sm:px-6">
            <div className="absolute inset-x-0 top-0 h-[58dvh] min-h-[24rem] sm:h-[64dvh] md:h-[76dvh]">
              {shouldAnimate && !hasIntroFinished && JUMPERS.map((jumper) => (
                <motion.div
                  key={jumper.name}
                  className={`absolute bottom-0 ${jumper.className}`}
                  initial={{ opacity: 0, x: jumper.startX, y: '48vh', scale: 0.9 }}
                  animate={{ opacity: 1, x: '0vw', y: '0vh', scale: 1 }}
                  transition={{ delay: 0.2, duration: 2.058, ease: EASE_OUT }}
                >
                  <motion.div
                    initial={{ opacity: 1, y: '0vh', scale: 1 }}
                    animate={{ opacity: 0, y: '-18vh', scale: 1.04 }}
                    transition={{ delay: 2.258, duration: 1.65, ease: [0.45, 0, 0.8, 1] }}
                  >
                    <Image
                      src={jumper.src}
                      alt={jumper.alt}
                      width={jumper.width}
                      height={jumper.height}
                      sizes="(max-width: 767px) 45vw, 34vw"
                      className="h-auto w-full select-none object-contain object-bottom"
                      draggable={false}
                      priority
                    />
                  </motion.div>
                </motion.div>
              ))}
            </div>

            <motion.div
              className="relative z-40 flex min-h-dvh flex-col items-center px-5 pb-12 pt-[14dvh]"
            >
              <motion.div
                initial={shouldAnimate ? { y: '16dvh' } : false}
                animate={{ y: 0 }}
                transition={{ delay: shouldAnimate ? 5.7 : 0, duration: shouldAnimate ? 0.9 : 0, ease: EASE_OUT }}
                onAnimationComplete={() => setHasIntroFinished(true)}
              >
                <EditionLaunchMark shouldAnimate={shouldAnimate} />
              </motion.div>

              <motion.h1
                id="edition-launch-title"
                className="mt-7 max-w-[32rem] text-center text-[clamp(1.25rem,3vw,2rem)] font-semibold leading-tight text-brand-white"
                initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: shouldAnimate ? 6.35 : 0, duration: shouldAnimate ? 0.65 : 0, ease: EASE_OUT }}
              >
                Zurich JS Conf 2 is coming back.
              </motion.h1>

              <motion.div
                className="mt-10 flex w-full max-w-[22rem] flex-col items-center"
                initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: shouldAnimate ? 6.8 : 0, duration: shouldAnimate ? 0.65 : 0, ease: EASE_OUT }}
              >
                <p className="mb-3 text-center text-sm font-semibold text-brand-white sm:text-base">
                  Join the waitlist
                </p>
                <NewsletterForm
                  inputId="edition-launch-email"
                  ctaLabel="Sign up"
                  onSubscribe={onSubscribe}
                  variant="light"
                  className="w-full"
                />
              </motion.div>
            </motion.div>
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

export type { EditionLaunchOverlayProps };
