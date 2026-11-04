/**
 * Server-side validation of AI-generated meals against the household's
 * saved restrictions. The prompt already forbids these items; this module is
 * the independent second gate — prompt instructions are a request, this is a
 * guarantee. Any violation means the meal is dropped, never shown.
 *
 * Allergies are HARD exclusions and are NOT interchangeable with dietary
 * preferences: an allergy blocks an ingredient even when the diet would allow
 * it, and vice versa. Keyword matching uses whole-word logic with alias lists
 * ("\\begg\\b" must never flag "eggplant").
 *
 * Pure functions — unit-testable (tests/restrictions.test.js).
 */

/** Allergen families → ingredient keywords (matched as whole words). */
const ALLERGEN_KEYWORDS = {
  dairy: [
    "milk", "paneer", "yogurt", "yoghurt", "curd", "cream", "cheese", "butter",
    "ghee", "khoya", "mawa", "malai", "whey", "casein", "lassi", "buttermilk",
  ],
  gluten: [
    "wheat", "atta", "maida", "sooji", "semolina", "barley", "rye", "noodles",
    "pasta", "macaroni", "spaghetti", "vermicelli", "bread", "bun", "pav",
    "croissant", "biscuit", "couscous", "seitan",
  ],
  nuts: [
    "almond", "almonds", "badam", "cashew", "cashews", "kaju", "peanut",
    "peanuts", "groundnut", "walnut", "walnuts", "pistachio", "pistachios",
    "pecan", "pecans", "hazelnut", "hazelnuts", "cashewnut",
  ],
  egg: ["egg", "eggs", "omelette", "mayonnaise", "custard", "meringue"],
  soy: ["soy", "soya", "tofu", "edamame", "soya chunks", "soy sauce"],
  seafood: [
    "fish", "prawn", "prawns", "shrimp", "shrimps", "crab", "crabs", "lobster",
    "salmon", "tuna", "pomfret", "mackerel", "bangda", "sardine", "sardines",
    "squid", "mussels", "anchovy", "surimi",
  ],
  sesame: ["sesame", "til", "tahini"],
  mustard: ["mustard", "rai", "sarson"],
  shellfish: ["prawn", "prawns", "shrimp", "shrimps", "crab", "crabs", "lobster", "squid", "mussels", "clams"],
};

/** Diet families → ingredient keywords that VIOLATE the diet. */
const DIET_VIOLATION_KEYWORDS = {
  vegan: [
    ...ALLERGEN_KEYWORDS.dairy, ...ALLERGEN_KEYWORDS.egg, "honey", "chicken",
    "chickens", "mutton", "lamb", "beef", "pork", "fish", "meat", "keema",
    ...ALLERGEN_KEYWORDS.seafood,
  ],
  vegetarian: [
    "chicken", "chickens", "mutton", "lamb", "beef", "pork", "fish", "meat",
    "keema", ...ALLERGEN_KEYWORDS.seafood,
  ],
  eggetarian: [
    "chicken", "chickens", "mutton", "lamb", "beef", "pork", "fish", "meat",
    "keema", ...ALLERGEN_KEYWORDS.seafood,
  ],
  pescatarian: ["chicken", "chickens", "mutton", "lamb", "beef", "pork", "meat", "keema"],
};

/** Ingredients that LOOK like gluten words but are gluten-free. */
const GLUTEN_FREE_FLOURS = ["rice flour", "besan", "chickpea flour", "buckwheat", "almond flour", "coconut flour", "jowar", "bajra", "ragi", "cornmeal", "maize"];

/** Low-carb diets: ingredients too dense in carbs to qualify. */
const LOW_CARB_LIMITS = ["rice", "basmati", "atta", "wheat", "maida", "sooji", "semolina", "bread", "pasta", "noodles", "sugar", "jaggery", "potato", "potatoes", "poha", "flattened rice", "tortilla", "bun", "rusk"];

/** Meals whose TITLE mentions a banned item (e.g. "Butter Chicken" for vegan). */
const TITLE_HINTS = {
  vegan: ["butter chicken", "paneer", "tikka", "kheer", "malai", "ghee", "lassi"],
};

