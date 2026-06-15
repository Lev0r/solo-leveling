import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { TimerRound } from '../../data/schema';
import type { TimerPhase } from './types';

const TICK_MS = 250;
const COMPLETE_MS = 1500;
const DEFAULT_GET_READY_SECONDS = 3;

type PhaseTransition = {
  phase: TimerPhase;
  roundIndex: number;
  durationMs: number;
};

export type UseIntervalTimerOptions = {
  getReadySeconds?: number;
  onComplete?: () => void;
};

export type UseIntervalTimerResult = {
  phase: TimerPhase;
  roundIndex: number;
  totalRounds: number;
  secondsLeft: number;
  isPaused: boolean;
  isRunning: boolean;
  pause: () => void;
  resume: () => void;
  togglePause: () => void;
  skipRest: () => void;
};

type TimerSnapshot = {
  phase: TimerPhase;
  roundIndex: number;
  secondsLeft: number;
  isPaused: boolean;
};

type TimerAction =
  | { type: 'tick'; secondsLeft: number }
  | { type: 'enterPhase'; phase: TimerPhase; roundIndex: number; secondsLeft: number }
  | { type: 'pause'; secondsLeft: number }
  | { type: 'resume'; secondsLeft: number };

function computeSecondsLeft(args: {
  phaseStartedAt: number;
  phaseDurationMs: number;
  accumulatedPauseMs: number;
  pausedAt: number | null;
}): number {
  const now = args.pausedAt ?? Date.now();
  const elapsed = now - args.phaseStartedAt - args.accumulatedPauseMs;
  return Math.max(0, Math.ceil((args.phaseDurationMs - elapsed) / 1000));
}

function getNextPhase(args: {
  currentPhase: TimerPhase;
  roundIndex: number;
  rounds: TimerRound[];
  getReadyMs: number;
}): PhaseTransition | null {
  const { currentPhase, roundIndex, rounds, getReadyMs } = args;
  const totalRounds = rounds.length;

  if (currentPhase === 'getReady') {
    const round = rounds[roundIndex - 1];
    if (round === undefined) {
      return null;
    }

    return {
      phase: 'work',
      roundIndex,
      durationMs: round.workSeconds * 1000,
    };
  }

  if (currentPhase === 'work') {
    const round = rounds[roundIndex - 1];
    if (round === undefined) {
      return null;
    }

    if (round.restSeconds > 0) {
      return {
        phase: 'rest',
        roundIndex,
        durationMs: round.restSeconds * 1000,
      };
    }

    if (roundIndex < totalRounds) {
      return {
        phase: 'getReady',
        roundIndex: roundIndex + 1,
        durationMs: getReadyMs,
      };
    }

    return { phase: 'complete', roundIndex, durationMs: COMPLETE_MS };
  }

  if (currentPhase === 'rest') {
    if (roundIndex < totalRounds) {
      return {
        phase: 'getReady',
        roundIndex: roundIndex + 1,
        durationMs: getReadyMs,
      };
    }

    return { phase: 'complete', roundIndex, durationMs: COMPLETE_MS };
  }

  return null;
}

function timerReducer(state: TimerSnapshot, action: TimerAction): TimerSnapshot {
  switch (action.type) {
    case 'tick':
      return { ...state, secondsLeft: action.secondsLeft };
    case 'enterPhase':
      return {
        ...state,
        phase: action.phase,
        roundIndex: action.roundIndex,
        secondsLeft: action.secondsLeft,
        isPaused: false,
      };
    case 'pause':
      return { ...state, isPaused: true, secondsLeft: action.secondsLeft };
    case 'resume':
      return { ...state, isPaused: false, secondsLeft: action.secondsLeft };
    default:
      return state;
  }
}

