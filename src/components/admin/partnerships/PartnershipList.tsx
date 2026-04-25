/**
 * Partnership List Component
 * Displays a list of partnerships with filtering and actions
 * Mobile: Card-based layout, Desktop: Table layout
 */

import React, { useState, useMemo } from 'react';
import { createColumnHelper, type ColumnDef, type SortingState, type Updater } from '@tanstack/react-table';
import Image from 'next/image';
import {
  Building2,
  Users,
  User,
  Award,
  MoreVertical,
  Eye,
  Edit,
  Mail,
  Trash2,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { Pagination } from '@/components/atoms';
import { AdminDataTable, AdminMobileCard } from '@/components/admin/common';
import type { Partnership, PartnershipType, PartnershipStatus } from './types';

const ITEMS_PER_PAGE = 10;

interface PartnershipListProps {
  partnerships: Partnership[];
  onView: (partnership: Partnership) => void;
  onEdit: (partnership: Partnership) => void;
  onDelete: (partnership: Partnership) => void;
  onEmail: (partnership: Partnership) => void;
}

const TYPE_ICONS: Record<PartnershipType, typeof Building2> = {
  community: Users,
  individual: User,
  company: Building2,
  sponsor: Award,
};

const TYPE_LABELS: Record<PartnershipType, string> = {
  community: 'Community',
  individual: 'Individual',
  company: 'Company',
  sponsor: 'Sponsor',
};

const STATUS_COLORS: Record<PartnershipStatus, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-text-brand-gray-lightest text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  expired: 'bg-red-100 text-red-800',
};

const columnHelper = createColumnHelper<Partnership>();

export function PartnershipList({
  partnerships,
  onView,
  onEdit,
  onDelete,
  onEmail,
}: PartnershipListProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);

  const sortedPartnerships = useMemo(() => {
    const [rule] = sorting;
    const next = [...partnerships];

    if (!rule) return next;

    const direction = rule.desc ? -1 : 1;
    next.sort((a, b) => {
      if (rule.id === 'type') return TYPE_LABELS[a.type].localeCompare(TYPE_LABELS[b.type]) * direction;
      if (rule.id === 'status') return a.status.localeCompare(b.status) * direction;
      if (rule.id === 'contact') return (a.contact_name || '').localeCompare(b.contact_name || '') * direction;
      return a.name.localeCompare(b.name) * direction;
    });

    return next;
  }, [partnerships, sorting]);

  // Pagination
  const totalPages = Math.ceil(sortedPartnerships.length / ITEMS_PER_PAGE);
  const paginatedPartnerships = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedPartnerships.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedPartnerships, currentPage]);

  // Reset to page 1 when partnerships change (e.g., filters applied)
  React.useEffect(() => {
    setCurrentPage(1);
  }, [partnerships.length, sorting]);

  const copyTrackingUrl = (partnership: Partnership) => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      utm_source: partnership.utm_source,
      utm_medium: partnership.utm_medium,
      utm_campaign: partnership.utm_campaign,
    });
    const url = `${baseUrl}?${params.toString()}`;
    navigator.clipboard.writeText(url);
    setCopiedId(partnership.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (partnerships.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-brand-gray-lightest">
        <Users className="mx-auto h-12 w-12 text-black" />
        <h3 className="mt-2 text-sm font-medium text-black">No partnerships</h3>
        <p className="mt-1 text-sm text-black">
          Get started by creating a new partnership.
        </p>
      </div>
    );
  }
  const handleSortingChange = (updater: Updater<SortingState>) => {
    setSorting((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater;
      return next.slice(0, 1);
    });
  };

  const columns = [
    columnHelper.accessor('name', {
      header: 'Partnership',
      enableSorting: true,
      size: 280,
      cell: ({ row }) => {
        const partnership = row.original;
        const Icon = TYPE_ICONS[partnership.type];

        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-text-brand-gray-lightest">
              {partnership.company_logo_url ? (
                <Image
                  src={partnership.company_logo_url}
                  alt={`${partnership.name} logo`}
                  width={40}
                  height={40}
                  className="h-full w-full object-contain p-1"
                  unoptimized={partnership.company_logo_url.endsWith('.svg') || partnership.company_logo_url.endsWith('.gif')}
                />
              ) : (
                <Icon className="h-5 w-5 text-black" />
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium text-black">{partnership.name}</div>
              {partnership.company_name ? <div className="truncate text-sm text-brand-gray-dark">{partnership.company_name}</div> : null}
            </div>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: 'type',
      header: 'Type',
      enableSorting: true,
      size: 140,
      cell: ({ row }) => (
        <span className="inline-flex rounded-full bg-text-brand-gray-lightest px-2.5 py-1 text-xs font-medium text-gray-800">
          {TYPE_LABELS[row.original.type]}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'status',
      header: 'Status',
      enableSorting: true,
      size: 140,
      cell: ({ row }) => (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[row.original.status]}`}>
          {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'contact',
      header: 'Contact',
      enableSorting: true,
      size: 220,
      cell: ({ row }) => (
        <div>
          <div className="text-sm text-black">{row.original.contact_name}</div>
          <div className="text-sm text-brand-gray-dark">{row.original.contact_email}</div>
        </div>
      ),
    }),
    columnHelper.display({
      id: 'tracking',
      header: 'Tracking',
      enableSorting: false,
      size: 140,
      cell: ({ row }) => (
        <button
          onClick={(event) => {
            event.stopPropagation();
            copyTrackingUrl(row.original);
          }}
          className="inline-flex items-center gap-1 text-sm text-black"
        >
          {copiedId === row.original.id ? (
            <>
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span className="font-mono text-xs">{row.original.utm_source}</span>
            </>
          )}
        </button>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      size: 80,
      cell: ({ row }) => (
        <ActionsMenu
          partnership={row.original}
          isOpen={openMenuId === row.original.id}
          onToggle={() => setOpenMenuId(openMenuId === row.original.id ? null : row.original.id)}
          onClose={() => setOpenMenuId(null)}
          onView={onView}
          onEdit={onEdit}
          onEmail={onEmail}
          onDelete={onDelete}
        />
      ),
    }),
  ] as Array<ColumnDef<Partnership, unknown>>;

  return (
    <AdminDataTable
      data={paginatedPartnerships}
      columns={columns}
      sorting={sorting}
      onSortingChange={handleSortingChange}
      onRowClick={onView}
      mobileList={{
        renderCard: (partnership) => {
          const Icon = TYPE_ICONS[partnership.type];

          return (
            <AdminMobileCard key={partnership.id}>
              <div className="mb-3 flex items-start justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-text-brand-gray-lightest">
                    {partnership.company_logo_url ? (
                      <Image
                        src={partnership.company_logo_url}
                        alt={`${partnership.name} logo`}
                        width={40}
                        height={40}
                        className="h-full w-full object-contain p-1"
                        unoptimized={partnership.company_logo_url.endsWith('.svg') || partnership.company_logo_url.endsWith('.gif')}
                      />
                    ) : (
                      <Icon className="h-5 w-5 text-black" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-black">{partnership.name}</p>
                    {partnership.company_name ? <p className="truncate text-xs text-black/60">{partnership.company_name}</p> : null}
                  </div>
                </div>
                <ActionsMenu
                  partnership={partnership}
                  isOpen={openMenuId === partnership.id}
                  onToggle={() => setOpenMenuId(openMenuId === partnership.id ? null : partnership.id)}
                  onClose={() => setOpenMenuId(null)}
                  onView={onView}
                  onEdit={onEdit}
                  onEmail={onEmail}
                  onDelete={onDelete}
                />
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                <span className="inline-flex rounded-full bg-text-brand-gray-lightest px-2.5 py-0.5 text-xs font-medium text-gray-800">
                  {TYPE_LABELS[partnership.type]}
                </span>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[partnership.status]}`}>
                  {partnership.status.charAt(0).toUpperCase() + partnership.status.slice(1)}
                </span>
              </div>

              <div className="mb-3 text-sm">
                <p className="font-medium text-black">{partnership.contact_name}</p>
                <p className="truncate text-xs text-black/60">{partnership.contact_email}</p>
              </div>

              <div className="flex items-center justify-between border-t border-text-brand-gray-lightest pt-3">
                <button
                  onClick={() => copyTrackingUrl(partnership)}
                  className="inline-flex items-center gap-1 text-sm text-black"
                >
                  {copiedId === partnership.id ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span className="font-mono text-xs">{partnership.utm_source}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => onView(partnership)}
                  className="text-sm font-medium text-black hover:underline"
                >
                  View Details
                </button>
              </div>
            </AdminMobileCard>
          );
        },
      }}
      pagination={(
        totalPages > 1 ? (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={ITEMS_PER_PAGE}
            totalItems={sortedPartnerships.length}
            variant="light"
          />
        ) : null
      )}
    />
  );
}

