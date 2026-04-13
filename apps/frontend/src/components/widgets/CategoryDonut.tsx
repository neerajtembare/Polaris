/**
 * @file components/widgets/CategoryDonut.tsx
 * @description Donut chart showing completed vs planned vs skipped activity breakdown.
 *   Uses Recharts PieChart with innerRadius for the ring effect.
 * @module @polaris/frontend/components/widgets
 *
 * @dependencies
 * - recharts (PieChart, Pie, Cell, Tooltip, ResponsiveContainer)
 *
 * @relatedFiles
 * - src/pages/Home.tsx
 * - src/hooks/useMetrics.ts
 */

import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface CategoryDonutProps {
  completedActivities: number;
  plannedActivities: number;
  totalActivities: number;
}

interface Segment {
  name: string;
  value: number;
  color: string;
  textColor: string;
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  if (!item) return null;
  return (
    <div className="bg-gray-900 border border-gray-700/60 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400">{item.name}</p>
      <p className="text-white font-semibold">{item.value}</p>
    </div>
  );
}

/**
 * Donut ring showing activity status breakdown.
 * Segments: Completed (emerald) · Planned (indigo) · Skipped (gray)
 */
export function CategoryDonut({ completedActivities, plannedActivities, totalActivities }: CategoryDonutProps) {
  const skipped = Math.max(0, totalActivities - completedActivities - plannedActivities);

  const segments = useMemo<Segment[]>(() => {
    const raw: Segment[] = [
      { name: 'Completed', value: completedActivities, color: '#34d399', textColor: 'text-emerald-400' },
      { name: 'Planned',   value: plannedActivities,   color: '#6366f1', textColor: 'text-indigo-400'  },
      { name: 'Skipped',   value: skipped,             color: '#374151', textColor: 'text-gray-500'    },
    ];
    // Filter zero-value segments to avoid PieChart rendering issues
    return raw.filter((s) => s.value > 0);
  }, [completedActivities, plannedActivities, skipped]);

  const completionRate = totalActivities > 0
    ? Math.round((completedActivities / totalActivities) * 100)
    : 0;

  // If no data yet, render an empty ring placeholder
  const displaySegments = segments.length > 0
    ? segments
    : [{ name: 'None', value: 1, color: '#1f2937', textColor: 'text-gray-700' }];

  return (
    <div className="glass px-5 py-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Completion</p>

      <div className="flex items-center gap-4">
        {/* Donut ring */}
        <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={displaySegments}
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={38}
                dataKey="value"
                stroke="none"
                startAngle={90}
                endAngle={-270}
              >
                {displaySegments.map((seg, i) => (
                  <Cell key={i} fill={seg.color} />
                ))}
              </Pie>
              <Tooltip content={<DonutTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Center label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-base font-bold text-white tabular-nums">{completionRate}%</span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2 flex-1 min-w-0">
          {[
            { label: 'Completed', value: completedActivities, color: 'bg-emerald-400' },
            { label: 'Planned',   value: plannedActivities,   color: 'bg-indigo-400'  },
            { label: 'Skipped',   value: skipped,             color: 'bg-gray-600'    },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
              <span className="text-xs text-gray-400 flex-1">{label}</span>
              <span className="text-xs font-medium text-white tabular-nums">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
