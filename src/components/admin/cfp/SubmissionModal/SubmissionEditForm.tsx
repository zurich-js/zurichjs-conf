/**
 * Submission Edit Form Component
 * Form for editing submission details
 */

import { Loader2 } from 'lucide-react';

interface EditFormData {
  title: string;
  abstract: string;
  submission_type: string;
  talk_level: string;
  workshop_duration_hours: number | null;
  workshop_expected_compensation: string | null;
  workshop_compensation_amount: number | null;
  workshop_special_requirements: string | null;
  workshop_max_participants: number | null;
}

interface SubmissionEditFormProps {
  editForm: EditFormData;
  setEditForm: (form: EditFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  isEditing: boolean;
}

export function SubmissionEditForm({
  editForm,
  setEditForm,
  onSave,
  onCancel,
  isEditing,
}: SubmissionEditFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-black font-semibold mb-1">Title</label>
        <input
          type="text"
          value={editForm.title}
          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs text-black font-semibold mb-1">Abstract</label>
        <textarea
          value={editForm.abstract}
          onChange={(e) => setEditForm({ ...editForm, abstract: e.target.value })}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-black font-semibold mb-1">Talk Type</label>
          <select
            value={editForm.submission_type}
            onChange={(e) => setEditForm({ ...editForm, submission_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
          >
            <option value="lightning">Lightning (10 min)</option>
            <option value="standard">Standard (30 min)</option>
            <option value="workshop">Workshop (90+ min)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-black font-semibold mb-1">Level</label>
          <select
            value={editForm.talk_level}
            onChange={(e) => setEditForm({ ...editForm, talk_level: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* Workshop-specific fields */}
      {editForm.submission_type === 'workshop' && (
        <div className="space-y-4 pt-2 border-t border-gray-200 mt-4">
          <p className="text-xs font-bold text-black uppercase tracking-wide">Workshop Details</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-black font-semibold mb-1">Duration (hours)</label>
              <input
                type="number"
                min="1"
                max="8"
                step="0.5"
                value={editForm.workshop_duration_hours || ''}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    workshop_duration_hours: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                placeholder="e.g., 3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-black font-semibold mb-1">Max Participants</label>
              <input
                type="number"
                min="1"
                max="100"
                value={editForm.workshop_max_participants || ''}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    workshop_max_participants: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                placeholder="e.g., 30"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-black font-semibold mb-1">Compensation Type</label>
              <select
                value={editForm.workshop_expected_compensation || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, workshop_expected_compensation: e.target.value || null })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
              >
                <option value="">Not specified</option>
                <option value="none">No compensation needed</option>
                <option value="flat_fee">Flat fee</option>
                <option value="per_attendee">Per attendee</option>
                <option value="negotiable">Negotiable</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-black font-semibold mb-1">Compensation Amount (CHF)</label>
              <input
                type="number"
                min="0"
                value={editForm.workshop_compensation_amount || ''}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    workshop_compensation_amount: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                placeholder="e.g., 500"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-black font-semibold mb-1">Special Requirements</label>
            <textarea
              value={editForm.workshop_special_requirements || ''}
              onChange={(e) =>
                setEditForm({ ...editForm, workshop_special_requirements: e.target.value || null })
              }
              rows={2}
              placeholder="Equipment, software, room setup, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none resize-none"
            />
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={onSave}
          disabled={isEditing}
          className="px-4 py-2 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2"
        >
          {isEditing && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Changes
        </button>
        <button
          onClick={onCancel}
          disabled={isEditing}
          className="px-4 py-2 border border-gray-300 text-black font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
