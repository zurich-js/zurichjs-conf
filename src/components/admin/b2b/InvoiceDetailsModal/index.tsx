/**
 * Invoice Details Modal - View and manage B2B invoice details
 */

import { useState } from 'react';
import type { B2BInvoiceWithAttendees } from '@/lib/types/b2b';
import { statusColors } from '../types';
import { DetailsSection } from './DetailsSection';
import { AttendeesSection } from './AttendeesSection';
import { ActionsSection } from './ActionsSection';
import type { ActiveSection } from './types';

interface InvoiceDetailsModalProps {
  invoice: B2BInvoiceWithAttendees;
  onClose: () => void;
  onUpdate: () => void;
}

export function InvoiceDetailsModal({ invoice, onClose, onUpdate }: InvoiceDetailsModalProps) {
  const [activeSection, setActiveSection] = useState<ActiveSection>('details');
  const [error, setError] = useState<string | null>(null);

  const sections: ActiveSection[] = ['details', 'attendees', 'actions'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{invoice.invoice_number}</h3>
              <p className="text-sm text-gray-700">{invoice.company_name}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${statusColors[invoice.status]}`}
              >
                {invoice.status}
              </span>
              <button onClick={onClose} className="text-gray-600 hover:text-gray-900 cursor-pointer">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex gap-2 sm:gap-4 mt-4 overflow-x-auto pb-1">
            {sections.map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  activeSection === section
                    ? 'bg-[#F1E271] text-black'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {activeSection === 'details' && (
            <DetailsSection
              invoice={invoice}
              onUpdate={onUpdate}
              setError={setError}
            />
          )}

          {activeSection === 'attendees' && (
            <AttendeesSection
              invoice={invoice}
              onUpdate={onUpdate}
              setError={setError}
            />
          )}

          {activeSection === 'actions' && (
            <ActionsSection
              invoice={invoice}
              onUpdate={onUpdate}
              setError={setError}
            />
          )}
        </div>
      </div>
    </div>
  );
}
