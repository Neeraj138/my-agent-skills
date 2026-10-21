# Styles

Each style is one Markdown file that another agent can follow to reproduce the look exactly. A new style should cover these sections, in this order:

1. **Principles.** Three to six rules that define the look.
2. **Tokens.** A `:root{}` block to copy and paste: colors, text-on-color, radii, borders, and the hero surface. Use the same variable names as Play (`--bg --card --ink --mute --line`, accents `--g --b --y --o --r --p`, `--rad --cr --bt --bw --cb`, `--hbg --hb --hi`), so the template and examples work after a token swap.
3. **Derived colors.** The formulas for edge, tint and track.
4. **Typography.** Families with a Google Fonts URL, the scale, and the poster scale.
5. **Shape and components.** Card, hero, badge, chip, button, viz panel, callout.
6. **Motion.** The style's easing and timing character.
7. **Explainer specifics.** How diagram primitives look in this style: cells, nodes, edges, masks, highlight frames, chart strokes.
8. **Do and do not.**

| Style | File | Character |
|---|---|---|
| Play | `play.md` | Friendly, chunky, light-mode, thick bottom borders, bright accents |
