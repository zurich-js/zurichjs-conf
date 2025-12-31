/**
 * Partnership List Component
 * Displays a list of partnerships with filtering and actions
 * Mobile: Card-based layout, Desktop: Table layout
 */

import React from 'react';
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
import { useState } from 'react';
import type { Partnership, PartnershipType, PartnershipStatus } from './types';

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
  inactive: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  expired: 'bg-red-100 text-red-800',
};

export function PartnershipList({
  partnerships,
  onView,
  onEdit,
  onDelete,
  onEmail,
}: PartnershipListProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <Users className="mx-auto h-12 w-12 text-black" />
        <h3 className="mt-2 text-sm font-medium text-black">No partnerships</h3>
        <p className="mt-1 text-sm text-black">
          Get started by creating a new partnership.
        </p>
      </div>
    );
  }

  // Mobile Card View
  const MobileCardView = () => (
    <div className="space-y-3 md:hidden">
      {partnerships.map((partnership) => {
        const Icon = TYPE_ICONS[partnership.type];
        return (
          <div
            key={partnership.id}
            className="bg-white rounded-lg border border-gray-200 p-4 text-black"
          >
            {/* Header with name and menu */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-black" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-black truncate">
                    {partnership.name}
                  </p>
                  {partnership.company_name && (
                    <p className="text-xs text-black/60 truncate">
                      {partnership.company_name}
                    </p>
                  )}
                </div>
              </div>
              <div className="relative flex-shrink-0">
                <button
                  onClick={() =>
                    setOpenMenuId(openMenuId === partnership.id ? null : partnership.id)
                  }
                  className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
                >
                  <MoreVertical className="h-4 w-4 text-black" />
                </button>

                {openMenuId === partnership.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setOpenMenuId(null)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      <button
                        onClick={() => {
                          onView(partnership);
                          setOpenMenuId(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-black hover:bg-gray-100 flex items-center cursor-pointer"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </button>
                      <button
                        onClick={() => {
                          onEdit(partnership);
                          setOpenMenuId(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-black hover:bg-gray-100 flex items-center cursor-pointer"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          onEmail(partnership);
                          setOpenMenuId(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-black hover:bg-gray-100 flex items-center cursor-pointer"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </button>
                      {partnership.company_website && (
                        <a
                          href={partnership.company_website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full px-4 py-2 text-left text-sm text-black hover:bg-gray-100 flex items-center cursor-pointer"
                          onClick={() => setOpenMenuId(null)}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Visit Website
                        </a>
                      )}
                      <hr className="my-1" />
                      <button
                        onClick={() => {
                          onDelete(partnership);
                          setOpenMenuId(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {TYPE_LABELS[partnership.type]}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[partnership.status]}`}
              >
                {partnership.status.charAt(0).toUpperCase() + partnership.status.slice(1)}
              </span>
            </div>

            {/* Contact Info */}
            <div className="text-sm mb-3">
              <p className="text-black font-medium">{partnership.contact_name}</p>
              <p className="text-black/60 text-xs truncate">{partnership.contact_email}</p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                onClick={() => copyTrackingUrl(partnership)}
                className="inline-flex items-center text-sm text-black hover:text-black cursor-pointer"
              >
                {copiedId === partnership.id ? (
                  <>
                    <Check className="h-4 w-4 mr-1 text-green-600" />
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    <span className="font-mono text-xs">{partnership.utm_source}</span>
                  </>
                )}
              </button>
              <button
                onClick={() => onView(partnership)}
                className="text-sm text-black font-medium hover:underline cursor-pointer"
              >
                View Details
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Desktop Table View
  const DesktopTableView = () => (
    <div className="hidden md:block bg-white rounded-lg border border-gray-200 text-black overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
              Partnership
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
              Contact
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
              Tracking
            </th>
            <th className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {partnerships.map((partnership) => {
            const Icon = TYPE_ICONS[partnership.type];
            return (
              <tr key={partnership.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-black" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-black">
                        {partnership.name}
                      </div>
                      {partnership.company_name && (
                        <div className="text-sm text-black">
                          {partnership.company_name}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {TYPE_LABELS[partnership.type]}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[partnership.status]}`}
                  >
                    {partnership.status.charAt(0).toUpperCase() + partnership.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-black">{partnership.contact_name}</div>
                  <div className="text-sm text-black">{partnership.contact_email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => copyTrackingUrl(partnership)}
                    className="inline-flex items-center text-sm text-black hover:text-black cursor-pointer"
                  >
                    {copiedId === partnership.id ? (
                      <>
                        <Check className="h-4 w-4 mr-1 text-green-600" />
                        <span className="text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        <span className="font-mono text-xs">{partnership.utm_source}</span>
                      </>
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="relative">
                    <button
                      onClick={() =>
                        setOpenMenuId(openMenuId === partnership.id ? null : partnership.id)
                      }
                      className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
                    >
                      <MoreVertical className="h-4 w-4 text-black" />
                    </button>

                    {openMenuId === partnership.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                          <button
                            onClick={() => {
                              onView(partnership);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-black hover:bg-gray-100 flex items-center cursor-pointer"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </button>
                          <button
                            onClick={() => {
                              onEdit(partnership);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-black hover:bg-gray-100 flex items-center cursor-pointer"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              onEmail(partnership);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-black hover:bg-gray-100 flex items-center cursor-pointer"
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </button>
                          {partnership.company_website && (
                            <a
                              href={partnership.company_website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full px-4 py-2 text-left text-sm text-black hover:bg-gray-100 flex items-center cursor-pointer"
                              onClick={() => setOpenMenuId(null)}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Visit Website
                            </a>
                          )}
                          <hr className="my-1" />
                          <button
                            onClick={() => {
                              onDelete(partnership);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <MobileCardView />
      <DesktopTableView />
    </>
  );
}
