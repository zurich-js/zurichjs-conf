/**
 * CFP Speaker Flights Management Page
 * Add and manage flight details
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { SEO } from '@/components/SEO';
import { Button, Input } from '@/components/atoms';
import { createSupabaseServerClient, getSpeakerByUserId } from '@/lib/cfp/auth';
import { getSpeakerFlights } from '@/lib/cfp/travel';
import type { CfpSpeaker, CfpSpeakerFlight, CfpFlightDirection } from '@/lib/types/cfp';

interface FlightsPageProps {
  speaker: CfpSpeaker;
  flights: CfpSpeakerFlight[];
}

export default function FlightsPage({ flights }: FlightsPageProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingFlight, setEditingFlight] = useState<CfpSpeakerFlight | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [direction, setDirection] = useState<CfpFlightDirection>('inbound');
  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [departureAirport, setDepartureAirport] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [bookingReference, setBookingReference] = useState('');

  const inboundFlight = flights.find((f) => f.direction === 'inbound');
  const outboundFlight = flights.find((f) => f.direction === 'outbound');

  const resetForm = () => {
    setDirection('inbound');
    setAirline('');
    setFlightNumber('');
    setDepartureAirport('');
    setArrivalAirport('');
    setDepartureTime('');
    setArrivalTime('');
    setBookingReference('');
    setEditingFlight(null);
    setShowForm(false);
  };

  const openEditForm = (flight: CfpSpeakerFlight) => {
    setEditingFlight(flight);
    setDirection(flight.direction);
    setAirline(flight.airline || '');
    setFlightNumber(flight.flight_number || '');
    setDepartureAirport(flight.departure_airport || '');
    setArrivalAirport(flight.arrival_airport || '');
    setDepartureTime(flight.departure_time ? flight.departure_time.slice(0, 16) : '');
    setArrivalTime(flight.arrival_time ? flight.arrival_time.slice(0, 16) : '');
    setBookingReference(flight.booking_reference || '');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const flightData = {
        direction,
        airline,
        flight_number: flightNumber,
        departure_airport: departureAirport,
        arrival_airport: arrivalAirport,
        departure_time: departureTime ? new Date(departureTime).toISOString() : undefined,
        arrival_time: arrivalTime ? new Date(arrivalTime).toISOString() : undefined,
        booking_reference: bookingReference || undefined,
      };

      const url = editingFlight
        ? `/api/cfp/travel/flights/${editingFlight.id}`
        : '/api/cfp/travel/flights';
      const method = editingFlight ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flightData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      resetForm();
      router.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (flightId: string) => {
    if (!confirm('Are you sure you want to delete this flight?')) return;

    try {
      const response = await fetch(`/api/cfp/travel/flights/${flightId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }

      router.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <>
      <SEO title="Flights | Travel | CFP" description="Manage your flight details" noindex />

      <div className="min-h-screen bg-brand-gray-darkest">
        {/* Header */}
        <header className="border-b border-brand-gray-dark">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/cfp/travel" className="flex items-center gap-3">
              <img src="/images/logo/zurichjs-square.png" alt="ZurichJS" className="h-10 w-10" />
              <span className="text-white font-semibold">Flights</span>
            </Link>
            <Link
              href="/cfp/travel"
              className="text-brand-gray-light hover:text-white text-sm transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Travel
            </Link>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-brand-gray-light">
                <p className="text-blue-300 font-medium mb-1">Flight Information</p>
                <p>
                  Please add your inbound and outbound flight details. You can use ZRH (Zurich Airport) as the arrival/departure airport for the conference.
                </p>
              </div>
            </div>
          </div>

          {/* Existing Flights */}
          <div className="space-y-4 mb-8">
            <FlightSection
              label="Inbound Flight"
              flight={inboundFlight}
              onEdit={openEditForm}
              onDelete={handleDelete}
              onAdd={() => {
                setDirection('inbound');
                setShowForm(true);
              }}
            />
            <FlightSection
              label="Outbound Flight"
              flight={outboundFlight}
              onEdit={openEditForm}
              onDelete={handleDelete}
              onAdd={() => {
                setDirection('outbound');
                setShowForm(true);
              }}
            />
          </div>

          {/* Add/Edit Form */}
          {showForm && (
            <section className="bg-brand-gray-dark rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-6">
                {editingFlight ? 'Edit Flight' : 'Add Flight'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Direction</label>
                  <div className="flex gap-4">
                    {(['inbound', 'outbound'] as CfpFlightDirection[]).map((d) => (
                      <label key={d} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="direction"
                          value={d}
                          checked={direction === d}
                          onChange={(e) => setDirection(e.target.value as CfpFlightDirection)}
                          className="w-4 h-4 text-brand-primary focus:ring-brand-primary"
                        />
                        <span className="text-white capitalize">{d}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="airline" className="block text-sm font-semibold text-white mb-2">
                      Airline <span className="text-red-400">*</span>
                    </label>
                    <Input
                      id="airline"
                      value={airline}
                      onChange={(e) => setAirline(e.target.value)}
                      placeholder="e.g., Swiss, Lufthansa"
                      required
                      fullWidth
                    />
                  </div>
                  <div>
                    <label htmlFor="flightNumber" className="block text-sm font-semibold text-white mb-2">
                      Flight Number <span className="text-red-400">*</span>
                    </label>
                    <Input
                      id="flightNumber"
                      value={flightNumber}
                      onChange={(e) => setFlightNumber(e.target.value)}
                      placeholder="e.g., LX123"
                      required
                      fullWidth
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="departure" className="block text-sm font-semibold text-white mb-2">
                      From (Airport Code) <span className="text-red-400">*</span>
                    </label>
                    <Input
                      id="departure"
                      value={departureAirport}
                      onChange={(e) => setDepartureAirport(e.target.value.toUpperCase())}
                      placeholder="e.g., LHR"
                      maxLength={4}
                      required
                      fullWidth
                    />
                  </div>
                  <div>
                    <label htmlFor="arrival" className="block text-sm font-semibold text-white mb-2">
                      To (Airport Code) <span className="text-red-400">*</span>
                    </label>
                    <Input
                      id="arrival"
                      value={arrivalAirport}
                      onChange={(e) => setArrivalAirport(e.target.value.toUpperCase())}
                      placeholder="e.g., ZRH"
                      maxLength={4}
                      required
                      fullWidth
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="departureTime" className="block text-sm font-semibold text-white mb-2">
                      Departure Time <span className="text-red-400">*</span>
                    </label>
                    <Input
                      id="departureTime"
                      type="datetime-local"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      required
                      fullWidth
                    />
                  </div>
                  <div>
                    <label htmlFor="arrivalTime" className="block text-sm font-semibold text-white mb-2">
                      Arrival Time <span className="text-red-400">*</span>
                    </label>
                    <Input
                      id="arrivalTime"
                      type="datetime-local"
                      value={arrivalTime}
                      onChange={(e) => setArrivalTime(e.target.value)}
                      required
                      fullWidth
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="booking" className="block text-sm font-semibold text-white mb-2">
                    Booking Reference
                  </label>
                  <Input
                    id="booking"
                    value={bookingReference}
                    onChange={(e) => setBookingReference(e.target.value)}
                    placeholder="e.g., ABC123"
                    fullWidth
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    {editingFlight ? 'Update Flight' : 'Add Flight'}
                  </Button>
                </div>
              </form>
            </section>
          )}
        </main>
      </div>
    </>
  );
}

function FlightSection({
  label,
  flight,
  onEdit,
  onDelete,
  onAdd,
}: {
  label: string;
  flight?: CfpSpeakerFlight;
  onEdit: (flight: CfpSpeakerFlight) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  if (!flight) {
    return (
      <div className="bg-brand-gray-dark rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{label}</h3>
          <Button variant="outline" size="sm" onClick={onAdd}>
            Add Flight
          </Button>
        </div>
        <p className="text-brand-gray-light mt-2">No flight added yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-brand-gray-dark rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{label}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(flight)}
            className="text-brand-primary hover:underline text-sm"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(flight.id)}
            className="text-red-400 hover:underline text-sm"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="bg-brand-gray-darkest rounded-xl p-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-2xl font-bold text-white">{flight.departure_airport}</div>
            <div className="text-sm text-brand-gray-light">
              {flight.departure_time
                ? new Date(flight.departure_time).toLocaleString()
                : 'TBD'}
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
              {flight.arrival_time
                ? new Date(flight.arrival_time).toLocaleString()
                : 'TBD'}
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-brand-gray-medium flex items-center justify-between">
          <div className="text-sm text-brand-gray-light">
            {flight.airline} {flight.flight_number}
          </div>
          {flight.booking_reference && (
            <div className="text-sm text-brand-gray-light">
              Ref: {flight.booking_reference}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<FlightsPageProps> = async (ctx) => {
  const supabase = createSupabaseServerClient(ctx);

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return {
      redirect: { destination: '/cfp/login', permanent: false },
    };
  }

  const speaker = await getSpeakerByUserId(session.user.id);

  if (!speaker) {
    return {
      redirect: { destination: '/cfp/login', permanent: false },
    };
  }

  const flights = await getSpeakerFlights(speaker.id);

  return {
    props: {
      speaker,
      flights,
    },
  };
};
