/**
 * Communication Section Component
 *
 * Single unified panel for the speaker-facing side of a submission:
 *  - Current state at a glance (decision + email)
 *  - One primary action based on what's next (record decision / schedule / cancel / send now)
 *  - Unified activity timeline (decision events + email events, newest first)
 *
 * Internal pipeline status changes live in StatusActionsSection and are kept visually
 * separate to reduce the chance of accidentally notifying a speaker.
 */

import { useMemo, useState } from 'react';
import {
  Check,
  Clock,
  Loader2,
  Mail,
  Send,
  XCircle,
  Zap,
  AlertTriangle,
  AlertCircle,
  Gavel,
  MailCheck,
  MailX,
  MailWarning,
  CalendarClock,
} from 'lucide-react';
import type { CfpDecisionStatus } from '@/lib/types/cfp';
import type { CfpDecisionEvent, CfpScheduledEmail } from '@/lib/types/cfp/decisions';
import { DecisionBadge } from '../DecisionModal';

interface CommunicationSectionProps {
  decisionStatus: CfpDecisionStatus | undefined;
  scheduledEmails: CfpScheduledEmail[];
  history?: CfpDecisionEvent[];
  onOpenDecisionModal: () => void;
  onScheduleAcceptance: () => void;
  onScheduleRejection: () => void;
  onCancelScheduledEmail: (scheduledEmailId: string) => Promise<void>;
  onSendNow?: (scheduledEmailId: string) => Promise<void>;
  isCancelling?: boolean;
  isSendingNow?: boolean;
}

