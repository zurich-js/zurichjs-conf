/**
 * Trip Cost Calculator — Travel Section
 * Region selector, cost range, airport input, and deep links
 */

import React from 'react';
import { Plane, TrainFront, ExternalLink, Info } from 'lucide-react';
import { AirportInput } from '@/components/atoms/AirportInput';
import { CalculatorSection, formatAmount, toDisplayCurrency } from './CalculatorWidgets';
import {
  TRAVEL_RANGES,
  TRAVEL_STEPS,
  buildSkyscannerUrl,
  buildKiwiUrl,
  buildGoogleFlightsUrl,
  type TravelRegion,
  type DisplayCurrency,
} from '@/config/trip-cost';

interface TravelSectionProps {
  travelRegion: TravelRegion;
  travelStep: number;
  originAirport: string | null;
  currency: DisplayCurrency;
  eurRate: number;
  onUpdate: (partial: { travelRegion?: TravelRegion; travelStep?: number; originAirport?: string | null }) => void;
}

function getOriginIata(originAirport: string | null): string | null {
  if (!originAirport) return null;
  const iata = originAirport.split(' - ')[0]?.trim();
  return iata && iata.length === 3 ? iata : null;
}

export function TravelSection({
  travelRegion,
  travelStep,
  originAirport,
  currency,
  eurRate,
  onUpdate,
}: TravelSectionProps) {
  const originIata = getOriginIata(originAirport);

  return (
    <CalculatorSection
      icon={
        <span className="flex items-center gap-1">
          <Plane className="w-4 h-4" />
          <TrainFront className="w-4 h-4" />
        </span>
      }
      title="Travel"
    >
      <div className="space-y-4">
        {/* Region selector */}
        <div className="flex gap-2">
          {(['europe', 'international'] as TravelRegion[]).map((region) => (
            <button
              key={region}
              onClick={() => onUpdate({ travelRegion: region })}
              className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                travelRegion === region
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              aria-pressed={travelRegion === region}
            >
              {TRAVEL_RANGES[region].label}
            </button>
          ))}
        </div>

        {/* Travel cost step */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">
            Estimated round-trip cost
          </label>
          <div className="flex gap-2">
            {TRAVEL_STEPS.map((step, idx) => {
              const range = TRAVEL_RANGES[travelRegion];
              const chf = range[step.key];
              const display = toDisplayCurrency(chf, currency, eurRate);
              return (
                <button
                  key={step.key}
                  onClick={() => onUpdate({ travelStep: idx })}
                  className={`cursor-pointer flex-1 px-3 py-3 rounded-lg text-center transition-colors border ${
                    travelStep === idx
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                  aria-pressed={travelStep === idx}
                >
                  <span className="block text-xs font-medium opacity-70">
                    {step.label}
                  </span>
                  <span className="block text-sm font-bold mt-0.5">
                    {formatAmount(display, currency)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Airport input */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Your departure airport (optional)
          </label>
          <AirportInput
            value={originAirport}
            onChange={(val) => onUpdate({ originAirport: val })}
            placeholder="Search your airport for flight links..."
            theme="light"
          />
        </div>

        {/* Deep links */}
        {originIata && (
          <div className="flex flex-wrap gap-3">
            <a
              href={buildGoogleFlightsUrl(originIata)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-900 hover:underline"
            >
              Google Flights
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href={buildSkyscannerUrl(originIata)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-900 hover:underline"
            >
              Skyscanner
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href={buildKiwiUrl(originIata)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-900 hover:underline"
            >
              Kiwi.com
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        <p className="flex items-start gap-1.5 text-xs text-gray-400">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          Travel by train or plane — prices vary by season, route, and booking time.
        </p>
      </div>
    </CalculatorSection>
  );
}
