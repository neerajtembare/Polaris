/**
 * @file src/__tests__/components/ui/ProgressBar.test.tsx
 * @description Tests for ProgressBar, ErrorBoundary, and EmptyState components.
 * @module @polaris/frontend/test
 */

import { describe, it, expect, vi, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProgressBar } from '../../../components/ui/ProgressBar.tsx';
import { ErrorBoundary } from '../../../components/ui/ErrorBoundary.tsx';
import { EmptyState } from '../../../components/ui/EmptyState.tsx';

// ---------------------------------------------------------------------------
// ProgressBar
// ---------------------------------------------------------------------------

describe('ProgressBar', () => {
  it('renders a progressbar role element', () => {
    render(<ProgressBar percentage={50} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('sets aria-valuenow to the clamped percentage', () => {
    render(<ProgressBar percentage={75} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
  });

  it('clamps to 0 for negative values', () => {
    render(<ProgressBar percentage={-20} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('clamps to 100 for values over 100', () => {
    render(<ProgressBar percentage={120} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('renders the label when provided', () => {
    render(<ProgressBar percentage={50} label="50%" />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('does not render a label when omitted', () => {
    const { queryByText } = render(<ProgressBar percentage={50} />);
    // Should not find any percentage text
    expect(queryByText(/\d+%/)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ErrorBoundary
// ---------------------------------------------------------------------------

// Silent console.error for expected error boundary output
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

afterAll(() => consoleErrorSpy.mockRestore());

function ThrowOnRender({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test crash message');
  return <div>normal content</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowOnRender shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('normal content')).toBeInTheDocument();
  });

  it('renders the fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowOnRender shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test crash message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState icon="📋" title="Nothing here" description="Add something to get started." />);

    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Add something to get started.')).toBeInTheDocument();
  });

  it('renders the action when provided', async () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        icon="✅"
        title="All done"
        description="No pending items."
        action={<button onClick={onClick}>Add item</button>}
      />
    );

    const button = screen.getByRole('button', { name: /add item/i });
    expect(button).toBeInTheDocument();
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
