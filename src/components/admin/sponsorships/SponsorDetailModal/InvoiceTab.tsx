/**
 * Sponsor Detail Modal - Invoice Tab
 */

import { useState, useEffect } from 'react';
import { RefreshCw, Eye, Download, Edit2, Check, X, ArrowRightLeft, Info } from 'lucide-react';
import type { SponsorshipDealWithRelations } from '../types';
import { formatAmount, calculateConvertedAmount, calculateRateFromAmount, isConversionValid, apiCall, type ConversionState } from './types';

interface InvoiceTabProps {
  deal: SponsorshipDealWithRelations;
  total: number;
  onUpdate: () => void;
  isUpdating: boolean;
  setIsUpdating: (b: boolean) => void;
  setError: (e: string | null) => void;
}

export function InvoiceTab({ deal, total, onUpdate, isUpdating, setIsUpdating, setError }: InvoiceTabProps) {
  const { invoice } = deal;
  const [dueDate, setDueDate] = useState('');
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [editDueDate, setEditDueDate] = useState('');
  const [isEditingConversion, setIsEditingConversion] = useState(false);

  const [conversion, setConversion] = useState<ConversionState>({
    payInEur: false,
    conversionRate: '0.95',
    convertedAmount: '',
    conversionJustification: '',
    conversionRateSource: 'manual',
  });

  // Initialize conversion state from invoice
  useEffect(() => {
    if (invoice) {
      const hasConversion = invoice.payable_currency === 'EUR' && invoice.conversion_rate_chf_to_eur != null;
      setConversion({
        payInEur: hasConversion,
        conversionRate: hasConversion && invoice.conversion_rate_chf_to_eur ? invoice.conversion_rate_chf_to_eur.toString() : '0.95',
        convertedAmount: hasConversion && invoice.converted_amount_eur ? (invoice.converted_amount_eur / 100).toFixed(2) : '',
        conversionJustification: invoice.conversion_justification || '',
        conversionRateSource: invoice.conversion_rate_source || 'manual',
      });
    }
  }, [invoice]);

  const handleGeneratePDF = async () => {
    await apiCall(`/api/admin/sponsorships/deals/${deal.id}/invoice/pdf/generate`, { method: 'POST' }, setError, setIsUpdating, onUpdate);
  };

  const handleUpdateDueDate = async () => {
    if (!editDueDate) return;
    await apiCall(`/api/admin/sponsorships/deals/${deal.id}/invoice`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dueDate: editDueDate }),
    }, setError, setIsUpdating, onUpdate);
    setIsEditingDueDate(false);
  };

  const handleCreateInvoice = async () => {
    if (!dueDate) return;
    const requestData: Record<string, unknown> = { dueDate };

    if (conversion.payInEur && deal.currency === 'CHF') {
      requestData.payInEur = true;
      requestData.conversionRateChfToEur = parseFloat(conversion.conversionRate);
      if (conversion.convertedAmount) {
        requestData.convertedAmountEur = Math.round(parseFloat(conversion.convertedAmount) * 100);
      }
      requestData.conversionJustification = conversion.conversionJustification;
      requestData.conversionRateSource = conversion.conversionRateSource;
    }

    await apiCall(`/api/admin/sponsorships/deals/${deal.id}/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    }, setError, setIsUpdating, onUpdate);
  };

  const handleUpdateConversion = async () => {
    if (!invoice) return;
    const conversionData = conversion.payInEur
      ? {
          payInEur: true,
          conversionRateChfToEur: parseFloat(conversion.conversionRate),
          convertedAmountEur: Math.round(parseFloat(conversion.convertedAmount) * 100),
          conversionJustification: conversion.conversionJustification,
          conversionRateSource: conversion.conversionRateSource,
        }
      : { payInEur: false };

    try {
      await apiCall(`/api/admin/sponsorships/deals/${deal.id}/invoice`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversion: conversionData }),
      }, setError, setIsUpdating, onUpdate);
      setIsEditingConversion(false);
    } catch { /* handled by apiCall */ }
  };

  const handleRateChange = (rate: string) => {
    const baseAmount = invoice?.base_amount_chf ?? invoice?.total_amount ?? total;
    setConversion(prev => ({
      ...prev,
      conversionRate: rate,
      convertedAmount: calculateConvertedAmount(rate, baseAmount),
    }));
  };

  const handleAmountChange = (amount: string) => {
    const baseAmount = invoice?.base_amount_chf ?? invoice?.total_amount ?? total;
    const newRate = calculateRateFromAmount(amount, baseAmount);
    setConversion(prev => ({
      ...prev,
      convertedAmount: amount,
      conversionRate: newRate || prev.conversionRate,
    }));
  };

  if (!invoice) {
    return <NoInvoiceView deal={deal} dueDate={dueDate} setDueDate={setDueDate} conversion={conversion} setConversion={setConversion} total={total} onCreateInvoice={handleCreateInvoice} isUpdating={isUpdating} handleRateChange={handleRateChange} handleAmountChange={handleAmountChange} />;
  }

  return (
    <div className="space-y-6">
      {/* Invoice Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <p className="text-sm text-gray-500">Invoice Number</p>
            <p className="text-base sm:text-lg font-bold font-mono">{invoice.invoice_number}</p>
          </div>
          <div className="sm:text-right">
            {invoice.payable_currency === 'EUR' && invoice.converted_amount_eur ? (
              <>
                <p className="text-sm text-gray-500">Amount Payable</p>
                <p className="text-base sm:text-lg font-bold text-blue-600">{formatAmount(invoice.converted_amount_eur, 'EUR')}</p>
                <p className="text-xs text-gray-500">Base: {formatAmount(invoice.total_amount, invoice.currency)}</p>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-base sm:text-lg font-bold">{formatAmount(invoice.total_amount, invoice.currency)}</p>
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
          <div><span className="text-gray-500">Issue Date:</span> <span>{invoice.issue_date}</span></div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Due Date:</span>
            {isEditingDueDate ? (
              <div className="flex items-center gap-2">
                <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#F1E271] focus:border-transparent" />
                <button onClick={handleUpdateDueDate} disabled={isUpdating || !editDueDate} className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"><Check className="h-4 w-4" /></button>
                <button onClick={() => setIsEditingDueDate(false)} className="p-1 text-gray-500 hover:bg-gray-100 rounded"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <>
                <span>{invoice.due_date}</span>
                <button onClick={() => { setEditDueDate(invoice.due_date); setIsEditingDueDate(true); }} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded" title="Edit due date"><Edit2 className="h-3.5 w-3.5" /></button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Currency Conversion Section */}
      {deal.currency === 'CHF' && (
        <ConversionSection
          invoice={invoice}
          conversion={conversion}
          setConversion={setConversion}
          isEditing={isEditingConversion}
          setIsEditing={setIsEditingConversion}
          onSave={handleUpdateConversion}
          isUpdating={isUpdating}
          handleRateChange={handleRateChange}
          handleAmountChange={handleAmountChange}
        />
      )}

      {/* PDF Actions */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Invoice PDF</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleGeneratePDF} disabled={isUpdating} className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
            {invoice.invoice_pdf_url ? 'Regenerate PDF' : 'Generate PDF'}
          </button>
          {invoice.invoice_pdf_url && (
            <>
              <a href={invoice.invoice_pdf_url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"><Eye className="h-4 w-4" />View PDF</a>
              <a href={invoice.invoice_pdf_url} download className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"><Download className="h-4 w-4" />Download</a>
            </>
          )}
        </div>
        {invoice.invoice_pdf_url && (
          <p className="text-xs text-gray-500">PDF Source: {invoice.invoice_pdf_source} • Last updated: {invoice.invoice_pdf_uploaded_at ? new Date(invoice.invoice_pdf_uploaded_at).toLocaleDateString() : 'N/A'}</p>
        )}
      </div>
    </div>
  );
}

function NoInvoiceView({ deal, dueDate, setDueDate, conversion, setConversion, total, onCreateInvoice, isUpdating, handleRateChange, handleAmountChange }: {
  deal: SponsorshipDealWithRelations;
  dueDate: string;
  setDueDate: (d: string) => void;
  conversion: ConversionState;
  setConversion: (c: ConversionState | ((prev: ConversionState) => ConversionState)) => void;
  total: number;
  onCreateInvoice: () => void;
  isUpdating: boolean;
  handleRateChange: (rate: string) => void;
  handleAmountChange: (amount: string) => void;
}) {
  if (deal.status === 'draft') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800 font-medium mb-1">Deal is still in draft</p>
        <p className="text-sm text-blue-700">To create an invoice, first move the deal to &quot;Offer Sent&quot; status.</p>
      </div>
    );
  }
  if (deal.status === 'cancelled') {
    return <div className="bg-gray-50 border border-gray-200 rounded-lg p-4"><p className="text-sm text-gray-600">This deal has been cancelled. No invoice can be created.</p></div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4"><p className="text-sm text-amber-800">No invoice has been created yet. Set a due date and create the invoice below.</p></div>
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Create Invoice</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-transparent" />
        </div>

        {deal.currency === 'CHF' && (
          <ConversionToggle conversion={conversion} setConversion={setConversion} total={total} handleRateChange={handleRateChange} handleAmountChange={handleAmountChange} />
        )}

        <button onClick={onCreateInvoice} disabled={!dueDate || isUpdating || (conversion.payInEur && !isConversionValid(conversion))} className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-black bg-[#F1E271] hover:bg-[#e6d766] rounded-lg transition-colors disabled:opacity-50">
          Create Invoice
        </button>
      </div>
    </div>
  );
}

function ConversionToggle({ conversion, setConversion, total, handleRateChange, handleAmountChange }: {
  conversion: ConversionState;
  setConversion: (c: ConversionState | ((prev: ConversionState) => ConversionState)) => void;
  total: number;
  handleRateChange: (rate: string) => void;
  handleAmountChange: (amount: string) => void;
}) {
  return (
    <div className="border border-blue-200 rounded-lg bg-blue-50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><ArrowRightLeft className="h-4 w-4 text-blue-600" /><span className="text-sm font-medium text-blue-900">Allow sponsor to pay in EUR</span></div>
        <button type="button" onClick={() => {
          const newPayInEur = !conversion.payInEur;
          setConversion(prev => ({
            ...prev,
            payInEur: newPayInEur,
            convertedAmount: newPayInEur ? calculateConvertedAmount(prev.conversionRate, total) : '',
          }));
        }} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${conversion.payInEur ? 'bg-blue-600' : 'bg-gray-200'}`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${conversion.payInEur ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {conversion.payInEur && <ConversionFields conversion={conversion} setConversion={setConversion} total={total} handleRateChange={handleRateChange} handleAmountChange={handleAmountChange} />}
    </div>
  );
}

function ConversionFields({ conversion, setConversion, total, handleRateChange, handleAmountChange }: {
  conversion: ConversionState;
  setConversion: (c: ConversionState | ((prev: ConversionState) => ConversionState)) => void;
  total: number;
  handleRateChange: (rate: string) => void;
  handleAmountChange: (amount: string) => void;
}) {
  return (
    <div className="space-y-3 pt-2 border-t border-blue-200">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">CHF → EUR Rate</label>
          <input type="number" step="0.0001" min="0.1" max="10" value={conversion.conversionRate} onChange={(e) => handleRateChange(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <p className="text-xs text-gray-500 mt-1">1 CHF = {conversion.conversionRate} EUR</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Converted Amount (EUR)</label>
          <input type="number" step="0.01" min="0" value={conversion.convertedAmount} onChange={(e) => handleAmountChange(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <p className="text-xs text-gray-500 mt-1">Edit to adjust rate</p>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Rate Source</label>
        <select value={conversion.conversionRateSource} onChange={(e) => setConversion(prev => ({ ...prev, conversionRateSource: e.target.value as ConversionState['conversionRateSource'] }))} className="w-full sm:w-48 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="ecb">ECB (European Central Bank)</option>
          <option value="bank">Bank Rate</option>
          <option value="manual">Manual / Agreed</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Conversion Justification <span className="text-red-500">*</span></label>
        <textarea value={conversion.conversionJustification} onChange={(e) => setConversion(prev => ({ ...prev, conversionJustification: e.target.value }))} placeholder="e.g., ECB rate from 2026-01-20" rows={2} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
      </div>
      <div className="flex items-start gap-2 bg-blue-100 rounded p-2">
        <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800"><p className="font-medium">Preview</p><p>Base: {formatAmount(total, 'CHF')} → Payable: {conversion.convertedAmount ? `EUR ${conversion.convertedAmount}` : '...'}</p></div>
      </div>
    </div>
  );
}

function ConversionSection({ invoice, conversion, setConversion, isEditing, setIsEditing, onSave, isUpdating, handleRateChange, handleAmountChange }: {
  invoice: NonNullable<SponsorshipDealWithRelations['invoice']>;
  conversion: ConversionState;
  setConversion: (c: ConversionState | ((prev: ConversionState) => ConversionState)) => void;
  isEditing: boolean;
  setIsEditing: (b: boolean) => void;
  onSave: () => void;
  isUpdating: boolean;
  handleRateChange: (rate: string) => void;
  handleAmountChange: (amount: string) => void;
}) {
  const baseAmount = invoice.base_amount_chf ?? invoice.total_amount;

  const resetConversion = () => {
    const hasConversion = invoice.payable_currency === 'EUR' && invoice.conversion_rate_chf_to_eur != null;
    setConversion({
      payInEur: hasConversion,
      conversionRate: hasConversion && invoice.conversion_rate_chf_to_eur ? invoice.conversion_rate_chf_to_eur.toString() : '0.95',
      convertedAmount: hasConversion && invoice.converted_amount_eur ? (invoice.converted_amount_eur / 100).toFixed(2) : '',
      conversionJustification: invoice.conversion_justification || '',
      conversionRateSource: invoice.conversion_rate_source || 'manual',
    });
    setIsEditing(false);
  };

  return (
    <div className="border border-blue-200 rounded-lg bg-blue-50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><ArrowRightLeft className="h-4 w-4 text-blue-600" /><span className="text-sm font-medium text-blue-900">EUR Payment Option</span></div>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"><Edit2 className="h-3.5 w-3.5" />Edit</button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={resetConversion} className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded">Cancel</button>
            <button onClick={onSave} disabled={isUpdating || (conversion.payInEur && !isConversionValid(conversion))} className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded flex items-center gap-1 disabled:opacity-50"><Check className="h-3.5 w-3.5" />Save</button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3 pt-2 border-t border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-900">Allow sponsor to pay in EUR</span>
            <button type="button" onClick={() => {
              const newPayInEur = !conversion.payInEur;
              setConversion(prev => ({
                ...prev,
                payInEur: newPayInEur,
                convertedAmount: newPayInEur ? calculateConvertedAmount(prev.conversionRate, baseAmount) : prev.convertedAmount,
              }));
            }} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${conversion.payInEur ? 'bg-blue-600' : 'bg-gray-200'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${conversion.payInEur ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {conversion.payInEur && <ConversionFields conversion={conversion} setConversion={setConversion} total={baseAmount} handleRateChange={handleRateChange} handleAmountChange={handleAmountChange} />}
        </div>
      ) : invoice.payable_currency === 'EUR' && invoice.conversion_rate_chf_to_eur ? (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-600">Base Amount (CHF):</span><span className="font-medium">{formatAmount(invoice.base_amount_chf ?? invoice.total_amount, 'CHF')}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Conversion Rate:</span><span className="font-medium">1 CHF = {invoice.conversion_rate_chf_to_eur} EUR</span></div>
          <div className="flex justify-between text-blue-700"><span>Payable Amount (EUR):</span><span className="font-bold">{formatAmount(invoice.converted_amount_eur!, 'EUR')}</span></div>
          {invoice.conversion_justification && <div className="pt-2 border-t border-blue-200"><span className="text-gray-600">Justification: </span><span className="text-gray-800">{invoice.conversion_justification}</span></div>}
          {invoice.conversion_rate_source && <div className="text-xs text-gray-500">Source: {invoice.conversion_rate_source.toUpperCase()}{invoice.conversion_updated_at && ` • Updated: ${new Date(invoice.conversion_updated_at).toLocaleDateString()}`}</div>}
        </div>
      ) : (
        <p className="text-sm text-blue-700">EUR payment not enabled. Click Edit to allow the sponsor to pay in EUR.</p>
      )}
    </div>
  );
}
