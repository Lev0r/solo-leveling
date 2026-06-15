import { act, renderHook, waitFor } from '@testing-library/react';
import { getDoc, setDoc } from 'firebase/firestore';
import {
  getTodayLog,
  setExerciseCompletion,
  useTodayLog,
} from './dailyLog';
import { DAILY_LOG_SCHEMA_VERSION } from './schema';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join('/') })),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock('./firebase', () => ({
  getDb: vi.fn(() => ({})),
}));

const mockGetDoc = vi.mocked(getDoc);
const mockSetDoc = vi.mocked(setDoc);

const uid = 'test-uid';
const timezone = 'UTC';
const dayId = 'day_a_legs_pull';
const now = new Date('2026-06-13T12:00:00.000Z');
const routineExerciseIds = ['ex_a', 'ex_b'];

describe('setExerciseCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetDoc.mockResolvedValue(undefined);
  });

  it('creates a new doc with the right shape when none exists', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => undefined,
    } as Awaited<ReturnType<typeof getDoc>>);

    const log = await setExerciseCompletion({
      uid,
      timezone,
      dayId,
      exerciseId: 'ex_a',
      isCompleted: true,
      routineExerciseIdsForDay: routineExerciseIds,
      now,
    });

    expect(log).toMatchObject({
      schemaVersion: DAILY_LOG_SCHEMA_VERSION,
      date: '2026-06-13',
      dayId,
      exercises: [{ exerciseId: 'ex_a', isCompleted: true, completedVia: 'manual' }],
    });
    expect(log.completedAt).toBeUndefined();
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
  });

  it('toggles an existing entry without duplicating it', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        schemaVersion: DAILY_LOG_SCHEMA_VERSION,
        date: '2026-06-13',
        dayId,
        exercises: [{ exerciseId: 'ex_a', isCompleted: true, completedVia: 'manual' }],
      }),
    } as Awaited<ReturnType<typeof getDoc>>);

    const log = await setExerciseCompletion({
      uid,
      timezone,
      dayId,
      exerciseId: 'ex_a',
      isCompleted: false,
      routineExerciseIdsForDay: routineExerciseIds,
      now,
    });

    expect(log.exercises).toHaveLength(1);
    expect(log.exercises[0]).toEqual({
      exerciseId: 'ex_a',
      isCompleted: false,
      completedVia: 'manual',
    });
  });

  it('sets completedAt when the final exercise flips to completed', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        schemaVersion: DAILY_LOG_SCHEMA_VERSION,
        date: '2026-06-13',
        dayId,
        exercises: [{ exerciseId: 'ex_a', isCompleted: true, completedVia: 'manual' }],
      }),
    } as Awaited<ReturnType<typeof getDoc>>);

    const log = await setExerciseCompletion({
      uid,
      timezone,
      dayId,
      exerciseId: 'ex_b',
      isCompleted: true,
      routineExerciseIdsForDay: routineExerciseIds,
      now,
    });

    expect(log.completedAt).toBe(now.toISOString());
  });

  it('does not clear completedAt when a user un-checks after completion', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        schemaVersion: DAILY_LOG_SCHEMA_VERSION,
        date: '2026-06-13',
        dayId,
        completedAt: '2026-06-13T11:00:00.000Z',
        exercises: [
          { exerciseId: 'ex_a', isCompleted: true, completedVia: 'manual' },
          { exerciseId: 'ex_b', isCompleted: true, completedVia: 'manual' },
        ],
      }),
    } as Awaited<ReturnType<typeof getDoc>>);

    const log = await setExerciseCompletion({
      uid,
      timezone,
      dayId,
      exerciseId: 'ex_b',
      isCompleted: false,
      routineExerciseIdsForDay: routineExerciseIds,
      now,
    });

    expect(log.completedAt).toBe('2026-06-13T11:00:00.000Z');
  });
});

describe('getTodayLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves to null when missing', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => undefined,
    } as Awaited<ReturnType<typeof getDoc>>);

    await expect(getTodayLog({ uid, timezone, now })).resolves.toBeNull();
  });
});

describe('useTodayLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reload triggers a second getDoc call', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
      data: () => undefined,
    } as Awaited<ReturnType<typeof getDoc>>);

    const { result } = renderHook(() => useTodayLog({ uid, timezone }));

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    expect(mockGetDoc).toHaveBeenCalledTimes(1);

    await act(async () => {
      if (result.current.status === 'ready') {
        result.current.reload();
      }
    });

    await waitFor(() => {
      expect(mockGetDoc).toHaveBeenCalledTimes(2);
    });
  });
});
