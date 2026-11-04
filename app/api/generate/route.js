import { NextResponse } from "next/server";
import { getModel, recipeGenerationConfig, MODEL_NAME } from "@/lib/gemini";
import { buildRecipePrompt } from "@/lib/prompts";
import { verifyVideoExists, youtubeWatchUrl } from "@/lib/video";
import { validateMealAgainstRestrictions } from "@/lib/restrictionCheck";
import { loadPersonalizationContext } from "@/lib/personalizationServer";
import { recordInteractions } from "@/lib/interactionStore";
import {
  parseStructuredResponse,
  parseLegacyMarkdown,
  renderRecipeMarkdown,
} from "@/lib/recipeUtils";

export const maxDuration = 60;

const MAX_INGREDIENTS = 25;
const MAX_INGREDIENT_LENGTH = 60;
const MAX_PREFERENCES_LENGTH = 500;
const GENERATION_TIMEOUT_MS = 90_000;
/** Single retry for an unusable (but timely) first sample — bounded tighter so the whole route stays snappy. */
const RETRY_TIMEOUT_MS = 30_000;

/** Validate + sanitize the request body. Returns {error} or normalized input. */
function validateInput(body) {
  if (!body || typeof body !== "object") {
    return { error: "Request body must be a JSON object." };
  }

  const raw = Array.isArray(body.ingredients) ? body.ingredients : [];
  const seen = new Set();
  const ingredients = [];

  for (const item of raw) {
    if (typeof item !== "string") continue;
    const cleaned = item.trim().replace(/\s+/g, " ").slice(0, MAX_INGREDIENT_LENGTH);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue; // de-dupe "Chicken" vs "chicken"
    seen.add(key);
    ingredients.push(cleaned);
    if (ingredients.length >= MAX_INGREDIENTS) break;
  }

  if (ingredients.length === 0) {
    return { error: "Please add at least one ingredient before generating." };
  }

  const preferences =
    typeof body.preferences === "string"
      ? body.preferences.trim().slice(0, MAX_PREFERENCES_LENGTH)
      : "";

  return {
    ingredients,
    preferences,
    includeNutrition: Boolean(body.includeNutrition),
  };
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("GENERATION_TIMEOUT")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function friendlyError(error) {
  const message = `${error?.message || ""}`;

  if (error?.code === "MISSING_GEMINI_API_KEY") {
    return {
      status: 500,
      message:
        "The server has no GEMINI_API_KEY configured. Add it to .env.local and restart the dev server.",
    };
  }
  if (message.includes("GENERATION_TIMEOUT")) {
    return { status: 504, message: "The AI took too long to respond. Please try again." };
  }
  if (error?.status === 429 || message.includes("429") || message.toLowerCase().includes("quota")) {
    return {
      status: 429,
      message: "Gemini API quota exceeded. Please wait a minute and try again.",
    };
  }
  if (
    error?.status === 503 ||
    message.includes("503") ||
    message.toLowerCase().includes("overloaded")
  ) {
    return {
      status: 503,
      message: "Gemini is overloaded right now. Please try again in a few seconds.",
    };
  }
  return { status: 500, message: "Failed to generate recipes. Please try again." };
}

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const validated = validateInput(body);
    if (validated.error) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    const { ingredients, preferences, includeNutrition } = validated;

    // Household profile + learned taste profile — restrictions are HARD
    // constraints (same gate as the planner), learned hints are soft.
    const { restrictions, learnedBlock } = await loadPersonalizationContext();
    const restrictionWarnings = [];

    const model = getModel(); // throws MissingApiKeyError when unconfigured
    const prompt = buildRecipePrompt({ ingredients, preferences, includeNutrition, restrictions, learnedBlock });

    const attemptGeneration = (timeoutMs) =>
      withTimeout(
        model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: recipeGenerationConfig(),
        }),
        timeoutMs
      );

    /** Parse one attempt: strict JSON first, then legacy markdown best-effort. */
    const parseAttempt = (text) => {
      let recipes = parseStructuredResponse(text);
      if (recipes.length === 0) {
        const chunks = text
          .split(/===RECIPE_SEPARATOR===/)
          .map((r) => r.trim())
          .filter(Boolean);
        const parts = chunks.length > 1 ? chunks : text.split(/(?=^##\s)/m).filter((r) => r.startsWith("##"));
        recipes = parts
          .slice(0, 3)
          .map((chunk, i) => parseLegacyMarkdown(chunk, i))
          .filter(Boolean);
      }
      return recipes;
    };

    let text = (await (await attemptGeneration(GENERATION_TIMEOUT_MS)).response).text();

    // Primary path: strict structured JSON.
    let recipes = parseAttempt(text);

    // A malformed sample is usually a one-off sampling artifact — one bounded
    // retry converts a hard 502 into a good result for the user.
    if (recipes.length === 0) {
      console.warn(
        `[generate] first ${MODEL_NAME} sample was unusable; retrying once.`
      );
      try {
        text = (await (await attemptGeneration(RETRY_TIMEOUT_MS)).response).text();
        recipes = parseAttempt(text);
      } catch (retryError) {
        console.warn("[generate] retry failed:", retryError?.message || retryError);
      }
    }

    if (recipes.length === 0) {
      console.error("[generate] AI returned an unusable response.");
      return NextResponse.json(
        {
          error:
            "The AI response could not be understood. This is usually temporary — please try again.",
        },
        { status: 502 }
      );
    }

    // HARD RESTRICTION GATE — identical guarantee to the meal planner: the
    // prompt asks, this enforces. Allergies/diet/dislikes from the SAVED
    // household profile drop a recipe entirely, regardless of any learned
    // preference. Dropped recipes are reported honestly, never hidden.
    if (restrictions.allergies?.length || (restrictions.diet && restrictions.diet !== "none") || restrictions.dislikes?.length) {
      const survivors = [];
      for (const recipe of recipes) {
        const check = validateMealAgainstRestrictions(recipe, restrictions);
        if (check.ok) survivors.push(recipe);
        else restrictionWarnings.push(`Skipped "${recipe.title}" — ${check.violations[0]}`);
      }
      if (survivors.length === 0) {
        const droppedTitles = recipes.map((r) => r.title).join(", ");
        return NextResponse.json(
          {
            error:
              `Every suggestion ("${droppedTitles}") conflicted with your saved household restrictions — ` +
              restrictionWarnings.map((w) => w.split(" — ")[1]).join("; ") +
              ". Adjust the household profile or your ingredients and try again.",
          },
          { status: 422 }
        );
      }
      recipes = survivors;
    }

    // REAL-VIDEO INTEGRITY: verify every proposed YouTube id against the
    // thumbnail CDN and drop the ones that don't exist. The client only ever
    // sees ids that point at real, watchable videos.
    recipes = await Promise.all(
      recipes.map(async (recipe) => {
        if (!recipe.youtubeVideoId) return recipe;
        const valid = await verifyVideoExists(recipe.youtubeVideoId);
        return valid
          ? { ...recipe, youtubeUrl: youtubeWatchUrl(recipe.youtubeVideoId) }
          : { ...recipe, youtubeVideoId: null, youtubeUrl: null };
      })
    );

    // Attach the deterministic display markdown every consumer relies on.
    const payload = recipes.map((recipe) => ({
      ...recipe,
      recipe: recipe.rawMarkdown || renderRecipeMarkdown(recipe),
    }));

    // Behavioural signal: what the household was OFFERED (exposure baseline
    // for the learned profile — saves/cooks/ratings are the endorsements).
    recordInteractions(
      payload.map((r) => ({
        type: "recipe_generated",
        title: r.title,
        dishName: r.dishName,
        cuisine: r.cuisine,
      }))
    ).catch(() => {}); // telemetry must never fail the request

    return NextResponse.json({ recipes: payload, model: MODEL_NAME, warnings: restrictionWarnings });
  } catch (error) {
    console.error("Error generating recipe:", error?.message || error);
    const { status, message } = friendlyError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
