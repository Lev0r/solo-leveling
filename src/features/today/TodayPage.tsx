import type { ChangeEvent, PointerEvent } from 'react';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArchiveBanner } from '../archive/ArchiveBanner';
import { useAuthState } from '../../data/auth';
import { setExerciseCompletion, useTodayLog } from '../../data/dailyLog';
import { useUserRoutine } from '../../data/routine';
import type { ChecklistExercise, Exercise, RoutineDay, TimedExercise } from '../../data/schema';
import { useUserProfileContext } from '../../data/userProfile';
import { getTodaysDay } from '../../lib/cycle';
import { unlockTimerAudio } from '../timer/timerSounds';
import type { TimerSession } from '../timer/types';

const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_THRESHOLD_PX = 10;

function ClockIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="10" cy="11" r="6.5" />
      <rect x="8.5" y="2" width="3" height="2.5" rx="0.5" />
      <line x1="10" y1="11" x2="10" y2="8" />
      <line x1="10" y1="11" x2="12.5" y2="11" />
    </svg>
  );
}

function ChecklistExerciseRow({
  exercise,
  isCompleted,
  isPending,
  onToggle,
}: {
  exercise: ChecklistExercise;
  isCompleted: boolean;
  isPending: boolean;
  onToggle: (exerciseId: string, checked: boolean) => void;
}) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onToggle(exercise.id, event.target.checked);
  };

  const checkboxId = `exercise-${exercise.id}`;

  return (
    <li className="exercise-card" data-done={isCompleted}>
      <label className="exercise-card__label" htmlFor={checkboxId}>
        <input
          type="checkbox"
          id={checkboxId}
          className="sr-only"
          checked={isCompleted}
          disabled={isPending}
          onChange={handleChange}
        />
        <span className="exercise-card__name">{exercise.name}</span>
        {exercise.notes ? (
          <span className="exercise-card__notes">{exercise.notes}</span>
        ) : null}
      </label>
    </li>
  );
}

function TimedExerciseRow({
  exercise,
  isCompleted,
  dayId,
  routineExerciseIdsForDay,
  onManualComplete,
}: {
  exercise: TimedExercise;
  isCompleted: boolean;
  dayId: string;
  routineExerciseIdsForDay: readonly string[];
  onManualComplete: (exerciseId: string) => Promise<void>;
}) {
  const { t } = useTranslation('today');
  const navigate = useNavigate();
  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    longPressFiredRef.current = false;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    unlockTimerAudio();

    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true;
      void onManualComplete(exercise.id);
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const start = pointerStartRef.current;
    if (start === null) {
      return;
    }

    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (distance > LONG_PRESS_MOVE_THRESHOLD_PX) {
      clearLongPressTimer();
    }
  };

  const handlePointerUp = () => {
    clearLongPressTimer();
    pointerStartRef.current = null;
  };

  const handlePointerCancel = () => {
    clearLongPressTimer();
    pointerStartRef.current = null;
  };

  const handleClick = () => {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }

    const timerSession: TimerSession = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      rounds: exercise.timer.rounds,
      dayId,
      routineExerciseIdsForDay,
    };
    navigate('/timer', { state: timerSession });
  };

  return (
    <li className="exercise-card exercise-card--timed" data-done={isCompleted}>
      <button
        type="button"
        className="exercise-card__timed-trigger"
        style={{ color: 'var(--work)' }}
        aria-label={t('actions.timedAria', { name: exercise.name })}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={handleClick}
      >
        <span style={{ flex: 1, minWidth: 0, color: 'var(--text)' }}>
          <span className="exercise-card__name">{exercise.name}</span>
          {exercise.notes ? (
            <span className="exercise-card__notes">{exercise.notes}</span>
          ) : null}
        </span>
        <ClockIcon />
      </button>
    </li>
  );
}

function ExerciseRow({
  exercise,
  isCompleted,
  isPending,
  dayId,
  routineExerciseIdsForDay,
  onToggle,
  onManualComplete,
}: {
  exercise: Exercise;
  isCompleted: boolean;
  isPending: boolean;
  dayId: string;
  routineExerciseIdsForDay: readonly string[];
  onToggle: (exerciseId: string, checked: boolean) => void;
  onManualComplete: (exerciseId: string) => Promise<void>;
}) {
  if (exercise.kind === 'timed') {
    return (
      <TimedExerciseRow
        exercise={exercise}
        isCompleted={isCompleted}
        dayId={dayId}
        routineExerciseIdsForDay={routineExerciseIdsForDay}
        onManualComplete={onManualComplete}
      />
    );
  }

  return (
    <ChecklistExerciseRow
      exercise={exercise}
      isCompleted={isCompleted}
      isPending={isPending}
      onToggle={onToggle}
    />
  );
}

