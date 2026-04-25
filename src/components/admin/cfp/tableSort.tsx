import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc';

export interface SingleSort<K extends string> {
  key: K;
  direction: SortDirection;
}

export type MultiSort<K extends string> = Array<SingleSort<K>>;

export function cycleSingleSort<K extends string>(
  current: SingleSort<K>,
  key: K
): SingleSort<K> {
  if (current.key !== key) {
    return { key, direction: 'asc' };
  }

  return {
    key,
    direction: current.direction === 'asc' ? 'desc' : 'asc',
  };
}

export function cycleMultiSort<K extends string>(
  current: MultiSort<K>,
  key: K
): MultiSort<K> {
  const existingIndex = current.findIndex((item) => item.key === key);

  if (existingIndex === -1) {
    return [{ key, direction: 'asc' }, ...current];
  }

  const existing = current[existingIndex];
  const withoutExisting = current.filter((item) => item.key !== key);

  if (existing.direction === 'asc') {
    return [{ key, direction: 'desc' }, ...withoutExisting];
  }

  return withoutExisting;
}

export function getMultiSortDirection<K extends string>(
  current: MultiSort<K>,
  key: K
): SortDirection | null {
  return current.find((item) => item.key === key)?.direction || null;
}

export function SortIndicator({ direction }: { direction: SortDirection | null }) {
  if (direction === 'asc') {
    return <ArrowUp className="w-3.5 h-3.5 text-gray-700" />;
  }
  if (direction === 'desc') {
    return <ArrowDown className="w-3.5 h-3.5 text-gray-700" />;
  }
  return <ArrowUpDown className="w-3.5 h-3.5 text-brand-gray-medium" />;
}
