'use client';

import React, { useEffect, useState } from 'react';
import { AddToCalendarButton } from 'add-to-calendar-button-react';

type CalendarOption = 'Apple' | 'Google' | 'iCal' | 'Microsoft365' | 'Outlook.com' | 'Yahoo' | 'MicrosoftTeams';

export interface AddToCalendarProps {
  name: string;
  description?: string;
  startDate: string; // YYYY-MM-DD format
  endDate?: string; // YYYY-MM-DD format
  location?: string;
  options?: CalendarOption[];
  timeZone?: string;
  size?: 'small' | 'default' | 'large';
  buttonStyle?: 'default' | 'flat' | 'round' | 'text';
  lightMode?: 'system' | 'light' | 'dark' | 'bodyScheme';
}

/**
 * AddToCalendar component - wrapper around add-to-calendar-button-react
 * Provides an easy way to add events to various calendar services
 *
 * Note: This component only renders on the client to avoid hydration mismatches
 * with the web component that modifies itself after mounting.
 */
export const AddToCalendar: React.FC<AddToCalendarProps> = ({
  name,
  description = '',
  startDate,
  endDate,
  location = 'Zurich, Switzerland',
  options = ['Apple', 'Google', 'iCal', 'Microsoft365', 'Outlook.com', 'Yahoo'],
  timeZone = 'Europe/Zurich',
  size = 'small',
  buttonStyle = 'text',
  lightMode = 'dark',
}) => {
  // Only render on client to avoid hydration mismatch
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prefix event name with conference name for calendar
  const calendarEventName = `ZurichJS Conference - ${name}`;

  // Don't render anything on the server
  if (!isMounted) {
    return null;
  }

  return (
    <>
      <AddToCalendarButton
        name={calendarEventName}
        description={description}
        startDate={startDate}
        endDate={endDate || startDate}
        startTime="09:00"
        endTime="18:00"
        timeZone={timeZone}
        location={location}
        options={options}
        size={size}
        buttonStyle={buttonStyle}
        lightMode={lightMode}
        hideCheckmark
        hideBackground
        trigger="click"
        listStyle="modal"
        styleLight="--btn-background: transparent; --btn-text: #F1E271; --btn-text-hover: #F1E271; --list-background: #242528; --list-text: #ffffff; --list-text-hover: #F1E271; --font: inherit; text-decoration: none; --btn-padding-x: 0; --btn-padding-y: 0; --btn-underline: transparent; --modal-background: #242528; --modal-text: #ffffff;"
        styleDark="--btn-background: transparent; --btn-text: #F1E271; --btn-text-hover: #F1E271; --list-background: #242528; --list-text: #ffffff; --list-text-hover: #F1E271; --font: inherit; text-decoration: none; --btn-padding-x: 0; --btn-padding-y: 0; --btn-underline: transparent; --modal-background: #242528; --modal-text: #ffffff;"
      />
      <style jsx global>{`
        .atcb-button {
          background-image: none !important;
        }

      `}</style>
    </>
  );
};
