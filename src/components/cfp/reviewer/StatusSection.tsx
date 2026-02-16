/**
 * Status Section Component
 * Display and manage submission status (super_admin only)
 */

import { ChevronDown } from 'lucide-react';
import { STATUS_INFO, STATUS_ACTIONS } from './types';

interface StatusSectionProps {
  status: string;
  showActions: boolean;
  isUpdating: boolean;
  onToggleActions: () => void;
  onStatusChange: (newStatus: string) => void;
}

export function StatusSection({
  status,
  showActions,
  isUpdating,
  onToggleActions,
  onStatusChange,
}: StatusSectionProps) {
  const statusColorClass = {
    submitted: 'bg-blue-500/20 text-blue-300',
    under_review: 'bg-purple-500/20 text-purple-300',
    waitlisted: 'bg-orange-500/20 text-orange-300',
    accepted: 'bg-green-500/20 text-green-300',
    rejected: 'bg-red-500/20 text-red-300',
  }[status] || 'bg-gray-500/20 text-gray-300';

  const actionColorClass = (actionStatus: string) => {
    return {
      accepted: 'bg-green-500/10 border border-green-500/30 hover:bg-green-500/20',
      rejected: 'bg-red-500/10 border border-red-500/30 hover:bg-red-500/20',
      waitlisted: 'bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20',
      under_review: 'bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20',
    }[actionStatus] || 'bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20';
  };

  const actionTextClass = (actionStatus: string) => {
    return {
      accepted: 'text-green-300',
      rejected: 'text-red-300',
      waitlisted: 'text-orange-300',
      under_review: 'text-purple-300',
    }[actionStatus] || 'text-purple-300';
  };

  return (
    <section className="bg-brand-gray-dark rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-brand-gray-medium mb-2">Current Status</h2>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${statusColorClass}`}>
              {STATUS_INFO[status]?.label || status}
            </span>
            <span className="text-sm text-brand-gray-light">
              {STATUS_INFO[status]?.description}
            </span>
          </div>
        </div>
        <button
          onClick={onToggleActions}
          className="px-4 py-2 bg-brand-gray-darkest text-white rounded-lg text-sm font-medium hover:bg-brand-gray-medium transition-colors cursor-pointer inline-flex items-center gap-2"
        >
          Change Status
          <ChevronDown className={`w-4 h-4 transition-transform ${showActions ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showActions && (
        <div className="mt-4 pt-4 border-t border-brand-gray-medium">
          <p className="text-xs text-brand-gray-medium mb-3">Select a new status for this submission:</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(STATUS_ACTIONS)
              .filter(([actionStatus]) => actionStatus !== status)
              .map(([actionStatus, info]) => (
                <button
                  key={actionStatus}
                  onClick={() => onStatusChange(actionStatus)}
                  disabled={isUpdating}
                  className={`p-3 rounded-lg text-left transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${actionColorClass(actionStatus)}`}
                >
                  <div className={`font-medium text-sm ${actionTextClass(actionStatus)}`}>
                    {info.label}
                  </div>
                  <div className="text-xs text-brand-gray-light mt-1">
                    {info.description}
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </section>
  );
}
