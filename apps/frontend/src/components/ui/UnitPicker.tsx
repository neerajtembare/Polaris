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
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-indigo-500 hover:text-white',
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
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-indigo-500 hover:text-white',
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
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      )}
    </div>
  );
}
