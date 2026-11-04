/**
 * Unit normalization, conversion and aggregation for grocery intelligence.
 *
 * Design rules (product-mandated):
 *   • Only units of the SAME physical dimension (mass / volume / count) ever
 *     merge — 500 g + 300 g = 800 g, 1 kg + 500 g = 1.5 kg, but grams never
 *     merge with pieces or litres.
 *   • Spoon/cup conversions use standard kitchen approximations (tsp 5 ml,
 *     tbsp 15 ml, cup 240 ml) and are flagged approximate.
 *   • Anything unknown stays untouched in its own line — never guessed.
 *
 * Pure functions, no side effects — fully unit-testable (tests/units.test.js).
 */

const GRAM = "g";
const MILLILITRE = "ml";
const PIECE = "piece";

/** Canonical unit table. `dim` is the aggregation family. */
const UNIT_DEFS = {
  mg: { dim: "mass", base: 0.001 },
  g: { dim: "mass", base: 1 },
  kg: { dim: "mass", base: 1000 },
  ml: { dim: "volume", base: 1 },
  l: { dim: "volume", base: 1000 },
  tsp: { dim: "volume", base: 5, approx: true },
  tbsp: { dim: "volume", base: 15, approx: true },
  cup: { dim: "volume", base: 240, approx: true },
  piece: { dim: "count", base: 1 },
  clove: { dim: "count", base: 1 },
  pinch: { dim: "count", base: 1, approx: true },
};

/** Spelling variants seen in recipes → canonical unit key. */
const UNIT_ALIASES = {
  gram: "g", grams: "g", gm: "g", gms: "g", g: "g",
  kilogram: "kg", kilograms: "kg", kgs: "kg", kg: "kg",
  milligram: "mg", milligrams: "mg", mg: "mg",
  millilitre: "ml", millilitres: "ml", milliliter: "ml", milliliters: "ml",
  ml: "ml", cc: "ml",
  litre: "l", litres: "l", liter: "l", liters: "l", ltr: "l", l: "l",
  teaspoon: "tsp", teaspoons: "tsp", tsps: "tsp", tsp: "tsp", tbs: "tbsp",
  tablespoon: "tbsp", tablespoons: "tbsp", tbsps: "tbsp", tbsp: "tbsp",
  cup: "cup", cups: "cup",
  piece: "piece", pieces: "piece", pcs: "piece", pc: "piece",
  nos: "piece", no: "piece",
  clove: "clove", cloves: "clove",
  pinch: "pinch", pinches: "pinch",
};

export const DIMENSIONS = { mass: "mass", volume: "volume", count: "count" };

/** "Tablespoons " → "tbsp". Unknown units return the trimmed lowercase input. */
export function normalizeUnit(unit) {
  const key = String(unit || "").trim().toLowerCase().replace(/\.$/, "");
  if (!key) return "";
  return UNIT_ALIASES[key] || key;
}

/** Canonical def for a unit, or null when unknown. */
export function unitDef(unit) {
  return UNIT_DEFS[normalizeUnit(unit)] || null;
}

/** True when both units share a dimension we can sum in (g/kg, ml/cup, …). */
export function unitsCompatible(a, b) {
  const da = unitDef(a);
  const db = unitDef(b);
  return Boolean(da && db && da.dim === db.dim);
}

/** Convert {amount, unit} to the dimension base (g / ml / pieces). Unknown → null. */
export function toBase(amount, unit) {
  const def = unitDef(unit);
  const n = Number(amount);
  if (!def || !Number.isFinite(n) || n < 0) return null;
  return n * def.base;
}

/* ─────────────────────────── display formatting ─────────────────────────── */

const round2 = (n) => Math.round(n * 100) / 100;

/** Pretty-print a mass value in g/kg or a volume value in ml/L. */
function formatMetric(base, smallUnit, bigUnit, factor) {
  if (base >= factor) return `${round2(base / factor)} ${bigUnit}`;
  if (base > 0 && base < 1) return `${Math.round(base * 1000)} mg`.replace("mg", smallUnit === "g" ? "mg" : "µl");
  return `${round2(base)} ${smallUnit}`;
}

