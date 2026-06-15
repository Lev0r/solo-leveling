import {
  computeCycleIndex,
  daysBetweenLocal,
  getTodaysDay,
  todayDateStringInTimezone,
} from './cycle';

describe('todayDateStringInTimezone', () => {
  it('returns YYYY-MM-DD in Europe/Warsaw', () => {
    const now = new Date('2026-06-13T22:30:00.000Z');
    expect(todayDateStringInTimezone(now, 'Europe/Warsaw')).toBe('2026-06-14');
  });

  it('returns YYYY-MM-DD in UTC', () => {
    const now = new Date('2026-06-13T22:30:00.000Z');
    expect(todayDateStringInTimezone(now, 'UTC')).toBe('2026-06-13');
  });

  it('handles Pacific/Auckland timezone boundary', () => {
    const now = new Date('2026-06-13T12:00:00.000Z');
    expect(todayDateStringInTimezone(now, 'Pacific/Auckland')).toBe('2026-06-14');
  });
});

describe('daysBetweenLocal', () => {
  it('returns positive gap for dates after anchor', () => {
    expect(daysBetweenLocal('2026-01-01', '2026-01-11')).toBe(10);
  });

  it('returns negative gap for dates before anchor', () => {
    expect(daysBetweenLocal('2026-01-11', '2026-01-01')).toBe(-10);
  });

  it('throws for invalid date strings', () => {
    expect(() => daysBetweenLocal('not-a-date', '2026-01-01')).toThrow();
  });
});

describe('computeCycleIndex', () => {
  it('wraps correctly over a 10-day span with cycle length 3', () => {
    const anchor = '2026-01-01';
    const expected = [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1];

    for (let offset = 0; offset <= 10; offset += 1) {
      const day = String(offset + 1).padStart(2, '0');
      const todayYmd = `2026-01-${day}`;
      expect(computeCycleIndex(anchor, todayYmd, 3)).toBe(expected[offset]);
    }
  });

  it('returns non-negative index for dates before anchor', () => {
    expect(computeCycleIndex('2026-01-10', '2026-01-09', 3)).toBe(2);
  });
});

describe('getTodaysDay', () => {
  it('returns the expected day element', () => {
    const routine = {
      anchorDate: '2026-01-01',
      days: [{ id: 'day_a' }, { id: 'day_b' }, { id: 'day_c' }],
    };
    const now = new Date('2026-01-04T12:00:00.000Z');

    const result = getTodaysDay(routine, 'UTC', now);

    expect(result.dateYmd).toBe('2026-01-04');
    expect(result.index).toBe(0);
    expect(result.day).toEqual({ id: 'day_a' });
  });
});
