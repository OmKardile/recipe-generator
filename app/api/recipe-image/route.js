import { NextResponse } from "next/server";
import { buildImagePrompt } from "@/lib/prompts";
import { searchMealDb } from "@/lib/mealDb";
import { foodArtDataUri } from "@/lib/foodArt";

/**
 * POST /api/recipe-image — accurate imagery for a recipe.
 *
 * Fidelity chain (never a random stock photo):
 *   1. Gemini image model renders a photorealistic plate of THIS exact recipe
 *      (dish name + real ingredient list + cuisine styling) — mode "hero".
 *   2. TheMealDB real photograph for well-known dishes (name must match).
 *   3. Deterministic generated artwork (same dish → same art, never broken).
 *
 * mode "hero"  — the actively displayed recipe (AI photography allowed, slow)
 * mode "thumb" — cards/thumbnails (instant: TheMealDB or artwork only)
 */

export const maxDuration = 60;

const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";
const IMAGE_TIMEOUT_MS = 50_000;
const MAX_BASE64_BYTES = 3_500_000; // ~2.6 MB binary — keep payloads sane

const memo = new Map(); // cacheKey → { payload, ts }
const MEMO_TTL_MS = 60 * 60 * 1000;
const MEMO_MAX = 80;

function validate(body) {
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
  if (!title) return null;
  return {
    title,
    cuisine: typeof body?.cuisine === "string" ? body.cuisine.trim().slice(0, 60) : "",
    description: typeof body?.description === "string" ? body.description.trim().slice(0, 400) : "",
    ingredients: Array.isArray(body?.ingredients) ? body.ingredients.slice(0, 30) : [],
    mode: body?.mode === "thumb" ? "thumb" : "hero",
  };
}

async function geminiImage(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
        signal: controller.signal,
      }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p?.inlineData?.data);
    if (!imagePart || imagePart.inlineData.data.length > MAX_BASE64_BYTES) return null;

    const mimeType = imagePart.inlineData.mimeType || "image/png";
    return {
      image: `data:${mimeType};base64,${imagePart.inlineData.data}`,
      source: "ai-generated",
      alt: "AI-styled photograph of this exact recipe",
    };
  } catch {
    return null; // timeout, model unavailable, quota — fall through the chain
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = validate(body);
  if (!input) {
    return NextResponse.json({ error: "A recipe title is required." }, { status: 400 });
  }

  const cacheKey = `${input.mode}::${input.title.toLowerCase()}::${input.cuisine.toLowerCase()}`;
  const cached = memo.get(cacheKey);
  if (cached && Date.now() - cached.ts < MEMO_TTL_MS) {
    return NextResponse.json(cached.payload);
  }

  let payload = null;

  // 1. AI photograph of this exact recipe (hero mode only — it takes ~15-25s).
  if (input.mode === "hero") {
    const ai = await geminiImage(buildImagePrompt(input));
    if (ai) payload = ai;
  }

  // 2. Real photo of a well-known dish (name-verified by the MealDB layer).
  if (!payload) {
    const meal = await searchMealDb(input.title);
    if (meal?.thumb) {
      payload = {
        image: meal.thumb,
        source: "themealdb",
        alt: `Photograph of ${meal.name} via TheMealDB`,
      };
    }
  }

  // 3. Deterministic kitchen artwork — never broken, never random.
  if (!payload) {
    payload = {
      image: foodArtDataUri(input.title, input.cuisine),
      source: "artwork",
      alt: `Generated artwork for ${input.title}`,
    };
  }

  if (memo.size >= MEMO_MAX) {
    const oldest = memo.keys().next().value;
    memo.delete(oldest);
  }
  memo.set(cacheKey, { payload, ts: Date.now() });

  return NextResponse.json(payload);
}
