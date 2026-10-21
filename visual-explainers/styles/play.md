# Play design system

A general-purpose visual system for apps, websites, dashboards, documents, slides and illustrations. The look is friendly, chunky and light-mode only:
- bright accents on a soft white canvas
- thick bottom borders that make every element feel like a pressable block
- clean geometric type

Section 12 adds the rules learned while building animated explainers in this style.

## 1. Principles

- **Chunky and tactile.** Every raised element (card, button, chip, input) has a thicker bottom border. This is the signature of the system.
- **Bright accents, calm canvas.** Large areas stay white or off-white. Saturated color appears in small, confident amounts.
- **One accent per component.** A card, panel or section chooses one accent and uses it consistently for its badge, tint, highlights and controls.
- **Rounded everything.** Generous radii on containers, pill shapes for tabs and tags, circles for badges and avatars.
- **Flat and honest.** No gradients, glows, blur or soft drop shadows. Depth comes only from borders and the bottom edge.
- **Light mode only.**

## 2. Color

### Accents

| Name | Token | Hex | Darker edge | Default meaning |
|---|---|---|---|---|
| Green | `--g` | #58CC02 | #58A700 | Primary, success, progress |
| Blue | `--b` | #1CB0F6 | #1899D6 | Info, links, selected |
| Yellow | `--y` | #FFC800 | #E5B400 | Highlight, attention, reward |
| Orange | `--o` | #FF9600 | #E58700 | Energy, streaks, caution |
| Red | `--r` | #FF4B4B | #EA2B2B | Error, danger, loss |
| Purple | `--p` | #CE82FF | #A560E8 | Secondary accent, creative |

### Neutrals

| Role | Token | Hex |
|---|---|---|
| Page background | `--bg` | #F7F7F7 |
| Surface (cards, inputs) | `--card` | #FFFFFF |
| Text | `--ink` | #3C3C3C |
| Secondary text | `--mute` | #777777 |
| Borders, tracks, dividers | `--line` | #E5E5E5 |

### Semantic mapping

| Meaning | Color |
|---|---|
| Primary, success, completed | green |
| Info, selected, link | blue |
| Warning, needs attention | yellow or orange |
| Error, destructive | red |
| Neutral, disabled | gray (`--line` fill, `--mute` text) |

### Text on color

