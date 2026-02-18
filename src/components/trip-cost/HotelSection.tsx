/**
 * Trip Cost Calculator — Hotel Section
 * Attendance selector, nights stepper, hotel type selector with grouped MEININGER
 */

import React from 'react';
import { Hotel, ExternalLink, Minus, Plus, Info, MapPin, Calendar } from 'lucide-react';
import { Input } from '@/components/atoms/Input';
import { CalculatorSection, formatAmount, toDisplayCurrency } from './CalculatorWidgets';
import {
  HOTEL_OPTIONS,
  ATTENDANCE_OPTIONS,
  MIN_NIGHTS,
  MAX_NIGHTS,
  buildHotelUrl,
  type HotelType,
  type HotelOption,
  type DisplayCurrency,
  type AttendanceDays,
} from '@/config/trip-cost';

interface HotelSectionProps {
  nights: number;
  hotelType: HotelType;
  customHotelCHF: number;
  currency: DisplayCurrency;
  eurRate: number;
  attendanceDays: AttendanceDays;
  onUpdate: (partial: {
    nights?: number;
    hotelType?: HotelType;
    customHotelCHF?: number;
    attendanceDays?: AttendanceDays;
  }) => void;
}

/** Group hotel options: MEININGER options are rendered together */
function groupHotelOptions(options: HotelOption[]): (HotelOption | HotelOption[])[] {
  const result: (HotelOption | HotelOption[])[] = [];
  const meiningerGroup: HotelOption[] = [];

  for (const opt of options) {
    if (opt.group === 'meininger') {
      meiningerGroup.push(opt);
    } else {
      if (meiningerGroup.length > 0) {
        result.push([...meiningerGroup]);
        meiningerGroup.length = 0;
      }
      result.push(opt);
    }
  }
  if (meiningerGroup.length > 0) {
    result.push(meiningerGroup);
  }
  return result;
}

