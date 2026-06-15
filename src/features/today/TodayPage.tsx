import type { CSSProperties, ChangeEvent } from 'react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { useAuthState } from '../../data/auth';
import { setExerciseCompletion, useTodayLog } from '../../data/dailyLog';
import { useUserRoutine } from '../../data/routine';
import type { Exercise, RoutineDay, TimedExercise } from '../../data/schema';
import { useUserProfileContext } from '../../data/userProfile';
import { getTodaysDay } from '../../lib/cycle';

const touchTarget: CSSProperties = {
  minHeight: 48,
  minWidth: 48,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 12px',
};

function formatTimerHint(
  exercise: TimedExercise,
  mixedLabel: string,
): string {
  const rounds = exercise.timer.rounds;
  const first = rounds[0];

  if (first === undefined) {
    return mixedLabel;
  }

  const isUniform = rounds.every(
    (round) =>
      round.workSeconds === first.workSeconds &&
      round.restSeconds === first.restSeconds,
  );

  if (isUniform) {
    return `${rounds.length}×${first.workSeconds}/${first.restSeconds}`;
  }

  const joined = rounds.map((round) => round.workSeconds).join('/');
  if (joined.length > 24) {
    return mixedLabel;
  }

  return joined;
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
  const { t } = useTranslation(['today', 'common']);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onToggle(exercise.id, event.target.checked);
  };

  const mixedLabel =
    exercise.kind === 'timed'
      ? t('today:hint.mixed', { count: exercise.timer.rounds.length })
      : '';

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
      {exercise.kind === 'timed' ? (
        <button
          type="button"
          className="exercise-card__action"
          data-variant="primary"
          style={touchTarget}
          aria-label={t('today:actions.startTimer')}
          onClick={(event) => {
            event.stopPropagation();
            console.log('today:startTimer', { exerciseId: exercise.id });
          }}
        >
          ▶ {formatTimerHint(exercise, mixedLabel)}
        </button>
      ) : null}
    </li>
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
    return <Navigate to="/welcome" replace />;
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
