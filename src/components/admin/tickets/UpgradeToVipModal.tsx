/**
 * Upgrade to VIP Modal Component
 * Admin modal for upgrading a standard ticket to VIP
 */

import React, { useState, useEffect } from 'react';
import { AdminModal, AdminModalFooter } from '../AdminModal';
import { Sparkles, CreditCard, Building2, Gift, AlertCircle } from 'lucide-react';
import { VIP_PERKS } from '@/lib/types/ticket-upgrade';
import type { UpgradeMode, UpgradeToVipResponse } from '@/lib/types/ticket-upgrade';

interface TicketInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string | null;
  ticketCategory: string;
  ticketStage: string;
}

interface UpgradeToVipModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: TicketInfo | null;
  onSuccess: (response: UpgradeToVipResponse) => void;
}

const UPGRADE_MODES: { value: UpgradeMode; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'complimentary',
    label: 'Complimentary',
    icon: <Gift className="w-5 h-5" />,
    description: 'Free upgrade (speaker, sponsor, etc.)',
  },
  {
    value: 'stripe',
    label: 'Stripe Payment',
    icon: <CreditCard className="w-5 h-5" />,
    description: 'Create payment link for card payment',
  },
  {
    value: 'bank_transfer',
    label: 'Bank Transfer',
    icon: <Building2 className="w-5 h-5" />,
    description: 'Manual bank transfer payment',
  },
];

const CURRENCIES = ['CHF', 'EUR', 'GBP'] as const;

export function UpgradeToVipModal({
  isOpen,
  onClose,
  ticket,
  onSuccess,
}: UpgradeToVipModalProps) {
  const [upgradeMode, setUpgradeMode] = useState<UpgradeMode>('complimentary');
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<typeof CURRENCIES[number]>('CHF');
  const [dueDate, setDueDate] = useState<string>('');
  const [adminNote, setAdminNote] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setUpgradeMode('complimentary');
      setAmount('');
      setCurrency('CHF');
      setDueDate('');
      setAdminNote('');
      setError(null);
    } else {
      // Set default due date to 14 days from now for bank transfers
      const defaultDueDate = new Date();
      defaultDueDate.setDate(defaultDueDate.getDate() + 14);
      setDueDate(defaultDueDate.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!ticket) return;

    setError(null);
    setIsLoading(true);

    try {
      // Validate amount for paid modes
      if (upgradeMode !== 'complimentary') {
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
          setError('Please enter a valid amount');
          setIsLoading(false);
          return;
        }
      }

      // Validate due date for bank transfer
      if (upgradeMode === 'bank_transfer' && !dueDate) {
        setError('Please select a due date');
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/admin/tickets/${ticket.id}/upgrade-to-vip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upgradeMode,
          amount: upgradeMode !== 'complimentary' ? Math.round(parseFloat(amount) * 100) : undefined,
          currency: upgradeMode !== 'complimentary' ? currency : undefined,
          adminNote: adminNote || undefined,
          bankTransferDueDate: upgradeMode === 'bank_transfer' ? dueDate : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to upgrade ticket');
      }

      onSuccess(data);
      onClose();
    } catch (err) {
      console.error('Upgrade error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!ticket) return null;

  const isVip = ticket.ticketCategory === 'vip';

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Upgrade to VIP"
      subtitle={`${ticket.firstName} ${ticket.lastName}`}
      size="lg"
      footer={
        <AdminModalFooter
          onCancel={onClose}
          onConfirm={handleSubmit}
          confirmText={upgradeMode === 'complimentary' ? 'Upgrade Now' : 'Create Upgrade'}
          isLoading={isLoading}
          disabled={isVip}
        />
      }
    >
      {isVip ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 font-medium">
            This ticket is already VIP and cannot be upgraded further.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Attendee Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Attendee Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>{' '}
                <span className="text-gray-900">{ticket.firstName} {ticket.lastName}</span>
              </div>
              <div>
                <span className="text-gray-500">Email:</span>{' '}
                <span className="text-gray-900">{ticket.email}</span>
              </div>
              {ticket.company && (
                <div>
                  <span className="text-gray-500">Company:</span>{' '}
                  <span className="text-gray-900">{ticket.company}</span>
                </div>
              )}
              <div>
                <span className="text-gray-500">Current Tier:</span>{' '}
                <span className="text-gray-900 capitalize">{ticket.ticketCategory}</span>
              </div>
            </div>
          </div>

          {/* VIP Perks Preview */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <h4 className="font-medium text-gray-900">VIP Benefits</h4>
            </div>
            <ul className="space-y-1 text-sm text-gray-700">
              {VIP_PERKS.map((perk, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">✨</span>
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Upgrade Mode Selector */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Upgrade Mode</h4>
            <div className="space-y-2">
              {UPGRADE_MODES.map((mode) => (
                <label
                  key={mode.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    upgradeMode === mode.value
                      ? 'border-[#F1E271] bg-yellow-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="upgradeMode"
                    value={mode.value}
                    checked={upgradeMode === mode.value}
                    onChange={(e) => setUpgradeMode(e.target.value as UpgradeMode)}
                    className="sr-only"
                  />
                  <div className={`${upgradeMode === mode.value ? 'text-amber-600' : 'text-gray-400'}`}>
                    {mode.icon}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{mode.label}</div>
                    <div className="text-sm text-gray-500">{mode.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Conditional Inputs based on mode */}
          {upgradeMode !== 'complimentary' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as typeof CURRENCIES[number])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
                  >
                    {CURRENCIES.map((curr) => (
                      <option key={curr} value={curr}>{curr}</option>
                    ))}
                  </select>
                </div>
              </div>

              {upgradeMode === 'bank_transfer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
                  />
                </div>
              )}
            </div>
          )}

          {/* Admin Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Note (optional)
            </label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Internal note about this upgrade..."
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">{adminNote.length}/500 characters</p>
          </div>

          {/* Warning/Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">An email will be sent to the attendee</p>
                <p className="mt-1">
                  {upgradeMode === 'complimentary'
                    ? 'The attendee will receive a confirmation email with their VIP benefits.'
                    : upgradeMode === 'stripe'
                      ? 'The attendee will receive an email with a payment link to complete the upgrade.'
                      : 'The attendee will receive an email with bank transfer instructions.'}
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm font-medium">{error}</p>
            </div>
          )}
        </div>
      )}
    </AdminModal>
  );
}
