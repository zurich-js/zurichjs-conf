/**
 * Export Partner Emails Modal
 * Grabs every partner contact email (respecting the active filters) so an admin
 * can copy them into a blast email or download them as a CSV.
 */

import React, { useMemo, useState } from 'react';
import { X, Mail, Copy, Check, Download } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import type { PartnerEmailContact } from './api';

interface ExportEmailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: PartnerEmailContact[];
  isLoading: boolean;
}

function csvEscape(value: string): string {
  // Wrap in quotes and double up any embedded quotes when the value contains
  // characters that would break CSV parsing.
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function ExportEmailsModal({
  isOpen,
  onClose,
  contacts,
  isLoading,
}: ExportEmailsModalProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  // De-duplicate by email (case-insensitive), keeping the first occurrence.
  const uniqueEmails = useMemo(() => {
    const seen = new Set<string>();
    const emails: string[] = [];
    for (const contact of contacts) {
      const email = contact.contact_email?.trim();
      if (!email) continue;
      const key = email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      emails.push(email);
    }
    return emails;
  }, [contacts]);

  const emailList = uniqueEmails.join(', ');

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!emailList) return;
    await navigator.clipboard.writeText(emailList);
    setCopied(true);
    toast.success('Copied', `${uniqueEmails.length} email${uniqueEmails.length === 1 ? '' : 's'} copied to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCsv = () => {
    const header = ['Name', 'Contact Name', 'Email', 'Company', 'Type', 'Status'];
    const rows = contacts.map((c) =>
      [
        c.name,
        c.contact_name,
        c.contact_email,
        c.company_name ?? '',
        c.type,
        c.status,
      ]
        .map((value) => csvEscape(String(value ?? '')))
        .join(',')
    );
    const csv = [header.join(','), ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'partner-emails.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-2 sm:px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="relative inline-block w-full max-w-lg mx-0 sm:mx-4 bg-white rounded-lg text-left overflow-hidden shadow-xl transform my-2 sm:my-8 text-black max-h-[95vh] sm:max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="bg-brand-primary px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Mail className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <h3 className="text-base sm:text-lg font-bold text-black truncate">Export Partner Emails</h3>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 sm:p-1 rounded-lg hover:bg-black/10 cursor-pointer flex-shrink-0 ml-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {isLoading ? (
              <div className="text-center py-10">
                <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="mt-3 text-sm text-black/60">Loading partner emails…</p>
              </div>
            ) : uniqueEmails.length === 0 ? (
              <div className="text-center py-10">
                <Mail className="mx-auto h-10 w-10 text-black/40" />
                <p className="mt-2 text-sm text-black">No partner emails match the current filters.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-black/70">
                  {uniqueEmails.length} unique email{uniqueEmails.length === 1 ? '' : 's'} from{' '}
                  {contacts.length} partner{contacts.length === 1 ? '' : 's'} (matching the current filters). Paste
                  into the BCC field of your blast email.
                </p>

                <textarea
                  readOnly
                  value={emailList}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black text-sm font-mono focus:ring-2 focus:ring-brand-primary focus:border-brand-primary resize-none"
                  onFocus={(e) => e.currentTarget.select()}
                />

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={handleCopy}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-brand-primary text-black font-medium rounded-lg hover:bg-[#E5D665] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Emails
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadCsv}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-black bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    Download CSV
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
