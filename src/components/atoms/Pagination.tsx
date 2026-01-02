/**
 * Pagination Component
 * Reusable pagination with page numbers, navigation, and page size selector
 * Supports light and dark variants for different contexts
 */

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Select } from './Select';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  totalItems?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  showItemCount?: boolean;
  showPageSizeSelector?: boolean;
  showFirstLastButtons?: boolean;
  variant?: 'light' | 'dark';
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize = 10,
  totalItems = 0,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  showItemCount = true,
  showPageSizeSelector = false,
  showFirstLastButtons = true,
  variant = 'light',
}: PaginationProps) {
  // Hide pagination if only 1 page and no page size selector
  if (totalPages <= 1 && !showPageSizeSelector) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers to show
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((page) => {
      if (page === 1 || page === totalPages) return true;
      if (Math.abs(page - currentPage) <= 1) return true;
      return false;
    })
    .reduce<(number | 'ellipsis')[]>((acc, page, idx, arr) => {
      if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
        acc.push('ellipsis');
      }
      acc.push(page);
      return acc;
    }, []);

  const pageSizeSelectOptions = pageSizeOptions.map((size) => ({
    value: String(size),
    label: String(size),
  }));

  // Variant-based styles
  const styles = {
    light: {
      text: 'text-gray-600',
      textMuted: 'text-gray-400',
      button: 'border border-gray-300 hover:bg-gray-50 text-gray-700',
      buttonActive: 'bg-[#F1E271] text-black border-transparent',
      buttonDisabled: 'opacity-50 cursor-not-allowed',
    },
    dark: {
      text: 'text-brand-gray-light',
      textMuted: 'text-brand-gray-medium',
      button: 'bg-brand-gray-dark text-brand-gray-light hover:text-white',
      buttonActive: 'bg-brand-primary text-black',
      buttonDisabled: 'opacity-50 cursor-not-allowed',
    },
  };

  const s = styles[variant];

  const borderClass = variant === 'dark' ? 'border-brand-gray-dark' : 'border-gray-200';

  return (
    <div className={`mt-6 pt-6 border-t ${borderClass} flex flex-col sm:flex-row items-center justify-between gap-4`}>
      <div className="flex items-center gap-4">
        {showItemCount && totalItems > 0 && (
          <span className={`text-sm ${s.text}`}>
            Showing <span className="font-medium">{startItem}</span> -{' '}
            <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{totalItems}</span>
          </span>
        )}
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className={`text-sm ${s.text}`}>Show:</span>
            <Select
              value={String(pageSize)}
              onChange={(value) => onPageSizeChange(Number(value))}
              options={pageSizeSelectOptions}
              variant={variant === 'light' ? 'default' : 'dark'}
              size="sm"
              anchor="top"
              compact
              className="w-16"
            />
          </div>
        )}
      </div>

      <nav className="flex items-center gap-1" aria-label="Pagination">
        {/* First page button */}
        {showFirstLastButtons && (
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${s.button} ${
              currentPage === 1 ? s.buttonDisabled : ''
            }`}
            aria-label="First page"
            title="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        )}

        {/* Previous button */}
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${s.button} ${
            currentPage === 1 ? s.buttonDisabled : ''
          }`}
          aria-label="Previous page"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page numbers */}
        <div className="hidden sm:flex items-center gap-1">
          {pages.map((page, index) =>
            page === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className={`px-2 ${s.textMuted}`}>
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`min-w-[40px] h-10 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  currentPage === page ? s.buttonActive : s.button
                }`}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </button>
            )
          )}
        </div>

        {/* Mobile page indicator */}
        <span className={`sm:hidden px-4 py-2 text-sm ${s.text}`}>
          Page {currentPage} of {totalPages}
        </span>

        {/* Next button */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${s.button} ${
            currentPage === totalPages ? s.buttonDisabled : ''
          }`}
          aria-label="Next page"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last page button */}
        {showFirstLastButtons && (
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${s.button} ${
              currentPage === totalPages ? s.buttonDisabled : ''
            }`}
            aria-label="Last page"
            title="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        )}
      </nav>
    </div>
  );
}
