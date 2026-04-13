/**
 * @file components/widgets/WeeklyInsights.tsx
 * @description AI-generated weekly behavioral insights card for the Home dashboard.
 *   Calls POST /api/ai/analyze-week and displays summary + insights + suggestions.
 *   Gracefully hidden when AI provider is 'mock' (mock returns a template, we still show it).
 *   Shows a skeleton while loading, nothing on error.
 *
 * @module @polaris/frontend/components/widgets
 *
 * @relatedFiles
 *   - src/hooks/useWeeklyInsights.ts
 *   - src/pages/Home.tsx
 */

import { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Lightbulb, ArrowRight, RefreshCw } from 'lucide-react';
import { useWeeklyInsights } from '../../hooks/useWeeklyInsights';
import { Skeleton } from '../ui/Skeleton';

export function WeeklyInsights() {
  const { data, isFetching, isError, refetch } = useWeeklyInsights();
  const [expanded, setExpanded] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  function handleGenerate() {
    setHasRequested(true);
    setExpanded(true);
    void refetch();
  }

  return (
    <section className="glass rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          <h2 className="text-sm font-medium text-white">AI Weekly Insights</h2>
          {data && (
            <span className="text-xs text-gray-600 bg-gray-800/60 px-1.5 py-0.5 rounded">
              {data.provider}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Re-run button — only visible after first request */}
          {hasRequested && !isFetching && (
            <button
              onClick={handleGenerate}
              className="text-gray-500 hover:text-gray-300 transition-colors"
              aria-label="Regenerate insights"
              title="Regenerate"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
          {data && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-gray-500 hover:text-gray-300 transition-colors"
              aria-label={expanded ? 'Collapse insights' : 'Expand insights'}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {!hasRequested ? (
        /* Idle state — user hasn't asked for analysis yet */
        <div className="flex flex-col items-center gap-3 py-3">
          <p className="text-xs text-gray-500 text-center">
            Get AI-generated observations and suggestions based on your past week.
          </p>
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Generate weekly insights
          </button>
        </div>
      ) : isFetching ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      ) : isError ? (
        <p className="text-xs text-red-400">Could not generate insights. Check that Ollama is running.</p>
      ) : data ? (
        <>
          <p className="text-sm text-gray-300 leading-relaxed">{data.summary}</p>

          {expanded && (
            <>
              {/* Insights */}
              {data.insights.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Lightbulb className="h-3 w-3" /> Observations
                  </p>
                  <ul className="space-y-1.5">
                    {data.insights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500/60 shrink-0" />
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {data.suggestions.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                    <ArrowRight className="h-3 w-3" /> This week, try
                  </p>
                  <ul className="space-y-1.5">
                    {data.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500/60 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {!expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              See insights & suggestions →
            </button>
          )}
        </>
      ) : null}
    </section>
  );
}
