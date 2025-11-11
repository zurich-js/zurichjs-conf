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
    medium: 'bg-brand-gray-darkest text-white',
    dark: 'bg-brand-black text-white',
  };

  // Calculate padding and margin based on drop configuration
  // Matches Vue implementation exactly
  const spacingClasses =
    dropTop && !dropBottom ? '-mb-16 pt-16 pb-32' :
    dropBottom && !dropTop ? '-mt-16 pb-16 pt-32' :
    !dropTop && !dropBottom ? '-my-16 py-32' :
    'py-16';

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

