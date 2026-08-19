/**
 * TicketApparelSection - Shows (and lets an admin edit) a ticket holder's t-shirt size
 * Hoodie size is shown read-only for VIP tickets, since it is part of the VIP package.
 */

import { useEffect, useState } from 'react';
import { Pencil, Shirt } from 'lucide-react';
import { Select } from '@/components/atoms';
import { useTicketApparel, useUpdateTicketTshirtSize } from '@/hooks/useTicketApparel';
import { APPAREL_SIZES, type ApparelSize } from '@/lib/types/ticket-constants';

/** Empty value represents "no size selected" and maps to null on save */
const NOT_SET = '';

const SIZE_OPTIONS = [
  { value: NOT_SET, label: 'Not set' },
  ...APPAREL_SIZES.map((size) => ({ value: size, label: size })),
];

interface TicketApparelSectionProps {
  ticketId: string;
  isVip: boolean;
}

export function TicketApparelSection({ ticketId, isVip }: TicketApparelSectionProps) {
  const { data, isLoading, error } = useTicketApparel(ticketId);
  const updateSize = useUpdateTicketTshirtSize(ticketId);

  const [isEditing, setIsEditing] = useState(false);
  const [draftSize, setDraftSize] = useState<string>(NOT_SET);

  const tshirtSize = data?.tshirtSize ?? null;

  // Keep the draft in sync when the fetched size arrives or changes elsewhere
  useEffect(() => {
    setDraftSize(tshirtSize ?? NOT_SET);
  }, [tshirtSize]);

  const startEditing = () => {
    setDraftSize(tshirtSize ?? NOT_SET);
    updateSize.reset();
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraftSize(tshirtSize ?? NOT_SET);
    updateSize.reset();
    setIsEditing(false);
  };

  const handleSave = () => {
    updateSize.mutate(draftSize === NOT_SET ? null : (draftSize as ApparelSize), {
      onSuccess: () => setIsEditing(false),
    });
  };

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <Shirt className="w-3.5 h-3.5" aria-hidden="true" />
        Apparel
      </h4>

      {isLoading ? (
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
      ) : error ? (
        <p className="text-sm text-red-600">{error.message}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">T-shirt Size</p>
            <p className="text-xs text-gray-400 mb-1">Size the attendee selected for their conference t-shirt</p>

            {isEditing ? (
              <div className="space-y-2">
                <Select
                  value={draftSize}
                  onChange={setDraftSize}
                  options={SIZE_OPTIONS}
                  size="sm"
                  placeholder="Select a size..."
                  disabled={updateSize.isPending}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={updateSize.isPending}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    {updateSize.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    disabled={updateSize.isPending}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                {updateSize.error && (
                  <p className="text-sm text-red-600" role="alert">
                    {updateSize.error.message}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${tshirtSize ? 'text-black' : 'text-gray-500'}`}>
                  {tshirtSize ?? 'Not set'}
                </span>
                <button
                  onClick={startEditing}
                  className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                  title="Edit t-shirt size"
                >
                  <Pencil className="w-4 h-4" aria-hidden="true" />
                  <span className="sr-only">Edit t-shirt size</span>
                </button>
              </div>
            )}
          </div>

          {isVip && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Hoodie Size</p>
              <p className="text-xs text-gray-400 mb-1">Included with the VIP package</p>
              <span className={`text-sm font-medium ${data?.hoodieSize ? 'text-black' : 'text-gray-500'}`}>
                {data?.hoodieSize ?? 'Not set'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
