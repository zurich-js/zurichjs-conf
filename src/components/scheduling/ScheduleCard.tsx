import type { ReactNode } from 'react';
import React from 'react';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ScheduleCardProps {
  id?: string;
  className?: string;
  defaultOpen?: boolean;
  expandable?: boolean;
  header: ReactNode;
  panel?: ReactNode;
  footer?: ReactNode;
  trailing?: ReactNode;
}

export function ScheduleCard({
  id,
  className,
  defaultOpen = false,
  expandable = false,
  header,
  panel,
  footer,
  trailing,
}: ScheduleCardProps) {
  if (!expandable) {
    return (
      <article id={id} className={className}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">{header}</div>
          {trailing ? <div className="mt-1 shrink-0">{trailing}</div> : null}
        </div>
        {panel ? <div className="pt-5">{panel}</div> : null}
        {footer ? <div className="pt-5">{footer}</div> : null}
      </article>
    );
  }

  return (
    <Disclosure as="article" defaultOpen={defaultOpen} id={id} className={className}>
      {({ open }) => (
        <>
          <div className="flex items-start justify-between gap-4">
            <DisclosureButton className="min-w-0 flex-1 text-left cursor-pointer">
              {header}
            </DisclosureButton>

            <div className="flex items-center gap-2">
              {trailing ? <div className="mt-1 shrink-0">{trailing}</div> : null}
              <DisclosureButton className="flex size-10 shrink-0 items-center justify-center rounded-full text-brand-black transition-colors hover:bg-brand-white cursor-pointer">
                <ChevronDown className={cn('size-5 transition-transform', open && 'rotate-180')} />
              </DisclosureButton>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {open && panel ? (
              <DisclosurePanel static as={React.Fragment}>
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-5">
                    {panel}
                    {footer ? <div className="pt-6">{footer}</div> : null}
                  </div>
                </motion.div>
              </DisclosurePanel>
            ) : null}
          </AnimatePresence>
        </>
      )}
    </Disclosure>
  );
}
