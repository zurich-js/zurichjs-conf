/**
 * Shared presentational pieces for the speaker logistics admin views
 * (desktop table + mobile card list)
 */

import React from 'react';
import { Check, Minus, X } from 'lucide-react';
import type { SpeakerLogisticsAdminRow } from './types';

export function RsvpCell({
  attending,
  plusOne,
}: {
  attending: boolean | null | undefined;
  plusOne?: boolean | null;
}) {
  if (attending === true) {
    return (
      <span className="inline-flex items-center gap-1 text-green-700">
        <Check className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Attending</span>
        {plusOne === true && (
          <span className="rounded bg-green-100 px-1 py-0.5 text-[10px] font-semibold leading-none">+1</span>
        )}
      </span>
    );
  }
  if (attending === false) {
    return (
      <span className="inline-flex items-center text-red-600">
        <X className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Not attending</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-gray-300">
      <Minus className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">No answer yet</span>
    </span>
  );
}

export function StatusBadge({ row }: { row: SpeakerLogisticsAdminRow }) {
  if (row.status === 'submitted') {
    return (
      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
        Submitted
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
      Pending
    </span>
  );
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-CH', {
    timeZone: 'Europe/Zurich',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** Expanded details: dietary, plus-one contact, accommodations, timestamps */
export function AnswerDetails({ row }: { row: SpeakerLogisticsAdminRow }) {
  const answers = row.answers;

  if (!answers) {
    return (
      <p className="text-sm text-gray-500">
        No answers yet — copy their unique link and send it to them directly.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
      <div>
        <p className="font-semibold text-gray-900">Dietary restrictions</p>
        <p className="mt-1 text-gray-700">{answers.dietary_restrictions || 'None reported'}</p>
        {answers.dinner_plus_one === true && (
          <>
            <p className="mt-3 font-semibold text-gray-900">Dinner plus-one dietary restrictions</p>
            <p className="mt-1 text-gray-700">
              {answers.dinner_plus_one_dietary_restrictions || 'None reported'}
            </p>
          </>
        )}
        <p className="mt-3 font-semibold text-gray-900">Talk / workshop accommodations</p>
        <p className="mt-1 text-gray-700">{answers.talk_special_accommodations || 'None requested'}</p>
      </div>
      <div>
        {answers.after_party_plus_one === true ? (
          <>
            <p className="font-semibold text-gray-900">After-party plus one (VIP ticket needed)</p>
            <p className="mt-1 text-gray-700">
              {answers.after_party_plus_one_first_name} {answers.after_party_plus_one_last_name}
            </p>
            <p className="break-all text-gray-700">{answers.after_party_plus_one_email}</p>
            <p className="mt-1 text-xs text-gray-500">Issue them a VIP ticket — it includes 20% off workshops.</p>
          </>
        ) : (
          <p className="text-gray-500">No after-party plus one.</p>
        )}
        <p className="mt-3 font-semibold text-gray-900">Hangout activities plus one (Sep 12)</p>
        <p className="mt-1 text-gray-700">
          {answers.speaker_hangout_plus_one === true ? 'Yes — bringing a plus one' : 'No plus one'}
        </p>
        <p className="mt-3 text-xs text-gray-500">Submitted {formatDateTime(row.submitted_at)}</p>
      </div>
    </div>
  );
}
