# Feature: Full-Screen Interval Timer

## Overview

Exercises with `kind: "timed"` expose a **single-tap** action on Today's Workout. That action opens a **full-screen countdown** with large white digits and **distinct background colors** for work and rest phases. The timer runs automatically through all rounds — including rounds with **different durations** — and then auto-marks the exercise complete before returning to the workout screen.

## User Story

> As a user, when an exercise has timed intervals, I want one tap to start a fullscreen timer so I can follow the protocol without managing phases manually, and the exercise should auto-check when the timer finishes.

## Entry Points

| Location | Control | Behavior |
|----------|---------|----------|
| Today's Workout — exercise row | Timer button (icon + duration hint) | Opens full-screen timer with that exercise's normalized rounds |
| Keyboard / accessibility | Same control, focusable | `Enter` / `Space` activates |

Exercises without `kind: "timed"` do not show this control. **Single tap** means one tap — no confirmation modal.

## Timer Input

The timer consumes the **normalized** form (see [data-model.md](../data-model.md)):

```typescript
interface TimerSession {
  exerciseId: string;
  exerciseName: string;
  rounds: Array<{ workSeconds: number; restSeconds: number }>;
}
```

Uniform `{ workSeconds, restSeconds, rounds: 4 }` and variable `{ rounds: [{...}, {...}, ...] }` both become this array on read. The timer never sees the shorthand.

## Visual Design

### Layout

- Occupies entire viewport (`100dvh` × `100vw`), no app chrome.
- Countdown is the primary element: **huge white numerals**, centered.
- Secondary line: phase label (`РОБОТА` / `ВІДПОЧИНОК`) and round indicator (`3 / 8`).
- All labels via i18n (uk default) — see [i18n.md](./i18n.md).

### Typography

- Main countdown: `clamp(4rem, 28vw, 14rem)`, tabular figures, bold (system font; no web fonts).
- Phase label: ~`1.5rem`.
- Color: `#FFFFFF` on colored backgrounds.

### Phase Colors

Final values live in [design/theme.md](../design/theme.md). Summary:

| Phase | Background | Purpose |
|-------|------------|---------|
| **Work** | warm `#FF6B35` (vibrant orange-coral) | "Go" state |
| **Rest** | cool `#22D3EE` (bright cyan) | Visual break |
| **Get ready** (optional 3 s lead-in) | dim warm tone | Brief countdown into round 1 |
| **Complete** | green `#10B981` | Brief "done" state before dismiss |
| **Paused** | dimmed current-phase color (~60%) | Same hue, lower brightness |

Warm vs. cool was chosen because the contrast is unmistakable at arm's length even with the screen at low brightness in a dim room.

### Safe Areas

Respect `env(safe-area-inset-*)`. Countdown stays centered in the safe region.

## Timer Behavior

### State Machine

```
Idle → [GetReady (3 s)?] → Work(1) → Rest(1) → Work(2) → Rest(2) → … → Work(N) → Complete → Auto-dismiss
```

Rules:

1. **Start:** First phase is **Work**, round `1 / N`. Optional 3 s `GetReady` lead-in (decision deferred; default on).
2. **Work → Rest:** When work hits `0`, switch to Rest for this round's `restSeconds`. If `restSeconds === 0`, go directly to next Work.
3. **Rest → Work:** When rest hits `0`, increment round and start Work.
4. **Final round:** After the last Work interval reaches `0`, show **Complete** (green) for ~1.5 s, **auto-mark the exercise complete** in the day's log (`completedVia: "timer"`), then return to Today's Workout.
5. **Between phases:** instant color swap for clarity (no fade in v1).

### Variable Round Support

Each round consumes its own `workSeconds` / `restSeconds` from the array. The round indicator shows `current / total`. No special UI is needed beyond reading the next entry.

Example: `[{40,20}, {30,20}, {30,0}]` runs:

```
Work 40 → Rest 20 → Work 30 → Rest 20 → Work 30 → Complete
```

### Auto-Complete on Finish

When the timer reaches its Complete state, write the day's log:

```ts
await dailyLog.markExerciseComplete({ exerciseId, completedVia: "timer" });
```

- If the day's log doesn't exist yet, it is created.
- If the user exits early (Escape / back / close), the exercise is **not** marked complete.
- If the user pauses and resumes, completion still triggers at the end.

