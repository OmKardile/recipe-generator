import { NextResponse } from "next/server";
import { getModel, recipeGenerationConfig, MODEL_NAME } from "@/lib/gemini";
import { buildRecipePrompt } from "@/lib/prompts";
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

    const model = getModel(); // throws MissingApiKeyError when unconfigured
    const prompt = buildRecipePrompt({ ingredients, preferences, includeNutrition });

    const result = await withTimeout(
      model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: recipeGenerationConfig(),
      }),
      GENERATION_TIMEOUT_MS
    );

    const text = (await result.response).text();

    // Primary path: strict structured JSON.
    let recipes = parseStructuredResponse(text);

    // Fallback: legacy free-form markdown → best-effort structured extraction.
    if (recipes.length === 0) {
      console.warn(
        `[generate] structured JSON parse failed for ${MODEL_NAME}; falling back to markdown parsing.`
      );
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

    // Attach the deterministic display markdown every consumer relies on.
    const payload = recipes.map((recipe) => ({
      ...recipe,
      recipe: recipe.rawMarkdown || renderRecipeMarkdown(recipe),
    }));

    return NextResponse.json({ recipes: payload, model: MODEL_NAME });
  } catch (error) {
    console.error("Error generating recipe:", error?.message || error);
    const { status, message } = friendlyError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
