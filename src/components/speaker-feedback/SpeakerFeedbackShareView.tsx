/**
 * The unlisted page a speaker opens to read their own conference feedback.
 *
 * Everything on it is already scoped to one speaker by the server — this
 * component only renders what it is handed, and links nowhere that would let a
 * visitor walk into another speaker's results.
 *
 * The star primitives are shared with the organiser view under
 * `@/components/admin/feedback`; they are presentation-only and imported by
 * module (not through the admin barrel) so none of the admin shell ships here.
 */

import Image from 'next/image';
import { EyeOff, MessageSquareText, Star } from 'lucide-react';
import { Heading, Kicker } from '@/components/atoms';
import { formatFeedbackStamp, formatScheduleStart, ratingTone } from '@/components/admin/feedback/format';
import { RatingBreakdown } from '@/components/admin/feedback/RatingBreakdown';
import { StarRating } from '@/components/admin/feedback/StarRating';
import { SEO } from '@/components/SEO';
import type { SpeakerFeedbackShareData } from '@/lib/types/session-feedback';

export interface SpeakerFeedbackShareViewProps {
  data: SpeakerFeedbackShareData;
}

/** One headline figure above the breakdown. */
function Stat({ label, value, tone }: { label: string; value: string; tone?: string }): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${tone ?? 'text-black'}`}>{value}</div>
    </div>
  );
}

/** Headline rollup, star histogram, per-session split and every comment a speaker received. */
export function SpeakerFeedbackShareView({ data }: SpeakerFeedbackShareViewProps): React.JSX.Element {
  const { detail, speakerName, speakerRole, speakerImageUrl } = data;
  const comments = detail.entries.filter((entry) => entry.comment);
  const hasMultipleSessions = detail.sessions.length > 1;

  return (
    <>
      <SEO
        title={`Your session feedback — ${speakerName}`}
        description="Private feedback summary for a ZurichJS Conf 2026 speaker."
        noindex
      />
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="mx-auto max-w-screen-md px-4 pt-28 pb-16 md:pt-36 md:pb-24">
          <header className="mb-8">
            <Kicker variant="light" className="mb-4">
              ZurichJS Conf 2026
            </Kicker>
            <div className="flex items-center gap-4">
              {speakerImageUrl ? (
                <Image
                  src={speakerImageUrl}
                  alt=""
                  width={64}
                  height={64}
                  className="size-16 shrink-0 rounded-full object-cover"
                />
              ) : null}
              <div className="min-w-0">
                <Heading level="h1" variant="light" className="text-2xl font-bold">
                  {speakerName}
                </Heading>
                <p className="text-sm text-gray-600">{speakerRole ?? 'Speaker'}</p>
              </div>
            </div>
            <p className="mt-5 text-base text-gray-700">
              Thank you for speaking at ZurichJS Conf 2026. Here is everything attendees rated and wrote about
              {hasMultipleSessions ? ' your sessions' : ' your session'} — unedited, and anonymous by design.
            </p>
          </header>

          <p className="mb-8 flex items-start gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
            <EyeOff className="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden="true" />
            <span>
              This page is private and unlisted: it is not linked anywhere on the site and search engines are asked
              not to index it. Anyone with the link can read it, so please keep it to yourself.
            </span>
          </p>

          {detail.responseCount === 0 ? (
            <section className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-10 text-center">
              <MessageSquareText className="mx-auto mb-3 size-6 text-gray-400" aria-hidden="true" />
              <p className="text-sm text-gray-600">
                No ratings have come in yet. Check back again later — this page updates as attendees submit feedback.
              </p>
            </section>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Stat label="Responses" value={String(detail.responseCount)} />
                <Stat
                  label="Average"
                  value={detail.averageRating === null ? '—' : `${detail.averageRating.toFixed(1)} / 5`}
                  tone={ratingTone(detail.averageRating)}
                />
                <Stat label="Comments" value={String(detail.commentCount)} />
              </div>

              <section aria-labelledby="speaker-feedback-breakdown" className="rounded-2xl border border-gray-200 bg-white p-5">
                <h2 id="speaker-feedback-breakdown" className="mb-3 text-sm font-bold text-black">
                  How attendees rated you
                </h2>
                <RatingBreakdown distribution={detail.distribution} total={detail.responseCount} />
              </section>

              {hasMultipleSessions ? (
                <section aria-labelledby="speaker-feedback-sessions" className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h2 id="speaker-feedback-sessions" className="mb-3 text-sm font-bold text-black">
                    Your sessions ({detail.sessions.length})
                  </h2>
                  <ul className="divide-y divide-gray-100">
                    {detail.sessions.map((session) => (
                      <li key={session.scheduleItemId} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-medium text-black">{session.title}</span>
                          <span className="block text-xs text-gray-500">
                            {session.date} · {formatScheduleStart(session.startTime)}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-xs tabular-nums text-gray-500">
                            {session.responseCount} {session.responseCount === 1 ? 'response' : 'responses'}
                          </span>
                          <span className={`w-12 text-right text-sm font-semibold tabular-nums ${ratingTone(session.averageRating)}`}>
                            {session.averageRating === null ? (
                              '—'
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <Star className="size-3 fill-current" aria-hidden="true" />
                                {session.averageRating.toFixed(1)}
                              </span>
                            )}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section aria-labelledby="speaker-feedback-comments">
                <h2 id="speaker-feedback-comments" className="mb-3 text-sm font-bold text-black">
                  What people wrote ({comments.length})
                </h2>
                {comments.length === 0 ? (
                  <p className="flex items-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-5 text-sm text-gray-600">
                    <MessageSquareText className="size-4 shrink-0 text-gray-400" aria-hidden="true" />
                    Every response so far is a star rating without a written comment.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {comments.map((entry) => (
                      <li key={entry.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <StarRating rating={entry.rating} className="w-4 h-4" />
                          <time dateTime={entry.created_at} className="text-xs tabular-nums text-gray-400">
                            {formatFeedbackStamp(entry.created_at)}
                          </time>
                        </div>
                        {hasMultipleSessions ? (
                          <p className="mt-1.5 text-xs font-medium text-gray-600">{entry.sessionTitle}</p>
                        ) : null}
                        <p className="mt-2 whitespace-pre-line break-words text-sm text-black">{entry.comment}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          <p className="mt-10 text-sm text-gray-500">
            Questions about anything here? Reply to the organiser who sent you this link.
          </p>
        </div>
      </main>
    </>
  );
}
