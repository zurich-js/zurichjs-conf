import { useRef } from "react";
import { useGridPacker, type GridItemConfig, type GridPackerOptions, type PlacedItem } from "@/hooks/useGridPacker";
import type { ReactNode } from "react";
import { clsx } from "clsx";

interface PackedGridProps {
  items: GridItemConfig[];
  columns: GridPackerOptions["columns"];
  gap?: string;
  renderItem: (item: GridItemConfig, placement: PlacedItem) => ReactNode;
  className?: string;
}

export function PackedGrid({
  items,
  columns,
  gap,
  renderItem,
  className,
}: PackedGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { placements, columns: activeColumns, cellSize } = useGridPacker(
    items,
    { columns },
    containerRef
  );

  const itemMap = new Map(items.map((item) => [item.id, item]));

  return (
    <div
      ref={containerRef}
      className={clsx('PackedGrid', gap, className)}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${activeColumns}, 1fr)`,
        ...(cellSize > 0 ? { gridAutoRows: `${cellSize}px` } : {}),
      }}
    >
      {placements.map((placement) => {
        const item = itemMap.get(placement.id);
        if (!item) return null;
        return (
          <div
            key={placement.id}
            style={{
              gridColumn: `${placement.col} / span ${placement.colSpan}`,
              gridRow: `${placement.row} / span ${placement.rowSpan}`,
            }}
          >
            {renderItem(item, placement)}
          </div>
        );
      })}
    </div>
  );
}
