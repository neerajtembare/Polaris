/**
 * @file pages/GoalCreate.tsx
 * @description Create Goal form page.
 *   Controlled form with validation; submits via useCreateGoal mutation.
 *   Redirects to /goals on success.
 * @module @polaris/frontend/pages
 *
 * @dependencies
 * - react (useState)
 * - react-router-dom (useNavigate, Link)
 * - hooks/useGoals (useCreateGoal)
 * - services/api (ApiRequestError)
 * - components/layout/AppLayout
 *
 * @relatedFiles
 * - src/hooks/useGoals.ts
 * - src/services/api.ts
 * - src/App.tsx
 */

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.tsx';
import { useCreateGoal } from '../hooks/useGoals.ts';
import { ApiRequestError } from '../services/api.ts';
import type { GoalTimeframe } from '@polaris/shared';

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

interface FormState {
  title:       string;
  description: string;
  timeframe:   GoalTimeframe;
  targetValue: string;   // stored as string; parsed on submit
  targetUnit:  string;
  targetDate:  string;
}

const DEFAULT_FORM: FormState = {
  title:       '',
  description: '',
  timeframe:   'long',
  targetValue: '',
  targetUnit:  '',
  targetDate:  '',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GoalCreate() {
  const navigate   = useNavigate();
  const createGoal = useCreateGoal();

  const [form,  setForm]  = useState<FormState>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);

  /** Update a single form field */
  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }

    try {
      await createGoal.mutateAsync({
        title:       form.title.trim(),
        ...(form.description.trim() && { description: form.description.trim() }),
        timeframe:   form.timeframe,
        ...(form.targetValue && { targetValue: Number(form.targetValue) }),
        ...(form.targetUnit.trim() && { targetUnit: form.targetUnit.trim() }),
        ...(form.targetDate && { targetDate: form.targetDate }),
      });
      navigate('/goals');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    }
  }

  // ——— Render ———
  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-6">
          <Link to="/goals" className="text-sm text-gray-400 hover:text-white transition-colors">
            ← Back to goals
          </Link>
          <h1 className="text-2xl font-bold text-white mt-3">New goal</h1>
          <p className="text-sm text-gray-400 mt-0.5">Define something you want to achieve</p>
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">

          {/* Error banner */}
          {error && (
            <div className="rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="title">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g. Run 100km this year"
              maxLength={200}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="description">
              Description <span className="text-gray-600 font-normal">(optional)</span>
            </label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Why does this goal matter to you?"
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Timeframe */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="timeframe">
              Timeframe
            </label>
            <select
              id="timeframe"
              value={form.timeframe}
              onChange={(e) => handleChange('timeframe', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="long">Long-term (months / years)</option>
              <option value="medium">Medium-term (weeks / months)</option>
              <option value="short">Short-term (days / weeks)</option>
            </select>
          </div>

          {/* Target row: value + unit */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="targetValue">
                Target value <span className="text-gray-600 font-normal">(optional)</span>
              </label>
              <input
                id="targetValue"
                type="number"
                min={0}
                step="any"
                value={form.targetValue}
                onChange={(e) => handleChange('targetValue', e.target.value)}
                placeholder="e.g. 100"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="targetUnit">
                Unit <span className="text-gray-600 font-normal">(optional)</span>
              </label>
              <input
                id="targetUnit"
                type="text"
                value={form.targetUnit}
                onChange={(e) => handleChange('targetUnit', e.target.value)}
                placeholder="e.g. km, pages, reps"
                maxLength={50}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Target date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="targetDate">
              Target date <span className="text-gray-600 font-normal">(optional)</span>
            </label>
            <input
              id="targetDate"
              type="date"
              value={form.targetDate}
              onChange={(e) => handleChange('targetDate', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent [color-scheme:dark]"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Link
              to="/goals"
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createGoal.isPending}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {createGoal.isPending ? 'Creating…' : 'Create goal'}
            </button>
          </div>

        </form>
      </div>
    </AppLayout>
  );
}
