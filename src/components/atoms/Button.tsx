import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export type ButtonVariant = 'primary' | 'ghost' | 'accent' | 'outline' | 'dark';
export type ButtonSize = 'sm' | 'md' | 'lg';

// Exclude event handlers that conflict with framer-motion
type ConflictingProps =
  | 'onDrag'
  | 'onDragStart'
  | 'onDragEnd'
  | 'onDragEnter'
  | 'onDragExit'
  | 'onDragLeave'
  | 'onDragOver'
  | 'onAnimationStart'
  | 'onAnimationEnd'
  | 'onAnimationIteration';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | ConflictingProps> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
  href?: string;
  loading?: boolean;
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-brand-primary text-text-dark font-semibold hover:bg-brand-dark shadow-lg hover:shadow-xl',
  ghost: 'bg-transparent text-text-primary border-2 border-text-primary font-medium hover:bg-text-primary hover:text-text-dark',
  accent: 'bg-vip text-text-primary font-semibold hover:bg-vip/90 shadow-lg hover:shadow-xl',
  outline: 'bg-transparent text-brand-primary border-2 border-brand-primary font-semibold hover:bg-brand-primary hover:text-text-dark',
  dark: 'bg-gray-800 text-text-primary font-semibold hover:bg-gray-700 shadow-md hover:shadow-lg',
};

/**
 * Button component with support for primary and ghost variants
 * Includes hover animations and multiple sizes
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      children,
      disabled = false,
      loading = false,
      className = '',
      href,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const baseStyles = 'inline-flex items-center justify-center gap-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
    
    // Apply rounded-lg as default if no border-radius class is provided
    const roundedClass = className.includes('rounded') ? '' : 'rounded-lg';
    
    const combinedClassName = `${baseStyles} ${roundedClass} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

    const motionProps: HTMLMotionProps<'button'> = {
      whileHover: isDisabled ? {} : { scale: 1.02, y: -2 },
      whileTap: isDisabled ? {} : { scale: 0.98 },
      transition: {
        duration: 0.15,
        ease: 'easeOut',
      },
    };

    const content = (
      <>
        {loading && (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </>
    );

    if (asChild && href) {
      return (
        <motion.a
          href={href}
          className={combinedClassName}
          whileHover={motionProps.whileHover}
          whileTap={motionProps.whileTap}
          transition={motionProps.transition}
          aria-disabled={isDisabled}
        >
          {content}
        </motion.a>
      );
    }

    return (
      <motion.button
        ref={ref}
        className={combinedClassName}
        disabled={isDisabled}
        {...props}
        {...motionProps}
      >
        {content}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

