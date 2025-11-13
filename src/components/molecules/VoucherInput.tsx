/**
 * VoucherInput Molecule Component
 * Input field for applying discount/voucher codes
 */

import React, { useState } from 'react';
import {Button, Input} from '@/components/atoms';

export interface VoucherInputProps {
  /**
   * Callback when voucher is applied
   */
  onApply: (code: string) => Promise<{ success: boolean; error?: string }>;
  /**
   * Whether the input is disabled
   */
  disabled?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * VoucherInput component
 * Allows users to enter and apply discount codes
 */
export const VoucherInput: React.FC<VoucherInputProps> = ({
  onApply,
  disabled = false,
  className = '',
}) => {
  const [code, setCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim() || isApplying) return;

    setIsApplying(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await onApply(code.trim());

      if (result.success) {
        setSuccess(true);
        setCode('');
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || 'Invalid promo code');
      }
    } catch {
      setError('Failed to apply promo code');
    } finally {
      setIsApplying(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Preserve case sensitivity for Stripe promotion codes
    setCode(e.target.value);
    setError(null);
    setSuccess(false);
  };

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={code}
            onChange={handleInputChange}
            placeholder="Enter promo code"
            disabled={disabled || isApplying}
            className="w-full font-mono flex-1"
            fullWidth
            aria-label="Promo code"
            aria-invalid={!!error}
            aria-describedby={error ? 'voucher-error' : success ? 'voucher-success' : undefined}
          />
          <Button
            type="submit"
            variant="ghost"
            size="md"
            disabled={!code.trim() || disabled || isApplying}
            loading={isApplying}
          >
            Apply
          </Button>
        </div>

        {/* Error message */}
        {error && (
          <p id="voucher-error" className="text-sm text-red-400 flex items-center gap-1">
            <svg
              className="w-4 h-4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}

        {/* Success message */}
        {success && (
          <p id="voucher-success" className="text-sm text-green-400 flex items-center gap-1">
            <svg
              className="w-4 h-4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Promo code applied successfully!
          </p>
        )}
      </form>
    </div>
  );
};

