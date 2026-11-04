# AI Recipe Generator 🧑‍🍳

A Next.js application that generates **chef-quality Indian recipes** from the ingredients you already have, powered by **Google Gemini 2.5 Flash**.

Enter what's in your kitchen → get **three distinct recipes** (a quick everyday dish, a classic comfort dish, and a weekend showstopper), each with structured ingredients, numbered steps, chef's tips, and honest timings.

## Features

### AI Recipe Generation
- **Structured recipes, not text soup** — the AI returns validated JSON (ingredients with numeric amounts, instructions, tips, nutrition) via a carefully engineered prompt in [`lib/prompts.js`](lib/prompts.js), so parsing never breaks.
- **Forced diversity** — the three options always differ in technique, time budget, and flavor base.
- **Food-safety aware** — poultry/ground-meat temperatures, hot-oil warnings, and no raw-egg/flour instructions are baked into the prompt.
- **Graceful degradation** — if the AI ever returns malformed output, a legacy markdown parser kicks in instead of showing an error.
- **Smart validation** — inputs are sanitized (duplicates removed, length caps, type checks) before reaching the model.

### Kitchen Tools
- **Real recipe media — real photos only, never AI-generated** — every recipe is a real, established dish carrying its canonical name. The server then resolves a **real photograph of that exact dish** (Wikipedia / Wikimedia Commons first, then TheMealDB's open recipe-photo database), falling back to the thumbnail of a **server-verified real YouTube cooking video** of the same dish. The video layer only ever shows a link that passed a CDN existence check (hallucinated ids are silently dropped); dishes with no verified video get a YouTube *search* link for the canonical name — a link that can never break. When no real photo exists at all, a branded emerald placeholder is shown instead — never a fabricated image.
- **Real serving scaling** — ingredient amounts rescale live (with pretty fractions) when you change servings.
- **Cook Mode** — tap ingredients and steps to check them off as you cook.
- **Household profile** — family size, default servings, dietary preference (vegetarian, vegan, keto, gluten-free…), allergies as hard exclusions, dislikes, cuisines, skill, equipment, time & budget. Allergies and preferences are enforced separately and both are re-validated server-side on every generated meal.
- **AI Meal Planner** — generates a dated plan (1–14 days, breakfast/lunch/dinner/snack, cooking days, time limits, leftover mode) that plans the schedule as a whole: shared ingredients across meals, pantry-first, no repeats. Lock favourites, regenerate the whole plan / one day / one meal without touching locks, adjust servings, place saved recipes, move meals, mark cooked (deducts pantry stock on your confirmation).
- **Pantry** — track what you already own with expiry alerts; pantry stock is subtracted from every shopping list automatically, and near-expiry items are prioritised by the planner. Quantities are only ever deducted through the explicit “I cooked this” action.
- **Grocery intelligence + DMart Ready** — one consolidated, pantry-subtracted list from any plan (500 g + 300 g → 800 g; incompatible units never merge blindly), grouped into 9 supermarket categories, with a retailer-adapter architecture ([docs](docs/RETAILER-INTEGRATION.md)). For each ingredient, discover real DMart Ready products via official search links, save the products & prices you verify yourself, get clearly-labeled AI estimates, and see honest cost intelligence: packages needed, rounding deltas vs the recipe, verified vs estimated vs unpriced totals, MRP & savings, budget remaining. PIN-code location config with honest (never fabricated) serviceability. Works fully without retailer data; no scraping, no invented prices, no credential collection.
- **Cooking Timer** — multiple labeled timers with browser notifications and an audio chime.
- **Save, Tag & Search** — personal cookbook with tags, search, and filtering.
- **Share links** — one-click shareable recipe URLs.
- **Dark mode** — per-browser, flash-free (theme applies before first paint), follows system preference.

### Design
- **Emerald “Fresh Basil” palette** — deep emerald / forest / lime across light & dark modes.
- **Editorial typography** — Geist Sans for UI, Geist Mono for timers.
- **Motion everywhere** — spring physics (framer-motion): a sliding tab pill, staggered card entrances, hover lifts, button micro-interactions, floating garnish icons, and an ambient aurora background with film grain — all respecting `prefers-reduced-motion`.
- **Distinctive icon language** — Lucide's food set (CookingPot, Carrot, Lightbulb, Activity, Citrus, ShoppingBasket, CalendarDays…).

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, framer-motion, Lucide icons
- **Backend**: Next.js API Routes
- **AI**: Google Gemini (`@google/generative-ai`) — `gemini-2.5-flash`
- **Media**: real photographs resolved server-side (Wikipedia/Wikimedia Commons → TheMealDB → verified YouTube video thumbnails); YouTube video ids verified against the CDN before display
- **Storage**: JSON files on disk (`data/`) for personal recipes, meal plans, pantry, grocery lists & verified product prices; in-memory store for share links
- **Deterministic grocery core**: unit normalization/aggregation, ingredient→product matching, package optimization and cost estimates are pure, unit-tested functions (`npm test`)

## Getting Started

1. **Clone & install**

   ```bash
   git clone https://github.com/OmKardile/recipe-generator.git
   cd recipe-generator
   npm install
   ```

2. **Configure your API key**

   Get a free key from [Google AI Studio](https://aistudio.google.com/apikey), then:

   ```bash
   cp .env.example .env.local
   # edit .env.local and paste your key
   ```

3. **Run the dev server**

   ```bash
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000).

4. **Other commands**

   ```bash
   npm run lint    # ESLint (flat config)
   npm run build   # Production build
   npm start       # Serve the production build
   ```

## API Reference

### `POST /api/generate`

**Request**

```json
{
  "ingredients": ["Chicken", "Rice", "Tomato"],
  "preferences": "Spicy, under 30 minutes",
  "includeNutrition": true
}
```

**Response** (abridged — each recipe also carries a ready-to-render `recipe` markdown string):

```json
{
  "recipes": [
    {
      "title": "15-Minute Chicken Tomato Pulao",
      "dishName": "Chicken pulao",
      "description": "A quick one-pot…",
      "cuisine": "North Indian",
      "difficulty": "Easy",
      "prepMinutes": 10,
      "cookMinutes": 20,
      "totalTimeMinutes": 30,
      "servings": 3,
      "ingredients": [
        { "name": "Basmati rice", "amount": 1, "unit": "cup", "note": "rinsed" }
      ],
      "instructions": ["Marinate the chicken…", "Toast the whole spices…"],
      "tips": ["Swap chicken with paneer for a veg version."],
      "nutrition": { "calories": 480, "protein": 32, "carbs": 58, "fat": 12 },
      "recipe": "# 15-Minute Chicken Tomato Pulao\n\n## Ingredients\n- 1 cup Basmati rice…"
    }
  ],
  "model": "gemini-2.5-flash"
}
```

**Errors** — `400` invalid input, `429` quota, `503` overloaded, `504` timeout, `500` missing key / server error. All errors return `{ "error": "human-readable message" }`.

### Other endpoints

| Method | Route | Purpose |
| ------ | ----- | ------- |
| `GET/POST` | `/api/my-recipes` | List / save personal recipes |
| `PATCH/DELETE` | `/api/my-recipes/[id]` | Update tags / delete |
| `GET/POST/DELETE` | `/api/meal-plan` | Weekly meal plan |
| `GET/POST/DELETE` | `/api/interactions` | Learn the household's taste — POST behavioural events, GET the derived profile, DELETE resets learning (saved preferences untouched) |
| `POST` | `/api/substitutions` | Substitutions for one ingredient — curated table first, schema-validated AI ideas on request, household-restriction filtered |
| `GET/POST` | `/api/tags` | Tag library |
| `GET/POST` | `/api/settings` | Misc settings |
| `GET` | `/api/recipe-media` | Resolve a REAL photo of a dish (`?dish=…&title=…`) — Wikipedia → TheMealDB, cached |
| `POST` | `/api/recipes` | Create a share link |
| `GET` | `/api/recipes/[id]` | Fetch a shared recipe |

## Architecture Notes

- **`lib/prompts.js`** — the prompt-engineering system: role anchoring, XML-delimited sections, a diversity matrix, anti-hallucination ingredient rules, food-safety constraints, a strict JSON output contract, and the authenticity contract (real established dishes, canonical `dishName`, YouTube ids only when certain).
- **`lib/personalization.js` + `lib/interactionStore.js`** — the adaptive layer: whitelisted behavioural events (ratings, likes, saves, skips, cooked meals, plan feedback, ingredient rejections) derive a learned taste profile injected into generation as SOFT hints; saved household restrictions are HARD constraints that always outrank learning. See [docs/ADAPTIVE-INTELLIGENCE.md](docs/ADAPTIVE-INTELLIGENCE.md).
- **`lib/planInsights.js`** — explainable plan-quality analytics: variety / pantry fit / effort / budget / protein-balance dimensions, cross-meal ingredient reuse, leftover and expiry insights; missing data scores null with an honest note instead of an invented number.
- **`lib/substitutions.js`** — curated Indian-kitchen substitution table (ratio + taste/texture/nutrition/cooking notes, never assumed nutritionally identical) with an AI fallback route; suggestions are filtered against household restrictions.
- **`lib/restrictionCheck.js`** — the independent restriction gate for every AI surface (generate, planner, substitutions), with gluten-flour and plant-dairy whitelists so coconut milk is never mistaken for dairy.
- **`lib/recipeUtils.js`** — response normalization (incl. `dishName` / `youtubeVideoId`), serving scaling (with vulgar-fraction formatting), deterministic markdown synthesis, legacy parsing, and shopping categorization.
- **`lib/video.js`** — YouTube integrity: server-side video verification (thumbnail CDN HEAD check, 24h cache), watch/search URL helpers, thumbnail candidates.
- **`lib/dishImage.js`** — the real-photo resolver: Wikipedia/Wikimedia Commons summary API (paced, non-food-article guard, allowed-width snapping) → TheMealDB search with word-overlap matching; 24h cache.
- **`lib/gemini.js`** — lazy model initialization (the app boots fine without an API key; only generation reports a clean error).
- **Storage caveat**: `data/*.json` works locally and on single-instance hosts. On serverless (Vercel), the filesystem is read-only and share links live in per-instance memory — for production durability, swap `lib/dataStore.js` / `lib/sharedStore.js` for [Vercel KV](https://vercel.com/storage/kv) (the `@vercel/kv` dependency is already declared).

## Contributing

Found a bug or want a feature? Open an issue or PR — run `npm run lint && npm run build` before submitting.

## License

Add a license of your choice (e.g. MIT) before commercial use.
