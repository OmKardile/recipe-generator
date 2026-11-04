# DESIGN — Indian Recipe Generator, "The Tiffin" redesign

Art-directed pass built with the /awwwards method (concept → system → build → QA).
Bar: Awwwards-style scoring, Design 40 / Usability 30 / Creativity 20 / Content 10.

## 0 · Brief

- Subject: a working tool — enter kitchen ingredients, get three real, chef-crafted Indian
  dishes (real photos, verified videos), save them, plan a week, build a shopping list.
- Audience: home cooks on phones and laptops.
- Job: make the tool feel like a designed object people enjoy opening every day.
- Assets: real dish photography through the existing real-media pipeline (Wikipedia →
  TheMealDB → verified video still). No fake imagery, ever.
- Constraints: keep every feature and API, keyboard a11y, reduced-motion paths, and the
  light/dark/system theme. No DB, no auth. English UI.

## 1 · Concept Card

Three candidates were scored (tiffin · masala dabba · dhaba menu board). Picked the first.

```
Idea:        The app is a tiffin carrier: four steel tiers (Generate · Recipes · Plan · Shop)
             you flip between, and every tier's content settles into place like stacked steel.
Metaphor:    the Mumbai dabbawala's lunchbox — compartments that carry a whole meal.
Signature:   the tier switch — the outgoing tier dips, the incoming one lifts and settles
             (tiny overshoot, like steel landing), while the tier numeral rolls 01 → 02.
             Second, quieter moment: the results index — hovering a dish row floats its
             REAL photo beside the cursor, tilting with velocity (inline thumbs on touch).
Emotion:     a calm, confident kitchen at 7am: steel, steam-warm light, one turmeric accent.
Motion verb: lift and settle.
Screenshot:  the corner-framed home — giant condensed display line "WHAT'S IN YOUR
             KITCHEN?", steel underline field, mono meta in the corners.
```

Anchor: the tiffin is THE object of Indian home cooking — a stack of compartments that
carries your whole meal. Swap test: move this to a budgeting app and it collapses.
Everything below derives from it: stacked tiers (tab panels), steel ground, stamped
numerals, lid header, sharp chamfered edges, settle motion.

Genericness test — the AI-default version of this brief is: centered white card, emerald
gradient button, pill tabs, icon badges, aurora blobs. Removed every one of those.

## 2 · Art direction system

### Palette (roles, named for the tiffin world)

| Role | Light — "steel morning" | Dark — "tandoor night" |
|---|---|---|
| ground  | #E9E9E3 brushed steel | #151611 |
| ink     | #1B1C16 curry-leaf shadow | #E7E5DA |
| muted   | #63655C (AA on ground) | #9A9A8E |
| line    | rgb(27 28 22 / .14) | rgb(231 229 218 / .15) |
| accent  | #8F5410 turmeric (text-safe, AA) | #E8A33C brighter turmeric |
| accent-fill | #E8A33C (fills, with ink text) | #E8A33C |
| leaf    | #3F6B4A done/success states only | #7FB98A |
| curtain | #14150F | #14150F |

One accent (turmeric). Leaf green only marks semantic "done" states (checked steps,
checked shopping items). Dark and light are both designed (`.dark` class, as before).

### Type (Google, via next/font)

- Display: **Big Shoulders Display** — condensed poster grotesk; dhaba-signage energy in
  latin dress. Wordmark, hero lines, dish titles, section titles, big numerals.
  Uppercase, tracking -0.01…-0.02em, leading 0.86–0.95.
- Text: **Host Grotesk** — body, UI labels, form fields.
- Meta: **JetBrains Mono** — tier numerals, corner meta, data facts, dates. Small (11–13px),
  tabular where numeric.

Fluid scale: `--t-mega` … `--t-xs` per the engine tokens; body 16–18px, 1.5 leading.

### Grid & rhythm

