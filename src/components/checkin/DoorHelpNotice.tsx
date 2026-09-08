import React from 'react';
import { DoorNotice } from './DoorNotice';

/** Every outcome of a Help tap except "not tapped". */
export type DoorHelpNoticeStatus = 'sending' | 'sent' | 'undelivered' | 'failed';

export interface DoorHelpNoticeProps {
  status: DoorHelpNoticeStatus;
  /** Short handle the volunteer can read out to whoever arrives. */
  reference: string | null;
  onDismiss: () => void;
  className?: string;
}

/**
 * What happened when Help was tapped. Three honest outcomes: the team has been
 * pinged, the ping could not be sent, or it is still going. Every one of them
 * ends with the same instruction — stay put, and find a core team member in
 * person if nobody comes — because a Slack message is not a promise.
 */
export const DoorHelpNotice: React.FC<DoorHelpNoticeProps> = ({
  status,
  reference,
  onDismiss,
  className = '',
}) => {
  const ref = reference ? (
    <>
      {' '}
      Reference for whoever arrives:{' '}
      <span className="font-mono text-text-primary">{reference}</span>.
    </>
  ) : null;

  if (status === 'sending') {
    return (
      <DoorNotice tone="info" title="Notifying the core team…" className={className}>
        Stay with the attendee. This takes a second.
      </DoorNotice>
    );
  }

  if (status === 'sent') {
    return (
      <DoorNotice
        tone="info"
        title="Core team notified — someone is coming to you"
        actionLabel="Got it"
        onAction={onDismiss}
        className={className}
      >
        The team has the attendee's details. Keep this screen open and stay where you are; if
        nobody arrives in a couple of minutes, find a core team member in person.
        {ref}
      </DoorNotice>
    );
  }

  return (
    <DoorNotice
      tone="warning"
      title="Could not reach the core team automatically"
      actionLabel="Got it"
      onAction={onDismiss}
      className={className}
    >
      Find a core team member in person — they can admit someone without a working code, look
      people up, and settle payment questions at the desk. Show them this screen.
      {ref}
    </DoorNotice>
  );
};
