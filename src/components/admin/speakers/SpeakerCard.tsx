/**
 * Speaker Card Component
 * Display a speaker with their sessions in the grid
 */

import { User, Plus } from 'lucide-react';
import type { SpeakerWithSessions, Session } from './types';

interface SpeakerCardProps {
  speaker: SpeakerWithSessions;
  onToggleVisibility: (id: string, isVisible: boolean) => void;
  onAddSession: (speakerId: string) => void;
  onEdit: (speaker: SpeakerWithSessions) => void;
  isTogglingVisibility: boolean;
}

function SessionTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    workshop: 'bg-purple-100 text-purple-700',
    lightning: 'bg-yellow-100 text-yellow-700',
    standard: 'bg-blue-100 text-blue-700',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[type] || styles.standard}`}>
      {type}
    </span>
  );
}

function SessionItem({ session }: { session: Session }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-sm font-medium text-black truncate">{session.title}</p>
      <div className="flex items-center gap-2 mt-1">
        <SessionTypeBadge type={session.submission_type} />
        {session.scheduled_date ? (
          <span className="text-xs text-gray-500">
            {new Date(session.scheduled_date).toLocaleDateString()}
            {session.scheduled_start_time && ` at ${session.scheduled_start_time.slice(0, 5)}`}
          </span>
        ) : (
          <span className="text-xs text-gray-400">Not scheduled</span>
        )}
      </div>
    </div>
  );
}

export function SpeakerCard({
  speaker,
  onToggleVisibility,
  onAddSession,
  onEdit,
  isTogglingVisibility,
}: SpeakerCardProps) {
  const acceptedSessions = speaker.submissions?.filter((s) => s.status === 'accepted') || [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Speaker Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start gap-4">
          {speaker.profile_image_url ? (
            <img
              src={speaker.profile_image_url}
              alt={`${speaker.first_name} ${speaker.last_name}`}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-8 h-8 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-black truncate">
              {speaker.first_name} {speaker.last_name}
            </h3>
            {speaker.job_title && (
              <p className="text-sm text-gray-500 truncate">{speaker.job_title}</p>
            )}
            {speaker.company && (
              <p className="text-sm text-gray-400 truncate">{speaker.company}</p>
            )}
          </div>
          {/* Visibility Toggle */}
          <button
            onClick={() => onToggleVisibility(speaker.id, !speaker.is_visible)}
            disabled={isTogglingVisibility}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
              speaker.is_visible ? 'bg-green-500' : 'bg-gray-300'
            }`}
            title={speaker.is_visible ? 'Visible on lineup' : 'Hidden from lineup'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                speaker.is_visible ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Sessions */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase">Sessions</h4>
          <button
            onClick={() => onAddSession(speaker.id)}
            className="text-xs text-green-600 hover:text-green-700 font-medium cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>
        {acceptedSessions.length > 0 ? (
          <div className="space-y-2">
            {acceptedSessions.map((session) => (
              <SessionItem key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No accepted sessions</p>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <a
          href={`mailto:${speaker.email}`}
          className="text-sm text-gray-600 hover:text-black transition-colors"
        >
          {speaker.email}
        </a>
        <button
          onClick={() => onEdit(speaker)}
          className="text-sm text-[#b8a820] hover:text-[#a09020] font-medium cursor-pointer"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
