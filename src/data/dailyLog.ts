import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { todayDateStringInTimezone } from '../lib/cycle';
import { getDb } from './firebase';
import {
  DAILY_LOG_SCHEMA_VERSION,
  type CompletedVia,
  type DailyLog,
  type DailyLogExerciseEntry,
} from './schema';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCompletedVia(value: unknown): value is CompletedVia {
  return value === 'manual' || value === 'timer';
}

function parseDailyLog(value: unknown): DailyLog {
  if (!isRecord(value)) {
    throw new Error('Invalid daily log document');
  }

  const schemaVersion = value.schemaVersion;
  const date = value.date;
  const dayId = value.dayId;
  const exercisesValue = value.exercises;
  const completedAt = value.completedAt;

  if (
    schemaVersion !== DAILY_LOG_SCHEMA_VERSION ||
    typeof date !== 'string' ||
    typeof dayId !== 'string' ||
    !Array.isArray(exercisesValue)
  ) {
    throw new Error('Invalid daily log document');
  }

  const exercises: DailyLogExerciseEntry[] = exercisesValue.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid daily log exercise entry at index ${index}`);
    }

    const exerciseId = entry.exerciseId;
    const isCompleted = entry.isCompleted;
    const completedVia = entry.completedVia;

    if (typeof exerciseId !== 'string' || typeof isCompleted !== 'boolean') {
      throw new Error(`Invalid daily log exercise entry at index ${index}`);
    }

    if (completedVia !== undefined && !isCompletedVia(completedVia)) {
      throw new Error(`Invalid completedVia at index ${index}`);
    }

    const parsed: DailyLogExerciseEntry = { exerciseId, isCompleted };
    if (completedVia !== undefined) {
      parsed.completedVia = completedVia;
    }

    return parsed;
  });

  const log: DailyLog = {
    schemaVersion: DAILY_LOG_SCHEMA_VERSION,
    date,
    dayId,
    exercises,
  };

  if (typeof completedAt === 'string') {
    log.completedAt = completedAt;
  }

  return log;
}

function dailyLogDocRef(uid: string, dateYmd: string) {
  return doc(getDb(), 'users', uid, 'dailyLogs', dateYmd);
}

export async function getTodayLog(args: {
  uid: string;
  timezone: string;
  now?: Date;
}): Promise<DailyLog | null> {
  const now = args.now ?? new Date();
  const dateYmd = todayDateStringInTimezone(now, args.timezone);
  const snapshot = await getDoc(dailyLogDocRef(args.uid, dateYmd));

  if (!snapshot.exists()) {
    return null;
  }

  return parseDailyLog(snapshot.data());
}

function upsertExerciseEntry(
  exercises: DailyLogExerciseEntry[],
  exerciseId: string,
  isCompleted: boolean,
  completedVia: CompletedVia,
): DailyLogExerciseEntry[] {
  const index = exercises.findIndex((entry) => entry.exerciseId === exerciseId);

  if (index === -1) {
    return [...exercises, { exerciseId, isCompleted, completedVia }];
  }

  return exercises.map((entry, entryIndex) => {
    if (entryIndex !== index) {
      return entry;
    }

    return { exerciseId, isCompleted, completedVia };
  });
}

function allRoutineExercisesCompleted(
  exercises: DailyLogExerciseEntry[],
  routineExerciseIdsForDay: readonly string[],
): boolean {
  return routineExerciseIdsForDay.every((id) =>
    exercises.some((entry) => entry.exerciseId === id && entry.isCompleted),
  );
}

export async function setExerciseCompletion(args: {
  uid: string;
  timezone: string;
  dayId: string;
  exerciseId: string;
  isCompleted: boolean;
  completedVia?: CompletedVia;
  routineExerciseIdsForDay: readonly string[];
  now?: Date;
}): Promise<DailyLog> {
  const now = args.now ?? new Date();
  const dateYmd = todayDateStringInTimezone(now, args.timezone);
  const completedVia = args.completedVia ?? 'manual';
  const ref = dailyLogDocRef(args.uid, dateYmd);
  const snapshot = await getDoc(ref);

  let log: DailyLog;

  if (!snapshot.exists()) {
    log = {
      schemaVersion: DAILY_LOG_SCHEMA_VERSION,
      date: dateYmd,
      dayId: args.dayId,
      exercises: [{ exerciseId: args.exerciseId, isCompleted: args.isCompleted, completedVia }],
    };
  } else {
    const existing = parseDailyLog(snapshot.data());
    log = {
      ...existing,
      dayId: args.dayId,
      exercises: upsertExerciseEntry(
        existing.exercises,
        args.exerciseId,
        args.isCompleted,
        completedVia,
      ),
    };
  }

  if (
    existingCompletedAtAbsent(log) &&
    allRoutineExercisesCompleted(log.exercises, args.routineExerciseIdsForDay)
  ) {
    log = { ...log, completedAt: now.toISOString() };
  }

  await setDoc(ref, log);
  return log;
}

function existingCompletedAtAbsent(log: DailyLog): boolean {
  return log.completedAt === undefined;
}

export type TodayLogState =
  | { status: 'loading' }
  | { status: 'ready'; log: DailyLog | null; reload: () => void }
  | { status: 'error'; error: Error };

export function useTodayLog(args: { uid: string; timezone: string }): TodayLogState {
  const { uid, timezone } = args;
  const [state, setState] = useState<TodayLogState>({ status: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void getTodayLog({ uid, timezone })
      .then((log) => {
        if (cancelled) {
          return;
        }

        setState({ status: 'ready', log, reload });
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
  }, [uid, timezone, reloadToken, reload]);

  return state;
}
