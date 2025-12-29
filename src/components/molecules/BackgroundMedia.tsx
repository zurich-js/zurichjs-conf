import React, { useState } from 'react';
import Image from 'next/image';

export interface BackgroundMediaProps {
  videoSrc?: string;
  posterSrc?: string;
  imgFallbackSrc?: string;
  overlayOpacity?: number;
  fadeOut?: boolean;
  className?: string;
}

/**
 * Background media component with video support and image fallbacks
 * Includes gradient overlay for text contrast
 * Handles video loading errors gracefully
 */
export const BackgroundMedia: React.FC<BackgroundMediaProps> = ({
  videoSrc,
  posterSrc,
  imgFallbackSrc,
  overlayOpacity = 0.7,
  fadeOut = true,
  className = '',
}) => {
  const [videoError, setVideoError] = useState(false);

  const handleVideoError = () => {
    console.warn('Video failed to load, falling back to image');
    setVideoError(true);
  };

  return (
    <div className={`absolute inset-0 overflow-hidden w-full h-full ${className}`}>
      {/* Media Layer - Top 85% of screen */}
      <div className="absolute top-0 left-0 right-0 h-[85%]">
        {videoSrc && !videoError ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            poster={posterSrc}
            onError={handleVideoError}
            className="absolute inset-0 w-full h-full object-cover"
            aria-hidden="true"
          >
            <source src={videoSrc} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <Image
            src={imgFallbackSrc || posterSrc || ''}
            alt=""
            fill
            className="object-cover"
            priority
            sizes="100vw"
            aria-hidden="true"
          />
        )}
        
        {/* Dark overlay for contrast - only on image */}
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
          aria-hidden="true"
        />
        
        {/* Fade out effect at bottom of image */}
        {fadeOut && (
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, transparent 0%, transparent 80%, rgba(0, 0, 0, 0.6) 90%, #000000 100%)',
            }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Solid black for bottom 15% of screen */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[15%] bg-black"
        aria-hidden="true"
      />
    </div>
  );
};

