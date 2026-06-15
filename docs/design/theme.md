# Design Theme

Modern, minimalist, **soft dark by default** (never pure black). Warm accents for "work" intensity; cool accents for "rest" and information. The whole palette is tuned to look pleasant on an AMOLED Android screen while staying easy on the eyes in a dim room.

## Palette

### Surfaces (soft dark, not black)

| Token | Hex | Use |
|-------|-----|-----|
| `--bg` | `#13141B` | App background (the only true "background") |
| `--surface-1` | `#1B1D26` | Cards, list rows, modal sheets |
| `--surface-2` | `#252835` | Elevated surface (e.g. focused row, dropdowns) |
| `--border` | `#2E3142` | Subtle dividers, input borders |

The base `#13141B` is a slate that reads as "dark" but has a slight cool undertone — kinder to the eye than `#000000` and avoids the OLED smear effect when scrolling.

### Text

| Token | Hex | Use |
|-------|-----|-----|
| `--text` | `#E8E9EE` | Primary body text |
| `--text-muted` | `#9CA3AF` | Secondary text, captions |
| `--text-dim` | `#5B6072` | Disabled, tertiary |

### Brand & Accent

| Token | Hex | Use |
|-------|-----|-----|
| `--accent` | `#A78BFA` | Brand violet — buttons, highlights, focus rings, "level up" moments |
| `--accent-soft` | `#7C66D9` | Hover/pressed state for accent |

The violet ties to the manhwa-system aesthetic of the icon without screaming "anime".

### Semantic — Timer Phases

| Token | Hex | Phase | Notes |
|-------|-----|-------|-------|
| `--work` | `#FF6B35` | Work (warm) | Vibrant orange-coral. Energetic, immediate. |
| `--rest` | `#22D3EE` | Rest (cool) | Bright cyan. Calm but still vivid. |
| `--ready` | `#F4A261` | Get-ready lead-in | Warmer/duller than `--work` so the start is unmistakable |
| `--complete` | `#10B981` | Timer finish | Emerald — universally "done" |
| `--paused` | `#000000` (60% over current phase) | Paused | Apply as overlay; preserves phase identity |

Warm vs. cool was chosen so the contrast is unmistakable from across the room and works for the ~5% of users with red-green color vision deficiency (the orange/cyan pair stays distinct under all common CVD simulations).

### Semantic — System

| Token | Hex | Use |
|-------|-----|-----|
| `--success` | `#10B981` | Completion, success toasts |
| `--warning` | `#F59E0B` | Caution, "you missed yesterday" hints |
| `--danger` | `#F43F5E` | Destructive actions, validation errors |
| `--info` | `#22D3EE` | Informational banners |

## Typography

- **Body:** `Manrope` (weights 400/500/600/700) — geometric, modern, full Cyrillic.
- **Display / headings / brand:** `Oswald` (weights 500/700) — condensed athletic feel, full Cyrillic.
- Both loaded from Google Fonts with `display=swap`; preconnect to `fonts.gstatic.com`. Tokens: `--font-body`, `--font-display` in `src/ui/tokens.css`.
- System font stack remains the fallback chain inside both tokens:
  ```
  -apple-system, BlinkMacSystemFont, "Segoe UI Variable", "Segoe UI",
  Roboto, "Helvetica Neue", Arial, sans-serif
  ```
- The "no web fonts in v1" rule from earlier docs was relaxed in Phase 5.6; see `docs/backlog.md` for the trade-off note.
- Tabular figures (`font-variant-numeric: tabular-nums`) on every number that updates (timer, sets, weights).
- Sizes: `12 / 14 / 16 / 20 / 24 / 32` rem-scaled. Default body: `16px`.
- Line height: `1.4` body, `1.1` headings, `1` for the timer digits.

## Spacing & Radius

- Spacing scale: `4 / 8 / 12 / 16 / 24 / 32 / 48` px.
- Radius: `8` (inputs, small cards), `16` (large cards / sheets), `999` (pill buttons).
- Touch targets: minimum `48 × 48 dp`.

## Motion

- Default transition: `150ms ease-out` for color, opacity, transform.
- Timer phase switch: **instant** (no transition) — clarity over polish.
- Avoid spring animations in v1.

## Tokens File (planned)

When code lands, tokens live in `src/ui/tokens.css` as CSS custom properties, exported to TypeScript via a small `tokens.ts` mirror so design code can stay type-safe.

```css
:root {
  color-scheme: dark;
  --bg: #13141B;
  --surface-1: #1B1D26;
  --surface-2: #252835;
  /* ... */
}
```

```ts
// src/ui/tokens.ts — string mirror for inline styles / canvas
export const tokens = {
  bg: '#13141B',
  surface1: '#1B1D26',
  surface2: '#252835',
  work: '#FF6B35',
  rest: '#22D3EE',
  // ...
} as const;
```

## Accessibility

- All text + background pairs target **WCAG AA** (≥ 4.5:1 for body, ≥ 3:1 for large text).
- Timer numerals (white on `--work` / `--rest`) easily clear AAA at the size used.
- Focus rings always visible: `outline: 2px solid var(--accent); outline-offset: 2px`.

## Light Theme

Not in v1. The system is structured so a future `:root.light` override is feasible without component changes, but no light tokens are defined.
