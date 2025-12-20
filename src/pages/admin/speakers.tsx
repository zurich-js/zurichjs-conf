/**
 * Speakers Dashboard
 * Manage confirmed speakers for the conference website lineup
 * Separate from CFP - this is for speakers who have been accepted
 */

import React, { useState } from 'react';
import Head from 'next/head';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import AdminHeader from '@/components/admin/AdminHeader';

interface Speaker {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  company: string | null;
  bio: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  twitter_handle: string | null;
  bluesky_handle: string | null;
  mastodon_handle: string | null;
  profile_image_url: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

interface Session {
  id: string;
  title: string;
  status: string;
  submission_type: string;
  talk_level: string;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_duration_minutes: number | null;
  room: string | null;
}

interface SpeakerWithSessions extends Speaker {
  submissions: Session[];
}

// Fetch speakers with their sessions
async function fetchSpeakers(): Promise<{ speakers: SpeakerWithSessions[] }> {
  const res = await fetch('/api/admin/cfp/speakers');
  if (!res.ok) throw new Error('Failed to fetch speakers');
  const data = await res.json();

  // Fetch sessions for each speaker
  const speakersWithSessions = await Promise.all(
    data.speakers.map(async (speaker: Speaker) => {
      const sessionsRes = await fetch(`/api/admin/cfp/speakers/${speaker.id}`);
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        return { ...speaker, submissions: sessionsData.submissions || [] };
      }
      return { ...speaker, submissions: [] };
    })
  );

  return { speakers: speakersWithSessions };
}

