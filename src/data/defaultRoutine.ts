/**
 * Built-in default routine encoding `docs/basic-program-template.md`.
 *
 * Encoding choices:
 * - 3-day microcycle (A: legs/pull, B: press/ballistic, C: recovery-only warmup).
 * - Daily Minimum (5 checklist warmup items) prepended to every day; Day C has warmup only.
 * - Uniform timers expanded to array form (kb_swings 4×40/20, halo 3×40/30).
 * - Variable timers use explicit per-round arrays (kb_row, kb_press, kb_lunges, kb_snatches, dynamic_plank).
 * - anchorDate 2026-01-01; units kg; Ukrainian names and coaching notes from the template.
 */
import {
  ROUTINE_SCHEMA_VERSION,
  type Exercise,
  type NormalizedRoutine,
  type TimedExercise,
} from './schema';

function uniformTimer(
  workSeconds: number,
  restSeconds: number,
  count: number,
): TimedExercise['timer'] {
  return {
    rounds: Array.from({ length: count }, () => ({ workSeconds, restSeconds })),
  };
}

function variableTimer(
  rounds: Array<{ workSeconds: number; restSeconds: number }>,
): TimedExercise['timer'] {
  return { rounds };
}

const DAILY_MINIMUM: Exercise[] = [
  {
    kind: 'checklist',
    id: 'warmup_joints',
    name: 'Суглобова розминка',
    notes: '2 хв: шия, плечі, таз, коліна',
  },
  {
    kind: 'timed',
    id: 'warmup_skipping',
    name: 'Скакалка',
    timer: { rounds: [{ workSeconds: 300, restSeconds: 0 }] },
    notes: 'Безперервно, помірний темп',
  },
  {
    kind: 'checklist',
    id: 'warmup_pushups',
    name: 'Віджимання (розминкові)',
    notes: '2 підходи по 50% від максимуму',
  },
  {
    kind: 'checklist',
    id: 'warmup_pullups',
    name: 'Підтягування (розминкові)',
    notes: '2 підходи по 50% від максимуму',
  },
  {
    kind: 'timed',
    id: 'warmup_plank',
    name: 'Планка',
    timer: { rounds: [{ workSeconds: 60, restSeconds: 0 }] },
    notes: 'Активація кору, нейтральний хребет',
  },
];

const DAY_A_EXERCISES: Exercise[] = [
  {
    kind: 'checklist',
    id: 'goblet_squat',
    name: 'Гоблет-присідання з гірею',
    notes: '3 підходи, ексцентрика 3-4 с, до печіння',
  },
  {
    kind: 'checklist',
    id: 'pullups',
    name: 'Підтягування на турніку',
    notes: '3 підходи, лишати 1-2 повторення в запасі',
  },
  {
    kind: 'timed',
    id: 'kb_row',
    name: 'Тяга гірі в нахилі (унілатерально)',
    timer: variableTimer([
      { workSeconds: 30, restSeconds: 30 },
      { workSeconds: 30, restSeconds: 30 },
      { workSeconds: 30, restSeconds: 0 },
    ]),
    notes: '3 підходи × 30 с на кожну руку',
  },
  {
    kind: 'timed',
    id: 'kb_swings',
    name: 'Махи гірею',
    timer: uniformTimer(40, 20, 4),
    notes: 'Обома руками, потужний поштовх тазом — балістично',
  },
  {
    kind: 'checklist',
    id: 'kb_curl',
    name: 'Підйом гірі на біцепс',
    notes: '3 підходи до контрольованої втоми',
  },
  {
    kind: 'checklist',
    id: 'abs',
    name: 'Прес',
    notes: '2 підходи до відмови',
  },
];

const DAY_B_EXERCISES: Exercise[] = [
  {
    kind: 'checklist',
    id: 'pushups_working',
    name: 'Віджимання від підлоги (робочі)',
    notes: '3 підходи, повна амплітуда, 1-2 в запасі',
  },
  {
    kind: 'timed',
    id: 'kb_press',
    name: 'Жим гірі над головою',
    timer: variableTimer([
      { workSeconds: 30, restSeconds: 30 },
      { workSeconds: 30, restSeconds: 30 },
      { workSeconds: 30, restSeconds: 0 },
    ]),
    notes: '3 підходи × 30 с на кожну руку',
  },
  {
    kind: 'timed',
    id: 'kb_lunges',
    name: 'Випади з гірею',
    timer: variableTimer([
      { workSeconds: 30, restSeconds: 30 },
      { workSeconds: 30, restSeconds: 30 },
      { workSeconds: 30, restSeconds: 0 },
    ]),
    notes: '3 підходи × 30 с на кожну ногу',
  },
  {
    kind: 'timed',
    id: 'kb_snatches',
    name: 'Ривки гірі однією рукою',
    timer: variableTimer([
      { workSeconds: 25, restSeconds: 30 },
      { workSeconds: 25, restSeconds: 30 },
      { workSeconds: 25, restSeconds: 0 },
    ]),
    notes: '3 підходи × 25 с на кожну руку',
  },
  {
    kind: 'timed',
    id: 'halo',
    name: 'Halo (Обертання гірі навколо голови)',
    timer: uniformTimer(40, 30, 3),
    notes: 'Повільні контрольовані оберти, плечі розслаблені',
  },
  {
    kind: 'timed',
    id: 'dynamic_plank',
    name: 'Динамічна планка',
    timer: variableTimer([
      { workSeconds: 50, restSeconds: 30 },
      { workSeconds: 50, restSeconds: 0 },
    ]),
    notes: '2 раунди × 50 с з переходом «низька-висока» планка',
  },
];

export const BUILTIN_DEFAULT_ROUTINE: NormalizedRoutine = {
  schemaVersion: ROUTINE_SCHEMA_VERSION,
  name: 'Відновлення форми',
  anchorDate: '2026-01-01',
  units: 'kg',
  days: [
    {
      id: 'day_a_legs_pull',
      label: 'Ноги та тягові',
      exercises: [...DAILY_MINIMUM, ...DAY_A_EXERCISES],
    },
    {
      id: 'day_b_press_ballistic',
      label: 'Жими та балістика',
      exercises: [...DAILY_MINIMUM, ...DAY_B_EXERCISES],
    },
    {
      id: 'day_c_recovery',
      label: 'Відновлення',
      exercises: [...DAILY_MINIMUM],
    },
  ],
};
