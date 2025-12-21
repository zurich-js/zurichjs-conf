/**
 * Add Session Modal
 * Create a new session for a speaker
 */

import { useState } from 'react';
import { X } from 'lucide-react';

interface AddSessionModalProps {
  speakerId: string;
  onClose: () => void;
  onCreated: () => void;
}

export function AddSessionModal({ speakerId, onClose, onCreated }: AddSessionModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    abstract: '',
    submission_type: 'standard',
    talk_level: 'intermediate',
    scheduled_date: '',
    scheduled_start_time: '',
    scheduled_duration_minutes: '',
    room: '',
    workshop_duration_hours: '',
    workshop_max_participants: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/admin/cfp/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speaker_id: speakerId,
          title: formData.title,
          abstract: formData.abstract,
          submission_type: formData.submission_type,
          talk_level: formData.talk_level,
          status: 'accepted',
          scheduled_date: formData.scheduled_date || undefined,
          scheduled_start_time: formData.scheduled_start_time || undefined,
          scheduled_duration_minutes: formData.scheduled_duration_minutes ? parseInt(formData.scheduled_duration_minutes) : undefined,
          room: formData.room || undefined,
          ...(formData.submission_type === 'workshop' && {
            workshop_duration_hours: formData.workshop_duration_hours ? parseFloat(formData.workshop_duration_hours) : undefined,
            workshop_max_participants: formData.workshop_max_participants ? parseInt(formData.workshop_max_participants) : undefined,
          }),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create session');
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-black">Add Session</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
            <X className="w-5 h-5 text-black" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-black mb-1">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Abstract *</label>
            <textarea
              required
              rows={3}
              value={formData.abstract}
              onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Type</label>
              <select
                value={formData.submission_type}
                onChange={(e) => setFormData({ ...formData, submission_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
              >
                <option value="lightning">Lightning Talk</option>
                <option value="standard">Standard Talk</option>
                <option value="workshop">Workshop</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Level</label>
              <select
                value={formData.talk_level}
                onChange={(e) => setFormData({ ...formData, talk_level: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          {/* Workshop-specific fields */}
          {formData.submission_type === 'workshop' && (
            <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
              <p className="text-sm font-medium text-black">Workshop Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Duration (hours)</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    step="0.5"
                    value={formData.workshop_duration_hours}
                    onChange={(e) => setFormData({ ...formData, workshop_duration_hours: e.target.value })}
                    placeholder="e.g., 3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Max Participants</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.workshop_max_participants}
                    onChange={(e) => setFormData({ ...formData, workshop_max_participants: e.target.value })}
                    placeholder="e.g., 30"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 pt-4 mt-4">
            <h4 className="text-sm font-semibold text-black mb-3">Scheduling (Optional)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
                <input
                  type="time"
                  value={formData.scheduled_start_time}
                  onChange={(e) => setFormData({ ...formData, scheduled_start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  min="5"
                  value={formData.scheduled_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, scheduled_duration_minutes: e.target.value })}
                  placeholder="e.g. 45"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Room</label>
                <input
                  type="text"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  placeholder="e.g. Main Hall"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-black cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Adding...' : 'Add Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