- 12 columns, outer margin = `--gutter`; text hangs from col 1 / col 5 / col 9 on desktop.
- Rhythm moods: hero airy (24u), index sections normal (16u), detail sections tight (8–12u),
  footer finale full-bleed.
- Radius rule: one value — 2px steel chamfer. No pills anywhere.

### Shape, motion language

- Motion verb "lift and settle": entrances `expo.out` with a 1–2% overshoot; panel swaps
  dip the old tier, lift the new one; presses scale to 0.97 (soft). Hovers under 100ms
  (`power3.out`, 0.25–0.45s).
- Eases: engine family only (expo.out / expo.inOut / power3.out). One clock: GSAP ticker.
- Loader (first visit only): the lid — steel black, wordmark + mono counter 000→100 tracking
  REAL loading (fonts + critical images), 1.1s floor, 2.6s cap; lifts off upward like a lid.
- Idle: still at rest, by decision (a tool, not a showcase). Hovers, the tier switch and the
  photo preview carry the life. No aurora, no decorative motion.
- Reduced motion: no Lenis, no reveals (content visible), no loader theatrics (short fade),
  hovers keep a visible state change (underline/fill), no overshoot.

### Composition plan

```
┌ lid (sticky header) ─────────────────────────────────────────────┐
│ INDIAN RECIPE GENERATOR            01 Generate 02 Recipes 03 Plan │  ← tabs, underline-draw,
│ wordmark, Big Shoulders            04 Shop                        │    current tier keeps line
├ hero (Generate tier) ────────────────────────────────────────────┤
│ WHAT'S IN YOUR                                                     │  ← display, 2 lines
│ KITCHEN?                                                           │
│ Add ingredients — commas are fine. Ctrl+Enter generates.           │
│ [ steel underline field …………………… ] [+ add]                        │
│ + onion + tomato + ginger + garlic …  (steel chips, tap → fill)    │
│ preferences (underline field) · nutrition switch                   │
│ [ GENERATE THREE DISHES ]  ← turmeric fill floods from pointer     │
│ Real dishes · real photos          Kitchen · 12 ingredients        │  ← corner meta
├ results (same tier) ─────────────────────────────────────────────┤
│ THREE FOR TONIGHT                                                  │
│ 01  Butter Chicken            North Indian · 45 min · 620 cal  →  │  ← index rows; hover
│ 02  Dal Tadka                 …                                  │    floats the real photo
│ 03  Jeera Rice                …                                  │
├ dish spread (detail) ────────────────────────────────────────────┤
│ [ full-bleed real photo 16:9, slight parallax ]                   │
│ BUTTER CHICKEN (display) · mono meta strip                        │
│ ingredients 2-col steel checkboxes │ steps, big mono numerals     │
│ nutrition = data facts (tabular) · actions steel bar              │
├ other tiers ─────────────────────────────────────────────────────┤
│ 02 Recipes: index rows + inline thumbs + tags                     │
│ 03 Plan: 7×4 steel week grid, day labels mono                     │
│ 04 Shop: checkbox rows, checked = leaf + strike                   │
└ footer finale ────────────────────────────────────────────────────┘
│ REAL FOOD, FROM WHAT YOU'VE GOT. (display, huge)                  │
│ Built with Next.js & Google Gemini · always taste and adjust.     │
```

Every section family used once: poster hero → index list → asymmetric dish spread →
data grid → statement footer.

### Details

- Focus ring: 2px turmeric, offset 3px, everywhere (`:focus-visible`), both themes.
- Selection: turmeric fill. Scrollbar: thin steel.
- Images: one aspect family per role (16:9 hero, 4:5 preview, 1:1 thumbs), one reveal
  (clip wipe up), one hover (scale 1.03 inside clipped frame).
- Icons: lucide, utility only (remove ×, trash, arrows). No icon badges, no garnish.
- No em/en dashes in visible copy. Sentence case in body, caps in display.
