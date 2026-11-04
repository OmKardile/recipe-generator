import { validateMealAgainstRestrictions } from './restrictionCheck.js';

/**
 * Personalization engine — derives a "learned taste profile" from recorded
 * interaction events. Pure functions only (no I/O), so it is fully unit
 * testable and safe to reuse client- or server-side.
 *
 * Contract with the rest of the app (product-mandated):
 *   1. Learned preferences are SOFT hints. Explicit household restrictions
 *      (diet / allergies / dislikes) always win — see
 *      filterLearnedByRestrictions() and the hard gates in the planner and
 *      generate routes.
 *   2. Learning NEVER writes into the saved household profile. The derived
 *      profile is a separate, resettable artifact.
 *   3. Recommendations must NOT push ingredients the household repeatedly
 *      rejected — those surface as "avoid" hints.
 */

/* Signal weights — how strongly each action speaks. */
const W = {
  saved: 2,
  cooked: 3,
  liked: 3,
  disliked: -3,
  skipped: -1,
  mealReplaced: -2,
  ratingUnit: 1.5, // (rating - 3) × unit
  ingredientCooked: 0.5,
  ingredientLiked: 0.25,
};

const round1 = (n) => Math.round(n * 10) / 10;

function bump(map, key, delta) {
  if (!key) return;
  map.set(key, round1((map.get(key) || 0) + delta));
}

function topEntries(map, { min, limit, absolute = false }) {
  return [...map.entries()]
    .filter(([, score]) => (absolute ? Math.abs(score) >= min : score >= min))
    .sort((a, b) => (absolute ? Math.abs(b[1]) - Math.abs(a[1]) : b[1] - a[1]))
    .slice(0, limit)
    .map(([name, score]) => ({ name, score }));
}

function median(numbers) {
  if (!numbers.length) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Derive the learned profile from interaction events.
 * @param {Array} events interactionStore records (any order)
 * @returns {object} profile (safe to serialize)
 */
export function deriveLearnedProfile(events = []) {
  const cuisineScores = new Map();
  const recipeAffinity = new Map(); // title → {score, cuisine}
  const recipeCuisine = new Map();
  const likedIngredients = new Map();
  const rejectedIngredients = new Map();
  const cookedCount = new Map();
  const mealTypes = new Map();
  const cookTimes = [];
  let feedbackUp = 0;
  let feedbackDown = 0;
  let lastActiveAt = null;

  for (const e of Array.isArray(events) ? events : []) {
    if (!e || !e.type) continue;
    if (e.createdAt && (!lastActiveAt || e.createdAt > lastActiveAt)) lastActiveAt = e.createdAt;
    const subject = e.title || e.dishName;

    switch (e.type) {
      case 'recipe_saved':
        bump(cuisineScores, e.cuisine, W.saved);
        break;
      case 'recipe_cooked':
        bump(cuisineScores, e.cuisine, W.cooked);
        bump(recipeAffinity, subject, 2); // choosing to cook a dish is an endorsement
        cookedCount.set(subject, (cookedCount.get(subject) || 0) + 1);
        mealTypes.set(e.mealType, (mealTypes.get(e.mealType) || 0) + 1);
        if (e.totalTimeMinutes) cookTimes.push(e.totalTimeMinutes);
        for (const ing of e.ingredients || []) bump(likedIngredients, ing, W.ingredientCooked);
        break;
      case 'recipe_liked':
        bump(cuisineScores, e.cuisine, W.liked);
        bump(recipeAffinity, subject, 2);
        for (const ing of e.ingredients || []) bump(likedIngredients, ing, W.ingredientLiked);
        mealTypes.set(e.mealType, (mealTypes.get(e.mealType) || 0) + 1);
        break;
      case 'recipe_disliked':
        bump(cuisineScores, e.cuisine, W.disliked);
        bump(recipeAffinity, subject, -2.5);
        break;
      case 'recipe_skipped':
        bump(cuisineScores, e.cuisine, W.skipped);
        break;
      case 'meal_replaced':
        bump(cuisineScores, e.cuisine, W.mealReplaced);
        bump(recipeAffinity, subject, -1.5);
        break;
      case 'recipe_rated':
        if (e.rating != null) {
          bump(cuisineScores, e.cuisine, (e.rating - 3) * W.ratingUnit);
          bump(recipeAffinity, subject, (e.rating - 3) * 2);
          for (const ing of e.ingredients || []) {
            bump(likedIngredients, ing, e.rating >= 4 ? 0.25 : e.rating <= 2 ? -0.5 : 0);
          }
        }
        break;
      case 'ingredient_rejected':
        if (e.fromIngredient) {
          rejectedIngredients.set(
            e.fromIngredient,
            (rejectedIngredients.get(e.fromIngredient) || 0) + 1
          );
        }
        break;
      case 'plan_feedback':
        if (e.rating != null && e.rating >= 4) feedbackUp += 1;
        else if (e.rating != null && e.rating <= 2) feedbackDown += 1;
        break;
      default:
        break;
    }
    if (e.cuisine && subject) recipeCuisine.set(subject, e.cuisine);
  }

  const enjoyed = topEntries(recipeAffinity, { min: 2, limit: 5 }).map(({ name }) => ({
    title: name,
    cuisine: recipeCuisine.get(name) || '',
  }));

  const tired = [...cookedCount.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([title, count]) => ({ title, count }));

  return {
    eventCount: (events || []).length,
    lastActiveAt,
    cuisines: topEntries(cuisineScores, { min: 2, limit: 4 }),
    avoidedCuisines: topEntries(cuisineScores, { min: 2, limit: 2 })
      .filter((c) => c.score < 0)
      .map((c) => ({ ...c, score: Math.abs(c.score) })),
    likedIngredients: [...likedIngredients.entries()]
      .filter(([, score]) => score >= 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, score]) => ({ name, score: round1(score) })),
    rejectedIngredients: [...rejectedIngredients.entries()]
      .filter(([, count]) => count >= 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count })),
    enjoyedRecipes: enjoyed,
    tiredRecipes: tired,
    typicalCookMinutes: median(cookTimes),
    mealTypeAffinity: [...mealTypes.entries()]
      .filter(([name]) => Boolean(name))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count })),
    planFeedback: { up: feedbackUp, down: feedbackDown },
  };
}