function ActionsMenu({
  partnership,
  isOpen,
  onToggle,
  onClose,
  onView,
  onEdit,
  onEmail,
  onDelete,
}: {
  partnership: Partnership;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onView: (partnership: Partnership) => void;
  onEdit: (partnership: Partnership) => void;
  onEmail: (partnership: Partnership) => void;
  onDelete: (partnership: Partnership) => void;
}) {
  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button onClick={onToggle} className="rounded-lg p-2 hover:bg-text-brand-gray-lightest">
        <MoreVertical className="h-4 w-4 text-black" />
      </button>

      {isOpen ? (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-brand-gray-lightest bg-white py-1 shadow-lg">
            <button onClick={() => { onView(partnership); onClose(); }} className="flex w-full items-center px-4 py-2 text-left text-sm text-black hover:bg-text-brand-gray-lightest">
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </button>
            <button onClick={() => { onEdit(partnership); onClose(); }} className="flex w-full items-center px-4 py-2 text-left text-sm text-black hover:bg-text-brand-gray-lightest">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </button>
            <button onClick={() => { onEmail(partnership); onClose(); }} className="flex w-full items-center px-4 py-2 text-left text-sm text-black hover:bg-text-brand-gray-lightest">
              <Mail className="mr-2 h-4 w-4" />
              Send Email
            </button>
            {partnership.company_website ? (
              <a
                href={partnership.company_website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="flex w-full items-center px-4 py-2 text-left text-sm text-black hover:bg-text-brand-gray-lightest"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Visit Website
              </a>
            ) : null}
            <hr className="my-1" />
            <button onClick={() => { onDelete(partnership); onClose(); }} className="flex w-full items-center px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
