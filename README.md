# Rasoi · AI Recipe Studio 🧑‍🍳🌿

A Next.js application that generates **chef-quality Indian recipes** from the ingredients you already have, powered by **Google Gemini 2.5 Flash** — now with AI-styled dish photography, video tutorials, and an award-level "Verdant Kitchen" design system.

Enter what's in your kitchen → get **three distinct recipes** (a quick everyday dish, a classic comfort dish, and a weekend showstopper), each with structured ingredients, numbered steps, chef's tips, honest timings, a photograph of the plated dish, and a matching video tutorial.

## Features

### AI Recipe Generation
- **Structured recipes, not text soup** — the AI returns validated JSON (ingredients with numeric amounts, instructions, tips, nutrition) via a carefully engineered prompt in [`lib/prompts.js`](lib/prompts.js), so parsing never breaks.
- **Forced diversity** — the three options always differ in technique, time budget, and flavor base.
- **Food-safety aware** — poultry/ground-meat temperatures, hot-oil warnings, and no raw-egg/flour instructions are baked into the prompt.
- **Graceful degradation** — if the AI ever returns malformed output, a legacy markdown parser kicks in instead of showing an error.
- **Smart validation** — inputs are sanitized (duplicates removed, length caps, type checks) before reaching the model.

### Accurate Recipe Media
- **Dish photography** (`POST /api/recipe-image`) — every recipe gets a picture that actually matches it:
  1. **Gemini's image model** renders a photorealistic plate of *this exact recipe* (dish name + real ingredient list + cuisine styling) — an engineered food-photography brief, not a generic prompt.
  2. **TheMealDB** provides real photographs for well-known dishes (name-verified, never a random photo).
  3. A **deterministic generated artwork** (same dish → same art) guarantees the UI is never broken.
- **Video tutorials** (`POST /api/recipe-video`) — the AI never invents URLs (hallucination magnet); real links come from the YouTube Data API (ranked toward actual recipe uploads), TheMealDB's curated tutorials, or an honest, precisely-targeted YouTube search link.

### Kitchen Tools
- **Real serving scaling** — ingredient amounts rescale live (with pretty fractions) when you change servings.
- **Cook Mode** — tap ingredients and steps to check them off as you cook.
- **Meal Planner** — weekly grid (breakfast / lunch / dinner / snack), with per-week calorie totals.
- **Smart Shopping List** — single recipe or aggregated weekly list with amount summing, grouped into supermarket-friendly categories (produce, dairy & protein, pantry, spices).
- **Cooking Timer** — multiple labeled timers with circular progress rings, browser notifications and an audio chime.
- **Save, Tag & Search** — personal cookbook with artwork thumbnails, tags, search, and filtering.
- **Share links** — one-click shareable recipe URLs with a designed hero.
- **Dark mode** — per-browser, flash-free (theme applies before first paint), follows system preference.

### Design — "Verdant Kitchen"
- Warm paper + deep herb-green palette with zest-lime and saffron accents (light **and** dark).
- **Fraunces** editorial serif display + **Outfit** geometric UI type.
- Motion system: scroll reveals, morphing gradient blobs, film-grain veil, marquee dish ticker, shimmer skeletons, 3D tilt cards, shine sweeps, animated steam, pulse rings — all with `prefers-reduced-motion` respect.
- Distinctive icon language mixing **Phosphor** and **Game Icons** (chef toque, tomatoes, chili peppers, whisks).

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, `react-icons` (Phosphor + Game Icons)
- **Backend**: Next.js API Routes
- **AI**: Google Gemini (`@google/generative-ai`) — `gemini-2.5-flash` for recipes, `gemini-2.5-flash-image` for dish photography (direct REST, server-side only)
- **Media data**: [TheMealDB](https://www.themealdb.com) (free), YouTube Data API v3 (optional key)
- **Storage**: JSON files on disk (`data/`) for personal recipes & meal plans; in-memory store for share links

## Getting Started

1. **Clone & install**

   ```bash
   git clone https://github.com/OmKardile/recipe-generator.git
   cd recipe-generator
   npm install
   ```

2. **Configure your API keys**

   Get a free Gemini key from [Google AI Studio](https://aistudio.google.com/apikey), then:

   ```bash
   cp .env.example .env.local
   # edit .env.local and paste your key
   ```

   Optional: add a `YOUTUBE_API_KEY` (from [Google Cloud Console](https://console.cloud.google.com/apis/library/youtube.googleapis.com)) to get specific, ranked video tutorials instead of search links.

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

### `POST /api/recipe-image`

**Request**

```json
{ "title": "Smoky Paneer Tikka Masala", "cuisine": "North Indian", "description": "…", "ingredients": [{ "name": "Paneer" }], "mode": "hero" }
```

**Response** — `{ "image": "data:image/png;base64,…", "source": "ai-generated | themealdb | artwork", "alt": "…" }`

`mode: "thumb"` skips the (slow) AI photograph and returns TheMealDB art or the generated artwork instantly — ideal for cards and thumbnails.

### `POST /api/recipe-video`

**Request** — `{ "title": "Butter Chicken", "cuisine": "North Indian" }`

**Response** — either a specific video `{ "videoId", "url", "embedUrl", "thumbnail", "title", "channel", "source": "youtube | themealdb", "searchUrl" }` or the honest fallback `{ "source": "search", "searchUrl": "https://www.youtube.com/results?search_query=…" }`. The model never fabricates URLs.

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

- **`lib/prompts.js`** — the prompt-engineering system: role anchoring, XML-delimited sections, a diversity matrix, anti-hallucination ingredient rules, food-safety constraints, a strict JSON output contract, plus the food-photography brief (`buildImagePrompt`) and the video-query builder (`buildVideoQuery`).
- **`lib/recipeUtils.js`** — response normalization, serving scaling (with vulgar-fraction formatting), deterministic markdown synthesis, legacy parsing, and shopping categorization.
- **`lib/gemini.js`** — lazy model initialization (the app boots fine without an API key; only generation reports a clean error).
- **`lib/mealDb.js`** — TheMealDB lookups with a 24h in-memory cache and an accuracy guard (no fuzzy mismatches).
- **`lib/foodArt.js`** — the deterministic artwork generator (pure function, server/client safe).
- **Storage caveat**: `data/*.json` works locally and on single-instance hosts. On serverless (Vercel), the filesystem is read-only and share links live in per-instance memory — for production durability, swap `lib/dataStore.js` / `lib/sharedStore.js` for [Vercel KV](https://vercel.com/storage/kv) (the `@vercel/kv` dependency is already declared).

## Credits

- Recipe generation: [Google Gemini](https://ai.google.dev/)
- Known-dish photos & tutorials: [TheMealDB](https://www.themealdb.com)
- Video tutorials: [YouTube](https://www.youtube.com)

## Contributing

Found a bug or want a feature? Open an issue or PR — run `npm run lint && npm run build` before submitting.

## License

Add a license of your choice (e.g. MIT) before commercial use.
