import { useEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';

interface BusyAreaProps {
  busy: boolean;
  size?: 'sm' | 'md';
  noRenderOnBusy?: boolean;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}

export function BusyArea({
  busy,
  size = 'md',
  noRenderOnBusy = false,
  className,
  contentClassName,
  children,
}: BusyAreaProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [lockedHeight, setLockedHeight] = useState<number>(0);
  const spinnerSize = size === 'sm' ? 'h-5 w-5 border-2' : 'h-8 w-8 border-b-2';

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    const updateHeight = () => {
      if (!busy) {
        setLockedHeight(element.offsetHeight);
      }
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);

    return () => observer.disconnect();
  }, [busy, children]);

  return (
    <div
      className={clsx('relative min-h-[inherit] w-full', className)}
      style={busy && lockedHeight > 0 ? { minHeight: `${lockedHeight}px` } : undefined}
    >
      {busy && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className={clsx('animate-spin rounded-full border-black/70', spinnerSize)} />
        </div>
      )}
      {(!noRenderOnBusy || !busy) && (
        <div
          ref={contentRef}
          className={clsx(contentClassName, { 'pointer-events-none opacity-0': busy })}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export type { BusyAreaProps };
