/**
 * Add Session Modal
 * Create a new session for a speaker
 */

import { useState } from 'react';
import { X } from 'lucide-react';

interface ExistingSessionOption {
  id: string;
  title: string;
  submission_type: string;
  participant_speaker_ids?: string[];
  speaker: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface AddSessionModalProps {
  speakerId: string;
  speakers: Array<{ id: string; first_name: string; last_name: string }>;
  sessions: ExistingSessionOption[];
  onClose: () => void;
  onCreated: () => void;
}

export function AddSessionModal({ speakerId, speakers, sessions, onClose, onCreated }: AddSessionModalProps) {
  const [mode, setMode] = useState<'existing' | 'create'>('existing');
  const [existingSessionId, setExistingSessionId] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    abstract: '',
    submission_type: 'standard',
    talk_level: 'intermediate',
    workshop_duration_hours: '',
    workshop_max_participants: '',
    participant_speaker_ids: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const attachablePanelSessions = sessions.filter((session) =>
    session.submission_type === 'panel' &&
    session.speaker.id !== speakerId &&
    !(session.participant_speaker_ids || []).includes(speakerId)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (mode === 'existing') {
        const session = attachablePanelSessions.find((entry) => entry.id === existingSessionId);
        if (!session) {
          throw new Error('Choose a panel to attach');
        }

        const res = await fetch(`/api/admin/cfp/submissions/${session.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submission_type: 'panel',
            participant_speaker_ids: Array.from(new Set([...(session.participant_speaker_ids || []), speakerId])),
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to attach speaker to panel');
        }

        onCreated();
        return;
      }

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
          ...(formData.submission_type === 'workshop' && {
            workshop_duration_hours: formData.workshop_duration_hours ? parseFloat(formData.workshop_duration_hours) : undefined,
            workshop_max_participants: formData.workshop_max_participants ? parseInt(formData.workshop_max_participants) : undefined,
          }),
          ...(formData.submission_type === 'panel' && {
            participant_speaker_ids: formData.participant_speaker_ids,
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

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setMode('existing')}
              className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold ${mode === 'existing' ? 'bg-white text-black shadow-sm' : 'text-gray-600'}`}
            >
              Attach panel
            </button>
            <button
              type="button"
              onClick={() => setMode('create')}
              className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold ${mode === 'create' ? 'bg-white text-black shadow-sm' : 'text-gray-600'}`}
            >
              Create new
            </button>
          </div>

          {mode === 'existing' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Existing panel</label>
                <select
                  value={existingSessionId}
                  onChange={(e) => setExistingSessionId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                >
                  <option value="">Select a panel</option>
                  {attachablePanelSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.title} ({session.speaker.first_name} {session.speaker.last_name})
                    </option>
                  ))}
                </select>
                {attachablePanelSessions.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">No existing panels are available for this speaker yet.</p>
                ) : null}
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                This adds the speaker as an additional panelist while keeping the original CFP submission owner.
              </div>
            </>
          ) : (
            <>

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
                <option value="panel">Panel</option>
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

          {formData.submission_type === 'panel' ? (
            <div className="border-t border-gray-200 pt-4 mt-4 space-y-3">
              <p className="text-sm font-medium text-black">Panel speakers</p>
              <div className="grid max-h-44 gap-2 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-3">
                {speakers.filter((speaker) => speaker.id !== speakerId).map((speaker) => {
                  const checked = formData.participant_speaker_ids.includes(speaker.id);
                  return (
                    <label key={speaker.id} className="flex cursor-pointer items-center gap-2 text-sm text-black">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setFormData({
                          ...formData,
                          participant_speaker_ids: checked
                            ? formData.participant_speaker_ids.filter((id) => id !== speaker.id)
                            : [...formData.participant_speaker_ids, speaker.id],
                        })}
                      />
                      {speaker.first_name} {speaker.last_name}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Scheduling now happens from the schedule tab so the public program has one source of truth.
          </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-black cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (mode === 'existing' && !existingSessionId)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : mode === 'existing' ? 'Attach Panel' : 'Add Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
