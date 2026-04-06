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

export const talkProgramSlots = [
  { start: '08:45', duration: 15, title: 'Opening remarks' },
  { start: '09:00', duration: 30, title: 'TBA' },
  { start: '09:35', duration: 30, title: 'TBA' },
  { start: '10:10', duration: 30, title: 'TBA' },
  { start: '10:55', duration: 45, title: 'TBA' },
  { start: '11:45', duration: 30, title: 'TBA' },
  { start: '12:25', duration: 25, title: 'TBA' },
  { start: '12:55', duration: 25, title: 'TBA' },
  { start: '14:05', duration: 30, title: 'TBA' },
  { start: '14:40', duration: 30, title: 'TBA' },
  { start: '15:15', duration: 45, title: 'TBA' },
  { start: '16:05', duration: 30, title: 'TBA' },
  { start: '16:40', duration: 30, title: 'TBA' },
  { start: '17:10', duration: 50, title: 'Closing remarks' },
] as const;

export const conferenceProgramItems = [
  { kind: 'event', time: '08:00 - 08:45', title: 'Doors open, registration, coffee, sponsors', copy: 'Arrive early, get settled, grab coffee, and spend time with the sponsors before the main program starts.' },
  { kind: 'slot', start: '08:45', duration: 15, title: 'Opening remarks' },
  { kind: 'slot', start: '09:00', duration: 30, title: 'TBA' },
  { kind: 'event', time: '09:30 - 09:35', title: 'Buffer', copy: 'A short transition between sessions.' },
  { kind: 'slot', start: '09:35', duration: 30, title: 'TBA' },
  { kind: 'event', time: '10:05 - 10:10', title: 'Buffer', copy: 'A short transition between sessions.' },
  { kind: 'slot', start: '10:10', duration: 30, title: 'TBA' },
  { kind: 'event', time: '10:40 - 10:55', title: 'Break', copy: 'Take a break, recharge, and say hi to the people around you.' },
  { kind: 'slot', start: '10:55', duration: 45, title: 'TBA' },
  { kind: 'event', time: '11:40 - 11:45', title: 'Buffer', copy: 'A short transition between sessions.' },
  { kind: 'slot', start: '11:45', duration: 30, title: 'TBA' },
  { kind: 'event', time: '12:15 - 12:25', title: 'Lunch transition, food pickup', copy: 'Pick up food, get settled, and get ready for the midday program.' },
  { kind: 'slot', start: '12:25', duration: 25, title: 'TBA' },
  { kind: 'event', time: '12:50 - 12:55', title: 'Short break', copy: 'A short reset before the second panel.' },
  { kind: 'slot', start: '12:55', duration: 25, title: 'TBA' },
  { kind: 'event', time: '13:20 - 14:05', title: 'Networking, sponsor time, hallway track', copy: 'Take time to connect, chat with sponsors, and follow the hallway track.' },
  { kind: 'slot', start: '14:05', duration: 30, title: 'TBA' },
  { kind: 'event', time: '14:35 - 14:40', title: 'Buffer', copy: 'A short transition between sessions.' },
  { kind: 'slot', start: '14:40', duration: 30, title: 'TBA' },
  { kind: 'event', time: '15:10 - 15:15', title: 'Buffer', copy: 'A short transition between sessions.' },
  { kind: 'slot', start: '15:15', duration: 45, title: 'TBA' },
  { kind: 'event', time: '16:00 - 16:05', title: 'Buffer', copy: 'A short transition between sessions.' },
  { kind: 'slot', start: '16:05', duration: 30, title: 'TBA' },
  { kind: 'event', time: '16:35 - 16:40', title: 'Buffer', copy: 'A short transition between sessions.' },
  { kind: 'slot', start: '16:40', duration: 30, title: 'TBA' },
  { kind: 'slot', start: '17:10', duration: 50, title: 'Closing remarks' },
] as const;
