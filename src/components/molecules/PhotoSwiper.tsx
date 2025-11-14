import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMotion } from '@/contexts/MotionContext';
import Image from 'next/image';

// Type definitions matching the data structure
// Max 2 levels of nesting: 1-2 images OR 1 image + 1 container with 1-2 images

// Nested container can hold single or double-horizontal layout
export type NestedContainer =
  | { type: 'single'; height: '1/3' | '2/3'; image: string; alt: string }
  | {
      type: 'double-horizontal';
      height: '1/3' | '2/3';
      left: { image: string; alt: string; width: '1/3' | '2/3' };
      right: { image: string; alt: string; width: '1/3' | '2/3' };
    };

export type PhotoLayout =
  | { type: 'single'; image: string; alt: string }
  | {
      type: 'double-vertical';
      top: { image: string; alt: string; height: '1/3' | '2/3' };
      bottom: { image: string; alt: string; height: '1/3' | '2/3' };
    }
  | {
      type: 'double-horizontal';
      left: { image: string; alt: string; width: '1/3' | '2/3' };
      right: { image: string; alt: string; width: '1/3' | '2/3' };
    }
  | {
      type: 'nested';
      main: { image: string; alt: string; height: '1/3' | '2/3' };
      nested: NestedContainer;
    };

export interface PhotoSlide {
  id: string;
  layout: PhotoLayout;
}

export interface PhotoSwiperProps {
  photos: PhotoSlide[];
  className?: string;
}

/**
 * PhotoSwiper - Horizontal scrolling photo gallery using Swiper React components
 *
 * Features:
 * - Client-side only rendering to avoid hydration issues
 * - Manual masonry layouts with custom components
 * - Auto-play with pause on hover
 * - Free-mode scrolling with momentum
 * - Keyboard navigation support
 * - Accessibility compliant
 *
 * @example
 * ```tsx
 * <PhotoSwiper photos={photoSlides} />
 * ```
 */
