/**
 * VIP Perks Table
 * Table listing all VIP perks with actions
 */

import React, { useState, useMemo } from 'react';
import { Copy, Check, Mail, XCircle, Search } from 'lucide-react';
import type { VipPerkWithTicket } from './types';

interface PerksTableProps {
  perks: VipPerkWithTicket[];
  onSendEmail: (perk: VipPerkWithTicket) => void;
  onDeactivate: (perkId: string) => void;
}

export function PerksTable({ perks, onSendEmail, onDeactivate }: PerksTableProps) {
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredPerks = useMemo(() => {
    if (!search) return perks;
    const q = search.toLowerCase();
    return perks.filter(
      (p) =>
        p.ticket.first_name.toLowerCase().includes(q) ||
        p.ticket.last_name.toLowerCase().includes(q) ||
        p.ticket.email.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q)
    );
  }, [perks, search]);

  const handleCopy = async (code: string, perkId: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(perkId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (perks.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500 text-sm">No VIP perks created yet. Use backfill or create individually.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Search */}
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Attendee</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Redeemed</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredPerks.map((perk) => (
              <tr key={perk.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">
                    {perk.ticket.first_name} {perk.ticket.last_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate max-w-[200px]">{perk.ticket.email}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{perk.code}</code>
                    <button
                      onClick={() => handleCopy(perk.code, perk.id)}
                      className="p-1 hover:bg-gray-100 rounded cursor-pointer"
                      title="Copy code"
                    >
                      {copiedId === perk.id ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {perk.is_active ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={perk.current_redemptions > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                    {perk.current_redemptions > 0 ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onSendEmail(perk)}
                      className="p-1.5 hover:bg-blue-50 rounded text-blue-600 cursor-pointer"
                      title="Send email"
                    >
                      <Mail className="h-4 w-4" />
                    </button>
                    {perk.is_active && (
                      <button
                        onClick={() => onDeactivate(perk.id)}
                        className="p-1.5 hover:bg-red-50 rounded text-red-500 cursor-pointer"
                        title="Deactivate"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredPerks.length === 0 && search && (
        <div className="p-6 text-center text-gray-500 text-sm">
          No perks match &ldquo;{search}&rdquo;
        </div>
      )}
    </div>
  );
}
