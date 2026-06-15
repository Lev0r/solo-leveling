import {
  collection,
  getDocs,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { DailyLog, NormalizedRoutine } from './schema';
import { ARCHIVE_SCHEMA_VERSION } from './schema';
import {
  createArchive,
  deleteRawLogsForYear,
  fetchDailyLogsForYear,
  getPendingArchiveYear,
  summarizeYear,
} from './archive';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join('/') })),
  doc: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join('/') })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn((...args: unknown[]) => args),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn((field: string, op: string, value: string) => ({ field, op, value })),
  writeBatch: vi.fn(),
}));

vi.mock('./firebase', () => ({
  getDb: vi.fn(() => ({})),
}));

vi.mock('./routine', () => ({
  getUserRoutine: vi.fn(),
  getDefaultRoutine: vi.fn(),
}));

import { getDefaultRoutine, getUserRoutine } from './routine';

const mockGetDocs = vi.mocked(getDocs);
const mockSetDoc = vi.mocked(setDoc);
const mockUpdateDoc = vi.mocked(updateDoc);
const mockWriteBatch = vi.mocked(writeBatch);
const mockGetUserRoutine = vi.mocked(getUserRoutine);
const mockGetDefaultRoutine = vi.mocked(getDefaultRoutine);

const routine: NormalizedRoutine = {
  schemaVersion: 1,
  anchorDate: '2026-01-01',
  days: [
    {
      id: 'day_a',
      label: 'Day A',
      exercises: [
        { kind: 'checklist', id: 'warmup', name: 'Warmup' },
        {
          kind: 'timed',
          id: 'kb_swings',
          name: 'Swings',
          timer: {
            rounds: [
              { workSeconds: 40, restSeconds: 20 },
              { workSeconds: 40, restSeconds: 0 },
            ],
          },
        },
      ],
    },
  ],
};

function makeLog(
  date: string,
  exercises: DailyLog['exercises'],
  dayId = 'day_a',
): DailyLog {
  return {
    schemaVersion: 1,
    date,
    dayId,
    exercises,
  };
}

describe('summarizeYear', () => {
  it('counts trained days, workouts by day, and exercise totals', () => {
    const logs: DailyLog[] = [
      makeLog('2026-01-02', [
        { exerciseId: 'warmup', isCompleted: true },
        { exerciseId: 'kb_swings', isCompleted: true, completedVia: 'timer' },
      ]),
      makeLog('2026-01-03', [{ exerciseId: 'warmup', isCompleted: false }]),
      makeLog('2026-01-04', [{ exerciseId: 'warmup', isCompleted: true }], 'day_b'),
    ];

    const archive = summarizeYear({
      logs,
      routine,
      year: 2026,
      timezone: 'Europe/Warsaw',
      now: new Date('2027-01-05T10:00:00.000Z'),
    });

    expect(archive.schemaVersion).toBe(ARCHIVE_SCHEMA_VERSION);
    expect(archive.year).toBe(2026);
    expect(archive.summarizedAt).toBe('2027-01-05T10:00:00.000Z');
    expect(archive.userTimezoneAtSummary).toBe('Europe/Warsaw');
    expect(archive.totals.daysTrained).toBe(2);
    expect(archive.totals.workoutsByDayId).toEqual({
      day_a: 1,
      day_b: 1,
    });
    expect(archive.exerciseTotals.warmup).toEqual({ completedSessions: 2 });
    expect(archive.exerciseTotals.kb_swings).toEqual({
      completedSessions: 1,
      totalWorkSeconds: 80,
    });
    expect(archive.rawLogsDeletedAt).toBeNull();
  });

  it('computes longest trained streak', () => {
    const logs: DailyLog[] = [
      makeLog('2026-01-05', [{ exerciseId: 'warmup', isCompleted: true }]),
      makeLog('2026-01-06', [{ exerciseId: 'warmup', isCompleted: true }]),
      makeLog('2026-01-07', [{ exerciseId: 'warmup', isCompleted: true }]),
      makeLog('2026-01-12', [{ exerciseId: 'warmup', isCompleted: true }]),
    ];

    const archive = summarizeYear({
      logs,
      routine,
      year: 2026,
      timezone: 'UTC',
    });

    expect(archive.streaks.longestTrainedDays).toBe(3);
  });

  it('computes longest rest streak including year end', () => {
    const logs: DailyLog[] = [];
    for (
      let day = new Date('2026-01-01T00:00:00Z');
      day <= new Date('2026-12-20T00:00:00Z');
      day.setUTCDate(day.getUTCDate() + 1)
    ) {
      logs.push(
        makeLog(day.toISOString().slice(0, 10), [
          { exerciseId: 'warmup', isCompleted: true },
        ]),
      );
    }

    const archive = summarizeYear({
      logs,
      routine,
      year: 2026,
      timezone: 'UTC',
    });

    expect(archive.streaks.longestRestDays).toBe(11);
  });

  it('returns full-year rest when nothing was trained', () => {
    const archive = summarizeYear({
      logs: [],
      routine,
      year: 2026,
      timezone: 'UTC',
    });

    expect(archive.totals.daysTrained).toBe(0);
    expect(archive.streaks.longestTrainedDays).toBe(0);
    expect(archive.streaks.longestRestDays).toBe(365);
  });

  it('omits totalWorkSeconds when routine is null', () => {
    const logs: DailyLog[] = [
      makeLog('2026-01-02', [{ exerciseId: 'kb_swings', isCompleted: true }]),
    ];

    const archive = summarizeYear({
      logs,
      routine: null,
      year: 2026,
      timezone: 'UTC',
    });

    expect(archive.exerciseTotals.kb_swings).toEqual({ completedSessions: 1 });
  });
});

