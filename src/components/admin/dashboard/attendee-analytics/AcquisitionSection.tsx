/**
 * Acquisition Section
 * How attendees were acquired: channels, coupons, partnerships, velocity
 */

import { ShoppingCart, Tag, Handshake, TrendingUp, Info } from 'lucide-react';
import { Tooltip } from '@/components/atoms';
import type { AttendeeAcquisition } from '@/lib/types/attendee-analytics';

interface AcquisitionSectionProps {
  acquisition: AttendeeAcquisition;
  totalAttendees: number;
}

export function AcquisitionSection({ acquisition, totalAttendees }: AcquisitionSectionProps) {
  const { byChannel, velocity } = acquisition;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <ShoppingCart className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-black">Acquisition & Velocity</h3>
        <Tooltip content="How attendees purchased tickets and registration momentum.">
          <Info className="w-4 h-4 text-gray-400 cursor-help" />
        </Tooltip>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channels */}
        <div>
          <h4 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-gray-500" />
            Sales Channels
          </h4>
          <div className="space-y-2">
            <ChannelBar label="Individual" count={byChannel.individual} total={totalAttendees} color="bg-blue-400" />
            <ChannelBar label="B2B / Corporate" count={byChannel.b2b} total={totalAttendees} color="bg-indigo-400" />
            <ChannelBar label="Complimentary" count={byChannel.complimentary} total={totalAttendees} color="bg-gray-400" />
          </div>
        </div>

        {/* Velocity */}
        <div>
          <h4 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            Registration Velocity
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
              <div className="text-xl font-bold text-black">{velocity.thisWeek}</div>
              <div className="text-xs text-gray-500">This week</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
              <div className="text-xl font-bold text-black">{velocity.thisMonth}</div>
              <div className="text-xs text-gray-500">This month</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
              <div className="text-xl font-bold text-black">{velocity.avgPerWeek}</div>
              <div className="text-xs text-gray-500">Avg/week</div>
            </div>
          </div>
        </div>

        {/* Coupons */}
        {acquisition.topCoupons.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-500" />
              Coupon Codes ({acquisition.withCoupon} used)
            </h4>
            <div className="space-y-1.5">
              {acquisition.topCoupons.map(({ code, count }) => (
                <div key={code} className="flex items-center justify-between text-sm">
                  <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{code}</code>
                  <span className="font-medium text-black">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Partnerships */}
        {acquisition.topPartnerships.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
              <Handshake className="w-4 h-4 text-gray-500" />
              Partnerships ({acquisition.fromPartnerships} attendees)
            </h4>
            <div className="space-y-1.5">
              {acquisition.topPartnerships.map(({ partnershipId, count }) => (
                <div key={partnershipId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate">{partnershipId}</span>
                  <span className="font-medium text-black">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ChannelBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-medium text-black">{count} ({pct}%)</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