export function CommunicationSection({
  decisionStatus,
  scheduledEmails,
  history = [],
  onOpenDecisionModal,
  onScheduleAcceptance,
  onScheduleRejection,
  onCancelScheduledEmail,
  onSendNow,
  isCancelling = false,
  isSendingNow = false,
}: CommunicationSectionProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [sendingNowId, setSendingNowId] = useState<string | null>(null);
  const [confirmSendNowId, setConfirmSendNowId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const isAccepted = decisionStatus === 'accepted';
  const isRejected = decisionStatus === 'rejected';
  const hasDecision = isAccepted || isRejected;
  const decisionType: 'acceptance' | 'rejection' | null = isAccepted
    ? 'acceptance'
    : isRejected
      ? 'rejection'
      : null;

  const relevantEmails = decisionType
    ? scheduledEmails.filter((e) => e.email_type === decisionType)
    : scheduledEmails;

  const pendingEmail = relevantEmails.find((e) => e.status === 'pending');
  const sentEmail = relevantEmails.find((e) => e.status === 'sent');

  const state = resolveCurrentState({
    decisionStatus,
    pendingEmail,
    sentEmail,
  });

  const handleCancel = async (emailId: string) => {
    setCancellingId(emailId);
    try {
      await onCancelScheduledEmail(emailId);
      setConfirmCancelId(null);
    } finally {
      setCancellingId(null);
    }
  };

  const handleSendNow = async (emailId: string) => {
    if (!onSendNow) return;
    setSendingNowId(emailId);
    try {
      await onSendNow(emailId);
      setConfirmSendNowId(null);
    } finally {
      setSendingNowId(null);
    }
  };

  const onScheduleDecisionEmail = () => {
    if (isAccepted) onScheduleAcceptance();
    else if (isRejected) onScheduleRejection();
  };

  const timeline = useMemo(
    () => buildTimeline(history, scheduledEmails),
    [history, scheduledEmails]
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
      {/* Header */}
      <div>
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-black">
          <Gavel className="h-4 w-4 text-gray-600" />
          Decision &amp; Speaker Communication
        </h4>
        <p className="mt-1 text-xs text-gray-500">
          Actions here are <strong>speaker-facing</strong>. Internal pipeline status is separate below.
        </p>
      </div>

      {/* Current state card */}
      <div className={`rounded-lg border-2 p-4 ${state.cardTone}`}>
        <div className="flex items-start gap-3">
          <div className="shrink-0">{state.icon}</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <DecisionBadge status={decisionStatus} size="md" />
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${state.badgeTone}`}>
                {state.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-black">{state.description}</p>
            {state.detail && <p className="mt-1 text-xs text-gray-600">{state.detail}</p>}
          </div>
        </div>
      </div>

      {/* Primary action zone */}
      <div className="space-y-2">
        {!hasDecision && (
          <button
            type="button"
            onClick={onOpenDecisionModal}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <Gavel className="h-4 w-4" />
            Record decision
          </button>
        )}

        {hasDecision && !pendingEmail && !sentEmail && (
          <>
            <button
              type="button"
              onClick={onScheduleDecisionEmail}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                isAccepted
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-800 text-white'
              }`}
            >
              <Send className="h-4 w-4" />
              Schedule {isAccepted ? 'acceptance' : 'rejection'} email to speaker
            </button>
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <p className="text-xs text-red-800">
                Scheduling sends a <strong>real email</strong> to the speaker at their registered address.
                You&apos;ll have a 30-minute window to cancel or send immediately.
              </p>
            </div>
          </>
        )}

        {pendingEmail && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-900">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-semibold">
                  Sending in {formatTimeRemaining(pendingEmail.scheduled_for)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {confirmSendNowId === pendingEmail.id ? (
                  <>
                    <span className="text-xs text-amber-900">Send now?</span>
                    <button
                      type="button"
                      onClick={() => handleSendNow(pendingEmail.id)}
                      disabled={isSendingNow || sendingNowId === pendingEmail.id}
                      className="inline-flex items-center gap-1 rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 cursor-pointer"
                    >
                      {sendingNowId === pendingEmail.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmSendNowId(null)}
                      className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 cursor-pointer"
                    >
                      No
                    </button>
                  </>
                ) : confirmCancelId === pendingEmail.id ? (
                  <>
                    <span className="text-xs text-amber-900">Cancel scheduled email?</span>
                    <button
                      type="button"
                      onClick={() => handleCancel(pendingEmail.id)}
                      disabled={isCancelling || cancellingId === pendingEmail.id}
                      className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                    >
                      {cancellingId === pendingEmail.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmCancelId(null)}
                      className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 cursor-pointer"
                    >
                      Keep it
                    </button>
                  </>
                ) : (
                  <>
                    {onSendNow && (
                      <button
                        type="button"
                        onClick={() => setConfirmSendNowId(pendingEmail.id)}
                        className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800 hover:bg-green-200 cursor-pointer"
                      >
                        <Zap className="h-3 w-3" />
                        Send now
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirmCancelId(pendingEmail.id)}
                      className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-200 cursor-pointer"
                    >
                      <XCircle className="h-3 w-3" />
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
            <p className="mt-1 text-xs text-amber-800">
              Scheduled for {new Date(pendingEmail.scheduled_for).toLocaleString()}
              {pendingEmail.coupon_code && ` · coupon ${pendingEmail.coupon_code} (${pendingEmail.coupon_discount_percent}% off)`}
            </p>
          </div>
        )}

        {hasDecision && pendingEmail == null && sentEmail && (
          <button
            type="button"
            onClick={onOpenDecisionModal}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-gray-50 cursor-pointer"
          >
            <Gavel className="h-3.5 w-3.5" />
            Change decision
          </button>
        )}
      </div>

      {/* Unified activity timeline */}
      <div className="rounded-lg bg-white border border-gray-200">
        <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600">
            <Mail className="h-3.5 w-3.5" />
            Activity timeline
          </p>
          <p className="text-[11px] text-gray-500">{timeline.length} event{timeline.length === 1 ? '' : 's'}</p>
        </div>
        {timeline.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-gray-500">
            No decision or email activity yet.
          </p>
        ) : (
          <ol className="divide-y divide-gray-100">
            {timeline.map((event) => (
              <li key={event.id} className="flex items-start gap-3 px-3 py-2.5">
                <span className="mt-0.5 shrink-0">{event.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-black">{event.title}</p>
                  {event.detail && <p className="text-xs text-gray-600">{event.detail}</p>}
                </div>
                <time
                  className="shrink-0 whitespace-nowrap text-[11px] text-gray-500"
                  dateTime={event.at}
                >
                  {new Date(event.at).toLocaleString()}
                </time>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

// --- State resolution ---

function resolveCurrentState({
  decisionStatus,
  pendingEmail,
  sentEmail,
}: {
  decisionStatus: CfpDecisionStatus | undefined;
  pendingEmail: CfpScheduledEmail | undefined;
  sentEmail: CfpScheduledEmail | undefined;
}): {
  label: string;
  description: string;
  detail?: string;
  cardTone: string;
  badgeTone: string;
  icon: React.ReactNode;
} {
  const decisionMade = decisionStatus === 'accepted' || decisionStatus === 'rejected';

  if (!decisionMade) {
    return {
      label: 'Undecided',
      description: 'No decision recorded. Speaker has not been contacted.',
      cardTone: 'border-amber-200 bg-amber-50',
      badgeTone: 'bg-amber-100 text-amber-800',
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    };
  }

  if (sentEmail) {
    return {
      label: 'Speaker notified',
      description: `${decisionStatus === 'accepted' ? 'Acceptance' : 'Rejection'} email was sent to the speaker.`,
      detail: sentEmail.sent_at
        ? `Sent ${new Date(sentEmail.sent_at).toLocaleString()}${sentEmail.coupon_code ? ` · coupon ${sentEmail.coupon_code}` : ''}`
        : undefined,
      cardTone: 'border-green-200 bg-green-50',
      badgeTone: 'bg-green-100 text-green-800',
      icon: <MailCheck className="h-5 w-5 text-green-600" />,
    };
  }

  if (pendingEmail) {
    return {
      label: 'Email scheduled',
      description: `${decisionStatus === 'accepted' ? 'Acceptance' : 'Rejection'} email queued. You can cancel or send immediately.`,
      detail: `Will send ${new Date(pendingEmail.scheduled_for).toLocaleString()}`,
      cardTone: 'border-amber-200 bg-amber-50',
      badgeTone: 'bg-amber-100 text-amber-800',
      icon: <CalendarClock className="h-5 w-5 text-amber-600" />,
    };
  }

  return {
    label: 'Decision recorded — speaker not yet notified',
    description: `Decision (${decisionStatus}) is saved internally. The speaker has not been emailed.`,
    cardTone: 'border-blue-200 bg-blue-50',
    badgeTone: 'bg-blue-100 text-blue-800',
    icon: <AlertCircle className="h-5 w-5 text-blue-600" />,
  };
}

// --- Timeline ---

interface TimelineEvent {
  id: string;
  at: string;
  title: string;
  detail?: string;
  icon: React.ReactNode;
}

function buildTimeline(
  history: CfpDecisionEvent[],
  emails: CfpScheduledEmail[]
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const h of history) {
    events.push({
      id: `h-${h.id}`,
      at: h.created_at,
      title: formatDecisionEventTitle(h),
      detail: h.notes || undefined,
      icon: <Gavel className="h-4 w-4 text-gray-600" />,
    });
  }

  for (const e of emails) {
    if (e.status === 'sent' && e.sent_at) {
      events.push({
        id: `e-sent-${e.id}`,
        at: e.sent_at,
        title: `${capitalize(e.email_type)} email sent`,
        detail: e.coupon_code
          ? `Coupon ${e.coupon_code} (${e.coupon_discount_percent}% off)`
          : undefined,
        icon: <MailCheck className="h-4 w-4 text-green-600" />,
      });
    }
    if (e.status === 'cancelled' && e.cancelled_at) {
      events.push({
        id: `e-cancel-${e.id}`,
        at: e.cancelled_at,
        title: `${capitalize(e.email_type)} email cancelled`,
        icon: <MailX className="h-4 w-4 text-gray-500" />,
      });
    }
    if (e.status === 'failed' && e.failed_at) {
      events.push({
        id: `e-fail-${e.id}`,
        at: e.failed_at,
        title: `${capitalize(e.email_type)} email failed`,
        detail: e.failure_reason || undefined,
        icon: <MailWarning className="h-4 w-4 text-red-600" />,
      });
    }
    if (e.status === 'pending') {
      events.push({
        id: `e-scheduled-${e.id}`,
        at: e.created_at,
        title: `${capitalize(e.email_type)} email scheduled`,
        detail: `Will send ${new Date(e.scheduled_for).toLocaleString()}`,
        icon: <CalendarClock className="h-4 w-4 text-amber-600" />,
      });
    }
  }

  events.sort((a, b) => (b.at > a.at ? 1 : b.at < a.at ? -1 : 0));
  return events;
}

function formatDecisionEventTitle(event: CfpDecisionEvent): string {
  const status = event.new_status;
  switch (event.event_type) {
    case 'decision_made':
      return `Decision recorded: ${capitalize(status)}`;
    case 'decision_changed':
      return `Decision changed to ${capitalize(status)}${event.previous_status ? ` (was ${event.previous_status})` : ''}`;
    case 'email_sent':
      return `Email sent (${capitalize(status)})`;
    case 'coupon_generated':
      return 'Rejection coupon generated';
    default:
      return `Event: ${event.event_type}`;
  }
}

function formatTimeRemaining(scheduledFor: string): string {
  const ms = new Date(scheduledFor).getTime() - Date.now();
  if (ms <= 0) return 'any moment';
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