### Countdown Display

- Show **remaining seconds** as an integer (`45`, `44`, … `1`, `0`).
- At `0`, transition immediately to the next phase.

### Audio & Haptics (v1)

- Out of v1. Deferred to a settings toggle later. Spec'd here so it can land additively.

## Controls

| Action | Input | Behavior |
|--------|-------|----------|
| Pause / Resume | Tap anywhere on screen | Freezes countdown; shows `ПАУЗА` |
| Exit | `Escape`, hardware back, "Close" icon (corner) | If running: confirm dialog. If complete: immediate exit. |
| Skip rest | Small "Skip" tap during rest phase | Jump to next work round |

Keep on-screen controls minimal so numbers stay dominant.

## Integration with Workout Screen

```
┌─────────────────────────────────────┐
│  Сьогодні — День 1                  │
├─────────────────────────────────────┤
│  ☐ Скакалка                          │
│  ☐ Махи гірею  [ ▶ 4×40/20 ]         │
│  ☐ Тяга гірі   [ ▶ 30/30/30 ]        │
└─────────────────────────────────────┘
         │  one tap
         ▼
┌─────────────────────────────────────┐
│██████████████████████████████████████│  ← warm orange (Work)
│                                     │
│              40                     │
│           РОБОТА                    │
│            1 / 4                    │
│                                     │
└─────────────────────────────────────┘
```

Row hint format:

- Uniform timer: `Nrounds × work/rest` (e.g. `4×40/20`).
- Variable timer: comma-joined work durations (e.g. `40/30/30`) or `<N> sets, mixed` if too long.

## Routing

Dedicated route `/timer` with location state passed via React Router. If the user reloads `/timer` directly, the screen has no session in memory and redirects to `/`.

```
navigate('/timer', { state: timerSession });
```

(Avoid encoding the full session in the URL — it's noisy and not deep-linkable in any meaningful way.)

## Implementation Notes

### Hook sketch

```typescript
type Phase = 'getReady' | 'work' | 'rest' | 'complete';

function useIntervalTimer(session: TimerSession, opts?: {
  getReadySeconds?: number;
  onComplete?: () => void;
}) {
  // Returns: phase, roundIndex, secondsLeft, isPaused, pause, resume, skipRest, exit
}
```

### Drift-resistance

Use a wall-clock approach instead of accumulating `setInterval` ticks:

- Record `phaseStartedAt = Date.now()` and `phaseDurationMs` when entering a phase.
- Tick `secondsLeft = Math.ceil((phaseStartedAt + phaseDurationMs - Date.now()) / 1000)` every 250 ms.
- On `visibilitychange → visible`, recompute from timestamps so a backgrounded tab catches up.

### Wake Lock (Android)

Acquire `navigator.wakeLock.request('screen')` on mount, release on unmount or `visibilitychange → hidden`. Re-acquire on `→ visible` if the timer is still running. If the API isn't available → do nothing.

### Installed PWA Behavior

When launched from the home screen (standalone), the timer must:

- Fill the full safe area.
- Not allow accidental back gestures to dismiss without confirmation if the timer is still running.
- Stay portrait (manifest enforces it).

### Testing Checklist (for the eventual Playwright/Vitest suite)

- [ ] 1 round, rest 0 — work only, then complete
- [ ] Uniform 8×20/10 — alternates colors correctly
- [ ] Variable `[{40,20},{30,20},{30,0}]` — last round skips trailing rest
- [ ] Pause/resume preserves remaining seconds
- [ ] Exit confirm while running; no confirm when complete
- [ ] Auto-complete writes `dailyLog.exercises[id].isCompleted = true` with `completedVia: "timer"`
- [ ] Background tab: countdown accurate on return
- [ ] Wake Lock acquired on mount (where supported)

## Out of Scope (v1)

- Custom colors per exercise
- Editing timer values on the timer screen
- Persisting partial timer progress (resume after exit)
- Text-to-speech / countdown beeps
- Multiple simultaneous timers
- Landscape orientation

## Future (v2+)

- Sound + haptics toggle
- "Get ready" length configurable
- Per-exercise color overrides
- Standalone timer screen (start an arbitrary timer not tied to today's workout)
