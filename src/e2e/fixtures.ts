import { todayDateStringInTimezone } from '../lib/cycle';
import { BUILTIN_DEFAULT_ROUTINE } from '../data/defaultRoutine';
import {
  DAILY_LOG_SCHEMA_VERSION,
  USER_PROFILE_SCHEMA_VERSION,
  type AppLanguage,
  type CompletedVia,
  type DailyLog,
  type DailyLogExerciseEntry,
  type UserProfile,
} from '../data/schema';

export function isE2EFixturesEnabled(): boolean {
  return import.meta.env.VITE_E2E_FIXTURES === 'true';
}

export const E2E_USER = {
  uid: 'e2e-test-user',
  email: 'e2e@test.example',
  displayName: 'E2E User',
} as const;

const E2E_PROFILE_SEED: UserProfile = {
  schemaVersion: USER_PROFILE_SCHEMA_VERSION,
  email: E2E_USER.email,
  displayName: E2E_USER.displayName,
  timezone: 'Europe/Kyiv',
  language: 'uk',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastSignInAt: '2026-01-01T00:00:00.000Z',
};

export const E2E_PROFILE: UserProfile = E2E_PROFILE_SEED;

export { BUILTIN_DEFAULT_ROUTINE };

let e2eProfile: UserProfile = { ...E2E_PROFILE_SEED };
let e2eTodayLog: DailyLog | null = null;

export function getE2EProfile(): UserProfile {
  return e2eProfile;
}

export function setE2EProfileLanguage(language: AppLanguage): void {
  e2eProfile = { ...e2eProfile, language };
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

export function e2eGetTodayLog(args: {
  uid: string;
  timezone: string;
  now?: Date;
}): DailyLog | null {
  void args.uid;

  if (e2eTodayLog === null) {
    return null;
  }

  const dateYmd = todayDateStringInTimezone(args.now ?? new Date(), args.timezone);
  if (e2eTodayLog.date !== dateYmd) {
    return null;
  }

  return e2eTodayLog;
}

export function e2eSetExerciseCompletion(args: {
  uid: string;
  timezone: string;
  dayId: string;
  exerciseId: string;
  isCompleted: boolean;
  completedVia?: CompletedVia;
  routineExerciseIdsForDay: readonly string[];
  now?: Date;
}): DailyLog {
  void args.uid;

  const now = args.now ?? new Date();
  const dateYmd = todayDateStringInTimezone(now, args.timezone);
  const completedVia = args.completedVia ?? 'manual';

  let log: DailyLog;

  if (e2eTodayLog === null || e2eTodayLog.date !== dateYmd) {
    log = {
      schemaVersion: DAILY_LOG_SCHEMA_VERSION,
      date: dateYmd,
      dayId: args.dayId,
      exercises: [{ exerciseId: args.exerciseId, isCompleted: args.isCompleted, completedVia }],
    };
  } else {
    log = {
      ...e2eTodayLog,
      dayId: args.dayId,
      exercises: upsertExerciseEntry(
        e2eTodayLog.exercises,
        args.exerciseId,
        args.isCompleted,
        completedVia,
      ),
    };
  }

  if (log.completedAt === undefined && allRoutineExercisesCompleted(log.exercises, args.routineExerciseIdsForDay)) {
    log = { ...log, completedAt: now.toISOString() };
  }

  e2eTodayLog = log;
  return log;
}
