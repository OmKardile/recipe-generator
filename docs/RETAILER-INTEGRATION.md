# Grocery Intelligence & Retailer Integration

This document explains how the meal planner, pantry, consolidated grocery list and
retailer integration (DMart Ready) fit together — and the data-honesty rules the
whole system is built on.

## 1. DMart Ready investigation (why the integration looks like it does)

Before building anything we investigated official programmatic access to DMart
Ready ([dmart.in](https://www.dmart.in/)):

| Question | Finding |
|---|---|
| Official developer API / partner programme? | **None exists.** DMart / Avenue Supermarts publishes no public developer portal, catalogue API, or affiliate programme for DMart Ready. |
| robots.txt posture | General pages allowed, but `/cart`, `/checkout/`, `/orders/`, `/pdp/`, `/deepLink/` and parameterized URLs are disallowed. Product pages in the sitemap use `/product/<slug>`. Search pages are a client-rendered SPA. |
| Third-party "DMart APIs" | Unofficial services reselling scraped data. **Not used** — that would depend on unauthorized access. |

**Consequences (deliberate design decisions):**

- No scraping, no reverse-engineered private endpoints, no unofficial APIs.
- Product discovery is a **link-based shopping handoff**: the app builds official
  DMart Ready search URLs (and accepts official `/product/<slug>` URLs the user
  pastes in).
- Prices exist in the app only as **user-verified entries** (the user checked
  DMart and typed what they saw, stamped with a date + PIN) or as
  **clearly-labeled AI estimates**. The two are never mixed or mislabeled.
- Availability is never invented: `unknown` is a first-class answer.
- Cart transfer is never claimed: `canTransferCart` is `false` until a real
  official integration confirms otherwise.
- No DMart credentials or payment details are ever collected or stored.
- The shopping list is fully functional with zero retailer data — the retailer
  layer only *augments* it.

## 2. Retailer adapter architecture

Core meal-planning / grocery logic **never imports a concrete retailer**. It
talks to the `RetailerProvider` interface and resolves implementations from the
registry in `lib/retailers/index.js`.

```
lib/retailers/base.js     RetailerProvider (interface contract + honesty rules)
lib/retailers/dmart.js    DmartReadyProvider (the only implementation today)
lib/retailers/index.js    registry — getRetailerProvider(id), listRetailers()
```

Interface: `getServiceability(pincode)`, `getFulfilmentOptions(pincode)`,
`searchProducts(ingredientDescriptor, location)`, `getProductDetails(productId, location)`,
`getPrice(productId, location)`, `getAvailability(productId, location)`,
`buildShoppingHandoff(selectedProducts, location)`.

**Adding a second retailer later** (e.g. BigBasket):

1. Write `lib/retailers/bigbasket.js` implementing `RetailerProvider`.
2. Register it in `lib/retailers/index.js`.
3. Done — the planner, pantry, grocery list, matching engine and UI pick it up
   through the registry (retailer select, serviceability, product catalog,
   handoff). No core logic changes.

## 3. Data flow

```
Household profile (/api/household)
        │  servings, diet, allergies (hard), dislikes, budget, currency
        ▼
AI meal plan (/api/planner)  ── regenerate (all | day | meal, locks honored)
        │  dated days × meal slots, each a validated recipe object;
        │  every meal re-validated against allergies/diet server-side
        ▼
Pantry (/api/pantry)          ── deduct only via explicit "I cooked this"
        │
        ▼
Grocery list (/api/grocery)  ── deterministic: scale → normalize → merge
        │  compatible units (500 g + 300 g = 800 g; g never merges with pieces)
        │  → subtract pantry → 9 categories → merge user state
        ▼
Retailer layer (/api/retailer-products, /api/retailer/suggest,
                /api/shopping-location)
        │  user-verified catalog, AI-estimate suggestions (on request only),
        │  PIN + fulfilment config
        ▼
Cart estimate (estimateShoppingCart) ── packages needed, rounding deltas,
        verified / estimated / unpriced totals, MRP & savings, budget remaining
```

## 4. Ingredient → product matching (`lib/productMatching.js`)

- **Alias knowledge base**: recipe names → supermarket terms
  (tomato → *fresh tomatoes*, wheat flour → *atta*, chickpeas → *kabuli chana*,
  cumin → *jeera*, refined oil → *cooking oil*…). Keys sharing a primary search
  term form an **alias family** — a product saved as “atta” matches a recipe
  asking for “wheat flour”.
- **Confidence scoring**: exact canonical 0.95 → family 0.85 → fallback ≤ 0.5;
  stale verifiedAt −0.05; preferred brand +0.05; **AI-estimate sources are
  capped at 0.45**.
- **Auto-selection policy**: only a *single, fresh (≤ 7 days), ≥ 0.85-confidence
  user-verified* product is auto-attached. Multiple candidates, stale prices or
  low confidence → manual selection required. A product the user explicitly
  removed is never re-attached by regeneration.
- **Package optimizer**: exact dynamic program for the minimum-cost combination
  of package sizes covering the required quantity. It reports the rounding
  delta (recipe needs 750 g, one 1 kg pack buys 1000 g → +250 g) — recipe
  quantities are never silently modified.

## 5. Price-source honesty model

| Source | Stored as | Shown as | Counts toward |
|---|---|---|---|
| User checked DMart & entered it | `priceSource: 'user-verified'` + `verifiedAt` + `pincode` | “you verified” | Verified total |
| AI suggestion (explicit request) | `priceSource: 'ai-estimate'` | “AI estimate” + disclaimer | Estimated total |
| Manual per-unit price (₹/kg) | `item.price` | per-unit input | Verified total |
| Nothing | — | unpriced count | Never guessed |

Staleness rules: prices older than 7 days are flagged for re-verification before
a final estimate; a price entered for one PIN is **flagged, not silently reused**,
when the configured PIN differs.

## 6. API surface (new)

| Route | Purpose |
|---|---|
| `GET/PUT /api/household` | household profile (servings, diet, allergies, budget) |
| `GET/POST /api/planner`, `GET/PATCH/DELETE /api/planner/[id]` | plan list, generation, surgical mutations (lock, servings, setMeal, moveMeal, clearMeal, markCooked, setDayCook, rename) |
| `POST /api/planner/[id]/regenerate` | scope `all` / `day` / `meal` — locked meals are never touched |
| `GET/POST /api/pantry`, `PATCH/DELETE /api/pantry/[id]` | pantry CRUD |
| `POST /api/pantry/consume` | explicit “I cooked this” pantry deduction |
| `GET/POST/PATCH /api/grocery` | list compute/regenerate + mutations (togglePurchased, updateItem, setPrice, addCustom, removeItem, clearPurchased, selectProduct, clearProduct, getPantryLines) |
| `GET/POST/PUT /api/shopping-location` | PIN + retailer + fulfilment config; POST = serviceability check |
| `GET/POST /api/retailer-products`, `PATCH/DELETE /api/retailer-products/[id]` | user-verified product catalog (official-URL validation) |
| `POST /api/retailer/suggest` | AI product estimates — explicit request only, rate-limited, clearly labeled |

## 7. Tests

`npm test` (node:test) covers the deterministic core: unit
normalization/aggregation (`tests/units.test.js`), grocery building + state
survival (`tests/grocery.test.js`), matching/confidence/optimizer/cart + DMart
provider behaviour (`tests/matching.test.js`), allergy/diet enforcement
(`tests/restrictions.test.js`).
