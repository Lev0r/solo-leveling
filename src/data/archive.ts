import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { daysBetweenLocal, todayDateStringInTimezone } from '../lib/cycle';
import { getDb } from './firebase';
import { getDefaultRoutine, getUserRoutine } from './routine';
import {
  ARCHIVE_SCHEMA_VERSION,
  type DailyLog,
  type NormalizedRoutine,
  type NormalizedTimer,
  type YearlyArchive,
} from './schema';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function archiveDocRef(uid: string, year: number) {
  return doc(getDb(), 'users', uid, 'archives', String(year));
}

function archivesCollectionRef(uid: string) {
  return collection(getDb(), 'users', uid, 'archives');
}

function dailyLogDocRef(uid: string, dateYmd: string) {
  return doc(getDb(), 'users', uid, 'dailyLogs', dateYmd);
}

function parseDailyLog(value: unknown): DailyLog | null {
  if (!isRecord(value)) {
    return null;
  }

  const schemaVersion = value.schemaVersion;
  const date = value.date;
  const dayId = value.dayId;
  const exercisesValue = value.exercises;

  if (
    typeof schemaVersion !== 'number' ||
    typeof date !== 'string' ||
    typeof dayId !== 'string' ||
    !Array.isArray(exercisesValue)
  ) {
    return null;
  }

  const exercises = exercisesValue.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    const exerciseId = entry.exerciseId;
    const isCompleted = entry.isCompleted;

    if (typeof exerciseId !== 'string' || typeof isCompleted !== 'boolean') {
      return [];
    }

    const parsed: DailyLog['exercises'][number] = { exerciseId, isCompleted };
    if (entry.completedVia === 'manual' || entry.completedVia === 'timer') {
      parsed.completedVia = entry.completedVia;
    }

    return [parsed];
  });

  const log: DailyLog = {
    schemaVersion: 1,
    date,
    dayId,
    exercises,
  };

  if (typeof value.completedAt === 'string') {
    log.completedAt = value.completedAt;
  }

  return log;
}

function parseYearlyArchive(value: unknown, year: number): YearlyArchive | null {
  if (!isRecord(value)) {
    return null;
  }

  const schemaVersion = value.schemaVersion;
  const docYear = value.year;
  const summarizedAt = value.summarizedAt;
  const userTimezoneAtSummary = value.userTimezoneAtSummary;
  const totalsValue = value.totals;
  const exerciseTotalsValue = value.exerciseTotals;
  const streaksValue = value.streaks;
  const rawLogsDeletedAt = value.rawLogsDeletedAt;

  if (
    schemaVersion !== ARCHIVE_SCHEMA_VERSION ||
    docYear !== year ||
    typeof summarizedAt !== 'string' ||
    typeof userTimezoneAtSummary !== 'string' ||
    !isRecord(totalsValue) ||
    !isRecord(exerciseTotalsValue) ||
    !isRecord(streaksValue) ||
    (rawLogsDeletedAt !== null && typeof rawLogsDeletedAt !== 'string')
  ) {
    return null;
  }

  const daysTrained = totalsValue.daysTrained;
  const workoutsByDayId = totalsValue.workoutsByDayId;

  if (typeof daysTrained !== 'number' || !isRecord(workoutsByDayId)) {
    return null;
  }

  const longestTrainedDays = streaksValue.longestTrainedDays;
  const longestRestDays = streaksValue.longestRestDays;

  if (typeof longestTrainedDays !== 'number' || typeof longestRestDays !== 'number') {
    return null;
  }

  const workouts: Record<string, number> = {};
  for (const [dayId, count] of Object.entries(workoutsByDayId)) {
    if (typeof count === 'number') {
      workouts[dayId] = count;
    }
  }

  const exerciseTotals: YearlyArchive['exerciseTotals'] = {};
  for (const [exerciseId, totals] of Object.entries(exerciseTotalsValue)) {
    if (!isRecord(totals)) {
      continue;
    }

    const completedSessions = totals.completedSessions;
    if (typeof completedSessions !== 'number') {
      continue;
    }

    const entry: YearlyArchive['exerciseTotals'][string] = { completedSessions };
    if (typeof totals.totalWorkSeconds === 'number') {
      entry.totalWorkSeconds = totals.totalWorkSeconds;
    }

    exerciseTotals[exerciseId] = entry;
  }

  return {
    schemaVersion: ARCHIVE_SCHEMA_VERSION,
    year,
    summarizedAt,
    userTimezoneAtSummary,
    totals: { daysTrained, workoutsByDayId: workouts },
    exerciseTotals,
    streaks: { longestTrainedDays, longestRestDays },
    rawLogsDeletedAt,
  };
}

