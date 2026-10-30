import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Lazy Gemini model factory.
 *
 * The original module threw at import-time when GEMINI_API_KEY was missing,
 * which crashed the entire Next.js app (even pages that never call the AI).
 * With lazy init, the app boots fine and only /api/generate reports a clean
 * 500 with an actionable message when the key is absent.
 */

let cachedModel = null;

export const MODEL_NAME = "gemini-2.5-flash";

export class MissingApiKeyError extends Error {
  constructor() {
    super(
      "GEMINI_API_KEY is not configured on the server. Add it to .env.local and restart."
    );
    this.name = "MissingApiKeyError";
    this.code = "MISSING_GEMINI_API_KEY";
  }
}

export function getModel() {
  if (cachedModel) return cachedModel;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new MissingApiKeyError();

  const genAI = new GoogleGenerativeAI(apiKey);
  cachedModel = genAI.getGenerativeModel({
    model: MODEL_NAME,
    // BLOCK_ONLY_HIGH avoids false positives on cooking language
    // ("kill the heat", "hot oil can burn") while keeping real harm blocked.
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_ONLY_HIGH",
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_ONLY_HIGH",
      },
    ],
  });
  return cachedModel;
}

/** Generation config tuned for creative-but-grounded recipe writing. */
export function recipeGenerationConfig() {
  return {
    responseMimeType: "application/json",
    temperature: 0.85,
    topP: 0.95,
    maxOutputTokens: 16384,
  };
}
