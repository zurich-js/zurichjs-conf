/**
 * Invoice Attendees Section - Manage attendees for B2B invoice
 */

import { useState } from 'react';
import type { B2BInvoiceWithAttendees, B2BInvoiceAttendeeWithWorkshops } from '@/lib/types/b2b';
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

  const handleToggleWorkshop = async (
    attendee: B2BInvoiceAttendeeWithWorkshops,
    workshopItemId: string
  ) => {
    const nextIds = attendee.workshop_item_ids.includes(workshopItemId)
      ? attendee.workshop_item_ids.filter((id) => id !== workshopItemId)
      : [...attendee.workshop_item_ids, workshopItemId];

    setActionLoading(`workshop-${attendee.id}-${workshopItemId}`);
    setError(null);

    try {
      const response = await fetch(`/api/admin/b2b-invoices/${invoice.id}/attendees`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendeeId: attendee.id, workshopItemIds: nextIds }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update workshop assignment');
      }

      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update workshop assignment');
    } finally {
      setActionLoading(null);
    }
  };

  const isEditable = invoice.status !== 'paid' && invoice.status !== 'cancelled';
  const canAddAttendees = isEditable && invoice.attendees.length < invoice.ticket_quantity;

  // Seats assigned per workshop line, derived from the attendees' assignments
  const assignedCounts = new Map<string, number>();
  for (const attendee of invoice.attendees) {
    for (const itemId of attendee.workshop_item_ids) {
      assignedCounts.set(itemId, (assignedCounts.get(itemId) ?? 0) + 1);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium text-gray-900">
          Attendees ({invoice.attendees.length}/{invoice.ticket_quantity})
        </h4>
        {canAddAttendees && (
          <button
            onClick={() => setShowAddAttendee(true)}
            className="px-3 py-1.5 text-sm bg-brand-primary text-black font-medium rounded-lg hover:bg-[#e6d766] transition-colors cursor-pointer"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={attendeeForm.lastName}
                onChange={(e) => setAttendeeForm({ ...attendeeForm, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-gray-900"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-900 mb-1">Email *</label>
              <input
                type="email"
                required
                value={attendeeForm.email}
                onChange={(e) => setAttendeeForm({ ...attendeeForm, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Company</label>
              <input
                type="text"
                value={attendeeForm.company}
                onChange={(e) => setAttendeeForm({ ...attendeeForm, company: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Job Title</label>
              <input
                type="text"
                value={attendeeForm.jobTitle}
                onChange={(e) => setAttendeeForm({ ...attendeeForm, jobTitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-gray-900"
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
              className="px-3 py-1.5 text-sm bg-brand-primary text-black font-medium rounded-lg hover:bg-[#e6d766] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {actionLoading === 'addAttendee' ? 'Adding...' : 'Add Attendee'}
            </button>
          </div>
        </form>
      )}

      {/* Workshop seat usage summary */}
      {invoice.workshop_items.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <h5 className="text-sm font-medium text-gray-900 mb-2">Workshop Seats</h5>
          <div className="space-y-1">
            {invoice.workshop_items.map((item) => {
              const assigned = assignedCounts.get(item.id) ?? 0;
              const complete = assigned === item.quantity;
              return (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.workshop_title}</span>
                  <span className={complete ? 'text-green-700 font-medium' : 'text-amber-700 font-medium'}>
                    {assigned}/{item.quantity} seats assigned
                  </span>
                </div>
              );
            })}
          </div>
          {isEditable && (
            <p className="mt-2 text-xs text-gray-600">
              Assign seats to attendees below. All seats must be assigned before the invoice can be marked as paid.
            </p>
          )}
        </div>
      )}

      {/* Attendee List */}
      {invoice.attendees.length === 0 ? (
        <p className="text-gray-700 text-center py-8">
          No attendees added yet. Add attendees before marking as paid.
        </p>
      ) : (
        <div className="space-y-2">
          {invoice.attendees.map((attendee) => (
            <div key={attendee.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
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
                  ) : isEditable ? (
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

              {/* Workshop seat assignment */}
              {invoice.workshop_items.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200 flex flex-wrap gap-x-4 gap-y-1">
                  {invoice.workshop_items.map((item) => {
                    const isAssigned = attendee.workshop_item_ids.includes(item.id);
                    const seatsFull = (assignedCounts.get(item.id) ?? 0) >= item.quantity;
                    const toggleDisabled =
                      !isEditable ||
                      (!isAssigned && seatsFull) ||
                      actionLoading === `workshop-${attendee.id}-${item.id}`;
                    return (
                      <label
                        key={item.id}
                        className={`inline-flex items-center gap-1.5 text-xs ${
                          toggleDisabled && !isAssigned ? 'text-gray-400' : 'text-gray-700 cursor-pointer'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          disabled={toggleDisabled}
                          onChange={() => handleToggleWorkshop(attendee, item.id)}
                          className="h-3.5 w-3.5 text-brand-primary border-gray-300 rounded focus:ring-brand-primary cursor-pointer disabled:cursor-not-allowed"
                        />
                        {item.workshop_title}
                      </label>
                    );
                  })}
                </div>
              )}
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