export const PhotoSwiper: React.FC<PhotoSwiperProps> = ({ photos, className = '' }) => {
  const { shouldAnimate } = useMotion();
  const [isMounted, setIsMounted] = useState(false);
  const [SwiperComponent, setSwiperComponent] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [SwiperSlideComponent, setSwiperSlideComponent] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [swiperModules, setSwiperModules] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Load Swiper client-side only to avoid hydration issues
  useEffect(() => {
    const loadSwiper = async () => {
      // Import Swiper styles
      await import('swiper/css');
      await import('swiper/css/free-mode');

      // Import Swiper React components
      const { Swiper, SwiperSlide } = await import('swiper/react');
      const { Autoplay, FreeMode, Keyboard } = await import('swiper/modules');

      setSwiperComponent(() => Swiper);
      setSwiperSlideComponent(() => SwiperSlide);
      setSwiperModules([Autoplay, FreeMode, Keyboard]);
      setIsMounted(true);
    };

    if (photos.length > 0) {
      loadSwiper();
    } else {
      setIsMounted(true);
    }
  }, [photos.length]);

  // Show loading placeholder
  if (!isMounted || !SwiperComponent || photos.length === 0) {
    return (
      <div className={`flex gap-4 overflow-hidden ${className}`} aria-label="Photo gallery loading">
        {photos.slice(0, 3).map((photo) => (
          <div
            key={photo.id}
            className="flex-shrink-0 w-[400px] h-[500px] bg-brand-black animate-pulse"
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  const Swiper = SwiperComponent;
  const SwiperSlide = SwiperSlideComponent;

  return (
    <Swiper
      modules={swiperModules}
      slidesPerView="auto"
      spaceBetween={16}
      freeMode={{
        enabled: true,
        momentum: true,
        momentumRatio: 0.5,
      }}
      autoplay={{
        delay: 4000,
        disableOnInteraction: true,
        pauseOnMouseEnter: true,
      }}
      grabCursor={true}
      keyboard={{
        enabled: true,
      }}
      breakpoints={{
        640: {
          spaceBetween: 20,
        },
        1024: {
          spaceBetween: 24,
        },
      }}
      className={`overflow-visible pb-4 cursor-grab active:cursor-grabbing ${className}`}
      wrapperClass="flex items-start"
      role="region"
      aria-label="Conference photo gallery"
    >
      {photos.map((photo, index) => {
        const delay = shouldAnimate ? 0.6 + index * 0.08 : 0;

        return (
          <SwiperSlide key={photo.id} className="!w-auto !h-auto">
            <motion.div
              className="w-[400px] h-[500px] overflow-hidden"
              initial={shouldAnimate ? { opacity: 0, scale: 0.95 } : false}
              animate={shouldAnimate ? { opacity: 1, scale: 1 } : {}}
              transition={{
                duration: 0.5,
                delay,
                ease: [0.22, 1, 0.36, 1],
              }}
              >
                {photo.layout.type === 'single' && (
                  <SinglePhotoLayout image={photo.layout.image} alt={photo.layout.alt} />
                )}
                {photo.layout.type === 'double-vertical' && (
                  <DoubleVerticalPhotoLayout top={photo.layout.top} bottom={photo.layout.bottom} />
                )}
                {photo.layout.type === 'double-horizontal' && (
                  <DoubleHorizontalPhotoLayout left={photo.layout.left} right={photo.layout.right} />
                )}
                {photo.layout.type === 'nested' && (
                  <NestedPhotoLayout main={photo.layout.main} nested={photo.layout.nested} />
                )}
              </motion.div>
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
};


/**
 * Photo layout components for manual masonry gallery
 * Max 2 levels of nesting: a slide can have 1-2 images, or 1 image + 1 container with 2 images
 */

// Helper to get Tailwind width class from fraction string
const getWidthClass = (width: '1/3' | '2/3' | 'full'): string => {
  switch (width) {
    case '1/3': return 'w-1/3';
    case '2/3': return 'w-2/3';
    case 'full': return 'w-full';
  }
};

// Helper to get Tailwind height class from fraction string
const getHeightClass = (height: '1/3' | '2/3' | 'full'): string => {
  switch (height) {
    case '1/3': return 'h-1/3';
    case '2/3': return 'h-2/3';
    case 'full': return 'h-full';
  }
};

export interface SinglePhotoLayoutProps {
  image: string;
  alt: string;
}

/**
 * SinglePhotoLayout - One full-size image
 */
export const SinglePhotoLayout: React.FC<SinglePhotoLayoutProps> = ({ image, alt }) => {
  return (
    <div className="relative w-full h-full">
      <Image
        src={image}
        alt={alt}
        fill
        className="object-cover opacity-100 sm:opacity-100 sm:opacity-40 hover:opacity-100 transition-opacity duration-500 rounded-xl"
        sizes="(max-width: 640px) 80vw, (max-width: 1024px) 60vw, 40vw"
      />
    </div>
  );
};

export interface DoubleVerticalPhotoLayoutProps {
  top: { image: string; alt: string; height: '1/3' | '2/3' };
  bottom: { image: string; alt: string; height: '1/3' | '2/3' };
}

/**
 * DoubleVerticalPhotoLayout - Two images stacked vertically
 * Level 1: Two direct children
 */
export const DoubleVerticalPhotoLayout: React.FC<DoubleVerticalPhotoLayoutProps> = ({
top,
bottom,
}) => {
  return (
    <div className="flex flex-col w-full h-full gap-4 sm:gap-5 lg:gap-6">
      <div className={`relative ${getHeightClass(top.height)}`}>
        <Image
          src={top.image}
          alt={top.alt}
          fill
          className="object-cover opacity-100 sm:opacity-40 hover:opacity-100 transition-opacity duration-500 rounded-xl"
          sizes="(max-width: 640px) 80vw, (max-width: 1024px) 60vw, 40vw"
        />
      </div>
      <div className={`relative ${getHeightClass(bottom.height)}`}>
        <Image
          src={bottom.image}
          alt={bottom.alt}
          fill
          className="object-cover opacity-100 sm:opacity-40 hover:opacity-100 transition-opacity duration-500 rounded-xl"
          sizes="(max-width: 640px) 80vw, (max-width: 1024px) 60vw, 40vw"
        />
      </div>
    </div>
  );
};

export interface DoubleHorizontalPhotoLayoutProps {
  left: { image: string; alt: string; width: '1/3' | '2/3' };
  right: { image: string; alt: string; width: '1/3' | '2/3' };
}

/**
 * DoubleHorizontalPhotoLayout - Two images side by side
 * Level 1: Two direct children
 */
export const DoubleHorizontalPhotoLayout: React.FC<DoubleHorizontalPhotoLayoutProps> = ({
left,
right,
}) => {
  return (
    <div className="flex w-full h-full gap-4 sm:gap-5 lg:gap-6">
      <div className={`relative ${getWidthClass(left.width)}`}>
        <Image
          src={left.image}
          alt={left.alt}
          fill
          className="object-cover opacity-100 sm:opacity-40 hover:opacity-100 transition-opacity duration-500 rounded-xl"
          sizes="(max-width: 640px) 40vw, (max-width: 1024px) 30vw, 20vw"
        />
      </div>
      <div className={`relative ${getWidthClass(right.width)}`}>
        <Image
          src={right.image}
          alt={right.alt}
          fill
          className="object-cover opacity-100 sm:opacity-40 hover:opacity-100 transition-opacity duration-500 rounded-xl"
          sizes="(max-width: 640px) 40vw, (max-width: 1024px) 30vw, 20vw"
        />
      </div>
    </div>
  );
};

export interface NestedPhotoLayoutProps {
  main: { image: string; alt: string; height: '1/3' | '2/3' };
  nested:
    | { type: 'single'; height: '1/3' | '2/3'; image: string; alt: string }
    | {
        type: 'double-horizontal';
        height: '1/3' | '2/3';
        left: { image: string; alt: string; width: '1/3' | '2/3' };
        right: { image: string; alt: string; width: '1/3' | '2/3' };
      };
}

/**
 * NestedPhotoLayout - One image + container with 1-2 more images
 * Level 1: Main image + nested container
 * Level 2: Single image OR two images inside the nested container
 * This is the ONLY layout with 2 levels of nesting
 */
export const NestedPhotoLayout: React.FC<NestedPhotoLayoutProps> = ({ main, nested }) => {
  return (
    <div className="flex flex-col w-full h-full gap-4 sm:gap-5 lg:gap-6">
      {/* Main image */}
      <div className={`relative ${getHeightClass(main.height)}`}>
        <Image
          src={main.image}
          alt={main.alt}
          fill
          className="object-cover opacity-100 sm:opacity-40 hover:opacity-100 transition-opacity duration-500 rounded-xl"
          sizes="(max-width: 640px) 80vw, (max-width: 1024px) 60vw, 40vw"
        />
      </div>

      {/* Nested container - single or double-horizontal */}
      {nested.type === 'single' ? (
        <div className={`relative ${getHeightClass(nested.height)}`}>
          <Image
            src={nested.image}
            alt={nested.alt}
            fill
            className="object-cover opacity-100 sm:opacity-40 hover:opacity-100 transition-opacity duration-500 rounded-xl"
            sizes="(max-width: 640px) 80vw, (max-width: 1024px) 60vw, 40vw"
          />
        </div>
      ) : (
        <div className={`flex w-full ${getHeightClass(nested.height)} gap-4 sm:gap-5 lg:gap-6`}>
          <div className={`relative ${getWidthClass(nested.left.width)} h-full`}>
            <Image
              src={nested.left.image}
              alt={nested.left.alt}
              fill
              className="object-cover opacity-100 sm:opacity-40 hover:opacity-100 transition-opacity duration-500 rounded-xl"
              sizes="(max-width: 640px) 40vw, (max-width: 1024px) 30vw, 20vw"
            />
          </div>
          <div className={`relative ${getWidthClass(nested.right.width)} h-full`}>
            <Image
              src={nested.right.image}
              alt={nested.right.alt}
              fill
              className="object-cover opacity-100 sm:opacity-40 hover:opacity-100 transition-opacity duration-500 rounded-xl"
              sizes="(max-width: 640px) 40vw, (max-width: 1024px) 30vw, 20vw"
            />
          </div>
        </div>
      )}
    </div>
  );
};
