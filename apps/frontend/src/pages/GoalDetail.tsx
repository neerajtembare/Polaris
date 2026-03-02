/**
 * @file pages/GoalDetail.tsx
 * @description Goal detail page showing full info, progress, and inline edit/delete.
 *   Read mode and edit mode are toggled in-place — no separate edit route needed.
 * @module @polaris/frontend/pages
 *
 * @dependencies
 * - react-router-dom (useParams, useNavigate, Link)
 * - hooks/useGoals (useGoal, useUpdateGoal, useDeleteGoal)
 * - components/layout/AppLayout
 * - components/ui/*
 *
 * @relatedFiles
 * - src/hooks/useGoals.ts
 * - src/pages/GoalsList.tsx
 * - src/App.tsx
 */

import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.tsx';
import { TimeframeBadge, StatusBadge } from '../components/ui/Badge.tsx';
import { ProgressBar } from '../components/ui/ProgressBar.tsx';
import { LoadingScreen } from '../components/ui/Spinner.tsx';
import { useGoal, useUpdateGoal, useDeleteGoal } from '../hooks/useGoals.ts';
import { ApiRequestError } from '../services/api.ts';
import type { GoalTimeframe, GoalStatus, UpdateGoalInput } from '@polaris/shared';

// ---------------------------------------------------------------------------
// Edit form state (separate from Goal type so all fields are strings for inputs)
// ---------------------------------------------------------------------------

interface EditFormState {
  title:       string;
  description: string;
  timeframe:   GoalTimeframe;
  targetValue: string;
  targetUnit:  string;
  targetDate:  string;
  status:      GoalStatus;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GoalDetail() {
  const { id = '' }  = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const updateGoal   = useUpdateGoal();
  const deleteGoal   = useDeleteGoal();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm,  setEditForm]  = useState<EditFormState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const { data: goal, isLoading, isError } = useGoal(id, { includeProgress: true });

  // ——— Enter edit mode ———
  function startEdit() {
    if (!goal) return;
    setEditForm({
      title:       goal.title,
      description: goal.description ?? '',
      timeframe:   goal.timeframe,
      targetValue: goal.targetValue?.toString() ?? '',
      targetUnit:  goal.targetUnit ?? '',
      targetDate:  goal.targetDate ?? '',
      status:      goal.status,
    });
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditForm(null);
    setEditError(null);
  }

  /** Update a field in the inline edit form */
  function handleEditChange(field: keyof EditFormState, value: string) {
    setEditForm((prev) => prev ? { ...prev, [field]: value } : prev);
    if (editError) setEditError(null);
  }

