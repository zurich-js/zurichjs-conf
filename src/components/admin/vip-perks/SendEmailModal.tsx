/**
 * VIP Perk Send Email Modal
 * Modal for sending/resending VIP perk discount emails
 */

import React, { useState } from 'react';
import { X, Mail, Check } from 'lucide-react';
import type { VipPerkWithTicket } from './types';

interface SendEmailModalProps {
  perk: VipPerkWithTicket;
  isOpen: boolean;
  onClose: () => void;
  onSend: (customMessage?: string) => Promise<void>;
}

export function SendEmailModal({ perk, isOpen, onClose, onSend }: SendEmailModalProps) {
  const [customMessage, setCustomMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    setIsSubmitting(true);
    try {
      await onSend(customMessage || undefined);
      setIsSent(true);
      setTimeout(() => {
        setIsSent(false);
        setCustomMessage('');
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
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-7 w-7 text-green-600" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-black">Email Sent!</h3>
            <p className="text-sm text-black mt-2">
              VIP perk email sent to {perk.ticket.email}
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
          <div className="bg-brand-primary px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Mail className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <h3 className="text-base sm:text-lg font-bold text-black truncate">Send VIP Perk Email</h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/10 cursor-pointer flex-shrink-0 ml-2">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {/* Recipient Info */}
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
              <p className="text-xs text-gray-500">Sending to</p>
              <p className="font-medium text-sm">{perk.ticket.first_name} {perk.ticket.last_name}</p>
              <p className="text-xs text-gray-500 truncate">{perk.ticket.email}</p>
            </div>

            {/* Coupon Code Preview */}
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Discount Code</p>
              <p className="text-lg font-bold font-mono tracking-wider">{perk.code}</p>
              <p className="text-xs text-gray-500 mt-1">{perk.discount_percent}% off workshops</p>
            </div>

            {/* Custom Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Custom Message (optional)
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add a personalized message..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-500 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-sm"
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
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-brand-primary text-black font-medium rounded-lg hover:bg-[#E5D665] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
