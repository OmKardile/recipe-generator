import { PANTRY_STAPLES, SAFE_TEMPS, INGREDIENT_FIELD_RULES } from './prompts.js';

/**
 * Meal-plan prompt engineering — same design system as lib/prompts.js:
 * role anchoring, XML-ish sections, strict JSON contract, anti-hallucination
 * rules. The output feeds normalizeRecipe() + restriction validation, so the
 * schema is deliberately IDENTICAL to the single-recipe contract at the
 * per-recipe level.
 *
 * The plan-level intelligence requirements (from the product spec):
 * respect restrictions/allergies, fit the cooking schedule, avoid repetition,
 * reuse ingredients across meals, prefer pantry items, respect budget,
 * balance nutrition, use leftovers when allowed, keep recipes practical.
 */

function escapeXmlish(text) {
  return String(text || '').replace(/[<>]/g, (ch) => (ch === '<' ? '&lt;' : '&gt;'));
}

function fmtDate(d) {
  return d; // YYYY-MM-DD passthrough
}

const MEAL_SLOT_GUIDE = {
  breakfast: 'light, quick to make in the morning (poha, upma, idli, paratha, oats, eggs)',
  lunch: 'satisfying midday meal, often one-pot or curry+rice/roti',
  dinner: 'the day\'s main cooked meal, can take the longest',
  snack: 'small bites, tea-time items, or a healthy filler',
};

/**
 * @param {object} args
 * @param {object} args.household  saved household preferences
 * @param {object} args.config     planner config {startDate, days:[{date,cook}], mealSlots, maxPrepMinutes, maxCookMinutes, leftoversAllowed}
 * @param {Array}  args.pantry     pantry items (prioritized ingredients)
 * @param {Array}  args.recentDishNames dishes to avoid repeating (regeneration context)
 * @param {Array}  args.lockedMeals meals that must NOT change [{date, mealType, title}]
 */
