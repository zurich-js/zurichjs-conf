import React from 'react';
import {SectionContainer} from "@/components/organisms/SectionContainer";

export interface ShapedSectionProps {
  /**
   * The clip-path shape style to apply
   * - widen: Expands at the edges
   * - tighten: Contracts at the edges
   * - down: Slopes downward
   * - up: Slopes upward
   * - straight: No angled edges, plain rectangular section
   */
  shape: 'widen' | 'tighten' | 'down' | 'up' | 'straight';

  /**
   * Visual variant determining background and text colors
   * - light: White background with dark text
   * - yellow: Brand yellow background with dark text
   * - medium: Medium gray background with white text
   * - dark: black background with white text
   */
  variant: 'light' | 'yellow' | 'gray' | 'medium' | 'dark';

  /**
   * Whether to keep the top edge straight
   * Use for the first section in a sequence
   */
  dropTop?: boolean;

  /**
   * Whether to keep the bottom edge straight
   * Use for the last section in a sequence
   */
  dropBottom?: boolean;

  /**
   * Optional CSS class name for additional styling
   */
  className?: string;

  /**
   * Disable the default container and padding
   * Use this for full-bleed content like background images/videos
   */
  disableContainer?: boolean;

  /**
   * Content to be rendered inside the shaped section
   */
  children: React.ReactNode;
  id?: string;
  /**
   * Reduce the top padding for tighter spacing with previous section
   */
  compactTop?: boolean;
}

/**
 * ShapedSection - Organism component for creating angled section transitions
 *
 * Creates visually striking sections with angled clip-path edges that can be
 * combined to create flowing page layouts. Each section can have different
 * shapes and color variants to create visual hierarchy.
 *
 * @example
 * ```tsx
 * <ShapedSection shape="tighten" variant="dark" dropTop>
 *   <Hero {...heroProps} />
 * </ShapedSection>
 * <ShapedSection shape="widen" variant="light">
 *   <Content {...contentProps} />
 * </ShapedSection>
 * ```
 */
export const ShapedSection: React.FC<ShapedSectionProps> = ({
  shape,
  variant,
  dropTop = false,
  dropBottom = false,
  className = '',
  disableContainer = false,
  children,
  id,
  compactTop = false,
}) => {
  // Map variants to Tailwind theme colors (defined in @theme in globals.css)
  const variantStyles = {
    light: 'bg-brand-white text-brand-black',
    yellow: 'bg-brand-yellow-main text-brand-black',
    gray: 'bg-brand-gray-light text-brand-black',
    medium: 'bg-brand-gray-darkest text-brand-white',
    dark: 'bg-brand-black text-brand-white',
  };

  // Calculate padding and margin based on drop configuration

  const spaceWithoutBottom = [
    '-mt-16 pt-16 pb-32',
    'sm:-mt-20 sm:pt-20 sm:pb-40',
    'md:-mt-28 md:pt-28 md:pb-56',
    'lg:-mt-40 lg:pt-40 lg:pb-64',
    'xl:-mt-40 2xl:pt-40 2xl:pb-64',
    '2xl:-mt-48 2xl:pt-48 2xl:pb-72',
    '3xl:-mt-64 3xl:pt-64 3xl:pb-96',
    '4xl:-mt-76 4xl:pt-76 4xl:pb-112',
  ].join(' ')

  const spaceWithoutTop = [
    '-mt-16 pb-16 pt-32',
    'sm:-mt-20 sm:pb-20 sm:pt-40',
    'md:-mt-28 md:pb-28 md:pt-56',
    'lg:-mt-40 lg:pb-40 lg:pt-64',
    'xl:-mt-40 2xl:pb-40 2xl:pt-64',
    '2xl:-mt-48 2xl:pb-48 2xl:pt-72',
    '3xl:-mt-64 3xl:pb-64 3xl:pt-96',
    '4xl:-mt-76 4xl:pb-76 4xl:pt-112',
  ].join(' ')

  const spaceStraight = [
    '-my-16 py-32',
    'sm:-my-20 sm:py-40',
    'md:-my-28 md:py-56',
    'lg:-my-40 lg:py-64',
    'xl:-my-40 2xl:py-64',
    '2xl:-my-48 2xl:py-72',
    '3xl:-my-64 3xl:py-96',
    '4xl:-my-76 4xl:py-112',
  ].join(' ')

  // Compact top variant - reduced top padding for tighter spacing
  const spaceStraightCompactTop = [
    '-my-16 pt-32 pb-32',
    'sm:-my-20 sm:pt-36 sm:pb-40',
    'md:-my-28 md:pt-48 md:pb-56',
    'lg:-my-40 lg:pt-56 lg:pb-64',
    'xl:-my-40 2xl:pt-56 2xl:pb-64',
    '2xl:-my-48 2xl:pt-64 2xl:pb-72',
    '3xl:-my-64 3xl:pt-80 3xl:pb-96',
    '4xl:-my-76 4xl:pt-96 4xl:pb-112',
  ].join(' ')

  const spaceWithBoth = [
    'py-16',
    'sm:py-20',
    'md:py-28',
    'lg:py-40',
    '2xl:py-40',
    '2xl:py-48',
    '3xl:py-64',
    '4xl:py-76',
  ].join(' ')

  const keepEdgesStraight = shape === 'straight' || (dropTop && dropBottom);

  const spacingClasses = (function () {
    if (keepEdgesStraight) return spaceWithBoth;
    if (dropTop && !dropBottom) return spaceWithoutBottom;
    if (dropBottom && !dropTop) return spaceWithoutTop;
    if (!dropTop && !dropBottom) {
      return compactTop ? spaceStraightCompactTop : spaceStraight;
    }
    return spaceWithBoth;
  })();

  // Build the shape-specific clip-path class
  const shapeClass = keepEdgesStraight ? undefined : `shaped-section-${shape}`;

  // Build drop modifier classes
  const dropClasses = [
    !keepEdgesStraight &&
    dropTop && !dropBottom && 'shaped-section-drop-top',
    !keepEdgesStraight &&
    !dropTop && dropBottom && 'shaped-section-drop-bottom',
  ].filter(Boolean).join(' ');

  return (
    <section
      className={`
        shaped-section overflow-hidden
        ${variantStyles[variant]}
        ${spacingClasses}
        ${shapeClass}
        ${dropClasses}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      id={id}
    >
      {disableContainer ? (
        children
      ) : (
        <SectionContainer>
          {children}
        </SectionContainer>
      )}
    </section>
  );
};
