import { renderHook, waitFor } from '@testing-library/react';
import { getDoc } from 'firebase/firestore';
import { BUILTIN_DEFAULT_ROUTINE } from './defaultRoutine';
import {
  InvalidRoutineError,
  getDefaultRoutine,
  parseRoutine,
  useUserRoutine,
} from './routine';
import { ROUTINE_SCHEMA_VERSION } from './schema';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join('/') })),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock('./firebase', () => ({
  getDb: vi.fn(() => ({})),
}));

const mockGetDoc = vi.mocked(getDoc);

const canonicalRoutine = {
  schemaVersion: 1,
  name: 'Відновлення форми',
  anchorDate: '2026-01-01',
  units: 'kg',
  days: [
    {
      id: 'day_a_legs_pull',
      label: 'День 1 — Ноги та тягові',
      exercises: [
        {
          kind: 'checklist',
          id: 'warmup_skipping',
          name: 'Скакалка',
          notes: '5 хв безперервно, помірний темп',
        },
        {
          kind: 'timed',
          id: 'kb_swings',
          name: 'Махи гірею',
          timer: {
            workSeconds: 40,
            restSeconds: 20,
            rounds: 4,
          },
        },
        {
          kind: 'timed',
          id: 'kb_row',
          name: 'Тяга гірі в нахилі (унілатерально)',
          timer: {
            rounds: [
              { workSeconds: 30, restSeconds: 30 },
              { workSeconds: 30, restSeconds: 30 },
              { workSeconds: 30, restSeconds: 0 },
            ],
          },
          notes: '30 с на кожну руку',
        },
      ],
    },
  ],
};

describe('parseRoutine', () => {
  it('accepts the canonical example from data-model.md', () => {
    const routine = parseRoutine(canonicalRoutine);

    expect(routine.schemaVersion).toBe(ROUTINE_SCHEMA_VERSION);
    expect(routine.days[0]?.exercises).toHaveLength(3);
  });

  it('normalizes uniform shorthand to array form', () => {
    const routine = parseRoutine(canonicalRoutine);
    const swings = routine.days[0]?.exercises[1];

    expect(swings?.kind).toBe('timed');
    if (swings?.kind === 'timed') {
      expect(swings.timer.rounds).toHaveLength(4);
      expect(swings.timer.rounds[0]).toEqual({ workSeconds: 40, restSeconds: 20 });
    }
  });

  it('infers kind from a v0-style entry missing kind but with timer present', () => {
    const routine = parseRoutine({
      schemaVersion: 1,
      anchorDate: '2026-01-01',
      days: [
        {
          id: 'day_a',
          label: 'Day A',
          exercises: [
            {
              id: 'kb_swings',
              name: 'Swings',
              timer: { workSeconds: 40, restSeconds: 20, rounds: 2 },
            },
          ],
        },
      ],
    });

    expect(routine.days[0]?.exercises[0]?.kind).toBe('timed');
  });

  it('throws for mixed uniform and array timer config', () => {
    expect(() =>
      parseRoutine({
        schemaVersion: 1,
        anchorDate: '2026-01-01',
        days: [
          {
            id: 'day_a',
            label: 'Day A',
            exercises: [
              {
                kind: 'timed',
                id: 'kb_swings',
                name: 'Swings',
                timer: {
                  workSeconds: 40,
                  restSeconds: 20,
                  rounds: [{ workSeconds: 30, restSeconds: 10 }],
                },
              },
            ],
          },
        ],
      }),
    ).toThrow(InvalidRoutineError);
  });

  it('throws for duplicate exercise IDs within a day', () => {
    expect(() =>
      parseRoutine({
        schemaVersion: 1,
        anchorDate: '2026-01-01',
        days: [
          {
            id: 'day_a',
            label: 'Day A',
            exercises: [
              { kind: 'checklist', id: 'dup', name: 'One' },
              { kind: 'checklist', id: 'dup', name: 'Two' },
            ],
          },
        ],
      }),
    ).toThrow(InvalidRoutineError);
  });

  it('throws for empty days array', () => {
    expect(() =>
      parseRoutine({
        schemaVersion: 1,
        anchorDate: '2026-01-01',
        days: [],
      }),
    ).toThrow(InvalidRoutineError);
  });

  it('throws when schemaVersion is greater than current', () => {
    expect(() =>
      parseRoutine({
        schemaVersion: ROUTINE_SCHEMA_VERSION + 1,
        anchorDate: '2026-01-01',
        days: [
          {
            id: 'day_a',
            label: 'Day A',
            exercises: [{ kind: 'checklist', id: 'a', name: 'A' }],
          },
        ],
      }),
    ).toThrow(InvalidRoutineError);
  });
});

describe('getDefaultRoutine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns BUILTIN_DEFAULT_ROUTINE when the document is missing', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => undefined,
    } as Awaited<ReturnType<typeof getDoc>>);

    await expect(getDefaultRoutine()).resolves.toEqual(BUILTIN_DEFAULT_ROUTINE);
  });

  it('returns the parsed result when the document is valid', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => canonicalRoutine,
    } as Awaited<ReturnType<typeof getDoc>>);

    const routine = await getDefaultRoutine();

    expect(routine.name).toBe('Відновлення форми');
    expect(routine.days[0]?.id).toBe('day_a_legs_pull');
  });
});

describe('useUserRoutine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ready with null when the user has no routine doc', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => undefined,
    } as Awaited<ReturnType<typeof getDoc>>);

    const { result } = renderHook(() => useUserRoutine('test-uid'));

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    if (result.current.status === 'ready') {
      expect(result.current.routine).toBeNull();
    }
  });
});