  // ——— Submit edit ———
  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editForm || !goal) return;
    setEditError(null);

    if (!editForm.title.trim()) {
      setEditError('Title is required.');
      return;
    }

    const update: UpdateGoalInput = {
      title:     editForm.title.trim(),
      timeframe: editForm.timeframe,
      status:    editForm.status,
      ...(editForm.description.trim()  ? { description: editForm.description.trim() }  : {}),
      ...(editForm.targetValue         ? { targetValue: Number(editForm.targetValue) } : { targetValue: null }),
      ...(editForm.targetUnit.trim()   ? { targetUnit: editForm.targetUnit.trim() }     : { targetUnit: null }),
      ...(editForm.targetDate          ? { targetDate: editForm.targetDate }            : { targetDate: null }),
    };

    try {
      await updateGoal.mutateAsync({ id: goal.id, data: update });
      setIsEditing(false);
      setEditForm(null);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setEditError(err.message);
      } else {
        setEditError('Something went wrong. Please try again.');
      }
    }
  }

  // ——— Delete ———
  async function handleDelete() {
    if (!goal) return;
    if (!window.confirm(`Delete "${goal.title}"? This cannot be undone.`)) return;
    await deleteGoal.mutateAsync(goal.id);
    navigate('/goals');
  }

  // ——— States ———
  if (isLoading) return <AppLayout><LoadingScreen /></AppLayout>;

  if (isError || !goal) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-6 py-8">
          <Link to="/goals" className="text-sm text-gray-400 hover:text-white transition-colors">
            ← Back to goals
          </Link>
          <div className="mt-8 rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
            Goal not found or failed to load.
          </div>
        </div>
      </AppLayout>
    );
  }

  const progress = goal.progress;

  // ——— Render ———
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Back link */}
        <Link to="/goals" className="text-sm text-gray-400 hover:text-white transition-colors">
          ← Back to goals
        </Link>

        {/* ——— VIEW MODE ——— */}
        {!isEditing && (
          <div className="mt-5">

            {/* Title + actions */}
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-bold text-white leading-tight">{goal.title}</h1>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={startEdit}
                  className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => void handleDelete()}
                  disabled={deleteGoal.isPending}
                  className="px-3 py-1.5 text-sm font-medium text-red-400 hover:text-white hover:bg-red-900/50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleteGoal.isPending ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>

            {/* Badges */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <TimeframeBadge timeframe={goal.timeframe} />
              <StatusBadge status={goal.status} />
            </div>

            {/* Description */}
            {goal.description && (
              <p className="mt-4 text-sm text-gray-300 leading-relaxed">{goal.description}</p>
            )}

            {/* Target + progress */}
            {goal.targetValue !== null && (
              <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                  Progress
                </p>
                {progress ? (
                  <>
                    <ProgressBar
                      percentage={progress.percentage ?? 0}
                      label={`${progress.percentage ?? 0}%`}
                      heightClass="h-2"
                    />
                    <div className="mt-3 grid grid-cols-3 gap-4 text-center">
                      <Stat label="Current"   value={`${progress.currentValue} ${goal.targetUnit ?? ''}`} />
                      <Stat label="Target"    value={`${goal.targetValue} ${goal.targetUnit ?? ''}`} />
                      <Stat label="Activities" value={String(progress.activityCount)} />
                    </div>
                    {progress.lastActivityDate && (
                      <p className="mt-3 text-xs text-gray-600 text-right">
                        Last activity: {progress.lastActivityDate}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No activities logged yet.</p>
                )}
              </div>
            )}

            {/* Metadata */}
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              {goal.targetDate && (
                <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-gray-500 mb-0.5">Target date</p>
                  <p className="text-white font-medium">{goal.targetDate}</p>
                </div>
              )}
              <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5">
                <p className="text-xs text-gray-500 mb-0.5">Created</p>
                <p className="text-white font-medium">
                  {new Date(goal.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

          </div>
        )}

        {/* ——— EDIT MODE ——— */}
        {isEditing && editForm && (
          <form
            onSubmit={(e) => void handleEditSubmit(e)}
            className="mt-5 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Edit goal</h2>
            </div>

            {editError && (
              <div className="rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
                {editError}
              </div>
            )}

            {/* Title */}
            <Field label="Title" required>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => handleEditChange('title', e.target.value)}
                maxLength={200}
                className={inputCls}
                autoFocus
              />
            </Field>

            {/* Description */}
            <Field label="Description">
              <textarea
                value={editForm.description}
                onChange={(e) => handleEditChange('description', e.target.value)}
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </Field>

            {/* Timeframe + Status */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Timeframe">
                <select
                  value={editForm.timeframe}
                  onChange={(e) => handleEditChange('timeframe', e.target.value)}
                  className={inputCls}
                >
                  <option value="long">Long-term</option>
                  <option value="medium">Medium-term</option>
                  <option value="short">Short-term</option>
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={editForm.status}
                  onChange={(e) => handleEditChange('status', e.target.value)}
                  className={inputCls}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </Field>
            </div>

            {/* Target value + unit */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Target value">
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={editForm.targetValue}
                  onChange={(e) => handleEditChange('targetValue', e.target.value)}
                  placeholder="e.g. 100"
                  className={inputCls}
                />
              </Field>
              <Field label="Unit">
                <input
                  type="text"
                  value={editForm.targetUnit}
                  onChange={(e) => handleEditChange('targetUnit', e.target.value)}
                  placeholder="e.g. km, pages"
                  maxLength={50}
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Target date */}
            <Field label="Target date">
              <input
                type="date"
                value={editForm.targetDate}
                onChange={(e) => handleEditChange('targetDate', e.target.value)}
                className={`${inputCls} [color-scheme:dark]`}
              />
            </Field>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateGoal.isPending}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {updateGoal.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        )}

      </div>
    </AppLayout>
  );
}

// ---------------------------------------------------------------------------
// Small sub-components (local to this page)
// ---------------------------------------------------------------------------

/** Single stat cell for the progress grid */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
    </div>
  );
}

/** Label wrapper for form fields */
function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

/** Shared Tailwind input/select/textarea class string */
const inputCls =
  'w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