- Text on green, blue, orange, red and purple is white.
- Text on yellow is ink (#3C3C3C). **Never put white on yellow.**
- Never use pure black. Body text is #3C3C3C.

### Derived colors

Compute these. Never invent new hex values.

| Derived color | Formula |
|---|---|
| Darker edge (bottom border, pressed state) | `color-mix(in srgb, var(--c) 70%, #000)` |
| Tint (panel behind content) | `color-mix(in srgb, var(--c) 12%, var(--card))` |
| Soft callout background | accent at 10% in `--card` |
| Track (empty part of a bar) | `color-mix(in srgb, var(--mute) 22%, transparent)` |

### Several accents

Cycle in this order: **blue, purple, orange, green, yellow, red**. Use at most 6 chart series.

## 3. Typography

- **DM Sans** (400, 500, 700, 800) for everything. **DM Mono** (400, 500) for numbers, ids, code and formulas.
- `https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=DM+Mono:wght@400;500&display=swap`
- Always set `font-variant-numeric: tabular-nums`.
- Headings are heavy (700–800) and tight. Body text is weight 500. Never use light weights.

| Style | Size / line height | Weight | Notes |
|---|---|---|---|
| Display | clamp(28px, 6vw, 42px) / 1.05 | 800 | letter-spacing −0.02em |
| H1 | 28 / 1.15 | 800 | −0.02em |
| H2 | 21 / 1.2 | 800 | −0.01em |
| H3 | 17 / 1.3 | 700 | |
| Body | 15 / 1.5 | 500 | |
| Long-form | 16 / 1.7 | 500 | |
| Caption | 14 / 1.55 | 500 | `--mute` |
| Label | 13 | 700 | |
| Micro | 11–12 | 500 | |

**Poster scale.** These sizes are for a 1024–1200px canvas that feeds show at about 600px.

| Element | Size |
|---|---|
| Display | 48–54 |
| H2 | 22–26 |
| Caption | 17–19, weight 600, ink color |
| Readout | 16–19 |
| Chips | 15–18 |
| Smallest allowed | about 14–15 at 1024 wide, about 18 at 1200 wide (rendered: 9px or more at 600) |

## 4. Shape, borders and spacing

| Element | Radius |
|---|---|
| Cards | 22px |
| Inner panels | 16px |
| Buttons, chips, inputs | 12px |
| Small tags | 8px |
| Pills, tabs | 999px |
| Badges | 50% |

| Element | Border (the signature) |
|---|---|
| Card | 2px `--line`, bottom 6px |
| Button | 2px, bottom 4px |
| Chip | 2px accent, bottom 4px |
| Input | 2px `--line`, bottom 4px; focus turns it blue |
| Divider | 2px `--line` |

- The bottom edge always uses the element's own darker color.
- Cards never get soft shadows.

**Spacing.** The base unit is 4px; use 4, 8, 12, 14, 16, 20, 24, 32, 48.

| Setting | Value |
|---|---|
| Card padding | 20px (18 when dense) |
| Gap between cards in a grid | 14px |
| Gap between stacked cards | 18px |
| Page padding | 14px on mobile, 24px on desktop |
| Container width, articles | 760px max |
| Container width, grids | 980–1200px max |

## 5. Tokens

```css
:root{
  --bg:#F7F7F7; --card:#FFFFFF; --ink:#3C3C3C; --mute:#777777; --line:#E5E5E5;
  --g:#58CC02; --b:#1CB0F6; --y:#FFC800; --o:#FF9600; --r:#FF4B4B; --p:#CE82FF;
  --onb:#FFFFFF; --ony:#3C3C3C;
  --rad:22px; --cr:12px; --bt:2px; --bw:6px; --cb:4px;
  --hbg:#58CC02; --hb:#58A700; --hi:#FFFFFF;
}
body{margin:0;background:var(--bg);color:var(--ink);
  font:500 15px/1.5 "DM Sans",system-ui,sans-serif;font-variant-numeric:tabular-nums}
```

Each component takes its accent from a local variable, e.g. `style="--c:var(--b)"`, and derives its edge and tint from that. For yellow components, also set `--on:var(--ony)`.

## 6. Components

- **Card:** white, 2px `--line` border with a 6px bottom, 22px radius, 18–20px padding, flex column with a 14–16px gap.
- **Hero (feature) card:** solid green, darker green border, white text, white chips with ink text. Use once per piece.
- **Badge:** a 32–34px circle in the accent, holding a white bold number. Add `box-shadow:0 3px 0 <edge>`; this hard offset edge is allowed, a blur is not. On yellow the text is ink.
- **Buttons:**

  | Variant | Look |
  |---|---|
  | Primary | green |
  | Secondary | white with a gray border |
  | Accent | any accent with the matching text color |
  | Danger | red |
  | Disabled | `--line` fill, `--mute` text, no edge |

  - Size: 12px radius, 10×16px padding, bold 14–15px text.
  - Press: move down 2px and shrink the bottom border to 2px.
  - Focus: a 3px blue outline with a 2px offset.
- **Chip:** white, 2px accent border with a 4px bottom, 12px radius, bold ink text.
- **Tag:** 8px radius, bold 12px text, tinted fill, accent-colored text.
- **Pill tabs:** 999px radius. Active tabs get an ink background with page-colored text.
- **Tinted panel (viz area):** tint background, 16px radius, 14–16px padding, no border.
- **Callout:** 4px accent bar on the left, soft background, DM Mono for formulas.
- **Table:** header in bold 13px `--mute`, 2px row dividers, numbers in right-aligned mono. Heat cells use tints from 12% to 92%, with white text above about 60%.
- **Bars and meters:** a fully rounded track, 12–16px tall. The fill is the accent.
- **Icons:** rounded with a 2.5px stroke, or flat fills. Never hairlines or gradients.

## 7. Layout recipes

- **Bento:** a 6-column grid with a 14px gap. Typical spans are 6 / 3+3 / 2+4 / 3+3 / 6. Below 760px everything stacks.
- **Single column:** a centered container, with a hero card first.
- **Dashboard:** a row of metric tiles, with wider chart cards below.
- **Slides or posters:** one oversized card per idea, display type, one accent each.

## 8. Motion

| Pattern | Behavior | Timing |
|---|---|---|
| Entrance | Fade and rise 8–10px from scale 0.9–0.94 | 0.35–0.55s, 30–60ms stagger |
| Pop | Scale 0.5→1 with an overshoot (back ease) | 0.3–0.5s |
| Press | Down 2px; bottom border shrinks | 80–120ms |
| Float | 6px bob | 1.1–2s, infinite |
| Pulse | Opacity and scale between 0.25 and 1.15 | 2.4s, staggered |
| Grow | Bars scale up from the baseline | 0.4–3s |
| Highlight | Flash an accent tint, then fade | 1.2s |

Motion must show a change of state or point at one thing. Always include `@media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}`.

## 9. Do and do not

**Do:**
- Put a thick bottom border on every raised element.
- Use the right text color on each accent.
- Keep large areas white or off-white.
- Use mono for numbers.
- Keep to one accent per card.

**Do not:**
- Use dark mode, gradients, glows, blur or soft shadows.
- Use light weights or 1px card borders.
- Use pure black, or white on yellow.
- Make more than one accent dominant in a card.
- Rely on color alone to carry meaning.

## 10. Accessibility

- Keep contrast as in section 2.
- Give every control a visible focus ring.
- Make touch targets at least 40px tall, including range inputs: `min-height:40px`.
- Respect reduced motion.
- Give diagrams `role="img"` and an accurate `aria-label`. Update the label if the toy changes.

## 11. One-line brief for other models

> Build [X] using the Play Design System: DM Sans + DM Mono, the exact tokens, 22px cards with a 6px bottom border, chunky chips/buttons, one accent per component, light mode only, motion that respects reduced-motion. Single self-contained file with CSS variables at :root.

## 12. Play in explainers (learned rules)

- **Accent per card in story order:** blue (problem), purple (fix), orange (cost), yellow (consequence), red (engine detail), green (detail or payoff). The hero is green.
- **Diagram primitives:**

  | Primitive | Look |
  |---|---|
  | Active cell / node | solid accent, scale bump 1→1.16→1 |
  | In-scope cell | accent at 34% in `--card` |
  | Masked or future cell | diagonal hatch of `--mute` at 22% on the web. **On posters use a flat `--mute` 13% fill**: hatching turns to mush after JPEG compression. |
  | Excluded / dropped cell | 2px dashed `--mute` 35% on the web, **2px solid `--mute` 55% with a white fill on posters** |
  | Edges in SVG | 2.5–3.5px round-cap strokes in the darker edge color, about 0.55 opacity. Nodes have a white fill and a 2.5px stroke. |
  | Highlight frame on the hero | 3px white border, 18px radius, a translucent white fill, and a white pill tag underneath in ink text |
  | Charts | a dashed `--mute` series for the baseline, a solid accent series of 4–4.5px for the subject, labels in the edge color, and a vertical scanner line at 25% ink |

- **Yellow cards** use ink text, edge-colored strokes (yellow on a yellow tint is invisible) and ink text on lit yellow chips.
- **Emphasis without layout shift:** use fill color, a `translateY(-2px)` lift and a scale bump. Never change `border-width` on state change, because it moves the layout. If one chip needs a bigger edge, give it that edge permanently.
- **Hard-coded colors:** `#fff` is fine as `--card`. Never use `#000` directly except inside the edge `color-mix` formula.
