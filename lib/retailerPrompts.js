/**
 * Prompt for AI product suggestions in the retailer picker.
 *
 * These are ESTIMATES, clearly and repeatedly labeled as such — the app
 * never presents them as DMart prices. The UI shows them only when the user
 * explicitly asks for suggestions, and always beside the official DMart
 * search link so they can be verified in one click.
 */

/**
 * @param {object} args
 * @param {{canonical: string, displayName: string, dim: string|null, requiredBase: number|null}} args.ingredient
 * @param {string[]} args.terms supermarket search terms (alias KB)
 * @param {string|null} args.diet household diet label
 * @param {string} args.dietaryTag 'veg' | 'non-veg'
 * @param {string} args.retailerLabel
 */
export function buildProductSuggestionPrompt({ ingredient, terms, diet, dietaryTag, retailerLabel }) {
  const displayName = ingredient?.displayName || ingredient?.canonical || 'ingredient'
  const required =
    ingredient?.requiredBase != null
      ? `The household needs about ${ingredient.requiredBase} base units (${ingredient.dim || 'unknown'} dimension: g / ml / pieces).`
      : 'The exact quantity needed is unknown.'

  const dietLine =
    dietaryTag === 'veg'
      ? `The household diet is "${diet || 'vegetarian'}" — suggest ONLY vegetarian products (never meat, fish or eggs).`
      : 'No vegetarian restriction applies to this ingredient.'

  return `<role>
You are a grocery retail assistant familiar with mainstream Indian supermarket shelves (Amul, Mother Dairy, Tata Sampann, Aashirvaad, Fortune, MDH, Everest, Tata Salt, Patanjali and similar widely distributed brands).
</role>

<task>
Suggest 3-5 REAL, widely-sold packaged grocery products that a shopper in India could find for this recipe ingredient. Output ONE valid JSON object, nothing else.

Ingredient: "${displayName}"${terms?.length ? ` (also sold as: ${terms.join(', ')})` : ''}
${required}
${dietLine}
</task>

<rules>
1. Every product must be a REAL, commonly stocked Indian grocery item — real brand, real pack format (e.g. "Amul Malai Paneer 200 g", "Aashirvaad Shudh Chakki Atta 5 kg"). Never invent brands.
2. Include a sensible range of package sizes: one around the needed quantity, one smaller, one larger — when they genuinely exist.
3. priceEstimate and mrpEstimate are ROUGH Indian retail estimates in INR, rounded to realistic price points. MRP is normally >= selling price. They are estimates only — the app labels them "AI estimate" and the user verifies them on ${retailerLabel}.
4. Do NOT claim any price is a ${retailerLabel} price. Do NOT claim availability or stock.
5. Respect the diet restriction absolutely.
6. unit must be one of: g, kg, ml, L, piece.
</rules>

<output_contract>
Return ONE JSON object, no markdown fences, first character "{" and last "}":
{
  "products": [
    {
      "name": "product name without brand",
      "brand": "brand name",
      "packageAmount": number > 0,
      "packageUnit": "g|kg|ml|L|piece",
      "priceEstimate": number >= 0,
      "mrpEstimate": number >= 0,
      "notes": "one short line, e.g. 'small pack suits a single meal' or null"
    }
  ]
}
</output_contract>

Begin with { now.`
}

/** Parse the AI response; returns [] when unusable. */
export function parseSuggestionResponse(text) {
  if (!text || typeof text !== 'string') return []
  let candidate = text.trim()
  const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) candidate = fence[1].trim()
  const first = candidate.indexOf('{')
  const last = candidate.lastIndexOf('}')
  if (first === -1 || last <= first) return []
  try {
    const data = JSON.parse(candidate.slice(first, last + 1))
    const list = Array.isArray(data?.products) ? data.products : []
    return list
      .map((p) => ({
        name: String(p?.name || '').trim().slice(0, 100),
        brand: String(p?.brand || '').trim().slice(0, 60),
        packageAmount: Number(p?.packageAmount),
        packageUnit: String(p?.packageUnit || '').trim().toLowerCase(),
        price: Number(p?.priceEstimate),
        mrp: Number(p?.mrpEstimate),
        notes: p?.notes ? String(p.notes).slice(0, 120) : null,
      }))
      .filter(
        (p) =>
          p.name &&
          Number.isFinite(p.packageAmount) &&
          p.packageAmount > 0 &&
          ['g', 'kg', 'ml', 'l', 'piece'].includes(p.packageUnit) &&
          Number.isFinite(p.price) &&
          p.price >= 0
      )
      .slice(0, 6)
  } catch {
    return []
  }
}
