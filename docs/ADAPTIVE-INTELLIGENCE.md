# Adaptive Intelligence — Personalization, Plan Optimization & Substitutions

This document covers the three P0 modules of the intelligence roadmap, their
data flows and their honesty guarantees. For the DMart Ready retailer
adapter, see [RETAILER-INTEGRATION.md](RETAILER-INTEGRATION.md).

## 1. Adaptive AI Personalization

**Modules**: `lib/interactionStore.js` (persistence), `lib/personalization.js`
(pure engine), `lib/personalizationServer.js` (shared loader),
`app/api/interactions/route.js` (API), UI affordances across RecipeDisplay,
RecipeSelector, PlannerView and HouseholdProfile.

### Tracked interactions (whitelisted, bounded to 500 events)

| Event | Recorded when | Signal strength |
| ----- | ------------- | --------------- |
| `recipe_generated` | AI offers a recipe / a planned meal | neutral (exposure baseline) |
| `recipe_saved` | user saves a recipe | +2 cuisine |
| `recipe_cooked` | "Cooked it" button, planned-meal cooking, with pantry consumption | +3 cuisine, +2 recipe, ingredients + time signal |
| `recipe_liked` / `recipe_disliked` | thumbs on the recipe view | ±3 cuisine |
| `recipe_rated` | 1–5 stars | (rating − 3) × 1.5 cuisine |
| `recipe_skipped` | "not today" on a suggestion card | −1 cuisine |
| `meal_replaced` | regenerating a single planned meal | −2 cuisine |
| `ingredient_rejected` | applying a substitution (paneer → tofu) | rejected-ingredient tally |
| `plan_feedback` | 👍/👎 on a generated plan | plan-level up/down tally |

### What is learned

Cuisine affinity (with strength labels), frequently used vs repeatedly
rejected ingredients, enjoyed dishes (affinity ≥ 2), tired dishes (cooked
≥ 3×), typical total cook time (median), meal-type affinity, plan feedback
counts, repetition warnings.

### The two-level guarantee

1. **Soft hints, hard rules.** `buildPersonalizationBlock()` renders the
   profile into a `<learned_preferences>` prompt section that explicitly
   states it must never override explicit diet, allergies or dislikes.
   `filterLearnedByRestrictions()` then removes any learned hint that
   conflicts with the saved household profile — a dairy-allergic household
   will never see "Paneer" as a learned preference, even if old events
   contained it.
2. **Enforcement, not asking.** `/api/generate` now runs the same
   server-side restriction gate as the planner (drop violating recipes,
   report them in `warnings`, return `422` if every suggestion conflicts).

### Non-negotiables honoured

- Learning **never writes into** `household.json` — the learned profile is a
  separate, derived artifact (`data/interactions.json`).
- The HouseholdProfile card shows exactly what was learned and offers a
  two-step reset (`DELETE /api/interactions`).
- Single-user today; owner-keyed record shape so a future auth layer can
  scope events without schema surgery.

## 2. Intelligent Meal-Plan Optimization

**Module**: `lib/planInsights.js` (pure), snapshot at generation in
`/api/planner` + `/api/planner/[id]/regenerate`, live recompute in
PlannerView, panel in `components/planner/PlanInsights.js`.

### Plan-quality dimensions (explainable heuristic)

| Dimension | Weight | Scored from | Missing-data behaviour |
| --------- | ------ | ----------- | ---------------------- |
| Variety | 0.25 | unique dishes & cuisines per meal | null only when no meals |
| Pantry fit | 0.20 | distinct plan ingredients already stocked (canonical names) | null when no ingredients |
| Effort | 0.20 | total/avg kitchen minutes vs plan limits, Hard-recipe penalty | null when no meals |
| Budget | 0.20 | priced grocery estimate vs weekly budget | **null with honest note — prices are never invented** |
| Balance | 0.15 | protein-forward days (≥15 g/serving) + daily calorie spread | null without nutrition estimates |

Overall = renormalized weighted mean over available dimensions (needs ≥ 2).
The disclaimer is always shown: *heuristic plan-quality score — not a
nutritional assessment*.

### Beyond the score

- **Ingredient overlap**: canonical-name matching finds ingredients used by
  ≥ 2 meals → "buy once, use 3×" chips (the overlap-optimization the prompt
  asks the AI for, made visible and verifiable).
- **Leftover planning**: `makesLeftovers` meals surface with their
  repurposing notes.
- **Expiry awareness**: pantry items within 3 days of expiry that this plan
  uses are called out (with a check-before-using caution — a date is never
  assumed to mean spoiled).

## 3. Recipe Substitution & Scaling

**Modules**: `lib/substitutions.js` (curated table, pure),
`app/api/substitutions/route.js` (AI fallback),
`components/SubstitutionPanel.js`, extended `ServingAdjuster`.

### Curated engine

High-confidence Indian-kitchen swaps keyed by canonical name + aliases
(cottage cheese → paneer, curd → yogurt, wheat flour → atta …). Every option
carries:

- `ratio` — amount multiplier (soya chunks are 0.5 dry weight),
- taste / texture / **nutrition** / cooking notes — the nutrition note always
  states the swap is *not nutritionally identical*.

### AI fallback

Only on explicit request ("Ask Chef Rani") or when the curated table has
nothing: strict-JSON prompt → schema validation (name/ratio clamp, four note
fields, capped at 3) → labelled `source: 'ai'` in the UI. Failures degrade
gracefully to curated-only with an honest message.

### Restriction-aware filtering

The route loads the saved household profile and filters BOTH curated and AI
options server-side — a vegan household is never offered paneer, a
dairy-allergic one never offered cream.

### False-positive fix shipped with this module

`restrictionCheck.js` gained a `NON_DAIRY_ANALOGUES` whitelist (coconut
milk/cream/yogurt, soy/oat/almond milk, peanut/cashew/almond butter,
coconut oil) for the dairy-allergen AND vegan/vegetarian diet paths — plant
analogues skip only dairy-derived keywords, so "oat milk with honey" is still
correctly rejected for vegans. Previously a dairy-allergic household wrongly
lost coconut-milk curries.

### Scaling

Presets 1 / 2 / 4 / 6 + custom (1–24) in ServingAdjuster; amounts scale from
base servings with the existing vulgar-fraction formatting; per-serving
nutrition is unaffected by scaling (as labelled). Substitutions persist into
saved/shared recipes and feed `ingredient_rejected` learning.

## Tests

`tests/personalization.test.js`, `tests/planInsights.test.js`,
`tests/substitutions.test.js`, extended `tests/restrictions.test.js` —
64 unit tests total, `npm test`.
