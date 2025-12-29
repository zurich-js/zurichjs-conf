import React from 'react';
import {SectionContainer} from "@/components/organisms/SectionContainer";

export interface ShapedSectionProps {
  /**
   * The clip-path shape style to apply
   * - widen: Expands at the edges
   * - tighten: Contracts at the edges
   * - down: Slopes downward
   * - up: Slopes upward
   */
  shape: 'widen' | 'tighten' | 'down' | 'up';

  /**
   * Visual variant determining background and text colors
   * - light: White background with dark text
   * - yellow: Brand yellow background with dark text
   * - medium: Medium gray background with white text
   * - dark: black background with white text
   */
  variant: 'light' | 'yellow' | 'medium' | 'dark';

  /**
   * Whether to apply angled clip-path to the top edge
   * Use for the first section in a sequence
   */
  dropTop?: boolean;

  /**
   * Whether to apply angled clip-path to the bottom edge
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
  id
}) => {
  // Map variants to Tailwind theme colors (defined in @theme in globals.css)
  const variantStyles = {
    light: 'bg-brand-white text-black',
    yellow: 'bg-brand-yellow-main text-black',
    medium: 'bg-brand-gray-darkest text-brand-white',
    dark: 'bg-brand-black text-brand-white',
  };

  // Calculate padding and margin based on drop configuration

  const spaceWithoutBottom = [
    '-mt-12 pt-12 pb-24',
    'sm:-mt-16 sm:pt-16 sm:pb-32',
    'md:-mt-20 md:pt-20 md:pb-40',
    'lg:-mt-28 lg:pt-28 lg:pb-48',
    'xl:-mt-28 xl:pt-28 xl:pb-48',
    '2xl:-mt-36 2xl:pt-36 2xl:pb-56',
    '3xl:-mt-48 3xl:pt-48 3xl:pb-72',
    '4xl:-mt-56 4xl:pt-56 4xl:pb-84',
  ].join(' ')

  const spaceWithoutTop = [
    '-mt-12 pb-12 pt-24',
    'sm:-mt-16 sm:pb-16 sm:pt-32',
    'md:-mt-20 md:pb-20 md:pt-40',
    'lg:-mt-28 lg:pb-28 lg:pt-48',
    'xl:-mt-28 xl:pb-28 xl:pt-48',
    '2xl:-mt-36 2xl:pb-36 2xl:pt-56',
    '3xl:-mt-48 3xl:pb-48 3xl:pt-72',
    '4xl:-mt-56 4xl:pb-56 4xl:pt-84',
  ].join(' ')

  const spaceStraight = [
    '-my-12 py-24',
    'sm:-my-16 sm:py-32',
    'md:-my-20 md:py-40',
    'lg:-my-28 lg:py-48',
    'xl:-my-28 xl:py-48',
    '2xl:-my-36 2xl:py-56',
    '3xl:-my-48 3xl:py-72',
    '4xl:-my-56 4xl:py-84',
  ].join(' ')

  const spaceWithBoth = [
    'py-12',
    'sm:py-16',
    'md:py-20',
    'lg:py-28',
    'xl:py-28',
    '2xl:py-36',
    '3xl:py-48',
    '4xl:py-56',
  ].join(' ')

  const spacingClasses = dropTop && !dropBottom ? spaceWithoutBottom :
    dropBottom && !dropTop ? spaceWithoutTop :
    !dropTop && !dropBottom ? spaceStraight :
    spaceWithBoth;

  // Build the shape-specific clip-path class
  const shapeClass = `shaped-section-${shape}`;

  // Build drop modifier classes
  const dropClasses = [
    dropTop && 'shaped-section-drop-top',
    dropBottom && 'shaped-section-drop-bottom',
  ].filter(Boolean).join(' ');

  return (
    <section
      className={`
        shaped-section
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

