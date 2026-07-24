/**
 * IssueTab - Switches between issuing conference tickets and workshop seats.
 */

import { useState } from 'react';
import { GraduationCap, Ticket, type LucideIcon } from 'lucide-react';
import { IssueTicketTab } from './IssueTicketTab';
import { IssueWorkshopTicketTab } from './IssueWorkshopTicketTab';

type IssueMode = 'conference' | 'workshop';

const MODES: Array<{ id: IssueMode; label: string; icon: LucideIcon }> = [
  { id: 'conference', label: 'Conference Ticket', icon: Ticket },
  { id: 'workshop', label: 'Workshop Seat', icon: GraduationCap },
];

export function IssueTab() {
  const [mode, setMode] = useState<IssueMode>('conference');

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex space-x-1" role="tablist" aria-label="Issue type">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button key={m.id} role="tab" aria-selected={active} onClick={() => setMode(m.id)}
              className={`px-4 sm:px-6 py-2.5 rounded-md font-medium text-sm transition-all cursor-pointer ${
                active ? 'bg-brand-primary text-black shadow-sm' : 'text-gray-600 hover:text-black hover:bg-gray-50'
              }`}>
              <div className="flex items-center justify-center space-x-2">
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span>{m.label}</span>
              </div>
            </button>
          );
        })}
      </div>
      {mode === 'conference' ? <IssueTicketTab /> : <IssueWorkshopTicketTab />}
    </div>
  );
}
