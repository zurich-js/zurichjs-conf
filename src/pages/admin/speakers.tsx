/**
 * Speakers Dashboard
 * Manage confirmed speakers for the conference website lineup
 * Separate from CFP - this is for speakers who have been accepted
 */

import { useState } from 'react';
import Head from 'next/head';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import {
  SpeakerWithSessions,
  AddSpeakerModal,
  AddSessionModal,
  EditSpeakerModal,
  AdminSpeakerCard,
} from '@/components/admin/speakers';

async function fetchSpeakers(): Promise<{ speakers: SpeakerWithSessions[] }> {
  const res = await fetch('/api/admin/cfp/speakers');
  if (!res.ok) throw new Error('Failed to fetch speakers');
  return res.json();
}

export default function SpeakersDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddSpeaker, setShowAddSpeaker] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<SpeakerWithSessions | null>(null);
  const [showAddSession, setShowAddSession] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { isAuthenticated, isLoading: isAuthLoading, logout } = useAdminAuth();

  const { data: speakersData, isLoading: isLoadingSpeakers } = useQuery({
    queryKey: ['speakers', 'list'],
    queryFn: fetchSpeakers,
    enabled: isAuthenticated === true,
  });

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

  if (isAuthLoading) return <AdminLoadingScreen />;
  if (!isAuthenticated) return <AdminLoginForm title="Speakers Dashboard" />;

  return (
    <>
      <Head>
        <title>Speakers Dashboard - Admin</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AdminHeader
          title="Speakers Dashboard"
          subtitle="Manage confirmed speakers for the conference"
          onLogout={logout}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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
                <AdminSpeakerCard
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