function TodayWorkout({
  uid,
  timezone,
  day,
  routineExerciseIdsForDay,
}: {
  uid: string;
  timezone: string;
  day: RoutineDay;
  routineExerciseIdsForDay: readonly string[];
}) {
  const { t } = useTranslation(['today', 'common']);
  const logState = useTodayLog({ uid, timezone });
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [toggleError, setToggleError] = useState(false);

  const handleToggle = useCallback(
    async (exerciseId: string, checked: boolean) => {
      if (logState.status !== 'ready') {
        return;
      }

      setToggleError(false);
      setPendingIds((prev) => new Set(prev).add(exerciseId));

      try {
        await setExerciseCompletion({
          uid,
          timezone,
          dayId: day.id,
          exerciseId,
          isCompleted: checked,
          routineExerciseIdsForDay,
        });
        logState.reload();
      } catch {
        setToggleError(true);
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(exerciseId);
          return next;
        });
      }
    },
    [uid, timezone, day.id, routineExerciseIdsForDay, logState],
  );

  const handleManualComplete = useCallback(
    async (exerciseId: string) => {
      if (logState.status !== 'ready') {
        return;
      }

      setToggleError(false);
      setPendingIds((prev) => new Set(prev).add(exerciseId));

      try {
        await setExerciseCompletion({
          uid,
          timezone,
          dayId: day.id,
          exerciseId,
          isCompleted: true,
          completedVia: 'manual',
          routineExerciseIdsForDay,
        });
        logState.reload();
      } catch {
        setToggleError(true);
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(exerciseId);
          return next;
        });
      }
    },
    [uid, timezone, day.id, routineExerciseIdsForDay, logState],
  );

  if (logState.status === 'loading') {
    return <p>{t('common:loading')}</p>;
  }

  if (logState.status === 'error') {
    return <p>{t('common:error')}</p>;
  }

  const log = logState.log;

  return (
    <>
      {log?.completedAt ? (
        <p className="today-completed-banner">{t('today:completedBanner')}</p>
      ) : null}
      {toggleError ? <p>{t('today:errors.toggleFailed')}</p> : null}
      <ul className="exercise-list">
        {day.exercises.map((exercise) => {
          const entry = log?.exercises.find((item) => item.exerciseId === exercise.id);
          return (
            <ExerciseRow
              key={exercise.id}
              exercise={exercise}
              isCompleted={entry?.isCompleted ?? false}
              isPending={pendingIds.has(exercise.id)}
              dayId={day.id}
              routineExerciseIdsForDay={routineExerciseIdsForDay}
              onToggle={(exerciseId, checked) => {
                void handleToggle(exerciseId, checked);
              }}
              onManualComplete={handleManualComplete}
            />
          );
        })}
      </ul>
    </>
  );
}

export function TodayPage() {
  const authState = useAuthState();
  const { profile } = useUserProfileContext();

  if (authState.status !== 'signed-in') {
    return null;
  }

  return <TodayPageContent uid={authState.user.uid} timezone={profile.timezone} />;
}

function TodayPageContent({ uid, timezone }: { uid: string; timezone: string }) {
  const { t } = useTranslation(['today', 'common']);
  const routineState = useUserRoutine(uid);

  if (routineState.status === 'loading') {
    return <p>{t('common:loading')}</p>;
  }

  if (routineState.status === 'error') {
    return <p>{t('common:error')}</p>;
  }

  if (routineState.routine === null) {
    return <Navigate to="/config" replace />;
  }

  const { day } = getTodaysDay(routineState.routine, timezone, new Date());
  const routineExerciseIdsForDay = day.exercises.map((exercise) => exercise.id);

  return (
    <section>
      <ArchiveBanner uid={uid} timezone={timezone} />
      <h1>{day.label}</h1>
      <TodayWorkout
        uid={uid}
        timezone={timezone}
        day={day}
        routineExerciseIdsForDay={routineExerciseIdsForDay}
      />
    </section>
  );
}
