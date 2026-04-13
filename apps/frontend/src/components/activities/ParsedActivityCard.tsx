/**
 * @file components/activities/ParsedActivityCard.tsx
 * @description Inline confirmation card shown after input is parsed.
 *   Displays parsed fields with edit capability. User reviews and saves.
 *
 * @module @polaris/frontend/components/activities
 *
 * @relatedFiles
 * - src/components/activities/SmartInputBar.tsx
 * - src/lib/parse-input.ts
 */

import { useState } from 'react';
import { Check, X, Pencil, Target } from 'lucide-react';
import type { ActivityType, UserIntent } from '@polaris/shared';

export interface ParsedFields {
  intent:       UserIntent;
  title: string;
  activityType: ActivityType;
  value: number | null;
  unit: string | null;
  goalId: string | null;
  goalTitle: string | null;
  confidence: number;
  source: 'ai' | 'local' | 'voice';
  tags?: string[];
}

interface ParsedActivityCardProps {
  parsed: ParsedFields;
  goals: Array<{ id: string; title: string }>;
  onSave: (fields: ParsedFields) => void;
  onDismiss: () => void;
  isSaving: boolean;
}

const TYPE_LABELS: Record<ActivityType, string> = {
  quantity: 'Qty',
  duration: 'Duration',
  completion: 'Done',
};

function formatValue(value: number | null, unit: string | null): string {
  if (value === null) return 'Completed';
  if (unit) return `${value} ${unit}`;
  return String(value);
}

function confidenceColor(c: number): string {
  if (c >= 0.8) return 'text-emerald-400';
  if (c >= 0.6) return 'text-amber-400';
  return 'text-red-400';
}

function sourceIcon(source: ParsedFields['source']): string {
  switch (source) {
    case 'ai': return '✨';
    case 'voice': return '🎤';
    case 'local': return '⚡';
  }
}

export function ParsedActivityCard({
  parsed,
  goals,
  onSave,
  onDismiss,
  isSaving,
}: ParsedActivityCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [fields, setFields] = useState<ParsedFields>(parsed);

  const handleSave = () => {
    onSave(fields);
  };

  if (isEditing) {
    return (
      <div className="bg-gray-800/80 backdrop-blur-sm border border-indigo-700/40 rounded-xl p-4 space-y-3 animate-fade-in">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Edit Activity</span>
          <button
            onClick={() => setIsEditing(false)}
            className="text-gray-500 hover:text-white transition-colors p-1"
            aria-label="Cancel edit"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <input
          type="text"
          value={fields.title}
          onChange={(e) => setFields((p) => ({ ...p, title: e.target.value }))}
          placeholder="Activity title"
          className="w-full bg-gray-900/50 border border-gray-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors"
        />

        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            min={0}
            step="any"
            value={fields.value ?? ''}
            onChange={(e) =>
              setFields((p) => ({
                ...p,
                value: e.target.value ? parseFloat(e.target.value) : null,
                activityType: e.target.value ? (p.activityType === 'completion' ? 'quantity' : p.activityType) : p.activityType,
              }))
            }
            placeholder="Amount"
            className="bg-gray-900/50 border border-gray-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors"
          />

          <input
            type="text"
            value={fields.unit ?? ''}
            onChange={(e) => setFields((p) => ({ ...p, unit: e.target.value || null }))}
            placeholder="Unit"
            className="bg-gray-900/50 border border-gray-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors"
          />

          <select
            value={fields.goalId ?? ''}
            onChange={(e) => {
              const goal = goals.find((g) => g.id === e.target.value);
              setFields((p) => ({
                ...p,
                goalId: e.target.value || null,
                goalTitle: goal?.title ?? null,
              }));
            }}
            className="bg-gray-900/50 border border-gray-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors"
          >
            <option value="">No goal</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setIsEditing(false)}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!fields.title.trim() || isSaving}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Check className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm border border-indigo-700/40 rounded-xl p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm" aria-hidden="true">{sourceIcon(parsed.source)}</span>
            <span className={`text-xs font-medium ${confidenceColor(parsed.confidence)}`}>
              {Math.round(parsed.confidence * 100)}% match
            </span>
            <span className="text-xs text-gray-600">&middot;</span>
            <span className="text-xs text-gray-500">{TYPE_LABELS[fields.activityType]}</span>
          </div>

          <p className="text-white font-medium text-sm">
            {fields.title}
            {fields.value !== null && (
              <span className="text-indigo-400 ml-2 font-normal">
                {formatValue(fields.value, fields.unit)}
              </span>
            )}
          </p>

          {fields.goalTitle && (
            <div className="flex items-center gap-1.5 mt-1">
              <Target className="h-3 w-3 text-gray-500" />
              <span className="text-xs text-gray-400">{fields.goalTitle}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
            aria-label="Edit activity"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDismiss}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
            aria-label="Save activity"
          >
            {isSaving ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
