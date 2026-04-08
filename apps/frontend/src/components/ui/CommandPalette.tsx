/**
 * @file CommandPalette.tsx
 * @description Global search command palette (Cmd/Ctrl+K) for goals, activities, and quick actions
 * @module components/ui/CommandPalette
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Target, Activity, X, Plus, Calendar } from 'lucide-react';
import { useGoals } from '../../hooks/useGoals';
import { useActivities } from '../../hooks/useActivities';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

type SearchResult = {
  id: string;
  type: 'goal' | 'activity' | 'action';
  title: string;
  description?: string | undefined;
  url?: string;
  action?: () => void;
  icon: typeof Target;
};

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { data: goals = [] } = useGoals({ status: 'active' }, { enabled: isOpen });
  const { data: activitiesResponse } = useActivities({ limit: 20 }, { enabled: isOpen });

  // Handle result selection
  const handleSelect = useCallback((result: SearchResult) => {
    if (result.action) {
      result.action();
    } else if (result.url) {
      navigate(result.url);
      onClose();
    }
  }, [navigate, onClose]);

  // Filter and combine results
  const searchResults: SearchResult[] = useMemo(() => {
    const activities = activitiesResponse?.data || [];

    const quickActions: SearchResult[] = [
      {
        id: 'new-activity',
        type: 'action',
        title: 'Log Activity',
        description: 'Record a new activity',
        action: () => {
          onClose();
          // This will be handled by the UnifiedLogSheet in Phase B
          const event = new CustomEvent('open-log-sheet');
          window.dispatchEvent(event);
        },
        icon: Plus,
      },
      {
        id: 'new-goal',
        type: 'action',
        title: 'Create Goal',
        description: 'Set a new goal',
        url: '/goals/new',
        icon: Target,
      },
      {
        id: 'today',
        type: 'action',
        title: 'Go to Home',
        description: 'View today\'s activities',
        url: '/',
        icon: Calendar,
      },
    ];

    return [
      // Quick actions (always show if no query or matches query)
      ...quickActions.filter(
        (action) =>
          !query ||
          action.title.toLowerCase().includes(query.toLowerCase()) ||
          action.description?.toLowerCase().includes(query.toLowerCase())
      ),
      // Goals
      ...goals
        .filter((goal) => !query || goal.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5)
        .map((goal) => ({
          id: goal.id,
          type: 'goal' as const,
          title: goal.title,
          description: goal.description || undefined,
          url: `/goals/${goal.id}`,
          icon: Target,
        })),
      // Activities
      ...activities
        .filter((activity) => !query || activity.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5)
        .map((activity) => ({
          id: activity.id,
          type: 'activity' as const,
          title: activity.title,
          description: activity.activityDate || undefined,
          url: `/history`,
          icon: Activity,
        })),
    ];
  }, [query, goals, activitiesResponse, onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % searchResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
      } else if (e.key === 'Enter' && searchResults[selectedIndex]) {
        e.preventDefault();
        handleSelect(searchResults[selectedIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, searchResults, handleSelect, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      // Use requestAnimationFrame to defer state updates
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        setQuery('');
        setSelectedIndex(0);
      });
    }
  }, [isOpen]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Command Palette */}
      <div className="fixed top-[10vh] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4">
        <div className="bg-gray-900/95 backdrop-blur-md border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-800/50">
            <Search className="h-5 w-5 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search goals, activities, or type a command..."
              className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none"
            />
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white rounded transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {searchResults.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No results found
              </div>
            ) : (
              <div className="py-2">
                {searchResults.map((result, index) => {
                  const Icon = result.icon;
                  const isSelected = index === selectedIndex;

                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                        isSelected
                          ? 'bg-indigo-500/20 text-white'
                          : 'text-gray-300 hover:bg-gray-800/50'
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 shrink-0 ${
                          isSelected ? 'text-indigo-400' : 'text-gray-500'
                        }`}
                      />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{result.title}</div>
                        {result.description && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {result.description}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 uppercase tracking-wide">
                        {result.type}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2 border-t border-gray-800/50 flex items-center justify-between text-xs text-gray-500">
            <div className="flex gap-4">
              <span><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">↑↓</kbd> Navigate</span>
              <span><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">Enter</kbd> Select</span>
            </div>
            <span><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">Esc</kbd> Close</span>
          </div>
        </div>
      </div>
    </>
  );
}
