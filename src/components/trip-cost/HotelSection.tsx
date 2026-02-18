/**
 * Trip Cost Calculator — Hotel Section
 * Nights stepper, hotel type selector with links, custom price input
 */

import React from 'react';
import { Hotel, ExternalLink, Minus, Plus, Info } from 'lucide-react';
import { Input } from '@/components/atoms/Input';
import { CalculatorSection, formatAmount, toDisplayCurrency } from './CalculatorWidgets';
import {
  HOTEL_OPTIONS,
  MIN_NIGHTS,
  MAX_NIGHTS,
  type HotelType,
  type DisplayCurrency,
} from '@/config/trip-cost';

interface HotelSectionProps {
  nights: number;
  hotelType: HotelType;
  customHotelCHF: number;
  currency: DisplayCurrency;
  eurRate: number;
  onUpdate: (partial: { nights?: number; hotelType?: HotelType; customHotelCHF?: number }) => void;
}

export function HotelSection({
  nights,
  hotelType,
  customHotelCHF,
  currency,
  eurRate,
  onUpdate,
}: HotelSectionProps) {
  return (
    <CalculatorSection icon={<Hotel className="w-5 h-5" />} title="Hotel">
      <div className="space-y-4">
        {/* Nights stepper */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">
            Number of nights
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onUpdate({ nights: Math.max(MIN_NIGHTS, nights - 1) })}
              disabled={nights <= MIN_NIGHTS}
              className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
              className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Increase nights"
            >
              <Plus className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-500">
              night{nights !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Hotel type selector */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">
            Where to stay
          </label>
          <div className="space-y-2">
            {HOTEL_OPTIONS.map((hotel) => {
              const priceDisplay =
                hotel.id !== 'other' && hotel.estimatePerNightCHF > 0
                  ? formatAmount(
                      toDisplayCurrency(hotel.estimatePerNightCHF, currency, eurRate),
                      currency
                    )
                  : null;

              return (
                <button
                  key={hotel.id}
                  onClick={() => onUpdate({ hotelType: hotel.id })}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    hotelType === hotel.id
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 bg-white hover:border-gray-400'
                  }`}
                  aria-pressed={hotelType === hotel.id}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {hotel.label}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {hotel.sublabel}
                      </span>
                    </div>
                    {priceDisplay && (
                      <span className="text-xs text-gray-500">
                        {priceDisplay}/night
                      </span>
                    )}
                  </div>
                  {hotel.url && hotelType === hotel.id && (
                    <a
                      href={hotel.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline mt-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Visit website
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </button>
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
