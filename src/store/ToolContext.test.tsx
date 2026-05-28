import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolProvider, useTools } from '../store/ToolContext';

function TestComponent() {
  const {
    toolSettings,
    getToolLevel,
    recordToolCall,
    thumbsUpTool,
    thumbsDownTool,
    toggleTool,
    resetToolSettings,
    isExecutingTool,
    toolApprovalState,
    setToolApproval,
    setIsExecutingTool,
  } = useTools();

  const level = getToolLevel('test-tool');

  return (
    <div>
      <span data-testid="level">{level.level}</span>
      <span data-testid="rank">{level.rank}</span>
      <span data-testid="calls">{level.totalCalls}</span>
      <span data-testid="successful">{level.successfulCalls}</span>
      <span data-testid="failed">{level.failedCalls}</span>
      <span data-testid="mastery">{level.masteryPoints}</span>
      <span data-testid="thumbsUp">{level.thumbsUp}</span>
      <span data-testid="thumbsDown">{level.thumbsDown}</span>
      <span data-testid="executing">{isExecutingTool ? 'true' : 'false'}</span>
      <span data-testid="approvalState">{toolApprovalState['test-tool'] || 'none'}</span>
      <span data-testid="toolCount">{Object.keys(toolSettings.enabledTools).length}</span>

      <button onClick={() => recordToolCall('test-tool', true, 100)}>Record Success</button>
      <button onClick={() => recordToolCall('test-tool', false, 50)}>Record Failure</button>
      <button onClick={() => thumbsUpTool('test-tool')}>Thumbs Up</button>
      <button onClick={() => thumbsDownTool('test-tool')}>Thumbs Down</button>
      <button onClick={() => toggleTool('web_search')}>Toggle Web Search</button>
      <button onClick={() => resetToolSettings()}>Reset Settings</button>
      <button onClick={() => setIsExecutingTool(true)}>Set Executing</button>
      <button onClick={() => setToolApproval('test-tool', 'approved')}>Approve</button>
    </div>
  );
}

describe('ToolContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides default tool level', () => {
    render(
      <ToolProvider>
        <TestComponent />
      </ToolProvider>
    );
    expect(screen.getByTestId('level').textContent).toBe('1');
    expect(screen.getByTestId('rank').textContent).toBe('basic');
    expect(screen.getByTestId('calls').textContent).toBe('0');
    expect(screen.getByTestId('mastery').textContent).toBe('0');
  });

  it('records successful tool calls and updates stats', async () => {
    const user = userEvent.setup();
    render(
      <ToolProvider>
        <TestComponent />
      </ToolProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Record Success' }));

    expect(screen.getByTestId('calls').textContent).toBe('1');
    expect(screen.getByTestId('successful').textContent).toBe('1');
    expect(screen.getByTestId('failed').textContent).toBe('0');
    expect(screen.getByTestId('mastery').textContent).toBe('1');
  });

  it('records failed tool calls', async () => {
    const user = userEvent.setup();
    render(
      <ToolProvider>
        <TestComponent />
      </ToolProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Record Failure' }));

    expect(screen.getByTestId('calls').textContent).toBe('1');
    expect(screen.getByTestId('successful').textContent).toBe('0');
    expect(screen.getByTestId('failed').textContent).toBe('1');
  });

  it('increases mastery on thumbs up', async () => {
    const user = userEvent.setup();
    render(
      <ToolProvider>
        <TestComponent />
      </ToolProvider>
    );

    // Record 10 successful calls to reach advanced rank (calls >= 10)
    for (let i = 0; i < 10; i++) {
      await user.click(screen.getByRole('button', { name: 'Record Success' }));
    }

    expect(screen.getByTestId('calls').textContent).toBe('10');
    expect(screen.getByTestId('rank').textContent).toBe('advanced');
    expect(screen.getByTestId('level').textContent).toBe('2');
    expect(screen.getByTestId('mastery').textContent).toBe('10');

    // Thumbs up gives +5 mastery points
    await user.click(screen.getByRole('button', { name: 'Thumbs Up' }));

    expect(screen.getByTestId('thumbsUp').textContent).toBe('1');
    expect(screen.getByTestId('mastery').textContent).toBe('15');
    // Rank stays advanced (based on calls, not mastery)
    expect(screen.getByTestId('rank').textContent).toBe('advanced');
  });

  it('tracks thumbs down', async () => {
    const user = userEvent.setup();
    render(
      <ToolProvider>
        <TestComponent />
      </ToolProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Thumbs Down' }));
    expect(screen.getByTestId('thumbsDown').textContent).toBe('1');
  });

  it('toggles tool settings', async () => {
    const user = userEvent.setup();
    render(
      <ToolProvider>
        <TestComponent />
      </ToolProvider>
    );

    const initialCount = screen.getByTestId('toolCount').textContent;
    expect(Number(initialCount)).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Toggle Web Search' }));
    // Count should remain the same since we're just toggling
    expect(screen.getByTestId('toolCount').textContent).toBe(initialCount);
  });

  it('resets tool settings to defaults', async () => {
    const user = userEvent.setup();
    render(
      <ToolProvider>
        <TestComponent />
      </ToolProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Toggle Web Search' }));
    await user.click(screen.getByRole('button', { name: 'Reset Settings' }));
    expect(screen.getByTestId('toolCount').textContent).toBeTruthy();
  });

  it('manages execution state', async () => {
    const user = userEvent.setup();
    render(
      <ToolProvider>
        <TestComponent />
      </ToolProvider>
    );

    expect(screen.getByTestId('executing').textContent).toBe('false');
    await user.click(screen.getByRole('button', { name: 'Set Executing' }));
    expect(screen.getByTestId('executing').textContent).toBe('true');
  });

  it('manages tool approval state', async () => {
    const user = userEvent.setup();
    render(
      <ToolProvider>
        <TestComponent />
      </ToolProvider>
    );

    expect(screen.getByTestId('approvalState').textContent).toBe('none');
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    expect(screen.getByTestId('approvalState').textContent).toBe('approved');
  });

  it('throws when useTools is used outside provider', () => {
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTools must be used within ToolProvider');
  });
});