export default function SpeakersDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddSpeaker, setShowAddSpeaker] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<SpeakerWithSessions | null>(null);
  const [showAddSession, setShowAddSession] = useState<string | null>(null); // speaker id
  const queryClient = useQueryClient();
  const toast = useToast();

  // Check auth status - always re-check on mount
  const { isLoading: isAuthLoading } = useQuery({
    queryKey: ['admin', 'auth'],
    queryFn: async () => {
      const res = await fetch('/api/admin/cfp/stats');
      if (res.ok) {
        setIsAuthenticated(true);
        return true;
      }
      setIsAuthenticated(false);
      return false;
    },
    retry: false,
    staleTime: 0, // Always re-check auth on mount
  });

  // Fetch speakers
  const { data: speakersData, isLoading: isLoadingSpeakers } = useQuery({
    queryKey: ['speakers', 'list'],
    queryFn: fetchSpeakers,
    enabled: isAuthenticated === true,
  });

  // Toggle visibility mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, isVisible }: { id: string; isVisible: boolean }) => {
      const res = await fetch(`/api/admin/cfp/speakers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_visible: isVisible }),
      });
      if (!res.ok) throw new Error('Failed to update visibility');
    },
    onSuccess: (_data, { isVisible }) => {
      queryClient.invalidateQueries({ queryKey: ['speakers'] });
      toast.success('Visibility Updated', isVisible ? 'Speaker is now visible on the lineup' : 'Speaker is now hidden from the lineup');
    },
    onError: () => {
      toast.error('Error', 'Failed to update speaker visibility');
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        setLoginError('Invalid password');
      }
    } catch {
      setLoginError('Login failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setIsAuthenticated(false);
  };

  // Filter speakers - only show those with accepted sessions or marked visible
  const speakers = speakersData?.speakers || [];
  const confirmedSpeakers = speakers.filter((s) => {
    const hasAcceptedSession = s.submissions?.some((sub) => sub.status === 'accepted');
    return s.is_visible || hasAcceptedSession;
  });

  const filteredSpeakers = confirmedSpeakers.filter((s) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.first_name?.toLowerCase().includes(query) ||
      s.last_name?.toLowerCase().includes(query) ||
      s.email.toLowerCase().includes(query) ||
      s.company?.toLowerCase().includes(query)
    );
  });

  // Loading state - show while checking auth or if auth state is unknown
  if (isAuthLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  // Login form - only show when explicitly not authenticated
  if (isAuthenticated === false) {
    return (
      <>
        <Head>
          <title>Speakers Dashboard - Admin</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
            <h1 className="text-2xl font-bold text-black mb-6 text-center">Speakers Dashboard</h1>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">Admin Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                  placeholder="Enter admin password"
                />
              </div>
              {loginError && <p className="text-red-600 text-sm">{loginError}</p>}
              <button
                type="submit"
                className="w-full py-3 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-semibold rounded-lg transition-all cursor-pointer"
              >
                Login
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Speakers Dashboard - Admin</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <AdminHeader
          title="Speakers Dashboard"
          subtitle="Manage confirmed speakers for the conference"
          onLogout={handleLogout}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">Total Speakers</p>
              <p className="text-2xl font-bold text-black">{confirmedSpeakers.length}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">Visible on Lineup</p>
              <p className="text-2xl font-bold text-green-600">
                {confirmedSpeakers.filter((s) => s.is_visible).length}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">Total Sessions</p>
              <p className="text-2xl font-bold text-blue-600">
                {confirmedSpeakers.reduce((acc, s) => acc + (s.submissions?.filter((sub) => sub.status === 'accepted').length || 0), 0)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">With Photos</p>
              <p className="text-2xl font-bold text-purple-600">
                {confirmedSpeakers.filter((s) => s.profile_image_url).length}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search speakers..."
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
            />
            <button
              onClick={() => setShowAddSpeaker(true)}
              className="px-4 py-2 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 justify-center"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Speaker
            </button>
          </div>

          {/* Speakers Grid */}
          {isLoadingSpeakers ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSpeakers.map((speaker) => (
                <div key={speaker.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
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
                        onClick={() => toggleVisibilityMutation.mutate({ id: speaker.id, isVisible: !speaker.is_visible })}
                        disabled={toggleVisibilityMutation.isPending}
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
                        onClick={() => setShowAddSession(speaker.id)}
                        className="text-xs text-green-600 hover:text-green-700 font-medium cursor-pointer flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add
                      </button>
                    </div>
                    {speaker.submissions?.filter((s) => s.status === 'accepted').length > 0 ? (
                      <div className="space-y-2">
                        {speaker.submissions
                          .filter((s) => s.status === 'accepted')
                          .map((session) => (
                            <div key={session.id} className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm font-medium text-black truncate">{session.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  session.submission_type === 'workshop' ? 'bg-purple-100 text-purple-700' :
                                  session.submission_type === 'lightning' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {session.submission_type}
                                </span>
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
                      onClick={() => setSelectedSpeaker(speaker)}
                      className="text-sm text-[#b8a820] hover:text-[#a09020] font-medium cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
              {filteredSpeakers.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  {searchQuery ? 'No speakers match your search' : 'No confirmed speakers yet'}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Add Speaker Modal */}
        {showAddSpeaker && (
          <AddSpeakerModal
            onClose={() => setShowAddSpeaker(false)}
            onCreated={() => {
              queryClient.invalidateQueries({ queryKey: ['speakers'] });
              setShowAddSpeaker(false);
              toast.success('Speaker Added', 'New speaker has been created');
            }}
          />
        )}

        {/* Add Session Modal */}
        {showAddSession && (
          <AddSessionModal
            speakerId={showAddSession}
            onClose={() => setShowAddSession(null)}
            onCreated={() => {
              queryClient.invalidateQueries({ queryKey: ['speakers'] });
              setShowAddSession(null);
              toast.success('Session Added', 'New session has been created');
            }}
          />
        )}

        {/* Edit Speaker Modal */}
        {selectedSpeaker && (
          <EditSpeakerModal
            speaker={selectedSpeaker}
            onClose={() => setSelectedSpeaker(null)}
            onUpdated={() => {
              queryClient.invalidateQueries({ queryKey: ['speakers'] });
              setSelectedSpeaker(null);
              toast.success('Speaker Updated', 'Speaker profile has been updated');
            }}
          />
        )}
      </div>
    </>
  );
}

// Add Speaker Modal Component
function AddSpeakerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    job_title: '',
    company: '',
    bio: '',
    is_visible: true,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File too large. Maximum size is 5MB');
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/admin/cfp/speakers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create speaker');
      }

      const { speaker } = await res.json();

      if (selectedImage && speaker?.id) {
        const imageFormData = new FormData();
        imageFormData.append('image', selectedImage);
        await fetch(`/api/admin/cfp/speakers/${speaker.id}/image`, {
          method: 'POST',
          body: imageFormData,
        });
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
          <h3 className="text-xl font-bold text-black">Add Speaker</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          {/* Image Upload */}
          <div className="flex items-center gap-4">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            <div>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-[#b8a820] hover:underline cursor-pointer">
                {imagePreview ? 'Change photo' : 'Upload photo'}
              </button>
              <p className="text-xs text-gray-500">JPG, PNG. Max 5MB</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Job Title</label>
              <input
                type="text"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Bio</label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-black">Visible on Lineup</label>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_visible: !formData.is_visible })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                formData.is_visible ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_visible ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-black cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Adding...' : 'Add Speaker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Session Modal Component
function AddSessionModal({ speakerId, onClose, onCreated }: { speakerId: string; onClose: () => void; onCreated: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    abstract: '',
    submission_type: 'standard',
    talk_level: 'intermediate',
    scheduled_date: '',
    scheduled_start_time: '',
    scheduled_duration_minutes: '',
    room: '',
    // Workshop fields
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
          // Workshop fields (only if workshop)
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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
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

// Edit Speaker Modal (simplified version)
function EditSpeakerModal({ speaker, onClose, onUpdated }: { speaker: SpeakerWithSessions; onClose: () => void; onUpdated: () => void }) {
  const [formData, setFormData] = useState({
    first_name: speaker.first_name || '',
    last_name: speaker.last_name || '',
    job_title: speaker.job_title || '',
    company: speaker.company || '',
    bio: speaker.bio || '',
    linkedin_url: speaker.linkedin_url || '',
    github_url: speaker.github_url || '',
    twitter_handle: speaker.twitter_handle || '',
    bluesky_handle: speaker.bluesky_handle || '',
    mastodon_handle: speaker.mastodon_handle || '',
  });
  const [profileImageUrl, setProfileImageUrl] = useState(speaker.profile_image_url);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);

      const res = await fetch(`/api/admin/cfp/speakers/${speaker.id}/image`, {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await res.json();
      if (res.ok) {
        setProfileImageUrl(data.imageUrl);
      } else {
        setError(data.error || 'Failed to upload image');
      }
    } catch {
      setError('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/cfp/speakers/${speaker.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, profile_image_url: profileImageUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update speaker');
      }

      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-black">Edit Speaker</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          {/* Profile Image */}
          <div className="flex items-center gap-4">
            {profileImageUrl ? (
              <img src={profileImageUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-sm text-[#b8a820] hover:underline cursor-pointer disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : 'Change photo'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">First Name</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Last Name</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Job Title</label>
              <input
                type="text"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Bio</label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
            />
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-black mb-3">Social Links</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">LinkedIn URL</label>
                <input
                  type="url"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black text-sm focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">GitHub URL</label>
                <input
                  type="url"
                  value={formData.github_url}
                  onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black text-sm focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Twitter Handle</label>
                <input
                  type="text"
                  value={formData.twitter_handle}
                  onChange={(e) => setFormData({ ...formData, twitter_handle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black text-sm focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bluesky Handle</label>
                <input
                  type="text"
                  value={formData.bluesky_handle}
                  onChange={(e) => setFormData({ ...formData, bluesky_handle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black text-sm focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
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
              className="px-4 py-2 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