export function isTrainedLog(log: DailyLog): boolean {
  return log.exercises.some((entry) => entry.isCompleted);
}

function timerWorkSeconds(timer: NormalizedTimer): number {
  return timer.rounds.reduce((sum, round) => sum + round.workSeconds, 0);
}

function buildTimedExerciseWorkSecondsMap(
  routine: NormalizedRoutine | null,
): Map<string, number> {
  const map = new Map<string, number>();

  if (routine === null) {
    return map;
  }

  for (const day of routine.days) {
    for (const exercise of day.exercises) {
      if (exercise.kind === 'timed') {
        map.set(exercise.id, timerWorkSeconds(exercise.timer));
      }
    }
  }

  return map;
}

function daysInYear(year: number): number {
  return daysBetweenLocal(`${year}-01-01`, `${year}-12-31`) + 1;
}

function computeStreaks(
  trainedDates: readonly string[],
  year: number,
): YearlyArchive['streaks'] {
  const sorted = [...trainedDates].sort();

  if (sorted.length === 0) {
    return { longestTrainedDays: 0, longestRestDays: daysInYear(year) };
  }

  let longestTrainedDays = 1;
  let currentTrained = 1;

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];

    if (previous === undefined || current === undefined) {
      continue;
    }

    if (daysBetweenLocal(previous, current) === 1) {
      currentTrained += 1;
      longestTrainedDays = Math.max(longestTrainedDays, currentTrained);
    } else {
      currentTrained = 1;
    }
  }

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const firstTrained = sorted[0];
  const lastTrained = sorted[sorted.length - 1];

  if (firstTrained === undefined || lastTrained === undefined) {
    return { longestTrainedDays: 0, longestRestDays: daysInYear(year) };
  }

  let longestRestDays = daysBetweenLocal(yearStart, firstTrained);

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];

    if (previous === undefined || current === undefined) {
      continue;
    }

    const restGap = daysBetweenLocal(previous, current) - 1;
    longestRestDays = Math.max(longestRestDays, restGap);
  }

  longestRestDays = Math.max(longestRestDays, daysBetweenLocal(lastTrained, yearEnd));

  return { longestTrainedDays, longestRestDays };
}

export function summarizeYear(args: {
  logs: DailyLog[];
  routine: NormalizedRoutine | null;
  year: number;
  timezone: string;
  now?: Date;
}): YearlyArchive {
  const { logs, routine, year, timezone } = args;
  const now = args.now ?? new Date();
  const timedWorkSeconds = buildTimedExerciseWorkSecondsMap(routine);

  const trainedLogs = logs.filter(isTrainedLog);
  const workoutsByDayId: Record<string, number> = {};
  const exerciseTotals: YearlyArchive['exerciseTotals'] = {};

  for (const log of trainedLogs) {
    workoutsByDayId[log.dayId] = (workoutsByDayId[log.dayId] ?? 0) + 1;

    for (const entry of log.exercises) {
      if (!entry.isCompleted) {
        continue;
      }

      const existing = exerciseTotals[entry.exerciseId] ?? { completedSessions: 0 };
      const next: YearlyArchive['exerciseTotals'][string] = {
        completedSessions: existing.completedSessions + 1,
      };

      const workSecondsPerSession = timedWorkSeconds.get(entry.exerciseId);
      if (workSecondsPerSession !== undefined) {
        next.totalWorkSeconds =
          (existing.totalWorkSeconds ?? 0) + workSecondsPerSession;
      }

      exerciseTotals[entry.exerciseId] = next;
    }
  }

  const streaks = computeStreaks(
    trainedLogs.map((log) => log.date),
    year,
  );

  return {
    schemaVersion: ARCHIVE_SCHEMA_VERSION,
    year,
    summarizedAt: now.toISOString(),
    userTimezoneAtSummary: timezone,
    totals: {
      daysTrained: trainedLogs.length,
      workoutsByDayId,
    },
    exerciseTotals,
    streaks,
    rawLogsDeletedAt: null,
  };
}

