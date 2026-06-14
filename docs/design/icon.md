# App Icon

## Concept

A stylized **RPG "system notification" frame** glowing cyan (#22D3EE), enclosing a clean geometric **kettlebell silhouette** in warm vibrant orange (#FF6B35). Above the kettlebell, small pixel-style text reads **"+1 LVL"**.

The joke: SoloLeveling is a manhwa about getting stronger alone via a System interface that pops up notifications like "Level Up!". The icon evokes that aesthetic *without* using the protagonist, his weapons, or any anime art style — so the app won't be mistaken for an anime/manga reader.

## Generated Asset

`assets/sololeveling-icon.png` — concept render produced 2026-06-13.

> ⚠️ The concept render is **not** the final production asset. It is 3:2, not square, and needs:
>
> - A square crop / regeneration at 1024×1024.
> - A separate **maskable** variant with the central content within the inner 80% (so Android's adaptive icon shapes don't clip "+1 LVL" or the frame corners).
> - Export at the manifest-required sizes: 192, 512, plus the maskable 512.

## Production Asset Spec

| File | Size | Purpose |
|------|------|---------|
| `public/icons/icon-192.png` | 192×192 | Web manifest standard |
| `public/icons/icon-512.png` | 512×512 | Web manifest large |
| `public/icons/icon-maskable-512.png` | 512×512 | Android adaptive icon (maskable safe zone) |
| `public/favicon.svg` | (vector) | Browser tab icon |

### Maskable Safe Zone

Android adaptive icons crop with masks (circle, squircle, rounded square, teardrop). All meaningful content must sit within the inner **80%** of the canvas (a 410×410 circle inside the 512×512 square). The cyan frame and "+1 LVL" should respect this — the surrounding `--bg` color fills the bleed area.

## Source Files

When a real designer (or another image-gen pass) produces final assets, store:

- `assets/icon-source.svg` — editable vector source (preferred).
- `assets/icon-1024.png` — large raster master.

Exports to `public/icons/*` are generated from these, ideally via a small `scripts/build-icons.js` (out of v1 scope; manual export is fine).

## Brand Color Pair (icon)

| Element | Hex | Notes |
|---------|-----|-------|
| Background | `#13141B` | Matches app `--bg` |
| Frame + "+1 LVL" | `#22D3EE` | Matches `--rest` / `--info` |
| Kettlebell | `#FF6B35` | Matches `--work` |

Using app tokens directly keeps the system feel consistent across icon → splash → in-app.

## Anti-Examples

To stay out of "anime reader" territory, do **not** use:

- Sung Jin-Woo's silhouette, daggers, knight armor, or shadow figures.
- Stylized manga panels.
- Speech-bubble or sound-effect typography.
- Glowing eyes / character close-ups.

Yes to:

- Workout equipment (kettlebell, barbell, jump rope) as the central subject.
- "System UI" framing language: brackets, frames, status text.
- Minimal flat geometry.
