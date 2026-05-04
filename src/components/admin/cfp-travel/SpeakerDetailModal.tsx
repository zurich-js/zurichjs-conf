/**
 * Speaker Detail Modal
 * Full travel management for a single speaker
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Utensils, Calendar } from 'lucide-react';
import { AdminModal } from '@/components/admin/AdminModal';
import { useToast } from '@/contexts/ToastContext';
import type { SpeakerWithTravel } from '@/lib/cfp/admin-travel';
import { travelQueryKeys, fetchSpeakerDetails } from './api';
import { calculateNights } from './types';
import { SpeakerFlightsSection } from './SpeakerFlightsSection';
import { SpeakerAccommodationSection } from './SpeakerAccommodationSection';
import { SpeakerInvoicesSection } from './SpeakerInvoicesSection';

interface SpeakerDetailModalProps {
  speaker: SpeakerWithTravel;
  onClose: () => void;
}

export function SpeakerDetailModal({ speaker: initialSpeaker, onClose }: SpeakerDetailModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: speaker = initialSpeaker } = useQuery({
    queryKey: travelQueryKeys.speaker(initialSpeaker.id),
    queryFn: () => fetchSpeakerDetails(initialSpeaker.id),
    initialData: initialSpeaker,
    staleTime: 10 * 1000,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: travelQueryKeys.speaker(speaker.id) });
    queryClient.invalidateQueries({ queryKey: travelQueryKeys.speakers });
    queryClient.invalidateQueries({ queryKey: travelQueryKeys.flights });
    queryClient.invalidateQueries({ queryKey: travelQueryKeys.invoices });
    queryClient.invalidateQueries({ queryKey: travelQueryKeys.stats });
  };

  // Flight mutations
  const createFlight = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/admin/cfp/travel/flights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speaker_id: speaker.id, ...data }),
      });
      if (!res.ok) throw new Error('Failed to create flight');
      return res.json();
    },
    onSuccess: () => { invalidateAll(); toast.success('Flight Added', 'Flight has been added'); },
    onError: () => toast.error('Error', 'Failed to add flight'),
  });

  const updateFlight = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/admin/cfp/travel/flights/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update flight');
      return res.json();
    },
    onSuccess: () => { invalidateAll(); toast.success('Flight Updated', 'Flight details updated'); },
    onError: () => toast.error('Error', 'Failed to update flight'),
  });

  const deleteFlight = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/cfp/travel/flights/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete flight');
      return res.json();
    },
    onSuccess: () => { invalidateAll(); toast.success('Flight Deleted', 'Flight has been removed'); },
    onError: () => toast.error('Error', 'Failed to delete flight'),
  });

  // Accommodation mutation
  const saveAccommodation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/admin/cfp/travel/speakers/${speaker.id}/accommodation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save accommodation');
      return res.json();
    },
    onSuccess: () => { invalidateAll(); toast.success('Hotel Saved', 'Accommodation details updated'); },
    onError: () => toast.error('Error', 'Failed to save accommodation'),
  });

  // Invoice mutations
  const createInvoice = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/admin/cfp/travel/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create invoice');
      return res.json();
    },
    onSuccess: () => { invalidateAll(); toast.success('Invoice Added', 'Invoice has been tracked'); },
    onError: () => toast.error('Error', 'Failed to add invoice'),
  });

  const updateInvoice = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/admin/cfp/travel/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update invoice');
      return res.json();
    },
    onSuccess: () => { invalidateAll(); toast.success('Invoice Updated', 'Invoice status updated'); },
    onError: () => toast.error('Error', 'Failed to update invoice'),
  });

  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/cfp/travel/invoices/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete invoice');
      return res.json();
    },
    onSuccess: () => { invalidateAll(); toast.success('Invoice Deleted', 'Invoice has been removed'); },
    onError: () => toast.error('Error', 'Failed to delete invoice'),
  });

  const uploadPdf = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/admin/cfp/travel/invoices/${id}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to upload PDF');
      return res.json();
    },
    onSuccess: () => { invalidateAll(); toast.success('PDF Uploaded', 'Invoice PDF has been attached'); },
    onError: () => toast.error('Error', 'Failed to upload PDF'),
  });

  const isSubmitting = createFlight.isPending || updateFlight.isPending || deleteFlight.isPending
    || saveAccommodation.isPending || createInvoice.isPending || updateInvoice.isPending
    || deleteInvoice.isPending || uploadPdf.isPending;

  const nights = calculateNights(
    speaker.accommodation?.check_in_date ?? null,
    speaker.accommodation?.check_out_date ?? null
  );

  return (
    <AdminModal
      onClose={onClose}
      title={`${speaker.first_name} ${speaker.last_name}`}
      subtitle={speaker.email}
      size="3xl"
    >
      {/* At-a-glance summary */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 mb-6">
        <SummaryCard
          label="Flights"
          value={speaker.flights.length > 0 ? `${speaker.flights.length}` : 'None'}
          icon={speaker.flights.length > 0 ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-gray-300" />}
        />
        <SummaryCard
          label="Hotel"
          value={speaker.accommodation?.hotel_name ? 'Booked' : 'Not Booked'}
          icon={speaker.accommodation?.hotel_name ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-gray-300" />}
        />
        <SummaryCard
          label="Nights"
          value={nights !== null ? `${nights}` : '-'}
          icon={<Calendar className="w-4 h-4 text-blue-500" />}
        />
        <SummaryCard
          label="Dinner"
          value={speaker.travel?.attending_speakers_dinner ? 'Yes' : speaker.travel?.attending_speakers_dinner === false ? 'No' : '-'}
          icon={<Utensils className="w-4 h-4 text-purple-500" />}
        />
        <SummaryCard
          label="Status"
          value={speaker.travel?.travel_confirmed ? 'Confirmed' : 'Pending'}
          icon={speaker.travel?.travel_confirmed ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-yellow-500" />}
        />
      </div>

      <div className="space-y-6">
        {/* Flights */}
        <SpeakerFlightsSection
          flights={speaker.flights}
          speakerId={speaker.id}
          onCreateFlight={(data) => createFlight.mutate(data)}
          onUpdateFlight={(id, data) => updateFlight.mutate({ id, data })}
          onDeleteFlight={(id) => deleteFlight.mutate(id)}
          isSubmitting={isSubmitting}
        />

        <hr className="border-gray-200" />

        {/* Accommodation */}
        <SpeakerAccommodationSection
          accommodation={speaker.accommodation}
          speakerId={speaker.id}
          onSave={(data) => saveAccommodation.mutate(data)}
          isSubmitting={isSubmitting}
        />

        <hr className="border-gray-200" />

        {/* Invoices */}
        <SpeakerInvoicesSection
          invoices={speaker.reimbursements}
          speakerId={speaker.id}
          onCreateInvoice={(data) => createInvoice.mutate(data)}
          onUpdateInvoice={(id, data) => updateInvoice.mutate({ id, data })}
          onDeleteInvoice={(id) => deleteInvoice.mutate(id)}
          onUploadPdf={(id, file) => uploadPdf.mutate({ id, file })}
          isSubmitting={isSubmitting}
        />

        {/* Travel Preferences (read-only) */}
        {speaker.travel && (
          <>
            <hr className="border-gray-200" />
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">Travel Preferences</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">Arrival:</span>{' '}
                  <span className="text-gray-700">{speaker.travel.arrival_date || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Departure:</span>{' '}
                  <span className="text-gray-700">{speaker.travel.departure_date || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Dietary:</span>{' '}
                  <span className="text-gray-700">{speaker.travel.dietary_restrictions || 'None'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Accessibility:</span>{' '}
                  <span className="text-gray-700">{speaker.travel.accessibility_needs || 'None'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Activities:</span>{' '}
                  <span className="text-gray-700">{speaker.travel.attending_speakers_activities ? 'Yes' : 'No'}</span>
                </div>
                {speaker.travel.flight_budget_amount && (
                  <div>
                    <span className="text-gray-400">Budget:</span>{' '}
                    <span className="text-gray-700">
                      {speaker.travel.flight_budget_currency} {(speaker.travel.flight_budget_amount / 100).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminModal>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-sm font-medium text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
