import type { ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type SortingState,
  type Updater,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminMobileList } from './AdminMobileCard';

interface AdminDataTableProps<TData> {
  data: TData[];
  columns: Array<ColumnDef<TData, unknown>>;
  sorting?: SortingState;
  onSortingChange?: (updater: Updater<SortingState>) => void;
  getRowId?: (row: TData, index: number, parent?: Row<TData>) => string;
  onRowClick?: (row: TData) => void;
  isLoading?: boolean;
  emptyState?: ReactNode;
  toolbar?: ReactNode;
  mobileList?: {
    renderCard: (row: TData, index: number) => ReactNode;
    emptyState?: ReactNode;
  };
  pagination?: ReactNode;
  className?: string;
  tableClassName?: string;
  rowClassName?: string | ((row: TData) => string);
}

function SortIcon({ state }: { state: false | 'asc' | 'desc' }) {
  if (state === 'asc') return <ArrowUp className="h-4 w-4 text-gray-700" />;
  if (state === 'desc') return <ArrowDown className="h-4 w-4 text-gray-700" />;
  return <ArrowUpDown className="h-4 w-4 text-brand-gray-medium" />;
}

export function AdminDataTable<TData>({
  data,
  columns,
  sorting = [],
  onSortingChange,
  getRowId,
  onRowClick,
  isLoading = false,
  emptyState,
  toolbar,
  mobileList,
  pagination,
  className,
  tableClassName,
  rowClassName,
}: AdminDataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    getCoreRowModel: getCoreRowModel(),
    onSortingChange,
    getRowId,
    manualSorting: true,
  });

  const rows = table.getRowModel().rows;
  const desktopColSpan = Math.max(columns.length, 1);

  return (
    <div className={cn('space-y-3', className)}>
      {toolbar}

      <div className="overflow-hidden rounded-xl border border-brand-gray-lightest bg-white shadow-sm">
        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <table className={cn('min-w-full divide-y divide-brand-gray-lightest', tableClassName)}>
              <thead className="bg-gray-50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const canSort = header.column.getCanSort();
                      const sortedState = header.column.getIsSorted();

                      return (
                        <th
                          key={header.id}
                          className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-brand-gray-dark"
                          style={{ width: header.getSize() === 150 ? undefined : header.getSize() }}
                        >
                          {header.isPlaceholder ? null : canSort ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className="inline-flex items-center gap-1.5 text-left transition-colors text-brand-gray-dark hover:text-black"
                            >
                              <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                              <SortIcon state={sortedState} />
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-brand-gray-lightest bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={desktopColSpan} className="px-4 py-12 text-center text-sm text-brand-gray-medium">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={desktopColSpan} className="px-4 py-12 text-center text-sm text-brand-gray-medium">
                      {emptyState ?? 'No results found.'}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                      className={cn(
                        'align-top transition-colors',
                        onRowClick ? 'cursor-pointer hover:bg-gray-50' : 'hover:bg-gray-50',
                        typeof rowClassName === 'function' ? rowClassName(row.original) : rowClassName
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-4 text-sm text-black">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {mobileList ? (
          <AdminMobileList rows={data} renderCard={mobileList.renderCard} emptyState={mobileList.emptyState} />
        ) : null}

        {pagination ? <div className="border-t border-brand-gray-lightest px-4 pb-4 pt-4 sm:px-5">{pagination}</div> : null}
      </div>
    </div>
  );
}
