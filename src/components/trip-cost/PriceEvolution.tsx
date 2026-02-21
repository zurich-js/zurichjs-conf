/**
 * Trip Cost Calculator — Price Evolution Timeline
 * Shows how the total cost increases from now → standard → late bird
 */

import { formatAmount } from './CalculatorWidgets';
import type { DisplayCurrency } from '@/config/trip-cost';

interface PriceEvolutionProps {
  totalDisplayAmount: number;
  standardEstDisplayAmount: number;
  lateBirdDisplayAmount: number;
  displayCurrency: DisplayCurrency;
  isConverted: boolean;
}

export function PriceEvolution({
  totalDisplayAmount,
  standardEstDisplayAmount,
  lateBirdDisplayAmount,
  displayCurrency,
  isConverted,
}: PriceEvolutionProps) {
  return (
    <div id="price-evolution" className="border border-gray-200 rounded-2xl p-5 pb-7 sm:p-6 sm:pb-9 mb-24 sm:mb-32">
      <h2 className="text-base font-semibold text-gray-900 mb-5">Price evolution</h2>
      <div className="relative mb-6">
        <div className="absolute top-[11px] left-[14px] right-[14px] h-1.5 rounded-full bg-gradient-to-r from-brand-green via-brand-yellow-main to-brand-red" />
        <div className="relative flex justify-between">
          <div className="text-center z-10 max-w-[30%]">
            <div className="w-6 h-6 rounded-full bg-brand-green border-2 border-white shadow mx-auto" />
            <span className="block text-[11px] sm:text-xs text-brand-green font-semibold mt-2">Now</span>
            <span className="block text-sm sm:text-base font-bold text-gray-900">
              {isConverted ? '~' : ''}{formatAmount(totalDisplayAmount, displayCurrency)}
            </span>
          </div>
          <div className="text-center z-10 max-w-[30%]">
            <div className="w-6 h-6 rounded-full bg-brand-yellow-secondary border-2 border-white shadow mx-auto" />
            <span className="block text-[11px] sm:text-xs text-brand-yellow-secondary font-semibold mt-2">Standard</span>
            <span className="block text-sm sm:text-base font-bold text-gray-900">
              ~{formatAmount(standardEstDisplayAmount, displayCurrency)}
            </span>
          </div>
          <div className="text-center z-10 max-w-[30%]">
            <div className="w-6 h-6 rounded-full bg-brand-red border-2 border-white shadow mx-auto" />
            <span className="block text-[11px] sm:text-xs text-brand-red font-semibold mt-2">Late Bird</span>
            <span className="block text-sm sm:text-base font-bold text-gray-900">
              ~{formatAmount(lateBirdDisplayAmount, displayCurrency)}
            </span>
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-500 space-y-1">
        <p className="font-medium text-gray-700">Includes estimated increases:</p>
        <p>• Ticket prices increase through pricing stages</p>
        <p>• Flights typically rise +25–30% closer to the event</p>
        <p>• Hotels typically rise +20–25% closer to the event</p>
      </div>
    </div>
  );
}
