# DESIGN — Indian Recipe Generator, "Sunny Kitchen" redesign

Art-directed pass built with the /awwwards method (concept → system → build → QA).
Bar: Awwwards-style scoring, Design 40 / Usability 30 / Creativity 20 / Content 10.

## 0 · Brief

- Subject: a working tool — enter kitchen ingredients, get three real, chef-crafted Indian
  dishes (real photos, verified videos), save them, plan a week, build a shopping list.
- Audience: home cooks on phones and laptops.
- Job: make the tool feel like a warm, friendly kitchen companion people enjoy opening
  every day — comfort over cleverness, color over chrome.
- Assets: real dish photography through the existing real-media pipeline (Wikipedia →
  TheMealDB → verified video still). No fake imagery, ever.
- Constraints: keep every feature and API, keyboard a11y, reduced-motion paths, and the
  light/dark/system theme. No DB, no auth. English UI.

## 1 · Concept Card

```
Idea:        The app is a sunny home kitchen at 10am: cream counters, warm light, and a
             constellation of colorful ingredients floating over the stove.
Metaphor:    the garnish tray — little bowls of leaf, citrus, cherry, grape, carrot, salad
             and croissant, each hovering at its own height, drifting as you lean in.
Signature:   the garnish constellation (hero parallax field). Seven colorful lucide icons
             orbit a pot medallion; every icon sits on its own depth layer and answers
             the pointer (lerped, per-depth translate + rotate) and the scroll (per-depth
             rise), while an idle CSS sway keeps the field alive at rest. This is THE
             first screen: color, warmth and life before a single word is read.
Second:      the mango flood — hovering a button floods it with a warm gradient from the
             pointer's entry point (GSAP), like syrup pouring over the pill.
Emotion:     friendly, comfortable, a little playful. Rounded everything, soft shadows,
             warm cream ground, cocoa ink. Nothing shouts.
Motion verb: drift and settle.
```

Anchor: garnish is what finishes a dish — color scattered on top of something wholesome.
Swap test: move this to a banking app and it collapses. The previous "steel tiffin"
direction was retired: chamfered edges, stamped numerals, uppercase condensed type and a
single turmeric accent read as design-chrome ("wanna-be") rather than warmth. Everything
below derives from the new anchor: soft radii, warm neutrals, many garnish hues, gentle
depth-based motion.

## 2 · Art direction system

### Palette (roles, named for the kitchen)

| Role | Light — "sunny cream" | Dark — "midnight chai" |
|---|---|---|
| ground | #FBF1DE warm cream | #221912 cocoa-dark |
| surface | #FFFDF7 (cards, pills) | #2C2117 |
| ink | #432D18 cocoa | #F7EBD9 |
| muted | #8A6C4B (AA on cream) | #C4AA88 |
| line | #EDDEBF / strong #DCC49A | rgb(247 235 217 / .12 / .26) |
| accent | #C25E00 deep mango (text-safe, AA) | #FFB169 brighter mango |
| accent-fill | #FF9E38 → gradient to #F97316 | #F9A13C → #F97316 |
| leaf | #2E8B4F done/success states | #62C88F |

Garnish hues (the counter-system, now the main event): leaf #1F9255 · citrus #E8821E ·
cherry #E14B66 · grape #7D5BD8 · carrot #E8703F · salad #14A08C · croissant #C79233
(brightened for dark: see `--g-*` tokens). They color the constellation, tab icons, pill
tints and empty-state medallions; running text stays on mango/cocoa.

### Type (Google, via next/font)

- Display: **Baloo 2** — rounded, chubby, friendly. Wordmark, hero line, dish titles,
  section titles, step medallions, timer digits. Sentence case (no uppercase shouting),
  leading 1.02–1.08.
- Text: **Nunito** — rounded body, UI labels, chips, buttons. 600–800 weights for labels.
- Meta: **JetBrains Mono** — counts, quantities, calories. Small (11–13px), tabular
  where numeric. No uppercase transforms anywhere.

### Shape & surfaces

- Radius: 14px controls, 22px cards, 30px media/medallions, full pills for tabs, chips,
  buttons and toggles. Nothing sharp.
- Shadows: warm, soft, tinted `rgb(133 86 26 / .16)`; hover lifts to `.26`. In dark,
  black-based. Buttons and cards get `--shadow-soft`; modals/timer `--shadow-lift`.
- Background: cream + static aurora wash (peach top-left, lilac top-right, mint bottom)
  + barely-there grain (opacity .035).

