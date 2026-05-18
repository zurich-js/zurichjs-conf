/**
 * WorkshopBookingsSection - Shows workshop bookings for a ticket holder
 */

import type { WorkshopBooking } from '@/hooks/useTicketSpendBreakdown';

interface WorkshopBookingsSectionProps {
  bookings: WorkshopBooking[];
  isLoading: boolean;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-GB', { dateStyle: 'medium' });
}

function formatTime(timeString: string | null): string {
  if (!timeString) return '';
  // Time comes as HH:MM:SS, display HH:MM
  return timeString.slice(0, 5);
}

function formatCurrency(cents: number, currency: string): string {
  if (cents === 0) return 'Free';
  return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

function LoadingSkeleton() {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <div className="h-3 w-36 bg-gray-200 rounded animate-pulse mb-3" />
      <div className="space-y-2">
        <div className="h-12 bg-gray-200 rounded animate-pulse" />
        <div className="h-12 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}

export function WorkshopBookingsSection({ bookings, isLoading }: WorkshopBookingsSectionProps) {
  if (isLoading) return <LoadingSkeleton />;
  if (bookings.length === 0) return null;

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
        Workshop Bookings ({bookings.length})
      </h4>
      <div className="space-y-2">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="rounded-lg border border-purple-200 bg-purple-50 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-black truncate">{booking.workshop_title}</p>
                {booking.workshop_date && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDate(booking.workshop_date)}
                    {booking.workshop_start_time && (
                      <> &middot; {formatTime(booking.workshop_start_time)}
                        {booking.workshop_end_time && <>–{formatTime(booking.workshop_end_time)}</>}
                      </>
                    )}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-black">
                  {formatCurrency(booking.amount_paid, booking.currency)}
                </p>
                {booking.discount_amount > 0 && (
                  <p className="text-xs text-green-600">
                    -{formatCurrency(booking.discount_amount, booking.currency)} discount
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  booking.status === 'confirmed'
                    ? 'bg-green-100 text-green-800'
                    : booking.status === 'refunded'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
