/**
 * QuantitySelector Atom Component
 * Accessible quantity selector with increment/decrement buttons
 */

import React from 'react';

export interface QuantitySelectorProps {
  /**
   * Current quantity value
   */
  value: number;
  /**
   * Callback when quantity changes
   */
  onChange: (value: number) => void;
  /**
   * Minimum quantity (default: 1)
   */
  min?: number;
  /**
   * Maximum quantity (default: 10)
   */
  max?: number;
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether the selector is disabled
   */
  disabled?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * QuantitySelector component
 * Displays +/- buttons with quantity display
 */
export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  value,
  onChange,
  min = 1,
  max = 10,
  size = 'md',
  disabled = false,
  className = '',
}) => {
  const handleDecrement = () => {
    if (value > min && !disabled) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max && !disabled) {
      onChange(value + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  };

  // Size-based styling
  const sizeClasses = {
    sm: {
      button: 'w-6 h-6 text-sm',
      input: 'w-10 h-6 text-sm',
    },
    md: {
      button: 'w-8 h-8 text-base',
      input: 'w-12 h-8 text-base',
    },
    lg: {
      button: 'w-10 h-10 text-lg',
      input: 'w-14 h-10 text-lg',
    },
  };

  const { button: buttonClass, input: inputClass } = sizeClasses[size];

  const canDecrement = value > min && !disabled;
  const canIncrement = value < max && !disabled;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`} role="group" aria-label="Quantity selector">
      {/* Decrement button */}
      <button
        type="button"
        onClick={handleDecrement}
        disabled={!canDecrement}
        className={`
          ${buttonClass}
          flex items-center justify-center
          rounded-lg
          bg-gray-800 text-white
          hover:bg-gray-700
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all
          focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-black
        `}
        aria-label="Decrease quantity"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M20 12H4" />
        </svg>
      </button>

      {/* Quantity display/input */}
      <input
        type="number"
        value={value}
        onChange={handleInputChange}
        min={min}
        max={max}
        disabled={disabled}
        className={`
          ${inputClass}
          text-center
          bg-gray-800 text-white
          border border-gray-700
          rounded-lg
          focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all
          [appearance:textfield]
          [&::-webkit-outer-spin-button]:appearance-none
          [&::-webkit-inner-spin-button]:appearance-none
        `}
        aria-label="Quantity"
      />

      {/* Increment button */}
      <button
        type="button"
        onClick={handleIncrement}
        disabled={!canIncrement}
        className={`
          ${buttonClass}
          flex items-center justify-center
          rounded-lg
          bg-gray-800 text-white
          hover:bg-gray-700
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all
          focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-black
        `}
        aria-label="Increase quantity"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
};

