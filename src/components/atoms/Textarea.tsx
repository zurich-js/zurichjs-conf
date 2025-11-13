import React, { forwardRef, TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  className?: string;
  error?: string;
  fullWidth?: boolean;
}

/**
 * Textarea component with validation states
 * Supports error messages and consistent styling with Input component
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className = '',
      error,
      fullWidth = false,
      rows = 3,
      'aria-invalid': ariaInvalid,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'bg-brand-gray-dark text-brand-white placeholder:text-brand-gray-medium focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed resize-none';

    const variantStyles = 'rounded-lg px-4 py-3';

    const widthStyle = fullWidth ? 'w-full' : '';
    const errorStyle = error ? 'ring-2 ring-error' : '';

    const combinedClassName = `${baseStyles} ${variantStyles} ${widthStyle} ${errorStyle} ${className}`;

    const textareaId = props.id || props.name;
    const errorId = error && textareaId ? `${textareaId}-error` : undefined;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        <textarea
          ref={ref}
          rows={rows}
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

Textarea.displayName = 'Textarea';

