/**
 * @file components/widgets/EnhancedHeatmap.tsx
 * @description GitHub-style activity heatmap built with CSS grid.
 *   Shows one cell per day, colored by activity intensity.
 *   No external chart library — pure Tailwind + inline styles.
 * @module @polaris/frontend/components/widgets
 *
 * @dependencies
 * - date-fns (eachDayOfInterval, parseISO, format, startOfWeek, getDay)
 *
 * @relatedFiles
 * - src/pages/Home.tsx
 * - src/hooks/useMetrics.ts
 */

import { useMemo, useState } from 'react';
import {
  eachDayOfInterval,
  parseISO,
  format,
  startOfWeek,
  getDay,
  isToday,
} from 'date-fns';

interface EnhancedHeatmapProps {
  activityByDay: Record<string, number>;
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
}

interface DayCell {
  date: Date;
  dateStr: string;
  count: number;
}

/** Map count → visual intensity class */
function intensityClass(count: number): string {
  if (count === 0) return 'bg-gray-800/60';
  if (count === 1) return 'bg-indigo-900/80';
  if (count === 2) return 'bg-indigo-700/80';
  if (count <= 4) return 'bg-indigo-500/80';
  return 'bg-indigo-400';
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Renders a calendar-style heatmap of activity counts.
 * Organized in week columns (Sunday-first), coloured by count intensity.
 */
export function EnhancedHeatmap({ activityByDay, startDate, endDate }: EnhancedHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ dateStr: string; count: number; x: number; y: number } | null>(null);

  const { weeks, maxCount } = useMemo(() => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    // Build cells for every day in the range
    const days = eachDayOfInterval({ start, end }).map<DayCell>((date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return { date, dateStr, count: activityByDay[dateStr] ?? 0 };
    });

    const max = Math.max(...days.map((d) => d.count), 1);

    // Pad the start so the first week begins on Sunday
    const weekStart = startOfWeek(start, { weekStartsOn: 0 });
    const paddingDays = getDay(start);

    // Group into weeks of 7 days (padded nulls at the beginning)
    const padded: Array<DayCell | null> = [
      ...Array<null>(paddingDays).fill(null),
      ...days,
    ];

    const weekBuckets: Array<Array<DayCell | null>> = [];
    for (let i = 0; i < padded.length; i += 7) {
      weekBuckets.push(padded.slice(i, i + 7));
    }

    void weekStart; // suppress unused warning

    return { weeks: weekBuckets, maxCount: max };
  }, [activityByDay, startDate, endDate]);

  void maxCount; // used for future scaling if needed

  return (
    <div className="glass px-5 py-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Activity Heatmap</p>

      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {/* Day-of-week labels column */}
        <div className="flex flex-col gap-1 shrink-0 mr-1">
          {/* Blank header cell to align with week columns */}
          <div className="h-3" />
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="flex items-center justify-center w-3 h-3 text-[9px] text-gray-600 leading-none">
              {/* Only show Mon, Wed, Fri labels */}
              {[1, 3, 5].includes(i) ? label : ''}
            </div>
          ))}
        </div>

        {/* Week columns */}
        {weeks.map((week, wi) => {
          // Find the first non-null date in the week for the month label
          const firstDay = week.find((d) => d !== null);
          const showMonthLabel = firstDay && (wi === 0 || parseInt(format(firstDay.date, 'd')) <= 7);
          const monthLabel = firstDay && showMonthLabel ? format(firstDay.date, 'MMM') : '';

          return (
            <div key={wi} className="flex flex-col gap-1 shrink-0">
              {/* Month header */}
              <div className="h-3 text-[9px] text-gray-600 leading-none whitespace-nowrap">
                {monthLabel}
              </div>

              {/* Day cells */}
              {week.map((cell, di) => {
                if (!cell) {
                  return <div key={di} className="w-3 h-3" />;
                }

                const isTodayCell = isToday(cell.date);

                return (
                  <div
                    key={di}
                    className={`w-3 h-3 rounded-[2px] cursor-default transition-opacity hover:opacity-80 ${intensityClass(cell.count)} ${
                      isTodayCell ? 'ring-1 ring-indigo-400/60' : ''
                    }`}
                    onMouseEnter={(e) => {
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setTooltip({
                        dateStr: format(cell.date, 'MMM d, yyyy'),
                        count: cell.count,
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    aria-label={`${format(cell.date, 'MMM d')}: ${cell.count} activities`}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-[10px] text-gray-600 mr-1">Less</span>
        {[0, 1, 2, 3, 5].map((count) => (
          <div key={count} className={`w-3 h-3 rounded-[2px] ${intensityClass(count)}`} />
        ))}
        <span className="text-[10px] text-gray-600 ml-1">More</span>
      </div>

      {/* Floating tooltip (portal-free, fixed position) */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 border border-gray-700/60 rounded-lg px-2.5 py-1.5 text-xs shadow-xl pointer-events-none -translate-x-1/2 -translate-y-full -mt-2"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="text-gray-400">{tooltip.dateStr}</p>
          <p className="text-indigo-300 font-semibold">{tooltip.count} {tooltip.count === 1 ? 'activity' : 'activities'}</p>
        </div>
      )}
    </div>
  );
}