export function useIntervalTimer(
  rounds: TimerRound[],
  options?: UseIntervalTimerOptions,
): UseIntervalTimerResult {
  const getReadySeconds = options?.getReadySeconds ?? DEFAULT_GET_READY_SECONDS;
  const getReadyMs = getReadySeconds * 1000;
  const onCompleteRef = useRef(options?.onComplete);
  const completeCalledRef = useRef(false);

  const phaseStartedAtRef = useRef(0);
  const phaseDurationMsRef = useRef(getReadyMs);
  const accumulatedPauseMsRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);

  useEffect(() => {
    onCompleteRef.current = options?.onComplete;
  }, [options?.onComplete]);

  const [state, dispatch] = useReducer(timerReducer, {
    phase: 'getReady',
    roundIndex: 1,
    secondsLeft: getReadySeconds,
    isPaused: false,
  });

  const enterPhase = useCallback((transition: PhaseTransition) => {
    phaseStartedAtRef.current = Date.now();
    phaseDurationMsRef.current = transition.durationMs;
    accumulatedPauseMsRef.current = 0;
    pausedAtRef.current = null;

    const secondsLeft = Math.ceil(transition.durationMs / 1000);
    dispatch({
      type: 'enterPhase',
      phase: transition.phase,
      roundIndex: transition.roundIndex,
      secondsLeft,
    });

    if (transition.phase === 'complete' && !completeCalledRef.current) {
      completeCalledRef.current = true;
      onCompleteRef.current?.();
    }
  }, []);

  const advanceIfExpired = useCallback(() => {
    if (state.isPaused || state.phase === 'complete') {
      return;
    }

    const secondsLeft = computeSecondsLeft({
      phaseStartedAt: phaseStartedAtRef.current,
      phaseDurationMs: phaseDurationMsRef.current,
      accumulatedPauseMs: accumulatedPauseMsRef.current,
      pausedAt: pausedAtRef.current,
    });

    dispatch({ type: 'tick', secondsLeft });

    if (secondsLeft > 0) {
      return;
    }

    const next = getNextPhase({
      currentPhase: state.phase,
      roundIndex: state.roundIndex,
      rounds,
      getReadyMs,
    });

    if (next !== null) {
      enterPhase(next);
    }
  }, [enterPhase, getReadyMs, rounds, state.isPaused, state.phase, state.roundIndex]);

  useEffect(() => {
    if (phaseStartedAtRef.current === 0) {
      phaseStartedAtRef.current = Date.now();
    }

    const intervalId = window.setInterval(() => {
      advanceIfExpired();
    }, TICK_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        advanceIfExpired();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [advanceIfExpired]);

  const pause = useCallback(() => {
    if (state.isPaused || state.phase === 'complete') {
      return;
    }

    const secondsLeft = computeSecondsLeft({
      phaseStartedAt: phaseStartedAtRef.current,
      phaseDurationMs: phaseDurationMsRef.current,
      accumulatedPauseMs: accumulatedPauseMsRef.current,
      pausedAt: pausedAtRef.current,
    });

    pausedAtRef.current = Date.now();
    dispatch({ type: 'pause', secondsLeft });
  }, [state.isPaused, state.phase]);

  const resume = useCallback(() => {
    if (!state.isPaused) {
      return;
    }

    if (pausedAtRef.current !== null) {
      accumulatedPauseMsRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }

    const secondsLeft = computeSecondsLeft({
      phaseStartedAt: phaseStartedAtRef.current,
      phaseDurationMs: phaseDurationMsRef.current,
      accumulatedPauseMs: accumulatedPauseMsRef.current,
      pausedAt: pausedAtRef.current,
    });

    dispatch({ type: 'resume', secondsLeft });
  }, [state.isPaused]);

  const togglePause = useCallback(() => {
    if (state.isPaused) {
      resume();
    } else {
      pause();
    }
  }, [pause, resume, state.isPaused]);

  const skipRest = useCallback(() => {
    if (state.phase !== 'rest' || state.isPaused) {
      return;
    }

    const next = getNextPhase({
      currentPhase: 'rest',
      roundIndex: state.roundIndex,
      rounds,
      getReadyMs,
    });

    if (next !== null) {
      enterPhase(next);
    }
  }, [enterPhase, getReadyMs, rounds, state.isPaused, state.phase, state.roundIndex]);

  return {
    phase: state.phase,
    roundIndex: state.roundIndex,
    totalRounds: rounds.length,
    secondsLeft: state.secondsLeft,
    isPaused: state.isPaused,
    isRunning: state.phase !== 'complete',
    pause,
    resume,
    togglePause,
    skipRest,
  };
}
