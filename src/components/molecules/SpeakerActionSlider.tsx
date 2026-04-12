import React, { useEffect, useState, type PropsWithChildren } from 'react';
import { AnimatePresence, motion, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface SpeakerActionSliderProps {
  className?: string;
}

export function SpeakerActionSlider({ children, className = '' }: PropsWithChildren<SpeakerActionSliderProps>) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = React.Children.toArray(children).filter(Boolean);
  const slideCount = slides.length;

  useEffect(() => {
    if (slideCount < 2) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCurrentSlide((current) => (current + 1) % slideCount);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [slideCount]);

  useEffect(() => {
    if (currentSlide < slideCount) {
      return;
    }

    setCurrentSlide(0);
  }, [currentSlide, slideCount]);

  if (slideCount === 0) {
    return null;
  }

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold && currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    } else if (info.offset.x < -threshold && currentSlide < slideCount - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  return (
    <section
      className="relative overflow-hidden pb-10"
      aria-label="Speaker call to action"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className={cn(
            'flex min-h-[var(--container-xs)] cursor-grab flex-col items-center justify-center gap-8 text-center active:cursor-grabbing',
            className
          )}
        >
          {slides[currentSlide]}
        </motion.div>
      </AnimatePresence>

      {slideCount > 1 ? (
        <div className="absolute right-0 bottom-0 left-0 flex justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={cn(
                'size-3 rounded-full transition-all duration-300',
                index === currentSlide ? 'scale-110 bg-brand-black' : 'bg-brand-gray-light hover:bg-brand-gray-medium'
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
