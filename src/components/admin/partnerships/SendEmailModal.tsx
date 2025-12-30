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
          <div className="relative bg-white rounded-lg p-8 text-center max-w-sm w-full">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-black">Email Sent!</h3>
            <p className="text-black mt-2">
              Partnership package sent to {partnership.contact_email}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="relative inline-block w-full max-w-lg mx-4 sm:mx-auto bg-white rounded-lg text-left overflow-hidden shadow-xl transform my-4 sm:my-8 text-black">
          {/* Header */}
          <div className="bg-[#F1E271] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <h3 className="text-lg font-bold text-black">Send Partnership Package</h3>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/10 cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Recipient Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-black">Sending to</p>
              <p className="font-medium">{partnership.contact_name}</p>
              <p className="text-sm text-black">{partnership.contact_email}</p>
            </div>

            {/* Options */}
            <div>
              <h4 className="text-sm font-medium text-black mb-3">Include in email</h4>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.include_coupons}
                    onChange={(e) =>
                      setOptions((prev) => ({ ...prev, include_coupons: e.target.checked }))
                    }
                    className="rounded text-[#F1E271] focus:ring-[#F1E271]"
                  />
                  <Ticket className="h-5 w-5 text-black" />
                  <div>
                    <p className="font-medium text-sm">Coupon Codes</p>
                    <p className="text-xs text-black">Include all active discount codes</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.include_vouchers}
                    onChange={(e) =>
                      setOptions((prev) => ({ ...prev, include_vouchers: e.target.checked }))
                    }
                    className="rounded text-[#F1E271] focus:ring-[#F1E271]"
                  />
                  <Gift className="h-5 w-5 text-black" />
                  <div>
                    <p className="font-medium text-sm">Voucher Codes</p>
                    <p className="text-xs text-black">Include all unredeemed vouchers</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.include_logo}
                    onChange={(e) =>
                      setOptions((prev) => ({ ...prev, include_logo: e.target.checked }))
                    }
                    className="rounded text-[#F1E271] focus:ring-[#F1E271]"
                  />
                  <ImageIcon className="h-5 w-5 text-black" />
                  <div>
                    <p className="font-medium text-sm">Logo</p>
                    <p className="text-xs text-black">Include ZurichJS logo in email</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Custom Message */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Custom Message (optional)
              </label>
              <textarea
                value={options.custom_message}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, custom_message: e.target.value }))
                }
                placeholder="Add a personalized message..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-500 focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271]"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={onClose}
                className="px-4 py-2 text-black bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#F1E271] text-black font-medium rounded-lg hover:bg-[#E5D665] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
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
