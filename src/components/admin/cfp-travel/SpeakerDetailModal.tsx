/**
 * Speaker Detail Modal
 * Full travel management for a single speaker
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Utensils, Calendar, Sparkles } from 'lucide-react';
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
  updateSpeakerTravel as apiUpdateSpeakerTravel,
} from './api';
import { calculateNights } from './types';
import { SpeakerFlightsSection } from './SpeakerFlightsSection';
import { SpeakerAccommodationSection } from './SpeakerAccommodationSection';
import { SpeakerInvoicesSection } from './SpeakerInvoicesSection';

interface SpeakerDetailModalProps {
  speaker: SpeakerWithTravel;
  onClose: () => void;
}

/**
 * A speaker counts as travel-confirmed when they have at least one inbound
 * AND one outbound flight booked. Hotel and other prefs aren't part of the
 * definition.
 */
function isTravelConfirmed(speaker: SpeakerWithTravel): boolean {
  const hasInbound = speaker.flights.some((f) => f.direction === 'inbound');
  const hasOutbound = speaker.flights.some((f) => f.direction === 'outbound');
  return hasInbound && hasOutbound;
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
        try {
          await uploadInvoicePdf(result.invoice.id, file);
        } catch {
          // Invoice was created but PDF upload failed - still return the result
          // so onSuccess fires and the invoice appears in the UI
          invalidateAll();
          toast.warning('Invoice Added', 'Invoice was created but PDF upload failed. You can re-upload the PDF.');
          return result;
        }
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

  const updateTravel = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiUpdateSpeakerTravel(speaker.id, data),
    onSuccess: () => { invalidateAll(); toast.success('Travel Updated', 'Speaker travel details saved'); },
    onError: () => toast.error('Error', 'Failed to update travel details'),
  });

  const isSubmitting = createFlight.isPending || updateFlight.isPending || deleteFlight.isPending
    || saveAccommodation.isPending || createInvoice.isPending || updateInvoice.isPending
    || deleteInvoice.isPending || uploadPdf.isPending || updateTravel.isPending;

  const nights = calculateNights(
    speaker.accommodation?.check_in_date ?? null,
    speaker.accommodation?.check_out_date ?? null
  );
  const travelConfirmed = isTravelConfirmed(speaker);

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
          value={travelConfirmed ? 'Confirmed' : 'Pending'}
          icon={travelConfirmed ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-yellow-500" />}
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
          flights={speaker.flights}
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

        <hr className="border-gray-200" />

        <SpeakerPreferencesSection
          speaker={speaker}
          travelConfirmed={travelConfirmed}
          onUpdate={(data) => updateTravel.mutate(data)}
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

/**
 * Speaker Preferences Section
 * Shows derived travel-confirmed status (read-only) plus the dinner /
 * activities tristates (still admin-editable).
 */
function SpeakerPreferencesSection({
  speaker,
  travelConfirmed,
  onUpdate,
  isSubmitting,
}: {
  speaker: SpeakerWithTravel;
  travelConfirmed: boolean;
  onUpdate: (data: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const travel = speaker.travel;

  return (
    <div>
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
        <Check className="w-4 h-4" />
        Travel Status & Preferences
      </h3>
      <div className="space-y-2">
        <div className={`flex items-center justify-between gap-3 p-3 border rounded-lg ${travelConfirmed ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center gap-3 min-w-0">
            {travelConfirmed ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-yellow-500" />}
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900">Travel Confirmed</div>
              <div className="text-xs text-gray-500">Auto-set when both inbound and outbound flights are booked</div>
            </div>
          </div>
          <span className={`px-2 py-0.5 text-xs rounded font-medium ${travelConfirmed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {travelConfirmed ? 'Confirmed' : 'Pending'}
          </span>
        </div>
        <TristateRow
          label="Attending Speakers Dinner"
          icon={<Utensils className="w-4 h-4 text-purple-500" />}
          value={travel?.attending_speakers_dinner ?? null}
          disabled={isSubmitting}
          onChange={(value) => onUpdate({ attending_speakers_dinner: value })}
        />
        <TristateRow
          label="Attending Speakers Activities"
          icon={<Sparkles className="w-4 h-4 text-blue-500" />}
          value={travel?.attending_speakers_activities ?? null}
          disabled={isSubmitting}
          onChange={(value) => onUpdate({ attending_speakers_activities: value })}
        />
      </div>
    </div>
  );
}

function TristateRow({
  label,
  icon,
  value,
  disabled,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: boolean | null;
  disabled: boolean;
  onChange: (value: boolean | null) => void;
}) {
  const options: { label: string; val: boolean | null; activeClass: string }[] = [
    { label: 'Yes', val: true, activeClass: 'bg-green-100 text-green-700 border-green-300' },
    { label: 'No', val: false, activeClass: 'bg-red-100 text-red-700 border-red-300' },
    { label: 'Unknown', val: null, activeClass: 'bg-gray-100 text-gray-700 border-gray-300' },
  ];
  return (
    <div className="flex items-center justify-between gap-3 p-3 border border-gray-200 bg-white rounded-lg">
      <div className="flex items-center gap-3 min-w-0">
        {icon}
        <div className="text-sm font-medium text-gray-900">{label}</div>
      </div>
      <div className="flex gap-1">
        {options.map((opt) => {
          const isActive = value === opt.val;
          return (
            <button
              key={String(opt.val)}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.val)}
              className={`px-2.5 py-1 text-xs rounded-md border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                isActive ? opt.activeClass : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
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
