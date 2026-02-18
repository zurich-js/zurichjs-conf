import { useMemo, useState, useEffect, useSyncExternalStore, type RefObject } from "react";

// --- Types ---

export interface GridItemConfig {
  id: string;
  sizes: Record<string, { cols: number; rows: number }>;
  priority?: number;
}

export interface GridPackerOptions {
  columns: Record<string, number>;
  gap?: number;
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

// --- Breakpoint helper ---

const BREAKPOINTS: [string, number][] = [
  ["2xl", 1536],
  ["xl", 1280],
  ["lg", 1024],
  ["md", 768],
  ["sm", 640],
  ["base", 0],
];

function getBreakpoint(): string {
  if (typeof window === "undefined") return "base";
  const width = window.innerWidth;
  for (const [name, min] of BREAKPOINTS) {
    if (width >= min) return name;
  }
  return "base";
}

function subscribeToBreakpoint(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const queries = BREAKPOINTS.filter(([, min]) => min > 0).map(([, min]) =>
    window.matchMedia(`(min-width: ${min}px)`)
  );
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

// --- Container width measurement ---

function useContainerWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return width;
}

// --- Resolve size for active breakpoint ---

function resolveSize(
  sizes: Record<string, { cols: number; rows: number }>,
  activeBreakpoint: string
): { cols: number; rows: number } {
  const activeIndex = BREAKPOINTS.findIndex(([name]) => name === activeBreakpoint);
  for (let i = activeIndex; i < BREAKPOINTS.length; i++) {
    const key = BREAKPOINTS[i][0];
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
  const activeIndex = BREAKPOINTS.findIndex(([name]) => name === activeBreakpoint);
  for (let i = activeIndex; i < BREAKPOINTS.length; i++) {
    const key = BREAKPOINTS[i][0];
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
  const containerWidth = useContainerWidth(containerRef);
  const gap = options.gap ?? 0;
  const cellSize = containerWidth > 0
    ? (containerWidth - (columns - 1) * gap) / columns
    : 0;

  const placements = useMemo(
    () => packItems(items, columns, breakpoint),
    [items, columns, breakpoint]
  );

  return { placements, columns, breakpoint, cellSize };
}
