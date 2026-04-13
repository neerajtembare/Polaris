/**
 * @file components/activities/SmartInputBar.tsx
 * @description The primary input interface for Polaris.
 *   Users type or speak naturally, and the system parses and confirms.
 *   Parse/save logic lives in hooks/use-activity-input.ts.
 *   This component handles input state, voice recording UI, and rendering.
 *
 * @module @polaris/frontend/components/activities
 *
 * @dependencies
 * - hooks/use-activity-input (parse → confirm → save logic)
 * - hooks/useVoiceActivity (voice pipeline)
 * - hooks/useVoiceRecorder (browser MediaRecorder)
 *
 * @relatedFiles
 * - src/hooks/use-activity-input.ts
 * - src/components/activities/ParsedActivityCard.tsx
 */

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Mic, Send, Sparkles } from 'lucide-react';
import { useVoiceStatus } from '../../hooks/useVoiceActivity';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { useActivityInput } from '../../hooks/use-activity-input';
import { ParsedActivityCard } from './ParsedActivityCard';
import { GoalSuggestionCard } from './GoalSuggestionCard';

export function SmartInputBar() {
  const [input, setInput]     = useState('');
  const inputRef              = useRef<HTMLInputElement>(null);

  const {
    parsedResult,
    isAiParsing,
    isSaving,
    goals,
    handleSubmitInput,
    handleVoiceBlob,
    handleSave,
    handleCreateGoal,
    handleLogAsActivity,
    handleDismiss,
    isVoiceProcessing,
  } = useActivityInput();

  const { data: voiceStatus }   = useVoiceStatus();
  const { state: recorderState, startRecording, stopRecording, duration } = useVoiceRecorder({
    onAudioReady: (blob) => { void handleVoiceBlob(blob); },
  });

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Listen for 'open-log-sheet' event from CommandPalette
  useEffect(() => {
    const handler = () => { inputRef.current?.focus(); };
    window.addEventListener('open-log-sheet', handler);
    return () => window.removeEventListener('open-log-sheet', handler);
  }, []);

  const onSubmit = () => {
    const text = input.trim();
    if (!text) return;
    void handleSubmitInput(text);
    setInput('');
  };

  const handleMicClick = () => {
    if (recorderState === 'recording') stopRecording();
    else if (recorderState === 'idle') void startRecording();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(); }
    if (e.key === 'Escape')               { handleDismiss(); setInput(''); }
  };

  const isRecording  = recorderState === 'recording';
  const isProcessing = isAiParsing || isVoiceProcessing || recorderState === 'processing';
  const showAiBadge  = isAiParsing && !isVoiceProcessing;

  return (
    <div className="space-y-3">
      {/* Input bar */}
      <div className={`flex items-center gap-2 bg-gray-900/80 backdrop-blur-md border rounded-xl px-4 py-3 transition-colors ${
        isRecording
          ? 'border-red-500/60 shadow-lg shadow-red-500/10'
          : 'border-gray-800 hover:border-gray-700 focus-within:border-indigo-500/60'
      }`}>
        {/* Mic button */}
        {(voiceStatus?.available ?? false) && (
          <button
            onClick={handleMicClick}
            className={`p-2 rounded-lg transition-all shrink-0 ${
              isRecording
                ? 'bg-red-500/20 text-red-400 animate-pulse'
                : 'text-gray-400 hover:text-indigo-400 hover:bg-gray-800/50'
            }`}
            aria-label={isRecording ? `Stop recording (${duration}s)` : 'Start voice input'}
          >
            <Mic className="h-5 w-5" />
          </button>
        )}

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={isRecording ? `Recording... ${duration}s` : input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRecording}
          placeholder="What did you do? e.g. read 30 pages, ran 5km, saved ₹500..."
          className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm disabled:text-red-400"
          autoComplete="off"
        />

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-block w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-500">
              {isVoiceProcessing ? 'Transcribing…' : isAiParsing ? 'AI parsing…' : 'Parsing…'}
            </span>
          </div>
        )}

        {/* Submit button */}
        {input.trim() && !isProcessing && (
          <button
            onClick={onSubmit}
            className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/30 rounded-lg transition-colors shrink-0"
            aria-label="Parse and log"
          >
            <Send className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Parsed result card — branches on intent */}
      {parsedResult && parsedResult.intent === 'create_goal' ? (
        <GoalSuggestionCard
          title={parsedResult.title}
          value={parsedResult.value}
          unit={parsedResult.unit}
          onCreateGoal={handleCreateGoal}
          onLogAsActivity={handleLogAsActivity}
          onDismiss={handleDismiss}
        />
      ) : parsedResult ? (
        <div className="relative">
          <ParsedActivityCard
            parsed={parsedResult}
            goals={goals}
            onSave={(fields) => void handleSave(fields)}
            onDismiss={handleDismiss}
            isSaving={isSaving}
          />
          {showAiBadge && (
            <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-indigo-900/60 border border-indigo-700/50 rounded-lg">
              <Sparkles className="h-3 w-3 text-indigo-400 animate-pulse" />
              <span className="text-xs text-indigo-300">AI refining…</span>
            </div>
          )}
        </div>
      ) : null}

      {/* Keyboard hint */}
      {!parsedResult && !input && (
        <div className="text-center">
          <span className="text-xs text-gray-600">
            Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-500 text-xs">Enter</kbd> to parse
            {(voiceStatus?.available ?? false) && ' · Click mic for voice'}
            <span className="hidden md:inline"> · <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-500 text-xs">N</kbd> to focus</span>
          </span>
        </div>
      )}
    </div>
  );
}

