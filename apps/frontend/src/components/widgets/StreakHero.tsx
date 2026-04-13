/**
 * @file components/widgets/StreakHero.tsx
 * @description Prominent streak display with flame animation and longest-streak comparison.
 * @module @polaris/frontend/components/widgets
 *
 * @dependencies
 * - lucide-react (Flame, Award)
 * - framer-motion (animation)
 *
 * @relatedFiles
 * - src/pages/Home.tsx
 * - src/hooks/useMetrics.ts
 */

import { Flame, Award } from 'lucide-react';
import { motion } from 'framer-motion';

interface StreakHeroProps {
  currentStreak: number;
  longestStreak: number;
}

/**
 * Visually prominent streak card with animated flame icon.
 * Acts as the motivational anchor on the Home page.
 */
export function StreakHero({ currentStreak, longestStreak }: StreakHeroProps) {
  const isOnFire = currentStreak >= 3;
  const isRecord = currentStreak > 0 && currentStreak >= longestStreak;

  return (
    <div className="glass px-5 py-4 flex items-center gap-4">
      {/* Animated flame */}
      <motion.div
        animate={isOnFire ? { scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] } : {}}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        className={`flex items-center justify-center w-12 h-12 rounded-xl ${
          currentStreak > 0
            ? 'bg-orange-500/15 text-orange-400'
            : 'bg-gray-800/50 text-gray-600'
        }`}
      >
        <Flame className="h-6 w-6" />
      </motion.div>

      {/* Streak numbers */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white tabular-nums">
            {currentStreak}
          </span>
          <span className="text-sm text-gray-400">
            day{currentStreak !== 1 ? 's' : ''} streak
          </span>
        </div>

        <div className="flex items-center gap-3 mt-1">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Award className="h-3.5 w-3.5" />
            Best: {longestStreak}d
          </span>
          {isRecord && currentStreak > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/15 text-amber-400 rounded-full">
              NEW RECORD
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
