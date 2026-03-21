/**
 * @file prisma/seed.ts
 * @description Seed the database with realistic 90-day sample data.
 *   Creates 4 goals and ~200 activities spread across the last 90 days so
 *   the dashboard heatmap, streaks, and goal-progress charts all have
 *   meaningful data to display.
 *
 *   Run via:  npx tsx prisma/seed.ts
 *   Or via:   npm run db:seed   (in apps/backend)
 *
 * @notes
 *   - Idempotent: deletes existing seed data before re-inserting (checks by title prefix)
 *   - Does NOT wipe user-created data — only rows with titles starting with [Seed]
 *   - Safe to run multiple times
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return a YYYY-MM-DD string for `daysAgo` days before today */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0] as string;
}

/** Return a random integer between min and max (inclusive) */
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Pick a random element from an array */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

// ---------------------------------------------------------------------------
// Goal definitions
// ---------------------------------------------------------------------------

const GOAL_DEFS = [
  {
    title:       '[Seed] Read 7200 pages this year',
    description: 'Average ~2 books/month × 300 pages — steady reading habit',
    timeframe:   'long',
    targetValue: 7200,
    targetUnit:  'pages',
    status:      'active',
  },
  {
    title:       '[Seed] Run 500 km this year',
    description: 'Build to 10 km per week and maintain',
    timeframe:   'long',
    targetValue: 500,
    targetUnit:  'km',
    status:      'active',
  },
  {
    title:       '[Seed] Save ₹1,00,000 this year',
    description: 'Cut discretionary spend, invest surplus',
    timeframe:   'long',
    targetValue: 100000,
    targetUnit:  '₹',
    status:      'active',
  },
  {
    title:       '[Seed] Study Python — 100 hours',
    description: 'Work through official tutorial + two projects',
    timeframe:   'medium',
    targetValue: 100,
    targetUnit:  'hours',
    status:      'active',
  },
] as const;

// ---------------------------------------------------------------------------
// Activity templates per goal
// ---------------------------------------------------------------------------

type GoalKey = 'reading' | 'running' | 'savings' | 'python';

interface ActivityTemplate {
  titles:       string[];
  activityType: 'quantity' | 'duration' | 'completion';
  valueFn:      () => number;
  unit:         string;
}

const TEMPLATES: Record<GoalKey, ActivityTemplate> = {
  reading: {
    titles:       ['Reading session', 'Read before bed', 'Morning read', 'Lunch read'],
    activityType: 'quantity',
    valueFn:      () => rand(15, 45),   // pages per session
    unit:         'pages',
  },
  running: {
    titles:       ['Morning run', 'Evening jog', 'Park run', 'Long run', 'Short run'],
    activityType: 'quantity',
    valueFn:      () => parseFloat((rand(30, 120) / 10).toFixed(1)),  // 3–12 km
    unit:         'km',
  },
  savings: {
    titles:       ['Skipped lunch out', 'No impulse buy', 'Transferred to savings', 'Saved on groceries'],
    activityType: 'quantity',
    valueFn:      () => rand(100, 2000) * 10,  // ₹1000–₹20000
    unit:         '₹',
  },
  python: {
    titles:       ['Python study', 'Worked on project', 'Completed lesson', 'Practiced functions', 'Read docs'],
    activityType: 'duration',
    valueFn:      () => rand(30, 120) / 60,    // 0.5–2 hours (stored as hours)
    unit:         'hours',
  },
};

// ---------------------------------------------------------------------------
// Build activity schedule
// ---------------------------------------------------------------------------

/**
 * Decide which goals get activities on a given day offset.
 * Simulates realistic human variation: some days nothing, some days 3+ things.
 */
function scheduleForDay(daysBack: number): GoalKey[] {
  const goals: GoalKey[] = [];

  // Reading: ~5 days/week
  if (Math.random() < 0.72) goals.push('reading');
  // Running: ~3 days/week, skip Sundays (offset % 7 === 0 is "Sunday" approx)
  if (Math.random() < 0.42 && daysBack % 7 !== 0) goals.push('running');
  // Savings: ~2 days/week
  if (Math.random() < 0.28) goals.push('savings');
  // Python: ~4 days/week, skip weekends (crude approximation)
  if (Math.random() < 0.57 && daysBack % 7 !== 0 && daysBack % 7 !== 6) goals.push('python');

  return goals;
}

// ---------------------------------------------------------------------------
// Status distribution (makes heatmap + stats interesting)
// ---------------------------------------------------------------------------

function chooseStatus(daysBack: number): 'completed' | 'skipped' | 'planned' {
  if (daysBack === 0) {
    // Today: mix of planned and completed
    return Math.random() < 0.5 ? 'completed' : 'planned';
  }
  // Past: mostly completed, some skipped
  const r = Math.random();
  if (r < 0.78) return 'completed';
  if (r < 0.93) return 'skipped';
  return 'planned';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌱 Seeding Polaris sample data...\n');

  // ---- Cleanup previous seed data ----
  const deleted = await prisma.activity.deleteMany({
    where: { title: { startsWith: '[Seed]' } },
  });
  const deletedGoals = await prisma.goal.deleteMany({
    where: { title: { startsWith: '[Seed]' } },
  });
  if (deleted.count > 0 || deletedGoals.count > 0) {
    console.log(`  Removed ${deletedGoals.count} old seed goals and ${deleted.count} old seed activities`);
  }

  // ---- Create goals ----
  const goals = await Promise.all(
    GOAL_DEFS.map((g) =>
      prisma.goal.create({
        data: {
          title:       g.title,
          description: g.description,
          timeframe:   g.timeframe,
          targetValue: g.targetValue,
          targetUnit:  g.targetUnit,
          status:      g.status,
        },
      })
    )
  );

  const [readingGoal, runningGoal, savingsGoal, pythonGoal] = goals as [
    typeof goals[0], typeof goals[0], typeof goals[0], typeof goals[0]
  ];

  console.log(`  Created ${goals.length} goals`);

  // Map goal key → goal id
  const goalIdMap: Record<GoalKey, string> = {
    reading: readingGoal.id,
    running: runningGoal.id,
    savings: savingsGoal.id,
    python:  pythonGoal.id,
  };

  // ---- Create activities ----
  let activityCount = 0;

  // Use a fixed seed-like sequence for determinism (Math.random is fine for seed data)
  for (let d = 89; d >= 0; d--) {
    const dateStr  = daysAgo(d);
    const goalKeys = scheduleForDay(d);

    for (const key of goalKeys) {
      const tpl    = TEMPLATES[key];
      const status = chooseStatus(d);
      const value  = tpl.valueFn();

      await prisma.activity.create({
        data: {
          title:        `[Seed] ${pick(tpl.titles)}`,
          activityType: tpl.activityType,
          value,
          unit:         tpl.unit,
          goalId:       goalIdMap[key],
          activityDate: new Date(`${dateStr}T09:00:00.000Z`),
          category:     'growth',
          status,
          completedAt:  status === 'completed' ? new Date(`${dateStr}T10:00:00.000Z`) : null,
        },
      });
      activityCount++;
    }
  }

  console.log(`  Created ${activityCount} activities across 90 days`);

  // ---- Summary stats ----
  const completedCount = await prisma.activity.count({
    where: { status: 'completed', title: { startsWith: '[Seed]' } },
  });
  console.log(`  Completed: ${completedCount} | Total: ${activityCount}`);

  console.log('\n✅ Seed complete. Open http://localhost:5173/dashboard to see the data.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
