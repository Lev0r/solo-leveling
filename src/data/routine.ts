import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { BUILTIN_DEFAULT_ROUTINE } from './defaultRoutine';
import { getDb } from './firebase';
import {
  ROUTINE_SCHEMA_VERSION,
  type ChecklistExercise,
  type Exercise,
  type NormalizedRoutine,
  type NormalizedTimer,
  type RoutineDay,
  type TimedExercise,
} from './schema';

export class InvalidRoutineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRoutineError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime());
}

function parseTimerRound(value: unknown, path: string): { workSeconds: number; restSeconds: number } {
  if (!isRecord(value)) {
    throw new InvalidRoutineError(`${path} must be an object`);
  }

  const workSeconds = value.workSeconds;
  const restSeconds = value.restSeconds;

  if (typeof workSeconds !== 'number' || !Number.isFinite(workSeconds) || workSeconds < 1) {
    throw new InvalidRoutineError(`${path}.workSeconds must be a number >= 1`);
  }

  if (typeof restSeconds !== 'number' || !Number.isFinite(restSeconds) || restSeconds < 0) {
    throw new InvalidRoutineError(`${path}.restSeconds must be a number >= 0`);
  }

  return { workSeconds, restSeconds };
}

function normalizeTimer(value: unknown, path: string): NormalizedTimer {
  if (!isRecord(value)) {
    throw new InvalidRoutineError(`${path} must be an object`);
  }

  const roundsValue = value.rounds;
  const hasWorkSeconds = 'workSeconds' in value;
  const hasRestSeconds = 'restSeconds' in value;
  const hasUniformRounds = typeof roundsValue === 'number';
  const hasArrayRounds = Array.isArray(roundsValue);

  const uniformFields = hasWorkSeconds || hasRestSeconds || hasUniformRounds;
  const variableFields = hasArrayRounds;

  if (uniformFields && variableFields) {
    throw new InvalidRoutineError(
      `${path} cannot mix uniform shorthand (workSeconds/restSeconds/rounds number) with variable rounds array`,
    );
  }

  if (uniformFields) {
    if (!hasWorkSeconds || !hasRestSeconds || !hasUniformRounds) {
      throw new InvalidRoutineError(
        `${path} uniform timer must include workSeconds, restSeconds, and rounds (number)`,
      );
    }

    const workSeconds = value.workSeconds;
    const restSeconds = value.restSeconds;
    const rounds = value.rounds;

    if (typeof workSeconds !== 'number' || !Number.isFinite(workSeconds) || workSeconds < 1) {
      throw new InvalidRoutineError(`${path}.workSeconds must be a number >= 1`);
    }

    if (typeof restSeconds !== 'number' || !Number.isFinite(restSeconds) || restSeconds < 0) {
      throw new InvalidRoutineError(`${path}.restSeconds must be a number >= 0`);
    }

    if (typeof rounds !== 'number' || !Number.isInteger(rounds) || rounds < 1) {
      throw new InvalidRoutineError(`${path}.rounds must be an integer >= 1`);
    }

    return {
      rounds: Array.from({ length: rounds }, () => ({ workSeconds, restSeconds })),
    };
  }

  if (!hasArrayRounds) {
    throw new InvalidRoutineError(
      `${path} must use either uniform shorthand or a rounds array`,
    );
  }

  if (roundsValue.length < 1) {
    throw new InvalidRoutineError(`${path}.rounds must contain at least one round`);
  }

  return {
    rounds: roundsValue.map((round, index) =>
      parseTimerRound(round, `${path}.rounds[${index}]`),
    ),
  };
}

function inferKind(exercise: Record<string, unknown>): 'checklist' | 'timed' {
  if ('timer' in exercise && exercise.timer !== undefined) {
    return 'timed';
  }

  return 'checklist';
}

function parseExercise(value: unknown, path: string): Exercise {
  if (!isRecord(value)) {
    throw new InvalidRoutineError(`${path} must be an object`);
  }

  const id = value.id;
  const name = value.name;
  const notes = value.notes;
  const kindValue = value.kind;
  const kind =
    kindValue === 'checklist' || kindValue === 'timed'
      ? kindValue
      : kindValue === undefined
        ? inferKind(value)
        : null;

  if (typeof id !== 'string' || id.length === 0) {
    throw new InvalidRoutineError(`${path}.id must be a non-empty string`);
  }

  if (typeof name !== 'string' || name.length === 0) {
    throw new InvalidRoutineError(`${path}.name must be a non-empty string`);
  }

  if (notes !== undefined && typeof notes !== 'string') {
    throw new InvalidRoutineError(`${path}.notes must be a string when present`);
  }

  if (kind === null) {
    throw new InvalidRoutineError(`${path}.kind must be "checklist" or "timed"`);
  }

  if (kind === 'checklist') {
    const exercise: ChecklistExercise = { kind, id, name };
    if (typeof notes === 'string') {
      exercise.notes = notes;
    }
    return exercise;
  }

  const exercise: TimedExercise = {
    kind,
    id,
    name,
    timer: normalizeTimer(value.timer, `${path}.timer`),
  };

  if (typeof notes === 'string') {
    exercise.notes = notes;
  }

  return exercise;
}

