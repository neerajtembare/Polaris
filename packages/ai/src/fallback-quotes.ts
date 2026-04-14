/**
 * @file fallback-quotes.ts
 * @description Motivational quotes shown when AI is unavailable.
 *   Indexed by day-of-year so the same quote repeats on the same day.
 * @module @polaris/ai
 */

const QUOTES: string[] = [
  "Small daily improvements compound into extraordinary results over time.",
  "Progress is not always visible — but every effort moves you forward.",
  "The goal is not to be perfect. The goal is to be consistent.",
  "You don't have to be great to start, but you have to start to be great.",
  "Discipline is choosing between what you want now and what you want most.",
  "One focused hour today beats ten distracted hours tomorrow.",
  "What you do every day matters more than what you do once in a while.",
  "Energy flows where attention goes — choose your focus carefully.",
  "A river cuts through rock not because of its power, but its persistence.",
  "Don't wait for motivation. Action creates motivation.",
  "Show up. Even when it's hard. Especially when it's hard.",
  "The best time to start was yesterday. The second best time is now.",
  "You are closer than you think. Keep going.",
  "Clarity comes from engagement, not from thought alone.",
  "Rest if you must, but don't you quit.",
  "Every expert was once a beginner who refused to give up.",
  "Do something today that your future self will thank you for.",
  "Success is built in the quiet moments no one else sees.",
  "The secret of getting ahead is getting started.",
  "Your habits are votes for the person you are becoming.",
  "Big goals are just a series of small goals completed consistently.",
  "Momentum builds from the smallest action taken today.",
  "You are not behind. You are exactly where your effort has taken you.",
  "Focus on progress, not perfection.",
  "Difficult roads often lead to beautiful destinations.",
  "Measure your success by how much you grow, not by where you stand.",
  "One step forward, every day, is still moving forward.",
  "The hardest part is always starting. You've already done that.",
  "Patience, persistence, and perspiration make an unbeatable combination.",
  "Today's effort is tomorrow's foundation.",
  "You earned your streak through consistency — protect it today.",
  "Progress is the best motivator. Notice how far you've come.",
  "Every goal you've hit started as an intention on a day like this.",
  "The body achieves what the mind believes.",
  "Don't compare your chapter one to someone else's chapter twenty.",
  "Consistent small wins build unshakeable confidence.",
  "What can you do in the next 30 minutes that moves you forward?",
  "Effort today, results tomorrow. Patience is a strategy.",
  "You don't need more time — you need fewer distractions.",
  "A bad day of training still beats a good day of inaction.",
  "Courage is starting even when you can't see the whole staircase.",
  "Progress over perfection, always.",
  "Goals without action are just wishes — make it real today.",
  "Your future self is counting on you right now.",
  "Routine is the architecture of achievement.",
  "Let your work speak louder than your intentions.",
  "The only limit on what you can achieve is what you believe you can achieve.",
  "One more day of consistency compounds indefinitely.",
  "Start where you are. Use what you have. Do what you can.",
];

/**
 * Returns a quote based on today's day-of-year.
 * The same day always returns the same quote for consistency.
 */
export function getQuoteForToday(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86_400_000);
  return QUOTES[dayOfYear % QUOTES.length] as string;
}
