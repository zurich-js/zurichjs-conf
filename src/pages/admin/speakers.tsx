/**
 * Speakers Dashboard
 * Manage confirmed speakers for the conference website lineup
 * Separate from CFP - this is for speakers who have been accepted
 */

import React, { useState } from 'react';
import Head from 'next/head';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import AdminHeader from '@/components/admin/AdminHeader';
import {
  SpeakerWithSessions,
  AddSpeakerModal,
  AddSessionModal,
  EditSpeakerModal,
  SpeakerCard,
} from '@/components/admin/speakers';

// Fetch speakers with their sessions (now returned in single request)
async function fetchSpeakers(): Promise<{ speakers: SpeakerWithSessions[] }> {
  const res = await fetch('/api/admin/cfp/speakers');
  if (!res.ok) throw new Error('Failed to fetch speakers');
  return res.json();
}

export default function SpeakersDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddSpeaker, setShowAddSpeaker] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<SpeakerWithSessions | null>(null);
  const [showAddSession, setShowAddSession] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  // Check auth status using dedicated verify endpoint
  const { data: isAuthenticatedData, isLoading: isAuthLoading } = useQuery({
    queryKey: ['admin', 'auth'],
    queryFn: async () => {
      const res = await fetch('/api/admin/verify');
      return res.ok;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Sync with local state for login form
  React.useEffect(() => {
    if (isAuthenticatedData !== undefined) {
      setIsAuthenticated(isAuthenticatedData);
    }
  }, [isAuthenticatedData]);

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

  // Filter speakers
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

  // Loading state
  if (isAuthLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  // Login form
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
            <StatCard label="Total Speakers" value={confirmedSpeakers.length} />
            <StatCard
              label="Visible on Lineup"
              value={confirmedSpeakers.filter((s) => s.is_visible).length}
              valueClassName="text-green-600"
            />
            <StatCard
              label="Total Sessions"
              value={confirmedSpeakers.reduce((acc, s) => acc + (s.submissions?.filter((sub) => sub.status === 'accepted').length || 0), 0)}
              valueClassName="text-blue-600"
            />
            <StatCard
              label="With Photos"
              value={confirmedSpeakers.filter((s) => s.profile_image_url).length}
              valueClassName="text-purple-600"
            />
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
              <Plus className="w-4 h-4" />
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
                <SpeakerCard
                  key={speaker.id}
                  speaker={speaker}
                  onToggleVisibility={(id, isVisible) => toggleVisibilityMutation.mutate({ id, isVisible })}
                  onAddSession={(speakerId) => setShowAddSession(speakerId)}
                  onEdit={(s) => setSelectedSpeaker(s)}
                  isTogglingVisibility={toggleVisibilityMutation.isPending}
                />
              ))}
              {filteredSpeakers.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  {searchQuery ? 'No speakers match your search' : 'No confirmed speakers yet'}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Modals */}
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

function StatCard({ label, value, valueClassName = 'text-black' }: { label: string; value: number; valueClassName?: string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueClassName}`}>{value}</p>
    </div>
  );
}
