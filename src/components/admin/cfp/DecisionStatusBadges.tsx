/**
 * Decision Status Badges
 * Small badges shown on rejected submissions indicating whether a decision
 * record exists and whether the rejection email has been communicated.
 */

import type { ReactNode } from 'react';
import { FileCheck, FileX, MailCheck, MailX, MailWarning, Clock } from 'lucide-react';
import type { CfpScheduledEmailStatus } from '@/lib/types/cfp/decisions';

interface DecisionStatusBadgesProps {
  hasDecisionRecord: boolean;
  emailSentAt: string | null | undefined;
  scheduledEmailStatus: CfpScheduledEmailStatus | null | undefined;
}

interface BadgeChipProps {
  icon: ReactNode;
  label: string;
  tooltip: string;
  className: string;
}

function BadgeChip({ icon, label, tooltip, className }: BadgeChipProps) {
  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${className}`}
    >
      {icon}
      {label}
    </span>
  );
}

export function DecisionStatusBadges({
  hasDecisionRecord,
  emailSentAt,
  scheduledEmailStatus,
}: DecisionStatusBadgesProps) {
  const iconClass = 'w-3 h-3';

  const decisionChip = hasDecisionRecord ? (
    <BadgeChip
      icon={<FileCheck className={iconClass} />}
      label="Decision"
      tooltip="A decision record has been created for this talk"
      className="bg-emerald-100 text-emerald-800"
    />
  ) : (
    <BadgeChip
      icon={<FileX className={iconClass} />}
      label="No decision"
      tooltip="No decision record yet — status was changed without creating a decision"
      className="bg-gray-100 text-gray-600"
    />
  );

  let emailChip: ReactNode;
  if (emailSentAt || scheduledEmailStatus === 'sent') {
    emailChip = (
      <BadgeChip
        icon={<MailCheck className={iconClass} />}
        label="Emailed"
        tooltip={emailSentAt ? `Email sent ${new Date(emailSentAt).toLocaleString()}` : 'Rejection email sent'}
        className="bg-emerald-100 text-emerald-800"
      />
    );
  } else if (scheduledEmailStatus === 'pending') {
    emailChip = (
      <BadgeChip
        icon={<Clock className={iconClass} />}
        label="Scheduled"
        tooltip="Rejection email scheduled — will send shortly"
        className="bg-amber-100 text-amber-800"
      />
    );
  } else if (scheduledEmailStatus === 'failed') {
    emailChip = (
      <BadgeChip
        icon={<MailWarning className={iconClass} />}
        label="Failed"
        tooltip="Rejection email failed to send"
        className="bg-red-100 text-red-800"
      />
    );
  } else {
    emailChip = (
      <BadgeChip
        icon={<MailX className={iconClass} />}
        label="Not emailed"
        tooltip="Speaker has not been notified yet"
        className="bg-gray-100 text-gray-600"
      />
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {decisionChip}
      {emailChip}
    </div>
  );
}
