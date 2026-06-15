const MS_PER_DAY = 86_400_000;

export function todayDateStringInTimezone(now: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function daysBetweenLocal(anchorYmd: string, todayYmd: string): number {
  const anchor = new Date(`${anchorYmd}T00:00:00Z`);
  const today = new Date(`${todayYmd}T00:00:00Z`);

  if (Number.isNaN(anchor.getTime()) || Number.isNaN(today.getTime())) {
    throw new Error(`Invalid date string: anchor="${anchorYmd}", today="${todayYmd}"`);
  }

  return Math.floor((today.getTime() - anchor.getTime()) / MS_PER_DAY);
}

export function computeCycleIndex(
  anchorYmd: string,
  todayYmd: string,
  cycleLength: number,
): number {
  const days = daysBetweenLocal(anchorYmd, todayYmd);
  return ((days % cycleLength) + cycleLength) % cycleLength;
}

export function getTodaysDay<T>(
  routine: { anchorDate: string; days: T[] },
  timezone: string,
  now: Date,
): { day: T; index: number; dateYmd: string } {
  const dateYmd = todayDateStringInTimezone(now, timezone);
  const index = computeCycleIndex(routine.anchorDate, dateYmd, routine.days.length);
  const day = routine.days[index];

  if (day === undefined) {
    throw new Error('Routine has no days');
  }

  return { day, index, dateYmd };
}
