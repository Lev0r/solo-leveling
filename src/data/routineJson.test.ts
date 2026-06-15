import { BUILTIN_DEFAULT_ROUTINE } from './defaultRoutine';
import { InvalidRoutineError } from './routine';
import { ROUTINE_SCHEMA_VERSION } from './schema';
import {
  exportRoutineToJson,
  importRoutineFromJson,
  routineExportFilename,
} from './routineJson';

describe('routineJson', () => {
  it('round-trips BUILTIN_DEFAULT_ROUTINE', () => {
    const json = exportRoutineToJson(BUILTIN_DEFAULT_ROUTINE);
    const imported = importRoutineFromJson(json);

    expect(imported).toEqual(BUILTIN_DEFAULT_ROUTINE);
  });

  it('rejects invalid JSON', () => {
    expect(() => importRoutineFromJson('{ not valid json')).toThrow(InvalidRoutineError);
    expect(() => importRoutineFromJson('{ not valid json')).toThrow(/Invalid JSON syntax/);
  });

  it('rejects schemaVersion too high', () => {
    const tooNew = {
      ...BUILTIN_DEFAULT_ROUTINE,
      schemaVersion: ROUTINE_SCHEMA_VERSION + 1,
    };
    const json = JSON.stringify(tooNew, null, 2);

    expect(() => importRoutineFromJson(json)).toThrow(InvalidRoutineError);
    expect(() => importRoutineFromJson(json)).toThrow(/exceeds supported version/);
  });

  it('pretty-prints with 2-space indent', () => {
    const json = exportRoutineToJson(BUILTIN_DEFAULT_ROUTINE);
    expect(json).toContain('\n  "schemaVersion"');
  });

  it('includes routine name slug in export filename when present', () => {
    expect(
      routineExportFilename({ ...BUILTIN_DEFAULT_ROUTINE, name: 'Test Routine' }),
    ).toBe('solo-leveling-routine-test-routine.json');
  });

  it('uses base filename when routine has no name', () => {
    const routine = { ...BUILTIN_DEFAULT_ROUTINE };
    delete routine.name;
    expect(routineExportFilename(routine)).toBe('solo-leveling-routine.json');
  });
});
