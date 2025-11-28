import React, { forwardRef, ButtonHTMLAttributes } from 'react';

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
  sm: 'px-3 py-1.5 text-xs ',
  md: 'px-4 py-2.5 text-md ',
  lg: 'px-4 py-2.5 text-lg ',
};

const baseStyles = 'inline-flex items-center leading-relaxed h-fit justify-center gap-2 rounded-full transition-all duration-300 ease-in-out outline-none focus:ring-4 focus:ring-brand-blue cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-brand-yellow-main text-brand-black font-bold hover:bg-brand-yellow-secondary focus:bg-brand-yellow-secondary',
  ghost: 'bg-transparent text-brand-white font-medium hover:bg-brand-white hover:text-brand-black',
  accent: 'bg-brand-orange text-text-primary font-semibold hover:bg-brand-orange-dark focus:bg-brand-orange-dark',
  outline: 'bg-transparent text-white border-2 border-white font-medium',
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

    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

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
        <a
          href={href}
          className={combinedClassName}
          aria-disabled={isDisabled}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        ref={ref}
        className={combinedClassName}
        disabled={isDisabled}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';

