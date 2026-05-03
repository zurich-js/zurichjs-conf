/**
 * SchedulePreviewModal
 * Read-only preview of a day's schedule layout
 */

import { AdminModal } from '@/components/admin/AdminModal';
import type { ProgramScheduleItemRecord } from '@/lib/types/program-schedule';
import { groupOverlappingScheduleItems, minutesToTime, timeToMinutes } from './utils';
import { formatScheduleDuration, getDisplayScheduleType, TypeChip } from './components';

interface SchedulePreviewModalProps {
  group: { date: string; label: string; items: ProgramScheduleItemRecord[] };
  onClose: () => void;
}

export function SchedulePreviewModal({ group, onClose }: SchedulePreviewModalProps) {
  const layout = groupOverlappingScheduleItems(group.items);

  return (
    <AdminModal
      title={`Schedule preview for ${group.label}`}
      maxWidth="4xl"
      showHeader={false}
      onClose={onClose}
      footer={<button type="button" onClick={onClose} className="cursor-pointer rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Close</button>}
    >
      <div className="overflow-x-auto -mx-2 px-2">
        {/* Desktop multi-column grid */}
        <div
          className="hidden sm:grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${layout.totalColumns}, minmax(200px, 1fr))`,
            gridTemplateRows: `repeat(${layout.rows.length}, minmax(0, auto))`,
          }}
        >
          {layout.layout.map((entry) => {
            const item = entry.item;
            const displayType = getDisplayScheduleType(item);
            const startTime = item.start_time.slice(0, 5);
            const endTime = minutesToTime(timeToMinutes(startTime) + item.duration_minutes);

            return (
              <div
                key={item.id}
                style={{
                  gridColumn: `${entry.colStart} / span ${entry.colSpan}`,
                  gridRow: `${entry.rowStart} / span ${entry.rowSpan}`,
                }}
                className="flex h-full min-h-0 flex-col"
              >
                <div className="flex-1 flex flex-wrap gap-4 items-center rounded-lg border border-gray-200 bg-white p-2 text-sm text-brand-gray-medium">
                  <div className="font-medium text-gray-950">
                    {startTime} - {endTime} ({formatScheduleDuration(item.duration_minutes)})
                  </div>
                  <TypeChip type={displayType} />
                  <div className="font-medium text-gray-950">{item.program_session?.title ?? item.title}</div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Mobile stacked list */}
        <div className="sm:hidden space-y-2">
          {layout.layout.map((entry) => {
            const item = entry.item;
            const displayType = getDisplayScheduleType(item);
            const startTime = item.start_time.slice(0, 5);
            const endTime = minutesToTime(timeToMinutes(startTime) + item.duration_minutes);

            return (
              <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-950">{startTime} - {endTime}</span>
                  <TypeChip type={displayType} />
                </div>
                <p className="mt-1 font-medium text-gray-950">{item.program_session?.title ?? item.title}</p>
                <p className="text-xs text-brand-gray-medium">{formatScheduleDuration(item.duration_minutes)}{item.room ? ` · ${item.room}` : ''}</p>
              </div>
            );
          })}
        </div>
      </div>
    </AdminModal>
  );
}
