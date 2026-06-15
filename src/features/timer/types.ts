import type { TimerRound } from '../../data/schema';

export type TimerSession = {
  exerciseId: string;
  exerciseName: string;
  rounds: TimerRound[];
  dayId: string;
  routineExerciseIdsForDay: readonly string[];
};

export type TimerPhase = 'getReady' | 'work' | 'rest' | 'complete';

export function isTimerSession(value: unknown): value is TimerSession {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.exerciseId !== 'string' ||
    typeof record.exerciseName !== 'string' ||
    typeof record.dayId !== 'string' ||
    !Array.isArray(record.routineExerciseIdsForDay) ||
    !Array.isArray(record.rounds) ||
    record.rounds.length === 0
  ) {
    return false;
  }

  if (!record.routineExerciseIdsForDay.every((id) => typeof id === 'string')) {
    return false;
  }

  return record.rounds.every(
    (round) =>
      typeof round === 'object' &&
      round !== null &&
      typeof (round as TimerRound).workSeconds === 'number' &&
      typeof (round as TimerRound).restSeconds === 'number',
  );
}
