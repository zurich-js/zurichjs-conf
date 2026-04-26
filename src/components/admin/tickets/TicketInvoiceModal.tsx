/**
 * TicketInvoiceModal - Admin modal for generating and viewing ticket invoices
 */

import { useState } from 'react';
import { FileText, X, Loader2, AlertTriangle, Download, CheckCircle, Trash2 } from 'lucide-react';
import { useTicketOrderContext, useGenerateTicketInvoice, useDeleteTicketInvoice } from '@/hooks/useTicketInvoice';

interface TicketInvoiceModalProps {
  ticketId: string;
  onClose: () => void;
}

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-CH', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function TicketInvoiceModal({ ticketId, onClose }: TicketInvoiceModalProps) {
  const { data: orderContext, isLoading, error } = useTicketOrderContext(ticketId);
  const generateMutation = useGenerateTicketInvoice(ticketId);
  const deleteMutation = useDeleteTicketInvoice(ticketId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const existingInvoice = orderContext?.existingInvoice ?? null;

  const generateButtonLabel = existingInvoice?.pdf_url ? 'Regenerate PDF' : 'Generate PDF';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-brand-gray-lightest bg-gradient-to-r from-teal-50 to-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-teal-700" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-black">Ticket Invoice</h3>
                <p className="text-xs sm:text-sm text-brand-gray-dark mt-0.5">Generate an invoice for this ticket purchase</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-text-brand-gray-lightest rounded-lg transition-colors cursor-pointer">
              <X className="w-5 h-5 text-brand-gray-medium" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center gap-3 py-8">
              <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
              <span className="text-sm text-brand-gray-dark">Loading order context...</span>
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-800 font-medium">
                {error instanceof Error ? error.message : 'Failed to load order context'}
              </p>
            </div>
          )}

          {/* Loaded state */}
          {orderContext && !isLoading && (
            <>
              {/* Warning banner */}
              {!orderContext.canGenerateInvoice && orderContext.invoiceWarning && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">{orderContext.invoiceWarning}</p>
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-xl p-4 border border-brand-gray-lightest">
                <h4 className="text-xs font-bold text-brand-gray-medium uppercase tracking-wide mb-3">Order Summary</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-brand-gray-medium">Purchase Type</span>
                    {orderContext.isGroupPurchase ? (
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                        Group · {orderContext.ticketCount} tickets
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full b[a-z]-brand-gray-lightest text-gray-700">
                        Individual
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-brand-gray-medium">Total Paid</span>
                    <span className="text-sm font-bold text-black">
                      {formatAmount(orderContext.totalAmount, orderContext.currency)}
                    </span>
                  </div>
                  {orderContext.discountAmount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-brand-gray-medium">Discount Applied</span>
                      <span className="text-sm font-medium text-green-600">
                        -{formatAmount(orderContext.discountAmount, orderContext.currency)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-brand-gray-medium">Session ID</span>
                    <span className="text-xs font-mono text-gray-700">
                      {orderContext.stripeSessionId.slice(0, 20)}...
                    </span>
                  </div>
                </div>
              </div>

              {/* Billing Details */}
              <div className="bg-gray-50 rounded-xl p-4 border border-brand-gray-lightest">
                <h4 className="text-xs font-bold text-brand-gray-medium uppercase tracking-wide mb-3">Billing Details</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-brand-gray-medium">Purchaser Name</span>
                    <span className="text-sm text-black">{orderContext.purchaserInfo.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-brand-gray-medium">Billing Email</span>
                    <span className="text-sm text-black break-all">{orderContext.purchaserInfo.email}</span>
                  </div>
                  {orderContext.purchaserInfo.company && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-brand-gray-medium">Company</span>
                      <span className="text-sm text-black">{orderContext.purchaserInfo.company}</span>
                    </div>
                  )}
                  {orderContext.purchaserInfo.country && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-brand-gray-medium">Country</span>
                      <span className="text-sm text-black">{orderContext.purchaserInfo.country}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Line Items */}
              <div className="bg-gray-50 rounded-xl p-4 border border-brand-gray-lightest">
                <h4 className="text-xs font-bold text-brand-gray-medium uppercase tracking-wide mb-3">Line Items</h4>
                <div className="space-y-2">
                  {orderContext.lineItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        {item.quantity > 1 && (
                          <span className="text-brand-gray-medium mr-1">{item.quantity}×</span>
                        )}
                        {item.description}
                      </span>
                      <span className="text-sm font-medium text-black flex-shrink-0 ml-4">
                        {formatAmount(item.totalAmount, orderContext.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Existing Invoice */}
              {existingInvoice && (
                <div className="bg-teal-50 rounded-xl p-4 border border-teal-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-teal-700 uppercase tracking-wide">Invoice</h4>
                    {!confirmDelete && (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                  {confirmDelete ? (
                    <div className="space-y-3">
                      <p className="text-sm text-red-700">
                        Delete <strong>{existingInvoice.invoice_number}</strong>? This removes the invoice record and PDF from storage. This cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            deleteMutation.mutate(undefined, { onSuccess: onClose });
                          }}
                          disabled={deleteMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          disabled={deleteMutation.isPending}
                          className="px-3 py-1.5 b[a-z]-brand-gray-lightest text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                      {deleteMutation.error && (
                        <p className="text-xs text-red-700">{deleteMutation.error instanceof Error ? deleteMutation.error.message : 'Delete failed'}</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-teal-600">Invoice Number</span>
                        <span className="text-sm font-bold text-teal-800">{existingInvoice.invoice_number}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-teal-600">Created</span>
                        <span className="text-sm text-teal-700">{formatDate(existingInvoice.generated_at)}</span>
                      </div>
                      {existingInvoice.pdf_url && (
                        <div className="pt-1">
                          <a
                            href={existingInvoice.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Download PDF
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Generate mutation error */}
              {generateMutation.error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-800 font-medium">
                    {generateMutation.error instanceof Error
                      ? generateMutation.error.message
                      : 'Failed to generate invoice'}
                  </p>
                </div>
              )}

              {/* Generate mutation success */}
              {generateMutation.data && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-green-800 font-medium">
                        Invoice generated: <span className="font-bold">{generateMutation.data.invoiceNumber}</span>
                      </p>
                      {generateMutation.data.pdfUrl && (
                        <a
                          href={generateMutation.data.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-green-700 underline hover:text-green-900 mt-1 inline-block"
                        >
                          Download PDF
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-brand-gray-lightest bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            {orderContext?.canGenerateInvoice && (
              <button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    {generateButtonLabel}
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2.5 b[a-z]-brand-gray-lightest text-black rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
