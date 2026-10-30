/**
 * Shared recipe utilities — normalization, scaling, markdown synthesis,
 * legacy parsing and shopping-list categorization.
 *
 * The AI now returns structured JSON; these helpers validate/normalize it,
 * render deterministic display markdown (identical everywhere the recipe is
 * shown), and finally make serving-scaling real.
 */

/* ──────────────────────────── Amount formatting ─────────────────────────── */

const FRACTION_MAP = [
  [0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"],
  [1.25, "1¼"], [4 / 3, "1⅓"], [1.5, "1½"], [5 / 3, "1⅔"], [1.75, "1¾"],
  [2.25, "2¼"], [7 / 3, "2⅓"], [2.5, "2½"], [8 / 3, "2⅔"], [2.75, "2¾"],
];

export function formatAmount(n) {
  if (n == null || Number.isNaN(n)) return "";
  for (const [value, glyph] of FRACTION_MAP) {
    if (Math.abs(n - value) < 0.03) return glyph;
  }
  return String(Math.round(n * 100) / 100);
}

export function scaleAmount(n, factor) {
  return Math.round(n * factor * 100) / 100;
}

export function ingredientLine(ing, factor = 1) {
  if (!ing) return "";
  const parts = [];
  if (typeof ing.amount === "number" && ing.amount > 0 && ing.unit !== "to taste") {
    parts.push(`${formatAmount(scaleAmount(ing.amount, factor))} ${ing.unit}`.trim());
  } else if (ing.unit === "to taste") {
    parts.push("to taste");
  }
  parts.push(ing.name);
  let line = parts.filter(Boolean).join(" ");
  if (ing.note) line += ` — ${ing.note}`;
  return line;
}

/* ────────────────────── Structured recipe normalization ─────────────────── */

const clampInt = (v, min, max, fallback) => {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const toCleanString = (v) =>
  typeof v === "string" ? v.replace(/[\r\n]+/g, " ").trim().slice(0, 500) : "";

const toStringArray = (v, max = 30) => {
  if (!Array.isArray(v)) return [];
  return v
    .map((s) => toCleanString(s))
    .filter(Boolean)
    .slice(0, max);
};

const normalizeNutrition = (n) => {
  if (!n || typeof n !== "object") return null;
  const num = (v) => {
    const parsed = parseInt(v, 10);
    return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
  };
  return {
    calories: num(n.calories),
    protein: num(n.protein),
    carbs: num(n.carbs),
    fat: num(n.fat),
  };
};

const normalizeIngredients = (list) => {
  if (!Array.isArray(list)) return [];
  return list
    .map((ing) => {
      if (typeof ing === "string") {
        return { name: toCleanString(ing).slice(0, 80), amount: 0, unit: "", note: null };
      }
      if (!ing || typeof ing !== "object") return null;
      const name = toCleanString(ing.name).slice(0, 80);
      if (!name) return null;
      const amount =
        typeof ing.amount === "number" && Number.isFinite(ing.amount) && ing.amount >= 0
          ? Math.min(ing.amount, 10000)
          : 0;
      const unit = toCleanString(ing.unit).slice(0, 20).toLowerCase();
      const note = ing.note ? toCleanString(ing.note).slice(0, 120) || null : null;
      return { name, amount, unit, note };
    })
    .filter(Boolean)
    .slice(0, 40);
};

const VALID_DIFFICULTIES = ["Easy", "Medium", "Hard"];

/** Validate + clamp one raw recipe object from the AI. Returns null if unusable. */
export function normalizeRecipe(raw, index = 0) {
  if (!raw || typeof raw !== "object") return null;
  const title = toCleanString(raw.title).slice(0, 120);
  const instructions = toStringArray(raw.instructions, 25);
  if (!title || instructions.length < 2) return null;

  const prepMinutes = clampInt(raw.prepMinutes, 1, 600, 10);
  const cookMinutes = clampInt(raw.cookMinutes, 1, 600, 20);
  const difficulty = VALID_DIFFICULTIES.includes(raw.difficulty) ? raw.difficulty : "Medium";

  return {
    id: index,
    title,
    description: toCleanString(raw.description).slice(0, 400),
    cuisine: toCleanString(raw.cuisine).slice(0, 60) || "Indian",
    difficulty,
    prepMinutes,
    cookMinutes,
    totalTimeMinutes: prepMinutes + cookMinutes,
    servings: clampInt(raw.servings, 1, 12, 4),
    ingredients: normalizeIngredients(raw.ingredients),
    instructions,
    tips: toStringArray(raw.tips, 5),
    nutrition: normalizeNutrition(raw.nutrition),
    structured: true,
  };
}

/**
 * Parse the AI response text into normalized recipes.
 * Handles: clean JSON, fenced JSON, JSON with surrounding chatter.
 * Returns [] when nothing parseable is found (caller falls back to legacy).
 */
export function parseStructuredResponse(text) {
  if (!text || typeof text !== "string") return [];

  let candidate = text.trim();
  const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidate = fence[1].trim();

  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first === -1 || last <= first) return [];
  candidate = candidate.slice(first, last + 1);

  let data;
  try {
    data = JSON.parse(candidate);
  } catch {
    return [];
  }

  const list = Array.isArray(data) ? data : Array.isArray(data.recipes) ? data.recipes : [];
  const normalized = list
    .map((r, i) => normalizeRecipe(r, i))
    .filter(Boolean)
    .slice(0, 3);

  return normalized;
}

/* ───────────────────── Markdown synthesis (deterministic) ───────────────── */

export function renderRecipeMarkdown(recipe) {
  if (!recipe) return "";
  const lines = [];
  lines.push(`# ${recipe.title}`);
  if (recipe.description) lines.push("", recipe.description);

  if (recipe.ingredients?.length) {
    lines.push("", "## Ingredients");
    recipe.ingredients.forEach((ing) => lines.push(`- ${ingredientLine(ing)}`));
  }

  lines.push("", "## Instructions");
  recipe.instructions.forEach((step, i) => lines.push(`${i + 1}. ${step}`));

  lines.push("", "## Time & Servings");
  lines.push(`- Prep: ${recipe.prepMinutes} min`);
  lines.push(`- Cook: ${recipe.cookMinutes} min`);
  lines.push(`- Total: ${recipe.totalTimeMinutes} min`);
  lines.push(`- Servings: ${recipe.servings}`);

  if (recipe.tips?.length) {
    lines.push("", "## Chef's Tips");
    recipe.tips.forEach((tip) => lines.push(`- ${tip}`));
  }

  if (recipe.nutrition) {
    lines.push(
      "",
      "## Nutrition (per serving)",
      `- Calories: ${recipe.nutrition.calories}`,
      `- Protein: ${recipe.nutrition.protein} g`,
      `- Carbs: ${recipe.nutrition.carbs} g`,
      `- Fat: ${recipe.nutrition.fat} g`
    );
  }

  return lines.join("\n");
}

/* ─────────────────── Legacy fallback (old-style markdown) ───────────────── */

/**
 * Best-effort structured extraction from free-form markdown — used only when
 * JSON parsing fails, so the app degrades gracefully instead of erroring.
 */
export function parseLegacyMarkdown(text, index = 0) {
  if (!text || typeof text !== "string") return null;
  const clean = text.trim();

  // First heading of level 1-2 in document order is the title — works both
  // for old "## [Title]" format and plain "# Title" markdown.
  const titleMatch = clean.match(/^#{1,2}\s+(.+)$/m);
  const title = titleMatch
    ? titleMatch[1].replace(/[\[\]_*]/g, "").trim().slice(0, 120)
    : `Recipe Option ${index + 1}`;

  const section = (name) => {
    const re = new RegExp(`#{2,3}\\s*${name}\\s*\\n([\\s\\S]*?)(?=\\n#{2,3}|$)`, "i");
    const m = clean.match(re);
    return m ? m[1] : "";
  };

  const ingredients = section("Ingredients")
    .split("\n")
    .map((l) => l.trim().replace(/^[-*d.]\s*/, "").replace(/^(\d+\.)\s*/, "").trim())
    .filter((l) => l.length > 1 && !l.startsWith("#"))
    .slice(0, 40)
    .map((name) => ({ name: name.slice(0, 80), amount: 0, unit: "", note: null }));

  const instructions = section("Instructions")
    .split("\n")
    .map((l) => l.trim().replace(/^\d+[.)]\s*/, "").replace(/^[-*]\s*/, "").trim())
    .filter((l) => l.length > 3)
    .slice(0, 25);

  const prepMatch = clean.match(/Prep[:\s]*(\d+)/i);
  const cookMatch = clean.match(/Cook[:\s]*(\d+)/i);
  const servingsMatch = clean.match(/Servings[:\s]*(\d+)/i);
  const prepMinutes = prepMatch ? parseInt(prepMatch[1], 10) : 10;
  const cookMinutes = cookMatch ? parseInt(cookMatch[1], 10) : 20;

  const calMatch = clean.match(/Calories[:\s]*(\d+)/i);
  const proteinMatch = clean.match(/Protein[:\s]*(\d+)/i);
  const carbsMatch = clean.match(/Carbs[:\s]*(\d+)/i);
  const fatMatch = clean.match(/Fat[:\s]*(\d+)/i);

  const descriptionBlock = clean
    .split("\n")
    .slice(1, 6)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && !l.startsWith("-"))
    .join(" ")
    .slice(0, 400);

  return {
    id: index,
    title,
    description: descriptionBlock,
    cuisine: "Indian",
    difficulty: "Medium",
    prepMinutes,
    cookMinutes,
    totalTimeMinutes: prepMinutes + cookMinutes,
    servings: servingsMatch ? parseInt(servingsMatch[1], 10) : 4,
    ingredients,
    instructions: instructions.length ? instructions : ["See full recipe below."],
    tips: [],
    nutrition: calMatch
      ? {
          calories: parseInt(calMatch[1], 10),
          protein: proteinMatch ? parseInt(proteinMatch[1], 10) : 0,
          carbs: carbsMatch ? parseInt(carbsMatch[1], 10) : 0,
          fat: fatMatch ? parseInt(fatMatch[1], 10) : 0,
        }
      : null,
    structured: false,
    rawMarkdown: clean,
  };
}

