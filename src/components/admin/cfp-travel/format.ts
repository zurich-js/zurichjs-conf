const DATE_FORMATTER = new Intl.DateTimeFormat('de-CH', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Europe/Zurich',
});

const TIME_FORMATTER = new Intl.DateTimeFormat('de-CH', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Europe/Zurich',
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('de-CH', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Europe/Zurich',
});

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return 'TBD';
  return DATE_FORMATTER.format(new Date(value));
}

export function formatTime(value: string | Date | null | undefined) {
  if (!value) return 'TBD';
  return TIME_FORMATTER.format(new Date(value));
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return 'TBD';
  return DATE_TIME_FORMATTER.format(new Date(value));
}

export function isTodayInZurich(value: string | Date | null | undefined) {
  if (!value) return false;
  const formatted = formatDate(value);
  return formatted === formatDate(new Date());
}

export function getTimestamp(value: string | Date | null | undefined) {
  if (!value) return null;
  return new Date(value).getTime();
}
