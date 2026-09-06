import { MessageSquareText, Star, Presentation, RadioTower } from 'lucide-react';
import type { AdminSessionFeedbackResponse } from '@/lib/feedback/types';

interface FeedbackStatsBarProps {
  totals: AdminSessionFeedbackResponse['totals'];
  sessionCount: number;
  isLive: boolean;
  lastUpdatedAt: number | null;
}

export function FeedbackStatsBar({ totals, sessionCount, isLive, lastUpdatedAt }: FeedbackStatsBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
        <MessageSquareText className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-black">{totals.responses} responses</span>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
        <Star className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-medium text-black">
          {totals.averageRating === null ? 'No ratings yet' : `${totals.averageRating.toFixed(1)} average`}
        </span>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
        <Presentation className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-black">
          {totals.sessionsWithFeedback} of {sessionCount} sessions rated
        </span>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm ml-auto">
        <RadioTower className={`w-4 h-4 ${isLive ? 'text-green-600' : 'text-gray-400'}`} />
        <span className="text-sm text-gray-600">
          {isLive ? 'Live · refreshing every 15s' : 'Paused'}
          {lastUpdatedAt ? (
            <span className="text-gray-400"> · updated {new Date(lastUpdatedAt).toLocaleTimeString('en-GB', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          ) : null}
        </span>
      </div>
    </div>
  );
}