/* ───────────────────── Shopping-list categorization ─────────────────────── */

const CATEGORY_RULES = [
  {
    key: "produce",
    label: "Fresh Produce",
    keywords: [
      "onion", "tomato", "ginger", "garlic", "green chilli", "green chili", "chilli",
      "potato", "spinach", "palak", "coriander", "cilantro", "mint", "lemon", "lime",
      "peas", "capsicum", "bell pepper", "carrot", "beans", "cauliflower", "gobi",
      "cucumber", "cabbage", "brinjal", "eggplant", "okra", "bhindi", "methi",
      "banana", "apple", "mango", "spring onion", "shallot",
    ],
  },
  {
    key: "protein",
    label: "Dairy, Eggs & Protein",
    keywords: [
      "paneer", "cottage cheese", "chicken", "egg", "mutton", "lamb", "beef", "fish",
      "prawn", "shrimp", "tofu", "yogurt", "yoghurt", "curd", "milk", "cream",
      "cheese", "malai", "khoya", "mawa",
    ],
  },
  {
    key: "pantry",
    label: "Pantry Staples",
    keywords: [
      "rice", "basmati", "atta", "flour", "maida", "sooji", "semolina", "poha",
      "dal", "lentil", "toor", "moong", "masoor", "chana", "chickpea", "rajma",
      "kidney bean", "sugar", "oil", "noodle", "pasta", "bread", "oats", "cashew",
      "almond", "raisin", "coconut milk", "besan", "corn",
    ],
  },
  {
    key: "spices",
    label: "Spices & Seasoning",
    keywords: [
      "turmeric", "haldi", "cumin", "jeera", "mustard seed", "rai", "coriander powder",
      "garam masala", "cardamom", "elaichi", "cinnamon", "dalchini", "clove", "lavang",
      "bay leaf", "pepper", "fenugreek", "kasuri", "amchur", "mango powder", "chaat",
      "asafoetida", "hing", "curry leaf", "kashmiri", "paprika", "five spice",
      "soy sauce", "vinegar", "salt", "schezwan", "gochu",
    ],
  },
];

export function categorizeIngredient(name) {
  const lower = (name || "").toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) return rule.key;
  }
  return "other";
}

export const SHOPPING_CATEGORIES = [
  ...CATEGORY_RULES.map(({ key, label }) => ({ key, label })),
  { key: "other", label: "Everything Else" },
];

/** Escape text before injecting into a print window (prevents markup injection). */
export function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
