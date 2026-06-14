# Feature: Yearly Archive

## Purpose

Daily logs accumulate ~365 documents per user per year. Future charts will want fast historical reads, and we don't want Firestore reads to grow unboundedly. The yearly archive collapses one year of `dailyLogs` into a single summary document, after which the raw logs may be deleted.

## Policy (v1)

- **Keep raw logs until summarized.** No automatic deletion before archival.
- **Summarize once per calendar year**, after the year ends. The user (or any client visit during the new year) triggers the archive.
- **After archival is confirmed by the user**, raw logs for that year may be deleted in a single batched delete.
- No cloud functions / scheduled jobs in v1 — archival is client-driven.

## Trigger

On app boot, if `currentYear > anyArchivedYear + 1` is unmet, check whether last year has an archive. If not, show a one-time banner on the Settings or Today screen:

> "Архів за 2026 рік ще не створено. Створити?" → button → runs archival.

The user can also trigger from `/settings` at any time.

## Document Shape

```json
{
  "schemaVersion": 1,
  "year": 2026,
  "summarizedAt": "2027-01-05T10:00:00.000Z",
  "userTimezoneAtSummary": "Europe/Warsaw",
  "totals": {
    "daysTrained": 142,
    "workoutsByDayId": {
      "day_a_legs_pull": 48,
      "day_b_press_ballistic": 47,
      "day_c_recovery": 47
    }
  },
  "exerciseTotals": {
    "kb_swings": {
      "completedSessions": 47,
      "totalWorkSeconds": 7520
    },
    "pullups": {
      "completedSessions": 95
    }
  },
  "streaks": {
    "longestTrainedDays": 18,
    "longestRestDays": 5
  },
  "rawLogsDeletedAt": null
}
```

| Field | Type | Description |
|-------|------|-------------|
| `year` | number | Matches doc ID |
| `summarizedAt` | ISO 8601 UTC | When the summary was computed |
| `userTimezoneAtSummary` | IANA TZ | Timezone used for date-bucket math |
| `totals.daysTrained` | number | Number of distinct `dailyLogs` docs where any exercise was completed |
| `totals.workoutsByDayId` | record | Counts of days completed per routine day id |
| `exerciseTotals.{exerciseId}.completedSessions` | number | Times this exercise was marked complete |
| `exerciseTotals.{exerciseId}.totalWorkSeconds` | number | Sum of timer work seconds (timed exercises only) |
| `streaks.longest*` | number | Longest consecutive runs |
| `rawLogsDeletedAt` | ISO 8601 UTC \| null | Set when raw logs were deleted; lets the UI hide "delete raw logs" button |

The shape is intentionally generous: future stats can be added without bumping the schema, since readers ignore unknown fields.

## Lifecycle

```
1. User triggers archive for year Y
2. Read all /users/{uid}/dailyLogs/{Y-MM-DD}
3. Compute summary in-memory
4. Write /users/{uid}/archives/{Y}
5. Show "Archive created. Delete raw logs to save space?"
   - Yes → batched delete of all dailyLogs in year Y, then patch rawLogsDeletedAt
   - No  → leave raw logs, rawLogsDeletedAt stays null
```

Steps 2–4 are idempotent: re-running them overwrites the archive cleanly.

## Reading Archives (future charts)

Charts read:

- `/users/{uid}/archives/*` for past years (cheap, one doc per year).
- `/users/{uid}/dailyLogs/*` for the current (and not-yet-archived) year.

This keeps long-range queries to O(years) instead of O(days).

## Quotas & Cost

For a single user training daily for a year:

- ~365 raw log reads × once per archive = ~365 Firestore reads. Free tier covers this many times over.
- 1 archive write per year.
- Delete: 365 writes (each delete is a write). Free tier handles 20,000/day — fine.

## Out of Scope (v1)

- Automatic archival via Cloud Functions (requires Blaze plan).
- Cross-user aggregates.
- Re-summarizing on routine changes (the archive is a snapshot in time).
- Compressing raw logs into the archive document itself (would exceed 1 MiB for verbose v2 logs with sets/reps).