### Motion language

- Motion verb "drift and settle": entrances rise 16px and settle (0.7s, expo.out);
  presses scale to 0.96–0.97; hovers lift 1–3px with shadow growth.
- The constellation: pointer parallax (lerp 0.075, ±34px × depth horizontal, ±22px
  vertical, ±6deg rotation), scroll rise (×0.055 × depth), CSS sway per icon (5.5–7.6s,
  own phase). Parallax writes `transform` on `.garnish__float`; centering uses the
  separate `translate` property; sway animates the inner `.garnish__bob` — three
  systems that compose instead of fighting.
- The mango flood on `[data-fill]` buttons (GSAP, from pointer entry) is unchanged
  behaviorally, reskinned to a mango gradient with cocoa text.
- Reduced motion: constellation parallax never starts, sway freezes (icons stay
  colorful), no Lenis, no reveals, flood snaps to filled, hovers keep a visible state.
- Touch: pointer parallax simply never fires; sway + scroll drift remain.

### Composition plan

```
┌ lid (warm glass header) ─────────────────────────────────────────┐
│ [pot] Indian Recipe Generator     ( Generate )( Recipes )( Plan ) │  ← pill tabs, active
│        real dishes · real photos       ( Shop )        ☀ ☾ ▲      │    wears its hue tint
├ hero (Generate tier) ────────────────────────────────────────────┤
│        🍃        🥕                                               │  ← the garnish constellation
│            🍒   [ POT ]   🍇         (parallax field, glow blobs) │
│      🍊        🥗       🥐                                         │
│ What's in your kitchen?          ← Baloo 2, gradient on "kitchen?"│
│ Add what you have. Get three real, chef-crafted dishes…          │
│ [ soft cream field ………………… ] (＋)                                │
│ ( + onion ) ( + tomato ) ( + ginger ) … quick-add pills          │
│ preferences card · nutrition pill toggle                          │
│ [   Generate three dishes   ]  ← mango flood from pointer         │
│ real dishes · real photos          kitchen · 12 ingredients       │
├ results (same tier) ─────────────────────────────────────────────┤
│ Three for tonight                                                 │
│ ┌────────────────────────────────────────────────┐                │  ← index CARDS (radius 22),
│ │ Butter Chicken   North Indian · 45 min · 620 → │                │    hover lifts + real-photo
│ └────────────────────────────────────────────────┘                │    preview floats by cursor
├ dish spread (detail) ────────────────────────────────────────────┤
│ Butter Chicken (Baloo) · meta chips w/ icons · servings stepper   │ ← text+data first;
│ [ ▶ YouTube CTA (chili pill) ] [small real-photo thumb]           │   media sits in a slim
│ ● Ingredients: aligned amount column + name (data list)           │   row, YouTube-led;
│ steps in mango circle medallions · nutrition = readable table     │   the whole spread is
│ actions bar (right-aligned; full-width grid on phones)            │   a surface card, r30
├ other tiers ─────────────────────────────────────────────────────┤
│ Recipes: card index + inline thumbs + tags (citrus tint)          │
│ Plan: 7×4 week grid, rounded slots (grape tint)                   │
│ Shop: checkbox pill rows (cherry tint)                            │
└ footer finale ────────────────────────────────────────────────────┘
│ Real food, from what you've got.  (Baloo, gradient on second half)│
└──────────────────────────────────────────────────────────────────┘
```

Every section family used once: parallax hero → card index → dish spread → week grid →
statement footer.

### Details

- Focus ring: 3px mango (80% mix), offset 3px, rounded — everywhere, both themes.
- Selection: mango fill with cocoa text. Scrollbar: rounded toffee thumb.
- Images: one aspect family per role (16:9 thumb chip on the dish media row, 4:5
  preview, 1:1 thumbs), one reveal (clip wipe up), one hover (scale 1.03 inside
  clipped frame). The dish photo is never the page's headline: YouTube is the
  preferred medium, the photo stays peripheral.
- Icons: lucide. The garnish set (Leaf, Citrus, Cherry, Grape, Carrot, Salad, Croissant,
  CookingPot) is the app's signature and stays decorative/aria-hidden; utility icons
  (remove ×, trash, arrows) stay semantic.
- Empty states: gradient medallions in the section's hue, gently swaying (frozen under
  reduced motion).
- No em/en dashes in visible copy. Sentence case everywhere, including display type.