/** Human-friendly amount for a base quantity of a given dimension. */
export function formatBase(base, dim) {
  if (base == null || !Number.isFinite(base)) return "";
  if (dim === "mass") return formatMetric(base, "g", "kg", 1000);
  if (dim === "volume") return formatMetric(base, "ml", "L", 1000);
  return `${round2(base)} ${base === 1 ? "piece" : "pieces"}`;
}

/** Human-friendly {amount, unit} pair (also handles unknown units verbatim). */
export function formatAmountUnit(amount, unit) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  const def = unitDef(unit);
  if (def) return formatBase(n * def.base, def.dim);
  return `${round2(n)} ${String(unit || "").trim()}`.trim();
}

/** Best display unit for a base value in a dimension ("kg" when ≥ 1000 g). */
export function displayUnitFor(base, dim) {
  if (dim === "mass") return base >= 1000 ? "kg" : "g";
  if (dim === "volume") return base >= 1000 ? "l" : "ml";
  return "piece";
}

/** Amount expressed in a specific display unit of the same dimension. */
export function fromBase(base, unit) {
  const def = unitDef(unit);
  if (!def || !Number.isFinite(base)) return null;
  return round2(base / def.base);
}

/* ───────────────────────────── name canonicalization ────────────────────── */

/** Canonical ingredient name for merging: "Fresh Tomatoes (chopped)" → "tomato". */
export function canonicalName(name) {
  let n = String(name || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ") // parenthetical prep notes
    .replace(/[^a-z\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Naive de-plural: tomatoes→tomato, berries→berry, leaves→leaf stays (leaf mass noun)
  if (n.length > 3) {
    if (n.endsWith("ies")) n = `${n.slice(0, -3)}y`;
    else if (n.endsWith("oes")) n = n.slice(0, -2);
    else if (n.endsWith("ses") || n.endsWith("ches") || n.endsWith("shes") || n.endsWith("xes")) n = n.slice(0, -2);
    else if (n.endsWith("s") && !n.endsWith("ss") && !n.endsWith("us")) n = n.slice(0, -1);
  }
  return n;
}

/* ─────────────────────────────── aggregation ────────────────────────────── */

/**
 * Aggregate ingredient lines into mergeable buckets.
 *
 * @param {Array<{name: string, amount: number, unit: string}>} lines
 * @returns {Map<string, {canonical: string, displayName: string, dim: string|null,
 *            unit: string, base: number|null, rawAmount: number, notes: Set<string>}>}
 *
 * Merge key = canonicalName + dimension. Ingredients whose units are unknown
 * (or dimensionless) never merge — each keeps its own bucket by exact unit.
 */
export function aggregateIngredients(lines) {
  const buckets = new Map();
  for (const line of Array.isArray(lines) ? lines : []) {
    if (!line) continue;
    const canonical = canonicalName(line.name);
    if (!canonical) continue;
    const rawAmount = Number(line.amount);
    const unit = normalizeUnit(line.unit);
    const def = unitDef(unit);
    const base = def && Number.isFinite(rawAmount) ? rawAmount * def.base : null;
    const dim = def ? def.dim : null;
    const key = def ? `${canonical}|${dim}` : `${canonical}|unit:${unit || "none"}`;

    const existing = buckets.get(key);
    if (existing && existing.base != null && base != null) {
      existing.base += base;
      existing.rawAmount += Number.isFinite(rawAmount) ? rawAmount : 0;
    } else if (existing && existing.base == null) {
      existing.rawAmount += Number.isFinite(rawAmount) ? rawAmount : 0;
    } else if (!existing) {
      buckets.set(key, {
        canonical,
        displayName: String(line.name || "").trim(),
        dim,
        unit: unit || String(line.unit || "").trim(),
        base,
        rawAmount: Number.isFinite(rawAmount) ? rawAmount : 0,
        notes: new Set(),
      });
    }
    if (line.note) buckets.get(key)?.notes.add(String(line.note));
  }
  return buckets;
}

/** Merge two same-dimension base values; returns null when incompatible. */
export function addBases(a, b) {
  if (a == null || b == null) return null;
  return a + b;
}
