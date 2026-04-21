/**
 * Speaker Card Component
 * Display a speaker with their sessions in the grid
 */

import { Plus, User } from 'lucide-react';
import type { SpeakerWithSessions, Session } from './types';

interface AdminSpeakerCardProps {
  speaker: SpeakerWithSessions;
  onToggleVisibility: (id: string, isVisible: boolean) => void;
  onToggleFeatured: (id: string, isFeatured: boolean) => void;
  onAddSession: (speakerId: string) => void;
  onEdit: (speaker: SpeakerWithSessions) => void;
  isTogglingVisibility: boolean;
  isTogglingFeatured: boolean;
  isIncomplete: boolean;
}

function SessionTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    workshop: 'bg-purple-100 text-purple-700',
    lightning: 'bg-yellow-100 text-yellow-700',
    standard: 'bg-blue-100 text-blue-700',
    panel: 'bg-green-100 text-green-700',
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
        <span className="text-xs text-gray-400">Manage placement from schedule</span>
      </div>
    </div>
  );
}

function ToggleButton({
  label,
  checked,
  onClick,
  disabled,
  activeClassName,
  title,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
  disabled: boolean;
  activeClassName: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-medium text-gray-500">{label}</span>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-wait disabled:opacity-60 ${
          checked ? activeClassName : 'bg-gray-300'
        }`}
        title={title}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export function AdminSpeakerCard({
  speaker,
  onToggleVisibility,
  onToggleFeatured,
  onAddSession,
  onEdit,
  isTogglingVisibility,
  isTogglingFeatured,
  isIncomplete,
}: AdminSpeakerCardProps) {
  const acceptedSessions = speaker.submissions?.filter((s) => s.status === 'accepted') || [];
  const isPublishRisk = isIncomplete && (speaker.is_visible || speaker.is_featured);

  return (
    <div className={`overflow-hidden rounded-xl border bg-white shadow-sm ${
      isPublishRisk ? 'border-red-300 ring-1 ring-red-100' : isIncomplete ? 'border-yellow-300' : 'border-gray-200'
    }`}>
      {/* Speaker Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            {speaker.profile_image_url ? (
              <img
                src={speaker.profile_image_url}
                alt={`${speaker.first_name} ${speaker.last_name}`}
                className="w-16 h-16 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 shrink-0 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-black truncate">
                {speaker.first_name} {speaker.last_name}
              </h3>
              {speaker.job_title && (
                <p className="text-sm text-gray-500 truncate">{speaker.job_title}</p>
              )}
              {speaker.company && (
                <p className="text-sm text-gray-400 truncate">{speaker.company}</p>
              )}
              {speaker.speaker_role === 'mc' ? (
                <span className="mt-2 inline-flex rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  MC
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2 sm:items-end">
            <ToggleButton
              label="Public"
              checked={speaker.is_visible}
              onClick={() => onToggleVisibility(speaker.id, !speaker.is_visible)}
              disabled={isTogglingVisibility}
              activeClassName="bg-green-500"
              title={speaker.is_visible ? 'Public on /speakers' : 'Hidden from /speakers'}
            />
            <ToggleButton
              label="Featured"
              checked={speaker.is_featured}
              onClick={() => onToggleFeatured(speaker.id, !speaker.is_featured)}
              disabled={isTogglingFeatured}
              activeClassName="bg-[#F1E271]"
              title={speaker.is_featured ? 'Featured on the frontpage speaker strip' : 'Not featured on the frontpage'}
            />
          </div>
        </div>

        {isIncomplete ? (
          <div className="mt-4">
            <span className={`rounded px-2 py-1 text-xs font-medium ${
              isPublishRisk ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              Incomplete
            </span>
          </div>
        ) : null}
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