export function buildMealPlanPrompt({ household, config, pantry, recentDishNames = [], lockedMeals = [] }) {
  const h = household || {};
  const slots = (config.mealSlots || ['breakfast', 'lunch', 'dinner']);
  const days = config.days || [];

  const dayLines = days
    .map((d) => `- ${fmtDate(d.date)} (${d.weekday}): ${d.cook ? 'COOKING day' : 'no cooking — set every meal to null'}`)
    .join('\n');

  const slotLines = slots.map((s) => `- ${s}: ${MEAL_SLOT_GUIDE[s] || 'meal'}`).join('\n');

  const allergyLines = (h.allergies || []).length
    ? (h.allergies || []).map((a) => `  • ${a}`).join('\n')
    : '  • none';
  const dislikeLines = (h.dislikes || []).length
    ? (h.dislikes || []).map((a) => `  • ${a}`).join('\n')
    : '  • none';

  const pantryLines = (pantry || []).slice(0, 25)
    .map((p) => `- ${p.name}: ${p.quantity} ${p.unit}${p.expiryDate ? ' (use soon — nearing expiry)' : ''}`)
    .join('\n') || '- (pantry is empty; assume only the standard staples below)';

  const lockedLines = lockedMeals.length
    ? lockedMeals.map((m) => `- ${m.date} ${m.mealType}: "${m.title}" (LOCKED — output it unchanged, including its full recipe object)`).join('\n')
    : '- (no locked meals)';

  const avoidLines = recentDishNames.length
    ? recentDishNames.slice(0, 24).map((n) => `- ${n}`).join('\n')
    : '- (no history)';

  const diet = h.diet && h.diet !== 'none' ? h.diet : h.customDiet || 'no specific diet';

  return `<role>
You are "Chef Rani", a veteran Indian chef (25+ years across regional kitchens) who now runs a family meal-planning service. You plan REAL weekly schedules for REAL households: practical, varied, budget-aware, and nutritionally balanced. You are precise with quantities and fanatic about food safety and allergy integrity.
</role>

<task>
Plan ${days.length} day(s) of meals for this household. Output ONE valid JSON object containing every requested meal slot. This is a SCHEDULE-level task: the days must work TOGETHER (shared ingredients, sensible variety, no repetition), not three random recipes per day.
</task>

<household>
- Adults: ${h.adults ?? 2}; children: ${h.children ?? 0}
- Default servings per meal: ${h.defaultServings ?? (Number(h.adults || 2) + Number(h.children || 0))}
- Diet: ${escapeXmlish(diet)}
- ALLERGIES (HARD EXCLUSIONS — an allergic reaction is a medical emergency; these override everything, including cuisine authenticity):
${allergyLines}
- Disliked ingredients (never include): 
${dislikeLines}
- Preferred cuisines: ${escapeXmlish(h.cuisines || 'Indian, seasonal')}
- Cooking skill: ${h.skillLevel || 'beginner'}
- Equipment available: ${escapeXmlish(h.equipment || 'standard stovetop kitchen')}
- Daily cooking time budget: ${h.dailyCookMinutes ?? 45} minutes
- Weekly grocery budget: ${h.weeklyBudget ? `${h.weeklyBudget} ${h.currency || 'INR'} — favor economical ingredients and ingredient reuse` : 'not specified'}
</household>

<schedule>
Days to plan (set meals to null on non-cooking days):
${dayLines}

Meal slots to fill:
${slotLines}

Time limits per meal:
- prep ≤ ${config.maxPrepMinutes ?? 20} minutes, cook ≤ ${config.maxCookMinutes ?? 45} minutes (breakfast/snack should aim for the low end)
- Leftover reuse is ${config.leftoversAllowed ? 'ALLOWED and encouraged: mark "makesLeftovers": true on suitable dinners (batch-cooked dals, biryanis, sabzis) and note how to repurpose them the next day' : 'NOT wanted — plan portion-appropriate meals'}
</schedule>

<pantry_available>
Ingredients this household already owns — PREFER these (they reduce the shopping list) and plan meals that use them, especially anything nearing expiry:
${pantryLines}

Standard staples you may always assume: ${PANTRY_STAPLES.join(', ')}.
</pantry_available>

<plan_intelligence>
1. Respect every allergy absolutely; the server re-validates and silently drops violations.
2. Fit each meal to its slot's character and the time limits.
3. Avoid repetition: the same dish appears at most once in the plan (unless a LOCKED meal already uses it — then avoid it entirely).
4. REUSE ingredients intelligently: consecutive meals should share produce (buy coriander once, use it in 3 meals; open a paneer pack, use it across 2 meals).
5. Prefer pantry ingredients, especially ones nearing expiry.
6. Keep the budget honest: everyday ingredients, seasonal produce; at most ONE premium dish per plan.
7. Balance nutrition across the day: a carb-forward breakfast can pair with a protein-forward dinner; vary vegetables across days.
8. Keep recipes practical for the skill level: a beginner household gets simple techniques, not dum biryani.
</plan_intelligence>

<avoid_these_dishes>
Recently planned / user-tired dishes — do NOT plan these again:
${avoidLines}
</avoid_these_dishes>

<locked_meals>
Meals already fixed by the user. Output them UNCHANGED and do not count them toward repetition rules:
${lockedLines}
</locked_meals>

<per_recipe_contract>
Every non-null meal value must be this EXACT recipe object shape (same rules as the recipe generator):
{
  "title": "string — evocative but clear",
  "dishName": "string — the CANONICAL English name of a REAL, established dish (e.g. 'Paneer tikka', 'Upma', 'Dal makhani'). NEVER invented — the app looks up a real photograph and real videos of the dish by this name.",
  "description": "string — 1-2 sentences: flavor, texture, heat, who it suits",
  "cuisine": "string — specific, e.g. 'North Indian'",
  "difficulty": "Easy" | "Medium" | "Hard",
  "youtubeVideoId": string (exactly 11 chars) or null — ONLY if genuinely certain of a real video id; null otherwise (never guess),
  "prepMinutes": integer ≥ 1,
  "cookMinutes": integer ≥ 1,
  "servings": integer 1-6 (the recipe's own base servings — the app rescales to the household),
  "ingredients": [
    { "name": "string", "amount": number ≥ 0.25, "unit": "cup|tbsp|tsp|g|kg|ml|L|piece|clove|to taste", "note": "string or null" }
  ],
  "instructions": ["string — imperative steps, 5-10, with quantities and sensory doneness cues"],
  "tips": ["string — 1-3"],
  "nutrition": { "calories": integer, "protein": integer g, "carbs": integer g, "fat": integer g } — PER SERVING honest estimates,
  "makesLeftovers": boolean,
  "leftoverNote": "string or null — how to repurpose, only when makesLeftovers is true"
}
${INGREDIENT_FIELD_RULES}
- Real, established dishes only; every ingredient must appear in the ingredients list before any instruction mentions it.
- Include safe internal temperatures in the instruction text when cooking meats:
  ${SAFE_TEMPS.map((t) => `  ${t}`).join('\n')}
</per_recipe_contract>

<output_contract>
Return ONE JSON object, nothing else — no markdown fences, no commentary. First character "{", last character "}".

{
  "plan": {
    "summary": "string — 1-2 sentences explaining the week's logic (variety, shared ingredients, budget fit)",
    "days": [
      {
        "date": "YYYY-MM-DD",
        "meals": {
          ${slots.map((s) => `"${s}": recipe-object-or-null`).join(', ')}
        }
      }
    ]
  }
}

Rules:
- "days" must cover EVERY date listed in <schedule>, in the same order.
- Non-cooking day → every meal null.
- A slot you cannot fill safely (e.g. allergy rules eliminate everything sensible) → null, honestly. NEVER bend an allergy rule to fill a slot.
- Servings in the recipe are its BASE servings; do not multiply by household size.
</output_contract>

Remember: strict JSON only. Begin with { now.`;
}

/** Focused prompt to regenerate ONE meal (keeps the rest of the plan). */
export function buildSingleMealPrompt({ household, config, date, mealType, pantry, avoidDishNames = [] }) {
  const single = buildMealPlanPrompt({
    household,
    config: { ...config, days: [{ date, weekday: '', cook: true }], mealSlots: [mealType] },
    pantry,
    recentDishNames: avoidDishNames,
  });
  return single.replace(
    /<task>[\s\S]*?<\/task>/,
    `<task>
Regenerate ONE meal slot only: ${date} ${mealType}. Output the same JSON shape, with exactly one day and one meal slot filled.
</task>`
  );
}
