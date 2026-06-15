import type { ChangeEvent } from 'react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthState } from '../../data/auth';
import { setExerciseCompletion, useTodayLog } from '../../data/dailyLog';
import { useUserRoutine } from '../../data/routine';
import type { ChecklistExercise, Exercise, RoutineDay, TimedExercise, TimerRound } from '../../data/schema';
import { useUserProfileContext } from '../../data/userProfile';
import { getTodaysDay } from '../../lib/cycle';

type TimerSession = {
  exerciseId: string;
  exerciseName: string;
  rounds: TimerRound[];
};

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
}: {
  exercise: TimedExercise;
  isCompleted: boolean;
}) {
  const { t } = useTranslation('today');
  const navigate = useNavigate();

  const handleStartTimer = () => {
    const timerSession: TimerSession = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      rounds: exercise.timer.rounds,
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
        onClick={handleStartTimer}
      >
        <ClockIcon />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="exercise-card__name" style={{ color: 'var(--text)' }}>
            {exercise.name}
          </span>
          {exercise.notes ? (
            <span className="exercise-card__notes">{exercise.notes}</span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

function ExerciseRow({
  exercise,
  isCompleted,
  isPending,
  onToggle,
}: {
  exercise: Exercise;
  isCompleted: boolean;
  isPending: boolean;
  onToggle: (exerciseId: string, checked: boolean) => void;
}) {
  if (exercise.kind === 'timed') {
    return <TimedExerciseRow exercise={exercise} isCompleted={isCompleted} />;
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
              onToggle={(exerciseId, checked) => {
                void handleToggle(exerciseId, checked);
              }}
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