describe('getPendingArchiveYear', () => {
  it('returns previous year when missing and current year is after 2026', () => {
    const pending = getPendingArchiveYear(
      'UTC',
      [],
      new Date('2027-02-01T12:00:00.000Z'),
    );

    expect(pending).toBe(2026);
  });

  it('returns null when archive exists or year is 2026', () => {
    expect(
      getPendingArchiveYear(
        'UTC',
        [{ year: 2026 } as never],
        new Date('2027-02-01T12:00:00.000Z'),
      ),
    ).toBeNull();

    expect(
      getPendingArchiveYear('UTC', [], new Date('2026-06-01T12:00:00.000Z')),
    ).toBeNull();
  });
});

describe('fetchDailyLogsForYear', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries daily logs within the year range', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        {
          data: () => ({
            schemaVersion: 1,
            date: '2026-03-01',
            dayId: 'day_a',
            exercises: [{ exerciseId: 'warmup', isCompleted: true }],
          }),
        },
      ],
    } as Awaited<ReturnType<typeof getDocs>>);

    const logs = await fetchDailyLogsForYear('uid-1', 2026);

    expect(collection).toHaveBeenCalled();
    expect(where).toHaveBeenCalledWith('date', '>=', '2026-01-01');
    expect(where).toHaveBeenCalledWith('date', '<=', '2026-12-31');
    expect(logs).toHaveLength(1);
    expect(logs[0]?.date).toBe('2026-03-01');
  });
});

describe('createArchive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetDoc.mockResolvedValue(undefined);
    mockGetUserRoutine.mockResolvedValue(routine);
    mockGetDocs.mockResolvedValue({ docs: [] } as unknown as Awaited<ReturnType<typeof getDocs>>);
  });

  it('writes a summarized archive document', async () => {
    const archive = await createArchive('uid-1', 2026, 'Europe/Warsaw');

    expect(archive.year).toBe(2026);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
  });

  it('falls back to default routine when user routine is missing', async () => {
    mockGetUserRoutine.mockResolvedValueOnce(null);
    mockGetDefaultRoutine.mockResolvedValueOnce(routine);

    await createArchive('uid-1', 2026, 'UTC');

    expect(mockGetDefaultRoutine).toHaveBeenCalledTimes(1);
  });
});

describe('deleteRawLogsForYear', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateDoc.mockResolvedValue(undefined);
  });

  it('batch deletes logs and patches rawLogsDeletedAt', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        { data: () => makeLog('2026-01-01', [{ exerciseId: 'warmup', isCompleted: true }]) },
        { data: () => makeLog('2026-01-02', [{ exerciseId: 'warmup', isCompleted: true }]) },
      ],
    } as Awaited<ReturnType<typeof getDocs>>);

    const batchDelete = vi.fn();
    const batchCommit = vi.fn().mockResolvedValue(undefined);
    mockWriteBatch.mockReturnValue({
      delete: batchDelete,
      commit: batchCommit,
    } as unknown as ReturnType<typeof writeBatch>);

    const deleted = await deleteRawLogsForYear('uid-1', 2026);

    expect(deleted).toBe(2);
    expect(batchDelete).toHaveBeenCalledTimes(2);
    expect(batchCommit).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
  });
});
