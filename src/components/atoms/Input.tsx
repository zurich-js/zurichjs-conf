import React, { forwardRef, InputHTMLAttributes } from 'react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  className?: string;
  error?: string;
  variant?: 'default' | 'pill';
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
      fullWidth = false,
      type = 'text',
      'aria-invalid': ariaInvalid,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'bg-surface-card text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantStyles = {
      default: 'rounded-lg px-4 py-3',
      pill: 'rounded-full px-6 py-3',
    };

    const widthStyle = fullWidth ? 'w-full' : '';
    const errorStyle = error ? 'ring-2 ring-error' : '';
    
    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${widthStyle} ${errorStyle} ${className}`;
    
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
            className="mt-2 text-sm text-error-light"
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


