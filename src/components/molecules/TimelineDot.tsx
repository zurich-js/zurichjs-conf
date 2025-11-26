import React from 'react';
import {TicketIcon, MicIcon, CalendarPlusIcon, FlagIcon, InfoIcon, LucideIcon} from "lucide-react";

export type TimelineIconType = 'ticket' | 'mic' | 'calendar' | 'flag' | 'info';

export interface TimelineDotProps {
  icon?: TimelineIconType;
  emphasis?: boolean;
  isCurrent?: boolean;
}

const icons: Record<TimelineIconType, LucideIcon> = {
  ticket: TicketIcon,
  mic: MicIcon,
  calendar: CalendarPlusIcon,
  flag: FlagIcon,
  info: InfoIcon,
};

/**
 * TimelineDot component representing an event on the timeline rail
 * Shows an icon within a circular dot with accent color
 */
export const TimelineDot: React.FC<TimelineDotProps> = ({
  icon = 'calendar',
}) => {

  const iconComponent = icons[icon];

  return React.createElement(iconComponent, {className: "", size: 16, strokeWidth: 1});
};



