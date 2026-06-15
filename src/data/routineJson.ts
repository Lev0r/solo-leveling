import { InvalidRoutineError, parseRoutine } from './routine';
import type { NormalizedRoutine } from './schema';

export function exportRoutineToJson(routine: NormalizedRoutine): string {
  return JSON.stringify(routine, null, 2);
}

export function importRoutineFromJson(text: string): NormalizedRoutine {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new InvalidRoutineError('Invalid JSON syntax');
  }

  return parseRoutine(parsed);
}

function slugifyRoutineName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function routineExportFilename(routine: NormalizedRoutine): string {
  const base = 'solo-leveling-routine';

  if (!routine.name) {
    return `${base}.json`;
  }

  const slug = slugifyRoutineName(routine.name);
  return slug ? `${base}-${slug}.json` : `${base}.json`;
}

export function downloadRoutineJson(routine: NormalizedRoutine): void {
  const json = exportRoutineToJson(routine);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = routineExportFilename(routine);
  anchor.click();
  URL.revokeObjectURL(url);
}
