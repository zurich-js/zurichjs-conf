/**
 * Send Partnership Email Modal
 * Configure and send partnership package emails
 */

import React, { useState } from 'react';
import { X, Mail, Check, ImageIcon, Gift, Ticket } from 'lucide-react';
import type { Partnership } from './types';

interface SendEmailModalProps {
  partnership: Partnership;
  isOpen: boolean;
  onClose: () => void;
  onSend: (options: {
    include_coupons: boolean;
    include_vouchers: boolean;
    include_logo: boolean;
    custom_message?: string;
  }) => Promise<void>;
}

export function SendEmailModal({
  partnership,
  isOpen,
  onClose,
  onSend,
}: SendEmailModalProps) {
  const [options, setOptions] = useState({
    include_coupons: true,
    include_vouchers: true,
    include_logo: true,
    custom_message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    setIsSubmitting(true);
    try {
      await onSend(options);
      setIsSent(true);
      setTimeout(() => {
        setIsSent(false);
        onClose();
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSent) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75" />
          <div className="relative bg-white rounded-lg p-6 sm:p-8 text-center max-w-sm w-full mx-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-7 w-7 sm:h-8 sm:w-8 text-green-600" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-black">Email Sent!</h3>
            <p className="text-sm sm:text-base text-black mt-2 break-words">
              Partnership package sent to {partnership.contact_email}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-2 sm:px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="relative inline-block w-full max-w-lg mx-0 sm:mx-4 bg-white rounded-lg text-left overflow-hidden shadow-xl transform my-2 sm:my-8 text-black max-h-[95vh] sm:max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="bg-[#F1E271] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Mail className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <h3 className="text-base sm:text-lg font-bold text-black truncate">Send Partnership Package</h3>
            </div>
            <button onClick={onClose} className="p-1.5 sm:p-1 rounded-lg hover:bg-black/10 cursor-pointer flex-shrink-0 ml-2">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
            {/* Recipient Info */}
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-black">Sending to</p>
              <p className="font-medium text-sm sm:text-base">{partnership.contact_name}</p>
              <p className="text-xs sm:text-sm text-black truncate">{partnership.contact_email}</p>
            </div>

            {/* Options */}
            <div>
              <h4 className="text-sm font-medium text-black mb-2 sm:mb-3">Include in email</h4>
              <div className="space-y-2 sm:space-y-3">
                <label className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.include_coupons}
                    onChange={(e) =>
                      setOptions((prev) => ({ ...prev, include_coupons: e.target.checked }))
                    }
                    className="rounded text-[#F1E271] focus:ring-[#F1E271] flex-shrink-0"
                  />
                  <Ticket className="h-4 w-4 sm:h-5 sm:w-5 text-black flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm">Coupon Codes</p>
                    <p className="text-xs text-black hidden sm:block">Include all active discount codes</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.include_vouchers}
                    onChange={(e) =>
                      setOptions((prev) => ({ ...prev, include_vouchers: e.target.checked }))
                    }
                    className="rounded text-[#F1E271] focus:ring-[#F1E271] flex-shrink-0"
                  />
                  <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-black flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm">Voucher Codes</p>
                    <p className="text-xs text-black hidden sm:block">Include all unredeemed vouchers</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.include_logo}
                    onChange={(e) =>
                      setOptions((prev) => ({ ...prev, include_logo: e.target.checked }))
                    }
                    className="rounded text-[#F1E271] focus:ring-[#F1E271] flex-shrink-0"
                  />
                  <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-black flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm">Logo</p>
                    <p className="text-xs text-black hidden sm:block">Include ZurichJS logo in email</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Custom Message */}
            <div>
              <label className="block text-sm font-medium text-black mb-1.5 sm:mb-2">
                Custom Message (optional)
              </label>
              <textarea
                value={options.custom_message}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, custom_message: e.target.value }))
                }
                placeholder="Add a personalized message..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-500 focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t flex-shrink-0">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-black bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-[#F1E271] text-black font-medium rounded-lg hover:bg-[#E5D665] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Mail className="h-4 w-4" />
                {isSubmitting ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
