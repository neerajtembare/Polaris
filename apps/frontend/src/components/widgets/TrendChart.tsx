/**
 * @file components/widgets/TrendChart.tsx
 * @description Area chart showing daily activity count trend over a period.
 *   Uses Recharts AreaChart with an indigo gradient fill.
 * @module @polaris/frontend/components/widgets
 *
 * @dependencies
 * - recharts (AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer)
 * - date-fns (parseISO, format)
 *
 * @relatedFiles
 * - src/pages/Home.tsx
 * - src/hooks/useMetrics.ts
 */

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { parseISO, format } from 'date-fns';
import type { MetricsPeriod } from '../../hooks/useMetrics';

interface TrendChartProps {
  activityByDay: Record<string, number>;
  period: MetricsPeriod;
}

interface DataPoint {
  label: string;
  count: number;
}

/** Format date label based on period granularity */
function formatLabel(dateStr: string, period: MetricsPeriod): string {
  const d = parseISO(dateStr);
  if (period === 'year') return format(d, 'MMM');
  if (period === 'month') return format(d, 'MMM d');
  return format(d, 'EEE');
}

/** Custom tooltip shown on hover */
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const count = payload[0]?.value ?? 0;
  return (
    <div className="bg-gray-900 border border-gray-700/60 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400">{label}</p>
      <p className="text-indigo-300 font-semibold mt-0.5">{count} {count === 1 ? 'activity' : 'activities'}</p>
    </div>
  );
}

/**
 * Renders a smooth area chart of daily activity counts.
 * Data is derived from the `activityByDay` map from DashboardMetrics.
 */
export function TrendChart({ activityByDay, period }: TrendChartProps) {
  const data = useMemo<DataPoint[]>(() => {
    const sorted = Object.entries(activityByDay)
      .sort(([a], [b]) => a.localeCompare(b));

    return sorted.map(([dateStr, count]) => ({
      label: formatLabel(dateStr, period),
      count,
    }));
  }, [activityByDay, period]);

  const maxCount = useMemo(() => Math.max(...data.map((d) => d.count), 1), [data]);

  if (data.length === 0) {
    return (
      <div className="glass px-5 py-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Activity Trend</p>
        <div className="flex items-center justify-center h-24 text-gray-600 text-sm">
          No data for this period
        </div>
      </div>
    );
  }

  return (
    <div className="glass px-5 py-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Activity Trend</p>

      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -32 }}>
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, maxCount]}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 2' }} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#trendGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#6366f1', stroke: '#0e0e13', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
