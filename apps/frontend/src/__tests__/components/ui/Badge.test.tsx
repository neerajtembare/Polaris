/**
 * @file src/__tests__/components/ui/Badge.test.tsx
 * @description Tests for Badge UI components (TimeframeBadge, StatusBadge).
 * @module @polaris/frontend/test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimeframeBadge, StatusBadge } from '../../../components/ui/Badge.tsx';

// ---------------------------------------------------------------------------
// TimeframeBadge
// ---------------------------------------------------------------------------

describe('TimeframeBadge', () => {
  it('renders "Long-term" for timeframe=long', () => {
    render(<TimeframeBadge timeframe="long" />);
    expect(screen.getByText('Long-term')).toBeInTheDocument();
  });

  it('renders "Medium-term" for timeframe=medium', () => {
    render(<TimeframeBadge timeframe="medium" />);
    expect(screen.getByText('Medium-term')).toBeInTheDocument();
  });

  it('renders "Short-term" for timeframe=short', () => {
    render(<TimeframeBadge timeframe="short" />);
    expect(screen.getByText('Short-term')).toBeInTheDocument();
  });

  it('accepts an additional className', () => {
    const { container } = render(<TimeframeBadge timeframe="long" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

describe('StatusBadge', () => {
  const statuses = [
    'active', 'completed', 'paused', 'archived', 'planned', 'skipped',
  ] as const;

  for (const status of statuses) {
    it(`renders status "${status}" correctly`, () => {
      render(<StatusBadge status={status} />);
      // StatusBadge renders the raw status string (CSS handles `capitalize` styling)
      expect(screen.getByText(status)).toBeInTheDocument();
    });
  }
});
