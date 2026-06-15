export const USER_PROFILE_SCHEMA_VERSION = 1;
export const ROUTINE_SCHEMA_VERSION = 1;
export const DAILY_LOG_SCHEMA_VERSION = 1;

export type AppLanguage = 'uk' | 'en';

export type UserProfile = {
  schemaVersion: typeof USER_PROFILE_SCHEMA_VERSION;
  email: string;
  displayName: string | null;
  timezone: string;
  language: AppLanguage;
  createdAt: string;
  lastSignInAt: string;
};

export type ExerciseId = string;
export type DayId = string;
export type CompletedVia = 'manual' | 'timer';

export type TimerRound = {
  workSeconds: number;
  restSeconds: number;
};

export type NormalizedTimer = {
  rounds: TimerRound[];
};

export type ChecklistExercise = {
  kind: 'checklist';
  id: ExerciseId;
  name: string;
  notes?: string;
};

export type TimedExercise = {
  kind: 'timed';
  id: ExerciseId;
  name: string;
  timer: NormalizedTimer;
  notes?: string;
};

export type Exercise = ChecklistExercise | TimedExercise;

export type RoutineDay = {
  id: DayId;
  label: string;
  exercises: Exercise[];
};

export type NormalizedRoutine = {
  schemaVersion: typeof ROUTINE_SCHEMA_VERSION;
  name?: string;
  anchorDate: string;
  units?: 'kg' | 'lb';
  days: RoutineDay[];
};

export type DailyLogExerciseEntry = {
  exerciseId: ExerciseId;
  isCompleted: boolean;
  completedVia?: CompletedVia;
};

export type DailyLog = {
  schemaVersion: typeof DAILY_LOG_SCHEMA_VERSION;
  date: string;
  dayId: DayId;
  exercises: DailyLogExerciseEntry[];
  completedAt?: string;
};
