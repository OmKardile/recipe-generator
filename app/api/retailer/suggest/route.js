import { NextResponse } from 'next/server';
import { getModel, recipeGenerationConfig, MODEL_NAME } from '@/lib/gemini';
import { buildProductSuggestionPrompt, parseSuggestionResponse } from '@/lib/retailerPrompts';
import { getShoppingLocation } from '@/lib/shoppingLocationStore';
import { getHousehold } from '@/lib/householdStore';
import { getRetailerProvider } from '@/lib/retailers/index';
import {
  supermarketTermsFor,
  ingredientDietaryTag,
  matchIngredient,
} from '@/lib/productMatching';
import { listProducts } from '@/lib/retailerProducts';
import { rateLimit, clientIp, startGeneration, endGeneration } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/retailer/suggest { canonical, displayName, dim, requiredBase }
 *
 * AI product suggestions for one grocery ingredient — ESTIMATES ONLY.
 * There is no official DMart Ready catalogue API, so these suggestions are
 * clearly labeled `priceSource: 'ai-estimate'`, capped at low confidence,
 * and shown beside the official DMart search link for one-click
 * verification. They are generated ONLY on explicit user request.
 */
export async function POST(request) {
  try {
    const ip = clientIp(request);
    if (!rateLimit(`suggest:${ip}`, 12, 60_000)) {
      return NextResponse.json(
        { error: 'Too many suggestion requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const canonical = String(body?.canonical || '').trim().toLowerCase().slice(0, 80);
    const displayName = String(body?.displayName || canonical).trim().slice(0, 80);
    if (!canonical) {
      return NextResponse.json({ error: 'canonical is required.' }, { status: 400 });
    }

    const genKey = `suggest:${ip}:${canonical}`;
    if (!startGeneration(genKey)) {
      return NextResponse.json(
        { error: 'Already fetching suggestions for this ingredient.' },
        { status: 409 }
      );
    }

    try {
      const [household, location] = await Promise.all([getHousehold(), getShoppingLocation()]);
      const provider = getRetailerProvider(location.retailerId);
      const retailerLabel = provider?.label || 'DMart Ready';

      const diet = household.diet !== 'none' ? household.diet : household.customDiet || null;
      const ingredient = {
        canonical,
        displayName,
        dim: typeof body?.dim === 'string' ? body.dim : null,
        requiredBase: Number.isFinite(Number(body?.requiredBase)) ? Number(body.requiredBase) : null,
      };

      // Verified catalog entries first — suggestions must also surface what
      // the user already confirmed, not only AI guesses.
      const catalogEntries = provider
        ? await listProducts({ retailerId: provider.id, canonical })
        : [];
      const matched = matchIngredient(ingredient, { catalogEntries });

      const model = getModel();
      const response = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: buildProductSuggestionPrompt({
                  ingredient,
                  terms: supermarketTermsFor(canonical, displayName),
                  diet,
                  dietaryTag: ingredientDietaryTag(canonical),
                  retailerLabel,
                }),
              },
            ],
          },
        ],
        generationConfig: { ...recipeGenerationConfig(), temperature: 0.4 },
      });
      const suggestions = parseSuggestionResponse((await response.response).text());

      const products = suggestions.map((s) => ({
        catalogId: null,
        retailerId: provider?.id || 'dmart',
        name: s.name,
        brand: s.brand,
        packageAmount: s.packageAmount,
        packageUnit: s.packageUnit,
        packageBase: s.packageAmount * packageFactor(s.packageUnit),
        packageDim: packageDimension(s.packageUnit),
        price: Math.round(s.price * 100) / 100,
        mrp: Number.isFinite(s.mrp) && s.mrp > 0 ? Math.round(s.mrp * 100) / 100 : null,
        priceSource: 'ai-estimate',
        availability: 'unknown',
        pincodeEntered: null,
        verifiedAt: null,
        url: null,
        searchTerm: supermarketTermsFor(canonical, displayName)[0],
        notes: s.notes,
        confidence: 0.45,
      }));

      return NextResponse.json({
        products,
        verifiedCandidates: matched.candidates,
        searchTerms: supermarketTermsFor(canonical, displayName),
        disclaimer:
          'These product suggestions and prices are AI ESTIMATES, not DMart Ready prices. Verify the actual product, package size and price on DMart Ready before buying — every estimate links straight to the official search.',
        model: MODEL_NAME,
      });
    } finally {
      endGeneration(genKey);
    }
  } catch (error) {
    console.error('Error generating product suggestions:', error?.message || error);
    const message = `${error?.message || ''}`;
    if (error?.code === 'MISSING_GEMINI_API_KEY') {
      return NextResponse.json(
        { error: 'The server has no GEMINI_API_KEY configured. Add it to .env.local and restart.' },
        { status: 500 }
      );
    }
    if (error?.status === 429 || message.includes('429') || message.toLowerCase().includes('quota')) {
      return NextResponse.json(
        { error: 'Gemini quota exceeded. Please wait a minute and try again.' },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to generate suggestions. Please try again.' },
      { status: 500 }
    );
  }
}

const UNITS = {
  g: { factor: 1, dim: 'mass' },
  kg: { factor: 1000, dim: 'mass' },
  ml: { factor: 1, dim: 'volume' },
  l: { factor: 1000, dim: 'volume' },
  piece: { factor: 1, dim: 'count' },
};

function packageFactor(unit) {
  return UNITS[unit]?.factor ?? 1
}

function packageDimension(unit) {
  return UNITS[unit]?.dim ?? null
}
