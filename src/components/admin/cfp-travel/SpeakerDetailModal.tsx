/**
 * Speaker Detail Modal
 * Full travel management for a single speaker
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Utensils, Calendar } from 'lucide-react';
import { AdminModal } from '@/components/admin/AdminModal';
import { useToast } from '@/contexts/ToastContext';
import type { SpeakerWithTravel } from '@/lib/cfp/admin-travel';
import {
  travelQueryKeys,
  fetchSpeakerDetails,
  createFlight as apiCreateFlight,
  updateFlight as apiUpdateFlight,
  deleteFlight as apiDeleteFlight,
  saveAccommodation as apiSaveAccommodation,
  createInvoice as apiCreateInvoice,
  updateInvoice as apiUpdateInvoice,
  deleteInvoice as apiDeleteInvoice,
  uploadInvoicePdf,
} from './api';
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

  const createFlight = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiCreateFlight(speaker.id, data),
    onSuccess: () => { invalidateAll(); toast.success('Flight Added', 'Flight has been added'); },
    onError: () => toast.error('Error', 'Failed to add flight'),
  });

  const updateFlight = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiUpdateFlight(id, data),
    onSuccess: () => { invalidateAll(); toast.success('Flight Updated', 'Flight details updated'); },
    onError: () => toast.error('Error', 'Failed to update flight'),
  });

  const deleteFlight = useMutation({
    mutationFn: (id: string) => apiDeleteFlight(id),
    onSuccess: () => { invalidateAll(); toast.success('Flight Deleted', 'Flight has been removed'); },
    onError: () => toast.error('Error', 'Failed to delete flight'),
  });

  const saveAccommodation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiSaveAccommodation(speaker.id, data),
    onSuccess: () => { invalidateAll(); toast.success('Hotel Saved', 'Accommodation details updated'); },
    onError: () => toast.error('Error', 'Failed to save accommodation'),
  });

  const createInvoice = useMutation({
    mutationFn: async ({ data, file }: { data: Record<string, unknown>; file?: File }) => {
      const result = await apiCreateInvoice(data);
      if (file && result.invoice?.id) {
        await uploadInvoicePdf(result.invoice.id, file);
      }
      return result;
    },
    onSuccess: () => { invalidateAll(); toast.success('Invoice Added', 'Invoice has been tracked'); },
    onError: () => toast.error('Error', 'Failed to add invoice'),
  });

  const updateInvoice = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiUpdateInvoice(id, data),
    onSuccess: () => { invalidateAll(); toast.success('Invoice Updated', 'Invoice status updated'); },
    onError: () => toast.error('Error', 'Failed to update invoice'),
  });

  const deleteInvoice = useMutation({
    mutationFn: (id: string) => apiDeleteInvoice(id),
    onSuccess: () => { invalidateAll(); toast.success('Invoice Deleted', 'Invoice has been removed'); },
    onError: () => toast.error('Error', 'Failed to delete invoice'),
  });

  const uploadPdf = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadInvoicePdf(id, file),
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
        <SpeakerFlightsSection
          flights={speaker.flights}
          speakerId={speaker.id}
          onCreateFlight={(data) => createFlight.mutate(data)}
          onUpdateFlight={(id, data) => updateFlight.mutate({ id, data })}
          onDeleteFlight={(id) => deleteFlight.mutate(id)}
          isSubmitting={isSubmitting}
        />

        <hr className="border-gray-200" />

        <SpeakerAccommodationSection
          accommodation={speaker.accommodation}
          speakerId={speaker.id}
          onSave={(data) => saveAccommodation.mutate(data)}
          isSubmitting={isSubmitting}
        />

        <hr className="border-gray-200" />

        <SpeakerInvoicesSection
          invoices={speaker.reimbursements}
          speakerId={speaker.id}
          onCreateInvoice={(data, file) => createInvoice.mutate({ data, file })}
          onUpdateInvoice={(id, data) => updateInvoice.mutate({ id, data })}
          onDeleteInvoice={(id) => deleteInvoice.mutate(id)}
          onUploadPdf={(id, file) => uploadPdf.mutate({ id, file })}
          isSubmitting={isSubmitting}
        />

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
