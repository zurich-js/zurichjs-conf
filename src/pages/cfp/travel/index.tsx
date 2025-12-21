/**
 * CFP Speaker Travel Overview Page
 * Manage travel details, flights, and reimbursements
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { SEO } from '@/components/SEO';
import { Button, Heading, Input } from '@/components/atoms';
import { createSupabaseServerClient, getSpeakerByUserId } from '@/lib/cfp/auth';
import { getCompleteTravelInfo } from '@/lib/cfp/travel';
import type {
  CfpSpeaker,
  CfpSpeakerTravel,
  CfpSpeakerFlight,
  CfpSpeakerAccommodation,
  CfpSpeakerReimbursement,
} from '@/lib/types/cfp';

interface TravelPageProps {
  speaker: CfpSpeaker;
  travel: CfpSpeakerTravel | null;
  flights: CfpSpeakerFlight[];
  accommodation: CfpSpeakerAccommodation | null;
  reimbursements: CfpSpeakerReimbursement[];
  hasAcceptedSubmission: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-300',
  approved: 'bg-green-500/20 text-green-300',
  rejected: 'bg-red-500/20 text-red-300',
  paid: 'bg-blue-500/20 text-blue-300',
};

export default function TravelOverview({
  travel,
  flights,
  accommodation,
  reimbursements,
  hasAcceptedSubmission,
}: TravelPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [arrivalDate, setArrivalDate] = useState(travel?.arrival_date || '');
  const [departureDate, setDepartureDate] = useState(travel?.departure_date || '');
  const [attendingDinner, setAttendingDinner] = useState(travel?.attending_speakers_dinner ?? false);
  const [attendingActivities, setAttendingActivities] = useState(travel?.attending_speakers_activities ?? false);
  const [dietaryRestrictions, setDietaryRestrictions] = useState(travel?.dietary_restrictions || '');
  const [accessibilityNeeds, setAccessibilityNeeds] = useState(travel?.accessibility_needs || '');

  const inboundFlight = flights.find((f) => f.direction === 'inbound');
  const outboundFlight = flights.find((f) => f.direction === 'outbound');
  const pendingReimbursements = reimbursements.filter((r) => r.status === 'pending');

  const handleSaveTravel = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/cfp/travel', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arrival_date: arrivalDate || undefined,
          departure_date: departureDate || undefined,
          attending_speakers_dinner: attendingDinner,
          attending_speakers_activities: attendingActivities,
          dietary_restrictions: dietaryRestrictions || undefined,
          accessibility_needs: accessibilityNeeds || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      router.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasAcceptedSubmission) {
    return (
      <>
        <SEO title="Travel | CFP" description="Speaker travel management" noindex />
        <div className="min-h-screen bg-brand-gray-darkest">
          <header className="border-b border-brand-gray-dark">
            <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
              <Link href="/cfp/dashboard" className="flex items-center gap-3">
                <img src="/images/logo/zurichjs-square.png" alt="ZurichJS" className="h-10 w-10" />
                <span className="text-white font-semibold">Travel</span>
              </Link>
            </div>
          </header>
          <main className="max-w-4xl mx-auto px-4 py-12">
            <div className="bg-brand-gray-dark rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-brand-gray-medium rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand-gray-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <Heading level="h1" className="text-xl font-bold text-white mb-2">
                Travel Management Unavailable
              </Heading>
              <p className="text-brand-gray-light mb-6">
                Travel management is only available after your submission has been accepted.
              </p>
              <Link href="/cfp/dashboard">
                <Button variant="primary">Back to Dashboard</Button>
              </Link>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title="Travel | CFP" description="Manage your travel details" noindex />

      <div className="min-h-screen bg-brand-gray-darkest">
        {/* Header */}
        <header className="border-b border-brand-gray-dark">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/cfp/dashboard" className="flex items-center gap-3">
              <img src="/images/logo/zurichjs-square.png" alt="ZurichJS" className="h-10 w-10" />
              <span className="text-white font-semibold">Travel</span>
            </Link>
            <Link
              href="/cfp/dashboard"
              className="text-brand-gray-light hover:text-white text-sm transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* Quick Stats */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-brand-gray-dark rounded-xl p-4">
              <div className="text-sm text-brand-gray-light mb-1">Travel Status</div>
              <div className={`text-lg font-semibold ${travel?.travel_confirmed ? 'text-green-400' : 'text-yellow-400'}`}>
                {travel?.travel_confirmed ? 'Confirmed' : 'Pending'}
              </div>
            </div>
            <div className="bg-brand-gray-dark rounded-xl p-4">
              <div className="text-sm text-brand-gray-light mb-1">Flights Added</div>
              <div className="text-lg font-semibold text-white">{flights.length}/2</div>
            </div>
            <div className="bg-brand-gray-dark rounded-xl p-4">
              <div className="text-sm text-brand-gray-light mb-1">Pending Claims</div>
              <div className="text-lg font-semibold text-white">{pendingReimbursements.length}</div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Travel Details */}
          <section className="bg-brand-gray-dark rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-6">Attendance Details</h2>

            <div className="space-y-6">
              {/* Dates */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="arrival" className="block text-sm font-semibold text-white mb-2">
                    Arrival Date
                  </label>
                  <Input
                    id="arrival"
                    type="date"
                    value={arrivalDate}
                    onChange={(e) => setArrivalDate(e.target.value)}
                    fullWidth
                  />
                </div>
                <div>
                  <label htmlFor="departure" className="block text-sm font-semibold text-white mb-2">
                    Departure Date
                  </label>
                  <Input
                    id="departure"
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    fullWidth
                  />
                </div>
              </div>

              {/* Events */}
              <div>
                <label className="block text-sm font-semibold text-white mb-3">Events</label>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attendingDinner}
                      onChange={(e) => setAttendingDinner(e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-brand-gray-medium bg-brand-gray-darkest text-brand-primary focus:ring-brand-primary"
                    />
                    <div>
                      <div className="text-white font-medium">Speakers Dinner</div>
                      <div className="text-sm text-brand-gray-light">
                        Join us for dinner with other speakers the evening before the conference
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attendingActivities}
                      onChange={(e) => setAttendingActivities(e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-brand-gray-medium bg-brand-gray-darkest text-brand-primary focus:ring-brand-primary"
                    />
                    <div>
                      <div className="text-white font-medium">Speakers Activities</div>
                      <div className="text-sm text-brand-gray-light">
                        Optional activities and networking events for speakers
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Dietary & Accessibility */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dietary" className="block text-sm font-semibold text-white mb-2">
                    Dietary Restrictions
                  </label>
                  <Input
                    id="dietary"
                    value={dietaryRestrictions}
                    onChange={(e) => setDietaryRestrictions(e.target.value)}
                    placeholder="e.g., Vegetarian, Gluten-free"
                    fullWidth
                  />
                </div>
                <div>
                  <label htmlFor="accessibility" className="block text-sm font-semibold text-white mb-2">
                    Accessibility Needs
                  </label>
                  <Input
                    id="accessibility"
                    value={accessibilityNeeds}
                    onChange={(e) => setAccessibilityNeeds(e.target.value)}
                    placeholder="Any accessibility requirements"
                    fullWidth
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveTravel}
                variant="primary"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                Save Details
              </Button>
            </div>
          </section>

          {/* Flights */}
          <section className="bg-brand-gray-dark rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Flights</h2>
              <Link href="/cfp/travel/flights">
                <Button variant="outline" size="sm">
                  Manage Flights
                </Button>
              </Link>
            </div>

            {flights.length === 0 ? (
              <p className="text-brand-gray-light text-center py-4">
                No flights added yet.{' '}
                <Link href="/cfp/travel/flights" className="text-brand-primary hover:underline">
                  Add your flight details
                </Link>
              </p>
            ) : (
              <div className="space-y-4">
                {inboundFlight && (
                  <FlightCard flight={inboundFlight} label="Inbound" />
                )}
                {outboundFlight && (
                  <FlightCard flight={outboundFlight} label="Outbound" />
                )}
              </div>
            )}
          </section>

          {/* Accommodation */}
          {accommodation && (
            <section className="bg-brand-gray-dark rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-bold text-white mb-4">Accommodation</h2>
              <div className="bg-brand-gray-darkest rounded-xl p-4">
                <h3 className="font-semibold text-white">{accommodation.hotel_name}</h3>
                {accommodation.hotel_address && (
                  <p className="text-sm text-brand-gray-light mt-1">{accommodation.hotel_address}</p>
                )}
                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                  <div>
                    <span className="text-brand-gray-medium">Check-in:</span>{' '}
                    <span className="text-white">{accommodation.check_in_date || 'TBD'}</span>
                  </div>
                  <div>
                    <span className="text-brand-gray-medium">Check-out:</span>{' '}
                    <span className="text-white">{accommodation.check_out_date || 'TBD'}</span>
                  </div>
                </div>
                {accommodation.reservation_number && (
                  <p className="text-sm text-brand-gray-light mt-2">
                    Reservation: {accommodation.reservation_number}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Reimbursements */}
          <section className="bg-brand-gray-dark rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Expense Reimbursements</h2>
              <Link href="/cfp/travel/reimbursements">
                <Button variant="outline" size="sm">
                  Submit Expense
                </Button>
              </Link>
            </div>

            {reimbursements.length === 0 ? (
              <p className="text-brand-gray-light text-center py-4">
                No reimbursement requests yet.
              </p>
            ) : (
              <div className="space-y-3">
                {reimbursements.slice(0, 5).map((r) => (
                  <div
                    key={r.id}
                    className="bg-brand-gray-darkest rounded-xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-white font-medium">{r.description}</div>
                      <div className="text-sm text-brand-gray-light capitalize">{r.expense_type}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-semibold">
                        {r.currency} {(r.amount / 100).toFixed(2)}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[r.status]}`}>
                        {r.status}
                      </span>
                    </div>
                  </div>
                ))}
                {reimbursements.length > 5 && (
                  <Link
                    href="/cfp/travel/reimbursements"
                    className="block text-center text-brand-primary text-sm hover:underline"
                  >
                    View all {reimbursements.length} requests
                  </Link>
                )}
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}

function FlightCard({ flight, label }: { flight: CfpSpeakerFlight; label: string }) {
  return (
    <div className="bg-brand-gray-darkest rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-brand-gray-light">{label}</span>
        <span className="text-xs px-2 py-0.5 rounded bg-brand-gray-medium text-brand-gray-light capitalize">
          {flight.flight_status}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div>
          <div className="text-2xl font-bold text-white">{flight.departure_airport}</div>
          <div className="text-sm text-brand-gray-light">
            {flight.departure_time ? new Date(flight.departure_time).toLocaleString() : 'TBD'}
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 px-4">
          <div className="h-px flex-1 bg-brand-gray-medium" />
          <svg className="w-4 h-4 text-brand-gray-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{flight.arrival_airport}</div>
          <div className="text-sm text-brand-gray-light">
            {flight.arrival_time ? new Date(flight.arrival_time).toLocaleString() : 'TBD'}
          </div>
        </div>
      </div>
      <div className="mt-2 text-sm text-brand-gray-light">
        {flight.airline} {flight.flight_number}
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<TravelPageProps> = async (ctx) => {
  const supabase = createSupabaseServerClient(ctx);

  // Get session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return {
      redirect: { destination: '/cfp/login', permanent: false },
    };
  }

  // Get speaker
  const speaker = await getSpeakerByUserId(session.user.id);

  if (!speaker) {
    return {
      redirect: { destination: '/cfp/login', permanent: false },
    };
  }

  // Check if speaker has an accepted submission
  const { createClient } = await import('@supabase/supabase-js');
  const { env } = await import('@/config/env');
  const adminClient = createClient(env.supabase.url, env.supabase.serviceRoleKey);

  const { data: acceptedSubmissions } = await adminClient
    .from('cfp_submissions')
    .select('id')
    .eq('speaker_id', speaker.id)
    .eq('status', 'accepted')
    .limit(1);

  const hasAcceptedSubmission = (acceptedSubmissions || []).length > 0;

  // Get travel info
  const { travel, flights, accommodation, reimbursements } = await getCompleteTravelInfo(speaker.id);

  return {
    props: {
      speaker,
      travel,
      flights,
      accommodation,
      reimbursements,
      hasAcceptedSubmission,
    },
  };
};
