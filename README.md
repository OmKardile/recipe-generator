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
- **Real recipe media** — every dish is paired with a **real YouTube video of a proven cook making the same canonical dish**, and the image shown is that video's actual thumbnail — a real photograph of real food. **No AI-generated imagery, ever.** The server verifies each video exists (CDN HEAD check) before the recipe reaches the browser, so a hallucinated link is impossible to display; dishes without a known video get a branded placeholder plus a YouTube search link.
- **Real serving scaling** — ingredient amounts rescale live (with pretty fractions) when you change servings.
- **Cook Mode** — tap ingredients and steps to check them off as you cook.
- **Meal Planner** — drag-free weekly grid (breakfast / lunch / dinner / snack), with per-week calorie totals.
- **Smart Shopping List** — single recipe or aggregated weekly list with amount summing, grouped into supermarket-friendly categories (produce, dairy & protein, pantry, spices).
- **Cooking Timer** — multiple labeled timers with browser notifications and an audio chime.
- **Save, Tag & Search** — personal cookbook with tags, search, and filtering.
- **Share links** — one-click shareable recipe URLs.
- **Dark mode** — per-browser, flash-free (theme applies before first paint), follows system preference.

### Design
- **Emerald “Fresh Basil” palette** — deep emerald / forest / lime across light & dark modes.
- **Editorial typography** — Fraunces display serif for headlines, Geist for UI.
- **Motion everywhere** — spring physics (framer-motion): sliding tab pill, staggered card entrances with 3D tilt, scroll-triggered section reveals, animated ingredient stagger, shine sweeps, ambient aurora background with film grain — all respecting `prefers-reduced-motion`.
- **Distinctive icon language** — Lucide (CookingPot, Carrot, Activity, BadgeCheck…) plus Phosphor meal icons (sunrise breakfast, fork-and-knife lunch, moon dinner, cookie snack).

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, framer-motion, Lucide + Phosphor icons
- **Backend**: Next.js API Routes
- **AI**: Google Gemini (`@google/generative-ai`) — `gemini-2.5-flash`
- **Media**: real YouTube video thumbnails (verified server-side via YouTube's CDN)
- **Storage**: JSON files on disk (`data/`) for personal recipes & meal plans; in-memory store for share links

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
| `GET/POST` | `/api/tags` | Tag library |
| `GET/POST` | `/api/settings` | Misc settings |
| `POST` | `/api/recipes` | Create a share link |
| `GET` | `/api/recipes/[id]` | Fetch a shared recipe |

## Architecture Notes

- **`lib/prompts.js`** — the prompt-engineering system: role anchoring, XML-delimited sections, a diversity matrix, anti-hallucination ingredient rules, food-safety constraints, and a strict JSON output contract.
- **`lib/recipeUtils.js`** — response normalization, serving scaling (with vulgar-fraction formatting), deterministic markdown synthesis, legacy parsing, and shopping categorization.
- **`lib/gemini.js`** — lazy model initialization (the app boots fine without an API key; only generation reports a clean error).
- **Storage caveat**: `data/*.json` works locally and on single-instance hosts. On serverless (Vercel), the filesystem is read-only and share links live in per-instance memory — for production durability, swap `lib/dataStore.js` / `lib/sharedStore.js` for [Vercel KV](https://vercel.com/storage/kv) (the `@vercel/kv` dependency is already declared).

## Contributing

Found a bug or want a feature? Open an issue or PR — run `npm run lint && npm run build` before submitting.

## License

Add a license of your choice (e.g. MIT) before commercial use.
