import React, { forwardRef, InputHTMLAttributes } from 'react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  className?: string;
  error?: string;
  variant?: 'default' | 'pill';
  /**
   * Surface the input sits on. Defaults to `dark` (the public site's surfaces);
   * pass `light` on light cards so it matches `Select`'s default trigger.
   */
  tone?: 'dark' | 'light';
  fullWidth?: boolean;
}

/**
 * Input component with validation states and variants
 * Supports email validation, error messages, and pill styling
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = '',
      error,
      variant = 'default',
      tone = 'dark',
      fullWidth = false,
      type = 'text',
      'aria-invalid': ariaInvalid,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'placeholder:text-brand-gray-medium focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

    const toneStyles = {
      dark: 'bg-brand-gray-dark text-brand-white',
      light: 'bg-brand-white border border-brand-gray-light text-brand-black',
    };

    const variantStyles = {
      default: 'rounded-lg px-4 py-3',
      pill: 'rounded-full px-6 py-3',
    };

    const widthStyle = fullWidth ? 'w-full' : '';
    const errorStyle = error ? 'ring-2 ring-error' : '';

    const combinedClassName = `${baseStyles} ${toneStyles[tone]} ${variantStyles[variant]} ${widthStyle} ${errorStyle} ${className}`;

    const inputId = props.id || props.name;
    const errorId = error && inputId ? `${inputId}-error` : undefined;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        <input
          ref={ref}
          type={type}
          className={combinedClassName}
          aria-invalid={error ? true : ariaInvalid}
          aria-describedby={error && errorId ? errorId : ariaDescribedBy}
          {...props}
        />
        {error && (
          <p
            id={errorId}
            className={`mt-2 text-sm ${tone === 'light' ? 'text-error-muted' : 'text-error-light'}`}
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';



