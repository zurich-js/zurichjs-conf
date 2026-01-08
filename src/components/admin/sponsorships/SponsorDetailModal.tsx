/**
 * Sponsor Detail Modal Component
 * Displays and manages a sponsorship deal's details
 * Self-contained with internal API calls
 */

import React, { useState } from 'react';
import {
  X,
  Building2,
  User,
  MapPin,
  FileText,
  Download,
  RefreshCw,
  Eye,
  ChevronRight,
  DollarSign,
  CheckSquare,
} from 'lucide-react';
import Image from 'next/image';
import { StatusBadge } from './StatusBadge';
import { LineItemsEditor } from './LineItemsEditor';
import { LogoUpload } from './LogoUpload';
import { PerksEditor } from './PerksEditor';
import type { SponsorshipDealWithRelations, SponsorshipDealStatus, SponsorshipCurrency } from './types';
import { VALID_DEAL_STATUS_TRANSITIONS } from '@/lib/types/sponsorship';

interface SponsorDetailModalProps {
  deal: SponsorshipDealWithRelations;
  onClose: () => void;
  onUpdate: () => void;
}

export function SponsorDetailModal({
  deal,
  onClose,
  onUpdate,
}: SponsorDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'pricing' | 'perks' | 'invoice'>('details');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');

  const { sponsor, tier, line_items, perks, invoice } = deal;

  // Format currency for display with comma delimiters
  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(cents / 100);
  };

  // Get allowed next statuses
  const allowedTransitions = VALID_DEAL_STATUS_TRANSITIONS[deal.status as SponsorshipDealStatus] || [];

  // API helper
  const apiCall = async (url: string, options?: RequestInit) => {
    setError(null);
    setIsUpdating(true);
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Request failed');
      }
      onUpdate();
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus: SponsorshipDealStatus) => {
    const paidBy = newStatus === 'paid' ? 'Admin' : undefined;
    await apiCall(`/api/admin/sponsorships/deals/${deal.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, paidBy }),
    });
  };

  const handleCreateInvoice = async () => {
    if (!dueDate) return;
    await apiCall(`/api/admin/sponsorships/deals/${deal.id}/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dueDate }),
    });
  };

  const handleGeneratePDF = async () => {
    await apiCall(`/api/admin/sponsorships/deals/${deal.id}/invoice/pdf/generate`, {
      method: 'POST',
    });
  };

  const handleToggleLogoPublic = async () => {
    await apiCall(`/api/admin/sponsorships/${sponsor.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isLogoPublic: !sponsor.is_logo_public }),
    });
  };

  // Calculate totals from line items
  const tierBase = line_items.filter(li => li.type === 'tier_base').reduce((sum, li) => sum + li.unit_price * li.quantity, 0);
  const addons = line_items.filter(li => li.type === 'addon').reduce((sum, li) => sum + li.unit_price * li.quantity, 0);
  const adjustments = line_items.filter(li => li.type === 'adjustment').reduce((sum, li) => sum + li.unit_price * li.quantity, 0);
  const creditAvailable = deal.currency === 'CHF' ? tier.addon_credit_chf : tier.addon_credit_eur;
  const creditableAddons = line_items.filter(li => li.type === 'addon' && li.uses_credit).reduce((sum, li) => sum + li.unit_price * li.quantity, 0);
  const creditApplied = Math.min(creditAvailable, creditableAddons);
  const subtotal = tierBase + addons;
  const total = Math.max(0, subtotal - creditApplied + adjustments);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                {sponsor.logo_url ? (
                  <Image
                    src={sponsor.logo_url}
                    alt={sponsor.company_name}
                    fill
                    className="object-contain p-1"
                  />
                ) : (
                  <div className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center">
                    <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-xl font-bold text-gray-900 truncate">{sponsor.company_name}</h2>
                <p className="text-xs sm:text-sm text-gray-500 font-mono">{deal.deal_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <StatusBadge status={deal.status} size="sm" />
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="px-4 sm:px-6 border-b border-gray-200 overflow-x-auto">
          <nav className="flex gap-1 sm:gap-6 min-w-max">
            {[
              { id: 'details', label: 'Details', icon: Building2 },
              { id: 'pricing', label: 'Pricing', icon: DollarSign },
              { id: 'perks', label: 'Perks', icon: CheckSquare },
              { id: 'invoice', label: 'Invoice', icon: FileText },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-0 py-3 sm:py-4 border-b-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[#F1E271] text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Status Actions - Prominent at top */}
              {allowedTransitions.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-3">Next Steps</h3>
                  <div className="flex flex-wrap gap-2">
                    {allowedTransitions.map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        disabled={isUpdating}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
                          status === 'cancelled'
                            ? 'bg-white border border-red-300 text-red-700 hover:bg-red-50'
                            : 'bg-[#F1E271] text-black hover:bg-[#e6d766]'
                        }`}
                      >
                        <ChevronRight className="h-4 w-4" />
                        Move to {status.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sponsor Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Contact
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium">{sponsor.contact_name}</p>
                    <p className="text-sm text-gray-600">{sponsor.contact_email}</p>
                    {sponsor.contact_phone && (
                      <p className="text-sm text-gray-600">{sponsor.contact_phone}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Billing Address
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-1">
                    <p className="text-sm">{sponsor.billing_address_street}</p>
                    <p className="text-sm">
                      {sponsor.billing_address_postal_code} {sponsor.billing_address_city}
                    </p>
                    <p className="text-sm">{sponsor.billing_address_country}</p>
                    {sponsor.vat_id && (
                      <p className="text-sm text-gray-600 mt-2">VAT: {sponsor.vat_id}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Deal Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Sponsorship Details</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-2xl font-bold capitalize">{tier.name}</span>
                      <span className="ml-2 text-gray-500">Tier</span>
                    </div>
                    <span className="text-sm text-gray-500">{deal.currency}</span>
                  </div>

                  {/* Line Items Summary */}
                  <div className="space-y-2 border-t border-gray-200 pt-4">
                    <div className="flex justify-between text-sm">
                      <span>Base Price</span>
                      <span>{formatAmount(tierBase, deal.currency)}</span>
                    </div>
                    {addons > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Add-ons</span>
                        <span>{formatAmount(addons, deal.currency)}</span>
                      </div>
                    )}
                    {creditApplied > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Credit Applied</span>
                        <span>-{formatAmount(creditApplied, deal.currency)}</span>
                      </div>
                    )}
                    {adjustments !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Adjustments</span>
                        <span>{formatAmount(adjustments, deal.currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold pt-2 border-t border-gray-200">
                      <span>Total</span>
                      <span>{formatAmount(total, deal.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logo Upload */}
              <LogoUpload
                sponsorId={sponsor.id}
                currentLogoUrl={sponsor.logo_url}
                onUpdate={onUpdate}
              />

              {/* Logo Visibility */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Public Visibility</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="text-sm font-medium">Show logo on website</p>
                      <p className="text-xs text-gray-500">Display sponsor logo on the public homepage</p>
                    </div>
                    <button
                      onClick={handleToggleLogoPublic}
                      disabled={!sponsor.logo_url || isUpdating}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        sponsor.is_logo_public ? 'bg-[#F1E271]' : 'bg-gray-200'
                      } ${!sponsor.logo_url || isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          sponsor.is_logo_public ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </label>
                  {!sponsor.logo_url && (
                    <p className="text-xs text-amber-600 mt-2">Upload a logo first to enable public display</p>
                  )}
                </div>
              </div>

            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                <h3 className="text-sm font-medium text-gray-700">Line Items</h3>
                <div className="text-xs sm:text-sm text-gray-500">
                  Tier Credit: {formatAmount(creditAvailable, deal.currency)}
                </div>
              </div>
              <LineItemsEditor
                dealId={deal.id}
                lineItems={line_items}
                currency={deal.currency as SponsorshipCurrency}
                tierCreditAvailable={creditAvailable}
                onUpdate={onUpdate}
              />
            </div>
          )}

          {activeTab === 'perks' && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Perks Checklist</h3>
              <PerksEditor
                dealId={deal.id}
                perks={perks}
                onUpdate={onUpdate}
              />
            </div>
          )}

          {activeTab === 'invoice' && (
            <div className="space-y-6">
              {!invoice ? (
                <div className="space-y-4">
                  {deal.status === 'draft' ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800 font-medium mb-1">Deal is still in draft</p>
                      <p className="text-sm text-blue-700">
                        To create an invoice, first move the deal to &quot;Offer Sent&quot; status using the
                        Status Actions in the Details tab. This confirms the sponsorship terms are finalized.
                      </p>
                    </div>
                  ) : deal.status === 'cancelled' ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600">
                        This deal has been cancelled. No invoice can be created.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-sm text-amber-800">
                          No invoice has been created yet. Set a due date and create the invoice below.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-gray-700">Create Invoice</h3>
                        <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Due Date
                            </label>
                            <input
                              type="date"
                              value={dueDate}
                              onChange={(e) => setDueDate(e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
                            />
                          </div>
                          <button
                            onClick={handleCreateInvoice}
                            disabled={!dueDate || isUpdating}
                            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-black bg-[#F1E271] hover:bg-[#e6d766] rounded-lg transition-colors disabled:opacity-50"
                          >
                            Create Invoice
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Invoice Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Invoice Number</p>
                        <p className="text-base sm:text-lg font-bold font-mono">{invoice.invoice_number}</p>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-sm text-gray-500">Total Amount</p>
                        <p className="text-base sm:text-lg font-bold">{formatAmount(invoice.total_amount, invoice.currency)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Issue Date:</span>{' '}
                        <span>{invoice.issue_date}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Due Date:</span>{' '}
                        <span>{invoice.due_date}</span>
                      </div>
                    </div>
                  </div>

                  {/* PDF Actions */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700">Invoice PDF</h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleGeneratePDF}
                        disabled={isUpdating}
                        className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
                        {invoice.invoice_pdf_url ? 'Regenerate PDF' : 'Generate PDF'}
                      </button>

                      {invoice.invoice_pdf_url && (
                        <>
                          <a
                            href={invoice.invoice_pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View PDF
                          </a>
                          <a
                            href={invoice.invoice_pdf_url}
                            download
                            className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </a>
                        </>
                      )}
                    </div>

                    {invoice.invoice_pdf_url && (
                      <p className="text-xs text-gray-500">
                        PDF Source: {invoice.invoice_pdf_source} •
                        Last updated: {invoice.invoice_pdf_uploaded_at
                          ? new Date(invoice.invoice_pdf_uploaded_at).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