function HotelOptionButton({
  hotel,
  isSelected,
  currency,
  eurRate,
  onSelect,
  rounded,
  inGroup,
}: {
  hotel: HotelOption;
  isSelected: boolean;
  currency: DisplayCurrency;
  eurRate: number;
  onSelect: () => void;
  rounded?: string;
  inGroup?: boolean;
}) {
  const priceDisplay =
    hotel.id !== 'other' && hotel.estimatePerNightCHF > 0
      ? formatAmount(toDisplayCurrency(hotel.estimatePerNightCHF, currency, eurRate), currency)
      : null;

  return (
    <button
      onClick={onSelect}
      className={`cursor-pointer w-full text-left px-4 py-3 border transition-colors ${
        rounded ?? 'rounded-lg'
      } ${
        isSelected
          ? 'border-black bg-gray-50'
          : 'border-gray-200 bg-white hover:border-gray-400'
      }`}
      aria-pressed={isSelected}
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-gray-900">{hotel.label}</span>
          <span className="text-xs text-gray-500 ml-2">{hotel.sublabel}</span>
        </div>
        {priceDisplay && (
          <span className="text-xs text-gray-500 shrink-0 ml-2">{priceDisplay}/night</span>
        )}
      </div>
      {/* Show distance + book link only for non-grouped hotels */}
      {!inGroup && hotel.distanceFromVenue && isSelected && (
        <span className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
          <MapPin className="w-3 h-3" />
          {hotel.distanceFromVenue} from venue
        </span>
      )}
      {!inGroup && hotel.url && isSelected && (
        <a
          href={buildHotelUrl(hotel.url)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 hover:underline mt-1"
          onClick={(e) => e.stopPropagation()}
        >
          Book
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </button>
  );
}

export function HotelSection({
  nights,
  hotelType,
  customHotelCHF,
  currency,
  eurRate,
  attendanceDays,
  onUpdate,
}: HotelSectionProps) {
  const grouped = groupHotelOptions(HOTEL_OPTIONS);
  const isAnyMeiningerSelected = hotelType === 'hostel' || hotelType === 'meininger';
  const currentAttendance = ATTENDANCE_OPTIONS.find((a) => a.id === attendanceDays) ?? ATTENDANCE_OPTIONS[0];

  const handleAttendance = (days: AttendanceDays) => {
    const option = ATTENDANCE_OPTIONS.find((a) => a.id === days);
    onUpdate({ attendanceDays: days, nights: option?.nights ?? 2 });
  };

  return (
    <CalculatorSection icon={<Hotel className="w-5 h-5" />} title="Hotel">
      <div className="space-y-4">
        {/* Attendance selector */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">
            <Calendar className="w-3.5 h-3.5 inline mr-1" />
            Which days are you attending?
          </label>
          <div className="space-y-1.5">
            {ATTENDANCE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleAttendance(opt.id)}
                className={`cursor-pointer w-full text-left px-3.5 py-2.5 rounded-lg border transition-colors ${
                  attendanceDays === opt.id
                    ? 'border-black bg-gray-50'
                    : 'border-gray-200 bg-white hover:border-gray-400'
                }`}
                aria-pressed={attendanceDays === opt.id}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                  <span className="text-xs text-gray-500">{opt.dates} · {opt.nights} nights</span>
                </div>
                {opt.hint && attendanceDays === opt.id && (
                  <p className="text-[11px] text-amber-600 mt-1">{opt.hint}</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Nights stepper */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">
            Number of nights
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onUpdate({ nights: Math.max(MIN_NIGHTS, nights - 1) })}
              disabled={nights <= MIN_NIGHTS}
              className="cursor-pointer w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Decrease nights"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-lg font-bold w-8 text-center" aria-live="polite">
              {nights}
            </span>
            <button
              onClick={() => onUpdate({ nights: Math.min(MAX_NIGHTS, nights + 1) })}
              disabled={nights >= MAX_NIGHTS}
              className="cursor-pointer w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Increase nights"
            >
              <Plus className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-500">
              night{nights !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            We recommend {currentAttendance.nights} nights for {currentAttendance.label.toLowerCase()} ({currentAttendance.dates})
          </p>
        </div>

        {/* Hotel type selector */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">
            Where to stay
          </label>
          <div className="space-y-2">
            {grouped.map((item, idx) => {
              // Grouped MEININGER pair
              if (Array.isArray(item)) {
                return (
                  <div key={`group-${idx}`} className="rounded-lg overflow-hidden border border-gray-200">
                    <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-200">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">MEININGER Zurich</span>
                    </div>
                    {item.map((hotel, hIdx) => (
                      <HotelOptionButton
                        key={hotel.id}
                        hotel={hotel}
                        isSelected={hotelType === hotel.id}
                        currency={currency}
                        eurRate={eurRate}
                        onSelect={() => onUpdate({ hotelType: hotel.id })}
                        rounded={`rounded-none ${hIdx === item.length - 1 ? '' : 'border-b-0'}`}
                        inGroup
                      />
                    ))}
                    {isAnyMeiningerSelected && item[0]?.url && (
                      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <MapPin className="w-3 h-3" />
                          {item[0].distanceFromVenue} from venue
                        </span>
                        <a
                          href={buildHotelUrl(item[0].url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 hover:underline"
                        >
                          Book
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                );
              }

              // Single option
              return (
                <HotelOptionButton
                  key={item.id}
                  hotel={item}
                  isSelected={hotelType === item.id}
                  currency={currency}
                  eurRate={eurRate}
                  onSelect={() => onUpdate({ hotelType: item.id })}
                />
              );
            })}
          </div>
        </div>

        {/* Custom hotel price */}
        {hotelType === 'other' && (
          <div>
            <label
              htmlFor="custom-hotel"
              className="block text-xs font-medium text-gray-500 mb-1.5"
            >
              Price per night (CHF)
            </label>
            <Input
              id="custom-hotel"
              name="custom-hotel"
              type="number"
              min={0}
              value={customHotelCHF}
              onChange={(e) =>
                onUpdate({ customHotelCHF: parseInt(e.target.value, 10) || 0 })
              }
              className="!bg-white !text-black border border-gray-300 max-w-[180px]"
              aria-label="Custom hotel price per night in CHF"
            />
          </div>
        )}

        <p className="flex items-start gap-1.5 text-xs text-gray-400">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          Hotel prices are estimates and may vary by dates and availability.
        </p>
      </div>
    </CalculatorSection>
  );
}
