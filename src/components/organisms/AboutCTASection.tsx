import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Kicker, Heading } from '@/components/atoms';
import { Button } from '@/components/atoms/Button';
import { ParallelogramSection } from '@/components/organisms/ParallelogramSection';
import { AboutCTASlide } from '@/data/about-us';

export interface AboutCTASectionProps {
  data: AboutCTASlide[];
}

export const AboutCTASection: React.FC<AboutCTASectionProps> = ({ data }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold && currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    } else if (info.offset.x < -threshold && currentSlide < data.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  return (
    <ParallelogramSection
      backgroundColor="var(--color-brand-yellow-main)"
    >
      <div className="relative min-h-[600px] md:min-h-[500px]">
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
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="cursor-grab active:cursor-grabbing"
          >
            <Kicker variant="light" className="mb-4">
              {data[currentSlide].kicker}
            </Kicker>
            <Heading level="h2" variant="light" className="mb-8 text-xl font-bold">
              {data[currentSlide].title}
            </Heading>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              <div className="space-y-6">
                <p
                  className="text-gray-900 leading-relaxed text-base"
                  dangerouslySetInnerHTML={{ __html: data[currentSlide].leftColumn }}
                />
                <div className="flex flex-col gap-3">
                  {data[currentSlide].buttons.map((button, index) => (
                    <Link key={index} href={button.url}>
                      <Button
                        variant={button.variant || 'dark'}
                        size="sm"
                      >
                        {button.text}
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {data[currentSlide].rightColumn.map((text, index) => (
                  <p
                    key={index}
                    className="text-gray-900 leading-relaxed text-base"
                    dangerouslySetInnerHTML={{ __html: text }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Dots */}
        {data.length > 1 && (
          <div className="flex justify-center gap-2 mt-12 absolute bottom-0 left-0 right-0">
            {data.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                type="button"
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'bg-gray-900 scale-110'
                    : 'bg-gray-400 hover:bg-gray-600'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </ParallelogramSection>
  );
};
