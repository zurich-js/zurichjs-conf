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
    const baseStyles = 'bg-[#111318] text-white placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[rgba(241,226,113,0.5)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantStyles = {
      default: 'rounded-lg px-4 py-3',
      pill: 'rounded-full px-6 py-3',
    };

    const widthStyle = fullWidth ? 'w-full' : '';
    const errorStyle = error ? 'ring-2 ring-red-500' : '';
    
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
            className="mt-2 text-sm text-red-400"
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

