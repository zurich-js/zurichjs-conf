import { useState } from 'react';
import { X } from 'lucide-react';
import type { Session } from './types';

interface EditSessionModalProps {
  session: Session;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditSessionModal({ session, onClose, onUpdated }: EditSessionModalProps) {
  const [formData, setFormData] = useState({
    title: session.title,
    abstract: session.abstract || '',
    submission_type: session.submission_type,
    talk_level: session.talk_level || 'intermediate',
    workshop_duration_hours: session.workshop_duration_hours?.toString() || '',
    workshop_max_participants: session.workshop_max_participants?.toString() || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/cfp/submissions/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          abstract: formData.abstract,
          submission_type: formData.submission_type,
          talk_level: formData.talk_level,
          workshop_duration_hours: formData.submission_type === 'workshop' && formData.workshop_duration_hours
            ? parseFloat(formData.workshop_duration_hours)
            : null,
          workshop_max_participants: formData.submission_type === 'workshop' && formData.workshop_max_participants
            ? parseInt(formData.workshop_max_participants, 10)
            : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update session');
      }

      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <h3 className="text-xl font-bold text-black">Edit Session</h3>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 cursor-pointer">
            <X className="h-5 w-5 text-black" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          ) : null}

          <div>
            <label className="mb-1 block text-sm font-medium text-black">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#F1E271]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-black">Abstract *</label>
            <textarea
              required
              rows={5}
              value={formData.abstract}
              onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#F1E271]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Type</label>
              <select
                value={formData.submission_type}
                onChange={(e) => setFormData({ ...formData, submission_type: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#F1E271]"
              >
                <option value="lightning">Lightning Talk</option>
                <option value="standard">Standard Talk</option>
                <option value="workshop">Workshop</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Level</label>
              <select
                value={formData.talk_level}
                onChange={(e) => setFormData({ ...formData, talk_level: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#F1E271]"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          {formData.submission_type === 'workshop' ? (
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-black">Duration (hours)</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  step="0.5"
                  value={formData.workshop_duration_hours}
                  onChange={(e) => setFormData({ ...formData, workshop_duration_hours: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#F1E271]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">Max participants</label>
                <input
                  type="number"
                  min="1"
                  value={formData.workshop_max_participants}
                  onChange={(e) => setFormData({ ...formData, workshop_max_participants: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#F1E271]"
                />
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="cursor-pointer px-4 py-2 text-gray-600 hover:text-black">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
