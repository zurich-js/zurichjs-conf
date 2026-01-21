/**
 * Invoice Attendees Section - Manage attendees for B2B invoice
 */

import { useState } from 'react';
import type { B2BInvoiceWithAttendees } from '@/lib/types/b2b';
import type { AttendeeFormData } from './types';

interface AttendeesSectionProps {
  invoice: B2BInvoiceWithAttendees;
  onUpdate: () => void;
  setError: (error: string | null) => void;
}

export function AttendeesSection({ invoice, onUpdate, setError }: AttendeesSectionProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAddAttendee, setShowAddAttendee] = useState(false);
  const [attendeeForm, setAttendeeForm] = useState<AttendeeFormData>({
    firstName: '',
    lastName: '',
    email: '',
    company: invoice.company_name,
    jobTitle: '',
  });

  const handleAddAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('addAttendee');
    setError(null);

    try {
      const response = await fetch(`/api/admin/b2b-invoices/${invoice.id}/attendees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendees: [{
            firstName: attendeeForm.firstName,
            lastName: attendeeForm.lastName,
            email: attendeeForm.email,
            company: attendeeForm.company || undefined,
            jobTitle: attendeeForm.jobTitle || undefined,
          }],
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add attendee');
      }

      setAttendeeForm({ firstName: '', lastName: '', email: '', company: invoice.company_name, jobTitle: '' });
      setShowAddAttendee(false);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add attendee');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAttendee = async (attendeeId: string) => {
    if (!confirm('Are you sure you want to remove this attendee?')) return;

    setActionLoading('deleteAttendee');
    setError(null);

    try {
      const response = await fetch(`/api/admin/b2b-invoices/${invoice.id}/attendees?attendeeId=${attendeeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove attendee');
      }

      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove attendee');
    } finally {
      setActionLoading(null);
    }
  };

  const canAddAttendees = invoice.status !== 'paid' && invoice.status !== 'cancelled' && invoice.attendees.length < invoice.ticket_quantity;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium text-gray-900">
          Attendees ({invoice.attendees.length}/{invoice.ticket_quantity})
        </h4>
        {canAddAttendees && (
          <button
            onClick={() => setShowAddAttendee(true)}
            className="px-3 py-1.5 text-sm bg-[#F1E271] text-black font-medium rounded-lg hover:bg-[#e6d766] transition-colors cursor-pointer"
          >
            + Add Attendee
          </button>
        )}
      </div>

      {/* Add Attendee Form */}
      {showAddAttendee && (
        <form onSubmit={handleAddAttendee} className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h5 className="font-medium text-gray-900 mb-3">Add New Attendee</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={attendeeForm.firstName}
                onChange={(e) => setAttendeeForm({ ...attendeeForm, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={attendeeForm.lastName}
                onChange={(e) => setAttendeeForm({ ...attendeeForm, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-900 mb-1">Email *</label>
              <input
                type="email"
                required
                value={attendeeForm.email}
                onChange={(e) => setAttendeeForm({ ...attendeeForm, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Company</label>
              <input
                type="text"
                value={attendeeForm.company}
                onChange={(e) => setAttendeeForm({ ...attendeeForm, company: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Job Title</label>
              <input
                type="text"
                value={attendeeForm.jobTitle}
                onChange={(e) => setAttendeeForm({ ...attendeeForm, jobTitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => {
                setShowAddAttendee(false);
                setAttendeeForm({ firstName: '', lastName: '', email: '', company: invoice.company_name, jobTitle: '' });
              }}
              className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading === 'addAttendee'}
              className="px-3 py-1.5 text-sm bg-[#F1E271] text-black font-medium rounded-lg hover:bg-[#e6d766] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {actionLoading === 'addAttendee' ? 'Adding...' : 'Add Attendee'}
            </button>
          </div>
        </form>
      )}

      {/* Attendee List */}
      {invoice.attendees.length === 0 ? (
        <p className="text-gray-700 text-center py-8">
          No attendees added yet. Add attendees before marking as paid.
        </p>
      ) : (
        <div className="space-y-2">
          {invoice.attendees.map((attendee) => (
            <div
              key={attendee.id}
              className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <p className="font-medium text-gray-900">
                  {attendee.first_name} {attendee.last_name}
                </p>
                <p className="text-sm text-gray-700">{attendee.email}</p>
                {(attendee.company || attendee.job_title) && (
                  <p className="text-xs text-gray-500">
                    {[attendee.job_title, attendee.company].filter(Boolean).join(' at ')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {attendee.ticket_id ? (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full font-medium">
                    Ticket Created
                  </span>
                ) : invoice.status !== 'paid' && invoice.status !== 'cancelled' ? (
                  <button
                    onClick={() => handleDeleteAttendee(attendee.id)}
                    disabled={actionLoading === 'deleteAttendee'}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                    title="Remove attendee"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warning for incomplete attendees */}
      {invoice.attendees.length < invoice.ticket_quantity && invoice.status !== 'paid' && (
        <p className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
          {invoice.ticket_quantity - invoice.attendees.length} more attendee(s) needed to complete this invoice.
        </p>
      )}
    </div>
  );
}
