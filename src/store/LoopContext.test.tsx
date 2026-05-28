import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoopProvider, useLoop } from '../store/LoopContext';
import { LoopConfig } from '../types';

const TEST_CONFIG: LoopConfig = {
  maxIterations: 5,
  iterationTimeout: 30000,
  stopCondition: 'manual',
  stopKeyword: '',
  stopThreshold: 0,
  autoContinueOnToolResult: true,
  exitStrategy: 'afterToolResult',
};

function TestComponent() {
  const {
    loopState,
    loopPaused,
    startLoop,
    pauseLoop,
    resumeLoop,
    cancelLoop,
    completeLoopIteration,
    resetLoop,
  } = useLoop();

  return (
    <div>
      <span data-testid="status">{loopState?.status || 'idle'}</span>
      <span data-testid="iteration">{loopState?.currentIteration ?? 0}</span>
      <span data-testid="paused">{loopPaused ? 'true' : 'false'}</span>
      <span data-testid="historyCount">{loopState?.history.length ?? 0}</span>

      <button onClick={() => startLoop('test prompt', TEST_CONFIG)}>Start</button>
      <button onClick={() => pauseLoop()}>Pause</button>
      <button onClick={() => resumeLoop()}>Resume</button>
      <button onClick={() => cancelLoop()}>Cancel</button>
      <button onClick={() => completeLoopIteration('input', 'output')}>Complete Iteration</button>
      <button onClick={() => resetLoop()}>Reset</button>
    </div>
  );
}

describe('LoopContext', () => {
  beforeEach(() => {
    // Clean up any existing loop state
  });

  it('starts with idle state', () => {
    render(
      <LoopProvider>
        <TestComponent />
      </LoopProvider>
    );

    expect(screen.getByTestId('status').textContent).toBe('idle');
    expect(screen.getByTestId('iteration').textContent).toBe('0');
    expect(screen.getByTestId('paused').textContent).toBe('false');
    expect(screen.getByTestId('historyCount').textContent).toBe('0');
  });

  it('starts a loop and updates state', async () => {
    const user = userEvent.setup();
    render(
      <LoopProvider>
        <TestComponent />
      </LoopProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Start' }));

    expect(screen.getByTestId('status').textContent).toBe('running');
    expect(screen.getByTestId('iteration').textContent).toBe('0');
    expect(screen.getByTestId('paused').textContent).toBe('false');
  });

  it('pauses and resumes a running loop', async () => {
    const user = userEvent.setup();
    render(
      <LoopProvider>
        <TestComponent />
      </LoopProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Start' }));
    await user.click(screen.getByRole('button', { name: 'Pause' }));

    expect(screen.getByTestId('status').textContent).toBe('paused');
    expect(screen.getByTestId('paused').textContent).toBe('true');

    await user.click(screen.getByRole('button', { name: 'Resume' }));

    expect(screen.getByTestId('status').textContent).toBe('running');
    expect(screen.getByTestId('paused').textContent).toBe('false');
  });

  it('cancels a running loop', async () => {
    const user = userEvent.setup();
    render(
      <LoopProvider>
        <TestComponent />
      </LoopProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Start' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByTestId('status').textContent).toBe('cancelled');
    expect(screen.getByTestId('paused').textContent).toBe('false');
  });

  it('completes iterations and tracks history', async () => {
    const user = userEvent.setup();
    render(
      <LoopProvider>
        <TestComponent />
      </LoopProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Start' }));

    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole('button', { name: 'Complete Iteration' }));
    }

    expect(screen.getByTestId('iteration').textContent).toBe('3');
    expect(screen.getByTestId('historyCount').textContent).toBe('3');
  });

  it('completes loop when maxIterations reached', async () => {
    const user = userEvent.setup();
    render(
      <LoopProvider>
        <TestComponent />
      </LoopProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Start' }));

    // Complete 5 iterations (maxIterations = 5)
    for (let i = 0; i < 5; i++) {
      await user.click(screen.getByRole('button', { name: 'Complete Iteration' }));
    }

    expect(screen.getByTestId('iteration').textContent).toBe('5');
    expect(screen.getByTestId('status').textContent).toBe('completed');
  });

  it('resets loop to idle state', async () => {
    const user = userEvent.setup();
    render(
      <LoopProvider>
        <TestComponent />
      </LoopProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Start' }));
    await user.click(screen.getByRole('button', { name: 'Complete Iteration' }));
    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByTestId('status').textContent).toBe('idle');
    expect(screen.getByTestId('iteration').textContent).toBe('0');
    expect(screen.getByTestId('historyCount').textContent).toBe('0');
  });

  it('throws when useLoop is used outside provider', () => {
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useLoop must be used within LoopProvider');
  });
});
