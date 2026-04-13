/**
 * @file components/ui/UnitPicker.tsx
 * @description Chip-grid unit picker with a "custom" free-text fallback.
 *   Used on GoalCreate and LogActivityForm so users pick common units
 *   (hours, km, pages…) without typing, while still allowing any custom string.
 */

import { useState } from 'react';
import { PRESET_LABELS } from '../../lib/units.ts';

interface UnitPickerProps {
  value:    string;
  onChange: (unit: string) => void;
  /** Input id for accessibility */
  id?: string;
}

/**
 * Renders a scrollable row of preset chips plus a "Custom" chip that reveals
 * a free-text input. The active chip (or "Custom") is highlighted.
 */
export function UnitPicker({ value, onChange, id }: UnitPickerProps) {
  const isPreset  = PRESET_LABELS.includes(value);
  const [mode, setMode] = useState<'preset' | 'custom'>(
    value && !isPreset ? 'custom' : 'preset'
  );

  function selectPreset(label: string) {
    setMode('preset');
    onChange(label);
  }

  function switchToCustom() {
    setMode('custom');
    // keep current value if it was already custom, else clear
    if (isPreset) onChange('');
  }

  return (
    <div className="space-y-2">
      {/* Chip grid */}
      <div className="flex flex-wrap gap-1.5">
        {PRESET_LABELS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => selectPreset(label)}
            className={[
              'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
              mode === 'preset' && value === label
                ? 'bg-primary/15 dark:bg-dark-primary/20 border-primary/40 dark:border-dark-primary/30 text-primary dark:text-dark-primary'
                : 'bg-surface-container dark:bg-white/5 border-outline-variant/20 dark:border-white/10 text-on-surface dark:text-dark-on-surface hover:border-primary dark:hover:border-dark-primary',
            ].join(' ')}
          >
            {label}
          </button>
        ))}

        {/* Custom chip */}
        <button
          type="button"
          onClick={switchToCustom}
          className={[
            'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
            mode === 'custom'
              ? 'bg-primary/15 dark:bg-dark-primary/20 border-primary/40 dark:border-dark-primary/30 text-primary dark:text-dark-primary'
              : 'bg-surface-container dark:bg-white/5 border-outline-variant/20 dark:border-white/10 text-on-surface-variant dark:text-dark-on-surface-variant hover:border-primary dark:hover:border-dark-primary',
          ].join(' ')}
        >
          Custom…
        </button>
      </div>

      {/* Custom free-text input */}
      {mode === 'custom' && (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. sprints, litres, ₹"
          maxLength={50}
          autoFocus
          className="w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-on-surface dark:text-dark-on-surface placeholder-on-surface-variant/40 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:focus:ring-dark-primary/30 focus:border-transparent"
        />
      )}
    </div>
  );
}