export function currentYearInTimezone(timezone: string, now = new Date()): number {
  const ymd = todayDateStringInTimezone(now, timezone);
  return Number.parseInt(ymd.slice(0, 4), 10);
}

export function getPendingArchiveYear(
  timezone: string,
  archives: YearlyArchive[],
  now = new Date(),
): number | null {
  const currentYear = currentYearInTimezone(timezone, now);

  if (currentYear <= 2026) {
    return null;
  }

  const previousYear = currentYear - 1;
  const hasArchive = archives.some((archive) => archive.year === previousYear);

  return hasArchive ? null : previousYear;
}

export async function getArchive(uid: string, year: number): Promise<YearlyArchive | null> {
  const snapshot = await getDoc(archiveDocRef(uid, year));

  if (!snapshot.exists()) {
    return null;
  }

  return parseYearlyArchive(snapshot.data(), year);
}

export async function listArchives(uid: string): Promise<YearlyArchive[]> {
  const snapshot = await getDocs(archivesCollectionRef(uid));
  const archives: YearlyArchive[] = [];

  for (const docSnapshot of snapshot.docs) {
    const year = Number.parseInt(docSnapshot.id, 10);

    if (!Number.isInteger(year)) {
      continue;
    }

    const parsed = parseYearlyArchive(docSnapshot.data(), year);
    if (parsed) {
      archives.push(parsed);
    }
  }

  archives.sort((a, b) => b.year - a.year);
  return archives;
}

export async function fetchDailyLogsForYear(uid: string, year: number): Promise<DailyLog[]> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  const logsQuery = query(
    collection(getDb(), 'users', uid, 'dailyLogs'),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
  );
  const snapshot = await getDocs(logsQuery);
  const logs: DailyLog[] = [];

  for (const docSnapshot of snapshot.docs) {
    const parsed = parseDailyLog(docSnapshot.data());
    if (parsed) {
      logs.push(parsed);
    }
  }

  logs.sort((a, b) => a.date.localeCompare(b.date));
  return logs;
}

export async function createArchive(
  uid: string,
  year: number,
  timezone: string,
): Promise<YearlyArchive> {
  const [logs, userRoutine] = await Promise.all([
    fetchDailyLogsForYear(uid, year),
    getUserRoutine(uid),
  ]);
  const routine = userRoutine ?? (await getDefaultRoutine());
  const archive = summarizeYear({ logs, routine, year, timezone });

  await setDoc(archiveDocRef(uid, year), archive);
  return archive;
}

const BATCH_DELETE_LIMIT = 500;

export async function deleteRawLogsForYear(uid: string, year: number): Promise<number> {
  const logs = await fetchDailyLogsForYear(uid, year);

  for (let offset = 0; offset < logs.length; offset += BATCH_DELETE_LIMIT) {
    const batch = writeBatch(getDb());
    const chunk = logs.slice(offset, offset + BATCH_DELETE_LIMIT);

    for (const log of chunk) {
      batch.delete(dailyLogDocRef(uid, log.date));
    }

    await batch.commit();
  }

  await updateDoc(archiveDocRef(uid, year), {
    rawLogsDeletedAt: new Date().toISOString(),
  });

  return logs.length;
}

export type ArchivePromptState =
  | { status: 'loading' }
  | {
      status: 'ready';
      archives: YearlyArchive[];
      pendingYear: number | null;
      reload: () => void;
    }
  | { status: 'error'; error: Error };

export function useArchivePrompt(args: { uid: string; timezone: string }): ArchivePromptState {
  const { uid, timezone } = args;
  const [state, setState] = useState<ArchivePromptState>({ status: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void listArchives(uid)
      .then((archives) => {
        if (cancelled) {
          return;
        }

        setState({
          status: 'ready',
          archives,
          pendingYear: getPendingArchiveYear(timezone, archives),
          reload,
        });
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