function wholeWordMatch(ingredientName, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, "i");
  return re.test(ingredientName);
}

function containsAny(name, keywords) {
  return keywords.some((kw) => wholeWordMatch(name, kw));
}

/**
 * Check one ingredient name against one allergen family.
 * Gluten has a whitelist escape ("rice flour" is not gluten).
 */
function violatesAllergen(name, family) {
  if (family === "gluten") {
    if (GLUTEN_FREE_FLOURS.some((f) => name.toLowerCase().includes(f))) return false;
  }
  return containsAny(name, ALLERGEN_KEYWORDS[family] || []);
}

/**
 * Validate a normalized recipe against the household restrictions.
 *
 * @param {{title?: string, dishName?: string, ingredients?: Array<{name:string}>}} recipe
 * @param {{diet?: string, allergies?: string[], dislikes?: string[]}} restrictions
 * @returns {{ok: boolean, violations: string[]}} human-readable violations
 */
export function validateMealAgainstRestrictions(recipe, restrictions = {}) {
  const violations = [];
  if (!recipe) return { ok: false, violations: ["Meal is empty."] };

  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const names = ingredients.map((i) => String(i?.name || ""));
  const searchText = [String(recipe.title || ""), String(recipe.dishName || ""), ...names].join("\n");

  // 1. Allergies — hard exclusions, checked on every ingredient AND the title.
  for (const allergy of restrictions.allergies || []) {
    const family = String(allergy).trim().toLowerCase();
    if (!family) continue;
    const hit =
      ALLERGEN_KEYWORDS[family]
        ? names.some((n) => violatesAllergen(n, family)) ||
          (family !== "sesame" && family !== "mustard" && violatesAllergen(`${recipe.title} ${recipe.dishName}`, family))
        : // Custom free-text allergy: whole-word match on the allergy string itself.
          containsAny(searchText, [family]);
    if (hit) violations.push(`Allergy (${allergy}) — contains ${family}`);
  }

  // 2. Diet — soft families block violating ingredients in the list itself.
  const diet = String(restrictions.diet || "").toLowerCase();
  if (DIET_VIOLATION_KEYWORDS[diet]) {
    const bad = names.filter((n) => containsAny(n, DIET_VIOLATION_KEYWORDS[diet]));
    if (bad.length) violations.push(`Diet (${restrictions.diet}) — contains ${bad[0]}`);
    if (diet === "vegan" && TITLE_HINTS.vegan.some((h) => `${recipe.title} ${recipe.dishName}`.toLowerCase().includes(h))) {
      const dairyHit = names.some((n) => containsAny(n, DIET_VIOLATION_KEYWORDS.vegan));
      if (dairyHit) violations.push(`Diet (vegan) — dairy in a dairy-sounding dish`);
    }
  }
  if (diet === "keto" || diet === "low carbohydrate") {
    const carb = names.find((n) => LOW_CARB_LIMITS.some((kw) => wholeWordMatch(n, kw)));
    if (carb) violations.push(`Diet (${restrictions.diet}) — high-carb ${carb}`);
  }

  // 3. Dislikes — excluded like allergies (generation input AND validation).
  for (const dislike of restrictions.dislikes || []) {
    const d = String(dislike).trim().toLowerCase();
    if (d && containsAny(searchText, [d])) {
      violations.push(`Dislikes ${dislike}`);
    }
  }

  return { ok: violations.length === 0, violations };
}

/** Map a friendly allergy label to a known family key (or keep as custom). */
export function normalizeAllergyLabel(label) {
  const l = String(label || "").toLowerCase().trim();
  if (ALLERGEN_KEYWORDS[l]) return l;
  const alias = {
    "lactose": "dairy", "milk": "dairy", "casein allergy": "dairy",
    "wheat": "gluten", "celiac": "gluten", "coeliac": "gluten",
    "tree nuts": "nuts", "tree nut": "nuts", "peanut butter": "nuts",
    "eggs": "egg", "fish": "seafood", "shellfish allergy": "shellfish",
  };
  return alias[l] || l;
}
