/**
 * @file components/activities/SmartInputBar.tsx
 * @description The primary input interface for Polaris.
 *   Users type or speak naturally, and the system parses and confirms.
 *   Uses local rule-based parsing first, then AI if available.
 *
 * @module @polaris/frontend/components/activities
 *
 * @dependencies
 * - lib/parse-input.ts (rule-based parser)
 * - hooks/useActivities (useCreateActivity)
 * - hooks/useGoals (useGoals)
 * - hooks/useVoiceActivity (voice pipeline)
 *
 * @relatedFiles
 * - src/components/activities/ParsedActivityCard.tsx
 * - src/pages/Home.tsx
 */

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Send, Sparkles } from 'lucide-react';
import { useCreateActivity } from '../../hooks/useActivities';
import { useGoals } from '../../hooks/useGoals';
import { useVoiceStatus, useVoiceActivity } from '../../hooks/useVoiceActivity';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { useAiParse } from '../../hooks/useAiParse';
import { parseInput, matchGoal } from '../../lib/parse-input';
import { ParsedActivityCard, type ParsedFields } from './ParsedActivityCard';
import { GoalSuggestionCard } from './GoalSuggestionCard';

function todayIso() {
  return new Date().toISOString().split('T')[0] as string;
}

export function SmartInputBar() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedFields | null>(null);
  const [isAiParsing, setIsAiParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Preserve original user text for rawInput — input state is cleared before save fires
  const rawInputRef = useRef('');

  const createActivity = useCreateActivity();
  const { data: goals = [] } = useGoals({ status: 'active' });
  const { data: voiceStatus } = useVoiceStatus();
  const { transcribeAndParse, isProcessing: isVoiceProcessing } = useVoiceActivity();
  const { state: recorderState, startRecording, stopRecording, duration } = useVoiceRecorder({
    onAudioReady: (blob) => {
      void handleVoiceBlob(blob);
    },
  });
  const { aiParse, isLoading: isAiLoading } = useAiParse();

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Listen for 'open-log-sheet' custom event from CommandPalette
  useEffect(() => {
    const handler = () => {
      inputRef.current?.focus();
    };
    window.addEventListener('open-log-sheet', handler);
    return () => window.removeEventListener('open-log-sheet', handler);
  }, []);

  const handleSubmitInput = async () => {
    const text = input.trim();
    if (!text) return;

    // Persist raw text before we clear input state
    rawInputRef.current = text;

    // Step 1: Local rule-based parse (instant)
    const localParsed = parseInput(text);
    const goalMatch = matchGoal(text, goals.map((g) => ({
      id: g.id,
      title: g.title,
      targetUnit: g.targetUnit,
    })));

    const parsedFields: ParsedFields = {
      intent:      localParsed.intent,
      title:       localParsed.title,
      activityType: localParsed.activityType,
      value:       localParsed.value,
      unit:        localParsed.unit,
      goalId:      goalMatch?.goalId ?? null,
      goalTitle:   goalMatch?.goalTitle ?? null,
      confidence:  localParsed.confidence,
      source:      'local',
    };

    // Show local result immediately
    setParsedResult({ ...parsedFields });

    // Step 2: AI upgrade — only fires when local confidence is below threshold
    setIsAiParsing(true);
    try {
      const aiResult = await aiParse(text, parsedFields.confidence);
      if (aiResult && aiResult.confidence > parsedFields.confidence) {
        setParsedResult({
          intent:       aiResult.intent,
          title:        aiResult.title,
          activityType: aiResult.activityType,
          value:        aiResult.value,
          unit:         aiResult.unit,
          goalId:       aiResult.goalId,
          goalTitle:    aiResult.goalTitle,
          confidence:   aiResult.confidence,
          source:       'ai',
        });
      }
    } finally {
      setIsAiParsing(false);
    }

    setInput('');
  };

  const handleVoiceBlob = async (blob: Blob) => {
    const result = await transcribeAndParse(blob);
    if (result) {
      setParsedResult({
        intent:       result.parsed.intent ?? 'log_activity',
        title:        result.parsed.title,
        activityType: result.parsed.activityType,
        value:        result.parsed.value,
        unit:         result.parsed.unit,
        goalId:       result.parsed.suggestedGoalId,
        goalTitle:    result.parsed.suggestedGoalTitle,
        confidence:   result.parsed.confidence,
        source:       'voice',
      });
    }
  };

  /** Navigate to /goals/new with pre-filled params from current parsedResult */
  const handleCreateGoal = () => {
    if (!parsedResult) return;
    const params = new URLSearchParams();
    params.set('title', parsedResult.title);
    if (parsedResult.unit) params.set('unit', parsedResult.unit);
    if (parsedResult.value !== null) params.set('target', String(parsedResult.value));
    setParsedResult(null);
    navigate(`/goals/new?${params.toString()}`);
  };

  /** Switch intent to log_activity so ParsedActivityCard renders */
  const handleLogAsActivity = () => {
    if (!parsedResult) return;
    setParsedResult({ ...parsedResult, intent: 'log_activity' });
  };

  const handleMicClick = () => {
    if (recorderState === 'recording') {
      stopRecording();
    } else if (recorderState === 'idle') {
      void startRecording();
    }
  };

  const handleSave = async (fields: ParsedFields) => {
    await createActivity.mutateAsync({
      title: fields.title,
      activityType: fields.activityType,
      activityDate: todayIso(),
      status: 'completed',
      ...(fields.value !== null ? { value: fields.value } : {}),
      ...(fields.unit ? { unit: fields.unit } : {}),
      ...(fields.goalId ? { goalId: fields.goalId } : {}),
      rawInput: rawInputRef.current || fields.title,
    });
    setParsedResult(null);
    setInput('');
    rawInputRef.current = '';
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmitInput();
    }
    if (e.key === 'Escape') {
      setParsedResult(null);
      setInput('');
    }
  };

  const isRecording = recorderState === 'recording';
  const isProcessing = isAiParsing || isAiLoading || isVoiceProcessing || recorderState === 'processing';
  const showAiBadge = (isAiParsing || isAiLoading) && !isVoiceProcessing;

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

        {/* Processing/AI indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-block w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-500">
              {isVoiceProcessing ? 'Transcribing…'
                : showAiBadge ? 'AI parsing…'
                : 'Parsing…'}
            </span>
          </div>
        )}

        {/* Submit button */}
        {input.trim() && !isProcessing && (
          <button
            onClick={() => void handleSubmitInput()}
            className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/30 rounded-lg transition-colors shrink-0"
            aria-label="Parse and log"
          >
            <Send className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Parsed result confirmation card — branches on intent */}
      {parsedResult && parsedResult.intent === 'create_goal' ? (
        <GoalSuggestionCard
          title={parsedResult.title}
          value={parsedResult.value}
          unit={parsedResult.unit}
          onCreateGoal={handleCreateGoal}
          onLogAsActivity={handleLogAsActivity}
          onDismiss={() => setParsedResult(null)}
        />
      ) : parsedResult ? (
        <div className="relative">
          <ParsedActivityCard
            parsed={parsedResult}
            goals={goals.map((g) => ({ id: g.id, title: g.title }))}
            onSave={(fields) => void handleSave(fields)}
            onDismiss={() => setParsedResult(null)}
            isSaving={createActivity.isPending}
          />
          {/* AI upgrading banner */}
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
