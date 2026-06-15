import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthState } from '../../data/auth';
import { setExerciseCompletion } from '../../data/dailyLog';
import { useUserProfileContext } from '../../data/userProfile';
import { playTimerTick, unlockTimerAudio } from './timerSounds';
import './timer.css';
import { isTimerSession, type TimerSession } from './types';
import { useIntervalTimer } from './useIntervalTimer';
import { useWakeLock } from './useWakeLock';

function CloseIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

export function TimerPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const authState = useAuthState();
  const { profile } = useUserProfileContext();

  if (authState.status !== 'signed-in') {
    return null;
  }

  if (!isTimerSession(location.state)) {
    return <Navigate to="/" replace />;
  }

  return (
    <TimerSessionView
      uid={authState.user.uid}
      timezone={profile.timezone}
      session={location.state}
      onExit={() => {
        navigate('/');
      }}
    />
  );
}

function TimerSessionView({
  uid,
  timezone,
  session,
  onExit,
}: {
  uid: string;
  timezone: string;
  session: TimerSession;
  onExit: () => void;
}) {
  const { t } = useTranslation('timer');
  const [completionError, setCompletionError] = useState(false);
  const completionStartedRef = useRef(false);
  const dismissTimerRef = useRef<number | null>(null);
  const lastSoundKeyRef = useRef<string | null>(null);

  const handleComplete = useCallback(async () => {
    if (completionStartedRef.current) {
      return;
    }

    completionStartedRef.current = true;

    try {
      await setExerciseCompletion({
        uid,
        timezone,
        dayId: session.dayId,
        exerciseId: session.exerciseId,
        isCompleted: true,
        completedVia: 'timer',
        routineExerciseIdsForDay: session.routineExerciseIdsForDay,
      });
    } catch {
      setCompletionError(true);
    }

    dismissTimerRef.current = window.setTimeout(() => {
      onExit();
    }, 1500);
  }, [onExit, session.dayId, session.exerciseId, session.routineExerciseIdsForDay, timezone, uid]);

  const timer = useIntervalTimer(session.rounds, {
    onComplete: () => {
      void handleComplete();
    },
  });

  useWakeLock(timer.isRunning && !timer.isPaused);

  const requestExit = useCallback(() => {
    if (timer.phase === 'complete') {
      if (dismissTimerRef.current !== null) {
        window.clearTimeout(dismissTimerRef.current);
      }
      onExit();
      return;
    }

    if (timer.isRunning) {
      const confirmed = window.confirm(t('exitConfirm'));
      if (!confirmed) {
        return;
      }
    }

    onExit();
  }, [onExit, t, timer.isRunning, timer.phase]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [requestExit]);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current !== null) {
        window.clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (timer.isPaused) {
      return;
    }

    const shouldPlaySoft = timer.phase === 'getReady' && timer.secondsLeft > 0;
    const shouldPlayLoud =
      timer.phase === 'work' && timer.secondsLeft >= 1 && timer.secondsLeft <= 3;

    if (!shouldPlaySoft && !shouldPlayLoud) {
      return;
    }

    const soundKey = `${timer.phase}-${timer.secondsLeft}`;
    if (lastSoundKeyRef.current === soundKey) {
      return;
    }

    lastSoundKeyRef.current = soundKey;
    playTimerTick(shouldPlaySoft ? 'soft' : 'loud');
  }, [timer.isPaused, timer.phase, timer.secondsLeft]);

  const handleSurfacePointerDown = () => {
    unlockTimerAudio();
  };

  const handleSurfaceClick = () => {
    unlockTimerAudio();
    timer.togglePause();
  };

  const phaseLabelKey =
    timer.isPaused && timer.phase !== 'complete'
      ? 'phase.paused'
      : (`phase.${timer.phase}` as 'phase.getReady' | 'phase.work' | 'phase.rest' | 'phase.complete');

  return (
    <div
      className="timer-screen"
      data-phase={timer.phase}
      data-paused={timer.isPaused ? 'true' : 'false'}
      onPointerDown={handleSurfacePointerDown}
      onClick={handleSurfaceClick}
      role="presentation"
    >
      <button
        type="button"
        className="timer-screen__close"
        aria-label={t('close')}
        onClick={(event) => {
          event.stopPropagation();
          requestExit();
        }}
      >
        <CloseIcon />
      </button>

      <div className="timer-screen__content">
        <p className="timer-screen__countdown tabular" aria-live="polite">
          {timer.secondsLeft}
        </p>
        <p className="timer-screen__phase">{t(phaseLabelKey)}</p>
        {timer.phase !== 'complete' ? (
          <p className="timer-screen__round">
            {t('round', { current: timer.roundIndex, total: timer.totalRounds })}
          </p>
        ) : null}
        {completionError ? <p className="timer-screen__error">{t('completeError')}</p> : null}
      </div>

      {timer.phase === 'rest' && !timer.isPaused ? (
        <button
          type="button"
          className="timer-screen__skip"
          onClick={(event) => {
            event.stopPropagation();
            timer.skipRest();
          }}
        >
          {t('skipRest')}
        </button>
      ) : null}
    </div>
  );
}
