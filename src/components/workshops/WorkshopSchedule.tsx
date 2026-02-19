/**
 * WorkshopSchedule
 * Groups workshops by time slot (Morning / Afternoon / Full Day)
 * and renders them in a responsive grid.
 */

import React from 'react';
import { Sunrise, Sunset, Clock } from 'lucide-react';
import { Heading } from '@/components/atoms';
import { WorkshopCard } from './WorkshopCard';
import type { PublicWorkshop, WorkshopTimeSlot } from '@/lib/types/workshop';

export interface WorkshopScheduleProps {
  workshops: PublicWorkshop[];
}

interface SlotGroup {
  slot: WorkshopTimeSlot;
  label: string;
  timeRange: string;
  icon: React.ReactNode;
  workshops: PublicWorkshop[];
}

const SLOT_CONFIG: Record<WorkshopTimeSlot, { label: string; timeRange: string; icon: React.ReactNode; order: number }> = {
  morning: {
    label: 'Morning Session',
    timeRange: '09:00 - 12:30',
    icon: <Sunrise className="w-5 h-5 text-brand-yellow-main" />,
    order: 0,
  },
  afternoon: {
    label: 'Afternoon Session',
    timeRange: '13:30 - 17:00',
    icon: <Sunset className="w-5 h-5 text-brand-orange" />,
    order: 1,
  },
  full_day: {
    label: 'Full Day Workshop',
    timeRange: '09:00 - 17:00',
    icon: <Clock className="w-5 h-5 text-brand-blue" />,
    order: 2,
  },
};

export const WorkshopSchedule: React.FC<WorkshopScheduleProps> = ({ workshops }) => {
  // Group workshops by time slot
  const groups: SlotGroup[] = Object.entries(SLOT_CONFIG)
    .map(([slot, config]) => ({
      slot: slot as WorkshopTimeSlot,
      label: config.label,
      timeRange: config.timeRange,
      icon: config.icon,
      workshops: workshops.filter(w => w.time_slot === slot),
    }))
    .filter(g => g.workshops.length > 0)
    .sort((a, b) => SLOT_CONFIG[a.slot].order - SLOT_CONFIG[b.slot].order);

  if (workshops.length === 0) {
    return (
      <div className="text-center py-16">
        <Heading level="h2" className="text-2xl">
          Workshops Coming Soon
        </Heading>
        <p className="text-brand-gray-light mt-4 max-w-md mx-auto">
          We are finalizing the workshop lineup. Check back soon for the full schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12 sm:space-y-16">
      {groups.map(group => (
        <section key={group.slot}>
          {/* Slot Header */}
          <div className="flex items-center gap-3 mb-6">
            {group.icon}
            <div>
              <Heading level="h2" className="text-xl sm:text-2xl">
                {group.label}
              </Heading>
              <p className="text-sm text-brand-gray-light mt-0.5">{group.timeRange}</p>
            </div>
          </div>

          {/* Workshop Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {group.workshops.map(workshop => (
              <WorkshopCard key={workshop.id} workshop={workshop} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
