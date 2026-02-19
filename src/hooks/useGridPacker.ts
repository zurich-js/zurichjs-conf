import { useMemo, useState, useEffect, useSyncExternalStore, type RefObject } from "react";

// --- Types ---

export interface GridItemConfig {
  id: string;
  sizes: Record<string, { cols: number; rows: number }>;
  priority?: number;
}

export interface GridPackerOptions {
  columns: Record<string, number>;
}

export interface PlacedItem {
  id: string;
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
}

export interface GridPackerResult {
  placements: PlacedItem[];
  columns: number;
  breakpoint: string;
  cellSize: number;
}

// --- Breakpoint helper (reads --breakpoint-* from Tailwind v4 @theme) ---

const BREAKPOINT_NAMES = ["4xl", "3xl", "2xl", "xl", "lg", "md", "sm", "xs"] as const;

let breakpointCache: [string, number][] | null = null;

function getBreakpoints(): [string, number][] {
  if (breakpointCache) return breakpointCache;
  if (typeof window === "undefined") {
    return [...BREAKPOINT_NAMES.map((name): [string, number] => [name, 0]), ["base", 0]];
  }

  const style = getComputedStyle(document.documentElement);
  const entries: [string, number][] = [];
  for (const name of BREAKPOINT_NAMES) {
    const value = parseFloat(style.getPropertyValue(`--breakpoint-${name}`));
    if (value > 0) entries.push([name, value]);
  }
  // Sort largest-first, append base
  entries.sort((a, b) => b[1] - a[1]);
  entries.push(["base", 0]);
  breakpointCache = entries;
  return entries;
}

function getBreakpoint(): string {
  if (typeof window === "undefined") return "base";
  const width = window.innerWidth;
  for (const [name, min] of getBreakpoints()) {
    if (width >= min) return name;
  }
  return "base";
}

function subscribeToBreakpoint(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const queries = getBreakpoints()
    .filter(([, min]) => min > 0)
    .map(([, min]) => window.matchMedia(`(min-width: ${min}px)`));
  for (const mql of queries) mql.addEventListener("change", callback);
  return () => {
    for (const mql of queries) mql.removeEventListener("change", callback);
  };
}

function getServerBreakpoint(): string {
  return "base";
}

export function useBreakpoint(): string {
  return useSyncExternalStore(subscribeToBreakpoint, getBreakpoint, getServerBreakpoint);
}

// --- Container measurement (width + computed gap) ---

function useContainerMeasure(ref: RefObject<HTMLElement | null>): { width: number; gap: number } {
  const [measure, setMeasure] = useState({ width: 0, gap: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function read() {
      const style = getComputedStyle(el!);
      const gap = parseFloat(style.columnGap) || parseFloat(style.gap) || 0;
      setMeasure({ width: el!.clientWidth, gap });
    }
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return measure;
}

// --- Resolve size for active breakpoint ---

function resolveSize(
  sizes: Record<string, { cols: number; rows: number }>,
  activeBreakpoint: string
): { cols: number; rows: number } {
  const bps = getBreakpoints();
  const activeIndex = Math.max(0, bps.findIndex(([name]) => name === activeBreakpoint));
  for (let i = activeIndex; i < bps.length; i++) {
    const key = bps[i][0];
    if (sizes[key]) return sizes[key];
  }
  const first = Object.values(sizes)[0];
  return first ?? { cols: 1, rows: 1 };
}

// --- Resolve active columns for breakpoint ---

function resolveColumns(
  columns: Record<string, number>,
  activeBreakpoint: string
): number {
  const bps = getBreakpoints();
  const activeIndex = Math.max(0, bps.findIndex(([name]) => name === activeBreakpoint));
  for (let i = activeIndex; i < bps.length; i++) {
    const key = bps[i][0];
    if (columns[key] !== undefined) return columns[key];
  }
  const first = Object.values(columns)[0];
  return first ?? 12;
}

// --- Packing algorithm (column-first within occupied rows) ---

function packItems(
  items: GridItemConfig[],
  columns: number,
  activeBreakpoint: string
): PlacedItem[] {
  const resolved = items.map((item) => {
    const size = resolveSize(item.sizes, activeBreakpoint);
    return {
      id: item.id,
      cols: Math.min(size.cols, columns),
      rows: size.rows,
      priority: item.priority ?? Infinity,
      area: size.cols * size.rows,
    };
  });

  resolved.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.area - a.area;
  });

  const grid: boolean[][] = [];
  let maxOccupiedRow = -1;

  function ensureRows(count: number) {
    while (grid.length < count) {
      grid.push(new Array(columns).fill(false));
    }
  }

  function canPlace(col: number, row: number, w: number, h: number): boolean {
    if (col + w > columns) return false;
    ensureRows(row + h);
    for (let r = row; r < row + h; r++) {
      for (let c = col; c < col + w; c++) {
        if (grid[r][c]) return false;
      }
    }
    return true;
  }

  function place(col: number, row: number, w: number, h: number) {
    ensureRows(row + h);
    for (let r = row; r < row + h; r++) {
      for (let c = col; c < col + w; c++) {
        grid[r][c] = true;
      }
    }
    maxOccupiedRow = Math.max(maxOccupiedRow, row + h - 1);
  }

  const placed: PlacedItem[] = [];

  for (const item of resolved) {
    let didPlace = false;

    // Phase 1: column-first scan within occupied rows
    // Scan left-to-right, and at each column try all existing rows top-to-bottom
    // This fills vertical gaps before expanding horizontally
    const scanRows = maxOccupiedRow + 1;
    for (let col = 0; col <= columns - item.cols && !didPlace; col++) {
      for (let row = 0; row < scanRows && !didPlace; row++) {
        if (canPlace(col, row, item.cols, item.rows)) {
          place(col, row, item.cols, item.rows);
          placed.push({
            id: item.id,
            col: col + 1,
            row: row + 1,
            colSpan: item.cols,
            rowSpan: item.rows,
          });
          didPlace = true;
        }
      }
    }

    // Phase 2: nothing fit in existing rows — expand to a new row
    if (!didPlace) {
      const newRow = maxOccupiedRow + 1;
      for (let col = 0; col <= columns - item.cols; col++) {
        if (canPlace(col, newRow, item.cols, item.rows)) {
          place(col, newRow, item.cols, item.rows);
          placed.push({
            id: item.id,
            col: col + 1,
            row: newRow + 1,
            colSpan: item.cols,
            rowSpan: item.rows,
          });
          didPlace = true;
          break;
        }
      }
    }
  }

  return placed;
}

// --- Hook ---

export function useGridPacker(
  items: GridItemConfig[],
  options: GridPackerOptions,
  containerRef: RefObject<HTMLElement | null>
): GridPackerResult {
  const breakpoint = useBreakpoint();
  const columns = resolveColumns(options.columns, breakpoint);
  const { width: containerWidth, gap } = useContainerMeasure(containerRef);
  const cellSize = containerWidth > 0
    ? (containerWidth - (columns - 1) * gap) / columns
    : 0;

  const placements = useMemo(
    () => packItems(items, columns, breakpoint),
    [items, columns, breakpoint]
  );

  return { placements, columns, breakpoint, cellSize };
}
