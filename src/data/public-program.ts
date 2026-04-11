export const publicProgramTabs = [
  { id: 'community', label: 'Community day', date: 'September 9, 2026', sessionDate: null },
  { id: 'warmup', label: 'Workshop day', date: 'September 10, 2026', sessionDate: '2026-09-10' },
  { id: 'conference', label: 'Conference day', date: 'September 11, 2026', sessionDate: '2026-09-11' },
  { id: 'post-conference', label: 'Post-conf day', date: 'September 12, 2026', sessionDate: null },
] as const;

export const workshopProgramSections = [
  { id: 'morning', label: 'Morning sessions', date: '09:00 - 13:00', start: '09:00', duration: 240 },
  { id: 'lunch', label: 'Lunch break', date: '13:00 - 14:00' },
  { id: 'afternoon', label: 'Afternoon sessions', date: '14:00 - 18:00', start: '14:00', duration: 240 },
] as const;

export const workshopSlotCount = 3;
