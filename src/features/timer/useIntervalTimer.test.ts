import { act, renderHook } from '@testing-library/react';
import type { TimerRound } from '../../data/schema';
import { useIntervalTimer } from './useIntervalTimer';

const GET_READY_SECONDS = 3;

function advanceMs(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function expectTimerState(
  result: { current: ReturnType<typeof useIntervalTimer> },
  expected: {
    phase: ReturnType<typeof useIntervalTimer>['phase'];
    roundIndex: number;
    secondsLeft: number;
    isPaused?: boolean;
  },
): void {
  expect(result.current.phase).toBe(expected.phase);
  expect(result.current.roundIndex).toBe(expected.roundIndex);
  expect(result.current.secondsLeft).toBe(expected.secondsLeft);
  if (expected.isPaused !== undefined) {
    expect(result.current.isPaused).toBe(expected.isPaused);
  }
}

describe('useIntervalTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs a single round with rest 0 through get-ready and work', () => {
    const rounds: TimerRound[] = [{ workSeconds: 5, restSeconds: 0 }];
    const onComplete = vi.fn();

    const { result } = renderHook(() =>
      useIntervalTimer(rounds, { getReadySeconds: GET_READY_SECONDS, onComplete }),
    );

    expectTimerState(result, { phase: 'getReady', roundIndex: 1, secondsLeft: 3 });

    advanceMs(3000);
    expectTimerState(result, { phase: 'work', roundIndex: 1, secondsLeft: 5 });

    advanceMs(5000);
    expectTimerState(result, { phase: 'complete', roundIndex: 1, secondsLeft: 2 });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('runs two uniform rounds with rest and get-ready before each work phase', () => {
    const rounds: TimerRound[] = [
      { workSeconds: 2, restSeconds: 2 },
      { workSeconds: 2, restSeconds: 2 },
    ];

    const { result } = renderHook(() =>
      useIntervalTimer(rounds, { getReadySeconds: GET_READY_SECONDS }),
    );

    expectTimerState(result, { phase: 'getReady', roundIndex: 1, secondsLeft: 3 });

    advanceMs(3000);
    expectTimerState(result, { phase: 'work', roundIndex: 1, secondsLeft: 2 });

    advanceMs(2000);
    expectTimerState(result, { phase: 'rest', roundIndex: 1, secondsLeft: 2 });

    advanceMs(2000);
    expectTimerState(result, { phase: 'getReady', roundIndex: 2, secondsLeft: 3 });

    advanceMs(3000);
    expectTimerState(result, { phase: 'work', roundIndex: 2, secondsLeft: 2 });

    advanceMs(2000);
    expectTimerState(result, { phase: 'rest', roundIndex: 2, secondsLeft: 2 });

    advanceMs(2000);
    expectTimerState(result, { phase: 'complete', roundIndex: 2, secondsLeft: 2 });
  });

  it('supports variable rounds and skips trailing rest on the last round', () => {
    const rounds: TimerRound[] = [
      { workSeconds: 2, restSeconds: 2 },
      { workSeconds: 2, restSeconds: 2 },
      { workSeconds: 2, restSeconds: 0 },
    ];

    const { result } = renderHook(() =>
      useIntervalTimer(rounds, { getReadySeconds: GET_READY_SECONDS }),
    );

    advanceMs(3000);
    expectTimerState(result, { phase: 'work', roundIndex: 1, secondsLeft: 2 });

    advanceMs(2000);
    expectTimerState(result, { phase: 'rest', roundIndex: 1, secondsLeft: 2 });

    advanceMs(2000);
    expectTimerState(result, { phase: 'getReady', roundIndex: 2, secondsLeft: 3 });

    advanceMs(3000);
    expectTimerState(result, { phase: 'work', roundIndex: 2, secondsLeft: 2 });

    advanceMs(2000);
    expectTimerState(result, { phase: 'rest', roundIndex: 2, secondsLeft: 2 });

    advanceMs(2000);
    expectTimerState(result, { phase: 'getReady', roundIndex: 3, secondsLeft: 3 });

    advanceMs(3000);
    expectTimerState(result, { phase: 'work', roundIndex: 3, secondsLeft: 2 });

    advanceMs(2000);
    expectTimerState(result, { phase: 'complete', roundIndex: 3, secondsLeft: 2 });
  });

  it('preserves remaining time across pause and resume', () => {
    const rounds: TimerRound[] = [{ workSeconds: 10, restSeconds: 0 }];
    const { result } = renderHook(() =>
      useIntervalTimer(rounds, { getReadySeconds: GET_READY_SECONDS }),
    );

    advanceMs(3000);
    expectTimerState(result, { phase: 'work', roundIndex: 1, secondsLeft: 10 });

    advanceMs(4000);
    expectTimerState(result, { phase: 'work', roundIndex: 1, secondsLeft: 6 });

    act(() => {
      result.current.pause();
    });
    expectTimerState(result, { phase: 'work', roundIndex: 1, secondsLeft: 6, isPaused: true });

    advanceMs(5000);
    expectTimerState(result, { phase: 'work', roundIndex: 1, secondsLeft: 6, isPaused: true });

    act(() => {
      result.current.resume();
    });
    expectTimerState(result, { phase: 'work', roundIndex: 1, secondsLeft: 6, isPaused: false });

    advanceMs(6000);
    expectTimerState(result, { phase: 'complete', roundIndex: 1, secondsLeft: 2 });
  });

  it('shows get-ready before round 1 and again after rest', () => {
    const rounds: TimerRound[] = [
      { workSeconds: 1, restSeconds: 1 },
      { workSeconds: 1, restSeconds: 0 },
    ];
    const { result } = renderHook(() =>
      useIntervalTimer(rounds, { getReadySeconds: GET_READY_SECONDS }),
    );

    expect(result.current.phase).toBe('getReady');

    advanceMs(3000);
    expect(result.current.phase).toBe('work');

    advanceMs(1000);
    expect(result.current.phase).toBe('rest');

    advanceMs(1000);
    expect(result.current.phase).toBe('getReady');
  });
});
