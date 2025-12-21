/**
 * Status Actions Section Component
 * Displays status update buttons for submissions
 */

import { Star, Check, Clock, X, Eye } from 'lucide-react';
import { STATUS_ACTIONS } from '@/lib/types/cfp-admin';

interface StatusActionsSectionProps {
  currentStatus: string;
  onUpdateStatus: (status: string) => void;
  isUpdating: boolean;
}

const PRIMARY_ACTIONS = [
  {
    status: 'shortlisted',
    icon: Star,
    activeClass: 'bg-indigo-100 text-indigo-800 border-2 border-indigo-500',
    defaultClass: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  },
  {
    status: 'accepted',
    icon: Check,
    activeClass: 'bg-green-100 text-green-800 border-2 border-green-500',
    defaultClass: 'bg-green-600 hover:bg-green-700 text-white',
  },
  {
    status: 'waitlisted',
    icon: Clock,
    activeClass: 'bg-orange-100 text-orange-800 border-2 border-orange-500',
    defaultClass: 'bg-orange-600 hover:bg-orange-700 text-white',
  },
  {
    status: 'rejected',
    icon: X,
    activeClass: 'bg-red-100 text-red-800 border-2 border-red-500',
    defaultClass: 'bg-red-600 hover:bg-red-700 text-white',
  },
  {
    status: 'under_review',
    icon: Eye,
    activeClass: 'bg-purple-100 text-purple-800 border-2 border-purple-500',
    defaultClass: 'border border-gray-300 hover:bg-gray-50 text-black',
  },
];

export function StatusActionsSection({ currentStatus, onUpdateStatus, isUpdating }: StatusActionsSectionProps) {
  return (
    <>
      {/* Primary Status Actions */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-4">Update Status</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {PRIMARY_ACTIONS.map(({ status, icon: Icon, activeClass, defaultClass }) => {
            const isActive = currentStatus === status;
            const action = STATUS_ACTIONS[status];
            return (
              <div key={status} className="flex flex-col">
                <button
                  onClick={() => onUpdateStatus(status)}
                  disabled={isUpdating || isActive}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center cursor-pointer ${
                    isActive ? activeClass : defaultClass
                  }`}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  {action?.action || status}
                </button>
                <p className="text-xs text-gray-500 mt-1.5 text-center">{action?.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Secondary Actions */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-4">Other Actions</h4>
        <div className="flex flex-wrap gap-4">
          {currentStatus !== 'draft' && (
            <div className="flex flex-col">
              <button
                onClick={() => onUpdateStatus('draft')}
                disabled={isUpdating}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Revert to Draft
              </button>
              <p className="text-xs text-gray-500 mt-1 max-w-[200px]">{STATUS_ACTIONS.draft?.description}</p>
            </div>
          )}
          {currentStatus !== 'withdrawn' && (
            <div className="flex flex-col">
              <button
                onClick={() => onUpdateStatus('withdrawn')}
                disabled={isUpdating}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Mark as Withdrawn
              </button>
              <p className="text-xs text-gray-500 mt-1 max-w-[200px]">{STATUS_ACTIONS.withdrawn?.description}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
