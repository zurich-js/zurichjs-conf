/**
 * ProgramSpeakersTab
 * Speaker grid with filtering, profile status, and session management
 */

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Users } from 'lucide-react';
import { ToggleButton, Pill } from '@/components/admin/shared';
import { getSessionScheduleCount, getSessionSpeakers } from './utils';
import { isSpeakerProfileIncomplete } from './components';
import { ProgramSessionModal } from './ProgramSessionModal';
import type { ProgramTabsProps, SessionModalState } from './types';

export function ProgramSpeakersTab({
  sessions,
  speakers,
  scheduleItems,
  onEditSpeaker,
  onCreateSpeaker,
  onToggleSpeakerVisibility,
  onToggleSpeakerFeatured,
  togglingVisibilityId,
  togglingFeaturedId,
  onRefresh,
  onToast,
}: ProgramTabsProps) {
  const [modal, setModal] = useState<SessionModalState>(null);
  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [featuredFilter, setFeaturedFilter] = useState('all');
  const [profileFilter, setProfileFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');
  const visibleSpeakers = speakers.filter((speaker) => {
    const speakerSessions = sessions.filter((session) => (session.speakers ?? []).some((assignment) => assignment.speaker_id === speaker.id));
    if (visibilityFilter === 'public' && !speaker.is_visible) return false;
    if (visibilityFilter === 'hidden' && speaker.is_visible) return false;
    if (featuredFilter === 'featured' && !speaker.is_featured) return false;
    if (featuredFilter === 'not-featured' && speaker.is_featured) return false;
    if (profileFilter === 'complete' && isSpeakerProfileIncomplete(speaker)) return false;
    if (profileFilter === 'incomplete' && !isSpeakerProfileIncomplete(speaker)) return false;
    if (sessionFilter === 'has-session' && speakerSessions.length === 0) return false;
    if (sessionFilter === 'no-session' && speakerSessions.length > 0) return false;
    if (!search) return true;
    const query = search.toLowerCase();
    return `${speaker.first_name} ${speaker.last_name} ${speaker.email} ${speaker.company ?? ''}`.toLowerCase().includes(query);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-lg font-semibold text-gray-950">Speakers</h2>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search speakers" className="col-span-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950" />
          <select value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950">
            <option value="all">All visibility</option>
            <option value="public">Public</option>
            <option value="hidden">Hidden</option>
          </select>
          <select value={featuredFilter} onChange={(event) => setFeaturedFilter(event.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950">
            <option value="all">All featured</option>
            <option value="featured">Featured</option>
            <option value="not-featured">Not featured</option>
          </select>
          <select value={profileFilter} onChange={(event) => setProfileFilter(event.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950">
            <option value="all">All profiles</option>
            <option value="complete">Profile complete</option>
            <option value="incomplete">Profile incomplete</option>
          </select>
          <select value={sessionFilter} onChange={(event) => setSessionFilter(event.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950">
            <option value="all">All assignments</option>
            <option value="has-session">Has session</option>
            <option value="no-session">No session</option>
          </select>
          <button onClick={onCreateSpeaker} className="cursor-pointer col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 rounded-md bg-brand-primary px-3 py-2 text-sm font-semibold text-black hover:bg-[#d9c51f]">
            <Plus className="size-4" />
            Add Speaker
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleSpeakers.map((speaker) => {
          const speakerSessions = sessions.filter((session) => (session.speakers ?? []).some((assignment) => assignment.speaker_id === speaker.id));
          const incompleteProfile = isSpeakerProfileIncomplete(speaker);
          const publishRisk = incompleteProfile && (speaker.is_visible || speaker.is_featured);
          return (
            <div key={speaker.id} className={`rounded-lg border-2 bg-white p-4 shadow-sm ${
              publishRisk ? 'border-brand-red ring-1 ring-red-100' : incompleteProfile ? 'border-brand-primary' : 'border-brand-green'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  {speaker.profile_image_url ? <Image src={speaker.profile_image_url} alt="" width={48} height={48} className="size-12 rounded-full object-cover" /> : <div className="flex size-12 items-center justify-center rounded-full bg-gray-100"><Users className="size-5 text-gray-400" /></div>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-950">{speaker.first_name} {speaker.last_name}</p>
                    <p className="truncate text-sm text-gray-600">{[speaker.job_title, speaker.company].filter(Boolean).join(' @ ') || speaker.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {speaker.speaker_role === 'mc' ? <Pill tone="blue">MC</Pill> : null}
                      {incompleteProfile ? <Pill tone={publishRisk ? 'red' : 'amber'}>incomplete</Pill> : null}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <ToggleButton
                    label="Public"
                    checked={speaker.is_visible}
                    disabled={togglingVisibilityId === speaker.id}
                    activeClassName="bg-green-500"
                    title={speaker.is_visible ? 'Public on /speakers' : 'Hidden from /speakers'}
                    onClick={() => onToggleSpeakerVisibility(speaker.id, !speaker.is_visible)}
                  />
                  <ToggleButton
                    label="Featured"
                    checked={speaker.is_featured}
                    disabled={togglingFeaturedId === speaker.id}
                    activeClassName="bg-brand-primary"
                    title={speaker.is_featured ? 'Featured on the frontpage speaker strip' : 'Not featured on the frontpage'}
                    onClick={() => onToggleSpeakerFeatured(speaker.id, !speaker.is_featured)}
                  />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {speakerSessions.length > 0 ? speakerSessions.map((session) => (
                  <div key={session.id} className="rounded-md bg-gray-50 px-3 py-2 text-sm">
                    <p className="font-medium text-gray-900">{session.title}</p>
                    <p className="text-gray-500">{session.kind} · {getSessionScheduleCount(session, scheduleItems) ? 'scheduled' : 'unscheduled'}</p>
                  </div>
                )) : <p className="text-sm text-gray-500">No program sessions assigned.</p>}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setModal({ mode: 'create', speakerId: speaker.id })} className="cursor-pointer rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-brand-gray-medium hover:bg-gray-50">Add session</button>
                <button onClick={() => onEditSpeaker(speaker)} className="cursor-pointer rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-brand-gray-medium hover:bg-gray-50">Edit profile</button>
              </div>
            </div>
          );
        })}
      </div>

      {modal ? (
        <ProgramSessionModal
          session={null}
          speakers={speakers}
          preselectedSpeakerId={modal.mode === 'create' ? modal.speakerId : null}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            onRefresh();
            onToast('Session saved');
          }}
        />
      ) : null}
    </div>
  );
}
