import React from 'react';
import { Heading } from '@/components/atoms';
import { cn } from '@/lib/utils';

export interface ScheduleInfoCardProps {
  time?: string;
  title: string;
  copy: string;
  className?: string;
}

export function ScheduleInfoCard({ time, title, copy, className }: ScheduleInfoCardProps) {
  return (
    <div className={cn('rounded-[1.25rem] border border-brand-gray-lightest bg-brand-gray-lightest p-5', className)}>
      {time ? <p className="text-sm text-brand-gray-medium">{time}</p> : null}
      <Heading level="h3" variant="light" className="mt-1 text-lg font-bold leading-tight">
        {title}
      </Heading>
      <p className="mt-4 text-sm leading-7 text-brand-gray-darkest">{copy}</p>
    </div>
  );
}