/**
 * Remove any learned hint that conflicts with the household's EXPLICIT
 * restrictions. The hard gates elsewhere would catch these anyway — this
 * keeps the prompt itself from ever asking for an allergen.
 *
 * @param {object} profile derived profile
 * @param {{diet?: string, allergies?: string[], dislikes?: string[]}} restrictions
 */
export function filterLearnedByRestrictions(profile, restrictions = {}) {
  if (!profile) return profile;
  const diet = restrictions.diet && restrictions.diet !== 'none' ? restrictions.diet : restrictions.customDiet;
  const check = { diet: diet || '', allergies: restrictions.allergies || [], dislikes: restrictions.dislikes || [] };

  const violates = (name, title = '') => {
    const pseudo = { title, dishName: '', ingredients: [{ name }] };
    return !validateMealAgainstRestrictions(pseudo, check).ok;
  };

  return {
    ...profile,
    likedIngredients: (profile.likedIngredients || []).filter((i) => !violates(i.name)),
    enjoyedRecipes: (profile.enjoyedRecipes || []).filter((r) => !violates('', r.title)),
    cuisines: (profile.cuisines || []).filter((c) => c.score >= 0),
  };
}

/**
 * Render the profile as a prompt fragment. Empty string when there is
 * nothing worth saying — callers must skip the section entirely then.
 *
 * @param {object} profile a FILTERED profile (see filterLearnedByRestrictions)
 */
export function buildPersonalizationBlock(profile) {
  if (!profile || !profile.eventCount) return '';

  const lines = [];
  const strength = (score) => (score >= 6 ? 'strongly' : 'moderately');

  if (profile.cuisines?.length) {
    lines.push(
      `- Cuisines they gravitate toward: ${profile.cuisines
        .map((c) => `${c.name} (${strength(c.score)})`)
        .join(', ')}`
    );
  }
  if (profile.enjoyedRecipes?.length) {
    lines.push(
      `- Dishes they enjoy — match the STYLE and flavor direction, not the exact dish: ${profile.enjoyedRecipes
        .map((r) => r.title)
        .join(', ')}`
    );
  }
  if (profile.likedIngredients?.length) {
    lines.push(`- Ingredients they cook with often: ${profile.likedIngredients.map((i) => i.name).join(', ')}`);
  }
  if (profile.rejectedIngredients?.length) {
    lines.push(
      `- Ingredients they repeatedly avoid or swap away — deprioritize dishes built around these: ${profile.rejectedIngredients
        .map((i) => i.name)
        .join(', ')}`
    );
  }
  if (profile.tiredRecipes?.length) {
    lines.push(`- Cooked very frequently lately — rotate away from: ${profile.tiredRecipes.map((r) => r.title).join(', ')}`);
  }
  if (profile.typicalCookMinutes) {
    lines.push(`- Typical total time of meals they actually cook: about ${profile.typicalCookMinutes} minutes`);
  }
  if (!lines.length) return '';

  return `<learned_preferences>
Hints learned from this household's own behaviour — what they rate highly, save, cook, skip or swap. These are SOFT style hints only: they NEVER override the explicit diet, allergies or dislikes stated above, and you must never introduce a known allergen or a disliked ingredient because a learned hint mentions something adjacent.
${lines.join('\n')}
</learned_preferences>`;
}

/** One-line human summary for UI surfaces ("learning from 42 interactions"). */
export function profileHeadline(profile) {
  if (!profile?.eventCount) return 'No cooking history yet — rate and cook to teach the app.';
  const parts = [`learning from ${profile.eventCount} interaction${profile.eventCount === 1 ? '' : 's'}`];
  if (profile.cuisines?.length) parts.push(`favours ${profile.cuisines.map((c) => c.name).join(', ')}`);
  if (profile.typicalCookMinutes) parts.push(`~${profile.typicalCookMinutes} min meals`);
  return parts.join(' · ');
}