function parseRoutineDay(value: unknown, path: string): RoutineDay {
  if (!isRecord(value)) {
    throw new InvalidRoutineError(`${path} must be an object`);
  }

  const id = value.id;
  const label = value.label;
  const exercisesValue = value.exercises;

  if (typeof id !== 'string' || id.length === 0) {
    throw new InvalidRoutineError(`${path}.id must be a non-empty string`);
  }

  if (typeof label !== 'string' || label.length === 0) {
    throw new InvalidRoutineError(`${path}.label must be a non-empty string`);
  }

  if (!Array.isArray(exercisesValue)) {
    throw new InvalidRoutineError(`${path}.exercises must be an array`);
  }

  const seenExerciseIds = new Set<string>();
  const exercises = exercisesValue.map((exercise, index) => {
    const parsed = parseExercise(exercise, `${path}.exercises[${index}]`);

    if (seenExerciseIds.has(parsed.id)) {
      throw new InvalidRoutineError(
        `${path}.exercises[${index}].id duplicates exercise id "${parsed.id}" within the day`,
      );
    }

    seenExerciseIds.add(parsed.id);
    return parsed;
  });

  return { id, label, exercises };
}

export function parseRoutine(value: unknown): NormalizedRoutine {
  if (!isRecord(value)) {
    throw new InvalidRoutineError('Routine must be an object');
  }

  const schemaVersion = value.schemaVersion;
  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion)) {
    throw new InvalidRoutineError('schemaVersion must be an integer');
  }

  if (schemaVersion > ROUTINE_SCHEMA_VERSION) {
    throw new InvalidRoutineError(
      `schemaVersion ${schemaVersion} exceeds supported version ${ROUTINE_SCHEMA_VERSION}`,
    );
  }

  const anchorDate = value.anchorDate;
  if (typeof anchorDate !== 'string' || !isIsoDate(anchorDate)) {
    throw new InvalidRoutineError('anchorDate must be a valid ISO date (YYYY-MM-DD)');
  }

  const name = value.name;
  if (name !== undefined && typeof name !== 'string') {
    throw new InvalidRoutineError('name must be a string when present');
  }

  const units = value.units;
  if (units !== undefined && units !== 'kg' && units !== 'lb') {
    throw new InvalidRoutineError('units must be "kg" or "lb" when present');
  }

  const daysValue = value.days;
  if (!Array.isArray(daysValue) || daysValue.length === 0) {
    throw new InvalidRoutineError('days must be a non-empty array');
  }

  const seenDayIds = new Set<string>();
  const days = daysValue.map((day, index) => {
    const parsed = parseRoutineDay(day, `days[${index}]`);

    if (seenDayIds.has(parsed.id)) {
      throw new InvalidRoutineError(
        `days[${index}].id duplicates day id "${parsed.id}" within the routine`,
      );
    }

    seenDayIds.add(parsed.id);
    return parsed;
  });

  const routine: NormalizedRoutine = {
    schemaVersion: ROUTINE_SCHEMA_VERSION,
    anchorDate,
    days,
  };

  if (typeof name === 'string') {
    routine.name = name;
  }

  if (units === 'kg' || units === 'lb') {
    routine.units = units;
  } else if (schemaVersion >= 1 || units === undefined) {
    routine.units = 'kg';
  }

  return routine;
}

function defaultRoutineDocRef() {
  return doc(getDb(), 'defaults', 'routine');
}

function userRoutineDocRef(uid: string) {
  return doc(getDb(), 'users', uid, 'routine', 'active');
}

export async function getDefaultRoutine(): Promise<NormalizedRoutine> {
  const snapshot = await getDoc(defaultRoutineDocRef());

  if (!snapshot.exists()) {
    return BUILTIN_DEFAULT_ROUTINE;
  }

  try {
    return parseRoutine(snapshot.data());
  } catch (error) {
    console.warn('Failed to parse /defaults/routine; using built-in default', error);
    return BUILTIN_DEFAULT_ROUTINE;
  }
}

export async function getUserRoutine(uid: string): Promise<NormalizedRoutine | null> {
  const snapshot = await getDoc(userRoutineDocRef(uid));

  if (!snapshot.exists()) {
    return null;
  }

  return parseRoutine(snapshot.data());
}

export async function setUserRoutine(
  uid: string,
  routine: NormalizedRoutine,
): Promise<void> {
  await setDoc(userRoutineDocRef(uid), routine);
}

export type UserRoutineState =
  | { status: 'loading' }
  | { status: 'ready'; routine: NormalizedRoutine | null }
  | { status: 'error'; error: Error };

export function useUserRoutine(uid: string): UserRoutineState {
  const [state, setState] = useState<UserRoutineState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    void getUserRoutine(uid)
      .then((routine) => {
        if (cancelled) {
          return;
        }

        setState({ status: 'ready', routine });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setState({
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [uid]);

  return state;
}
