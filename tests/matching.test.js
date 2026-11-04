import test from 'node:test'
import assert from 'node:assert/strict'
import {
  supermarketTermsFor, aliasFamily, ingredientDietaryTag,
  scoreCandidate, matchIngredient, pickDefaultCandidate,
  optimizePackages, estimateShoppingCart, isStaleTimestamp,
} from '../lib/productMatching.js'
import { DmartReadyProvider } from '../lib/retailers/dmart.js'

test('spec alias examples translate to supermarket terms', () => {
  assert.equal(supermarketTermsFor('tomato', 'Tomato')[0], 'fresh tomatoes')
  assert.equal(supermarketTermsFor('paneer', 'Paneer')[0], 'fresh paneer')
  assert.equal(supermarketTermsFor('refined oil', 'Refined oil')[0], 'cooking oil')
  assert.equal(supermarketTermsFor('wheat flour', 'Wheat flour')[0], 'atta')
  assert.equal(supermarketTermsFor('chickpea', 'Chickpeas')[0], 'kabuli chana')
  assert.equal(supermarketTermsFor('cumin seed', 'Cumin')[0], 'jeera')
})

test('alias families group equivalent names', () => {
  const atta = aliasFamily('wheat flour')
  assert.ok(atta.includes('atta'))
  assert.ok(aliasFamily('cumin').includes('cumin seed'))
  assert.ok(aliasFamily('chickpea').includes('chana'))
})

test('dietary tags', () => {
  assert.equal(ingredientDietaryTag('paneer'), 'veg')
  assert.equal(ingredientDietaryTag('chicken'), 'non-veg')
  assert.equal(ingredientDietaryTag('egg'), 'non-veg')
})

test('confidence scoring: identity > family > fallback; stale penalty', () => {
  const fresh = new Date().toISOString()
  const stale = '2026-01-01T00:00:00Z'
  assert.equal(scoreCandidate({ canonical: 'atta', verifiedAt: fresh }, { canonical: 'atta' }), 0.95)
  assert.equal(scoreCandidate({ canonical: 'atta', verifiedAt: fresh }, { canonical: 'wheat flour' }), 0.85)
  assert.equal(scoreCandidate({ canonical: 'atta', verifiedAt: stale }, { canonical: 'atta' }), 0.9)
  assert.ok(scoreCandidate({ canonical: 'rice', verifiedAt: fresh }, { canonical: 'atta' }) < 0.6)
  // AI estimates are capped low — never auto-selectable facts
  assert.equal(scoreCandidate({ canonical: 'atta', verifiedAt: fresh, priceSource: 'ai-estimate' }, { canonical: 'atta' }), 0.45)
})

test('auto-selection only for a single fresh high-confidence match', () => {
  const catalog = [
    { id: '1', canonical: 'paneer', brand: 'Amul', packageBase: 200, packageDim: 'mass', verifiedAt: new Date().toISOString() },
    { id: '2', canonical: 'paneer', brand: 'Mother Dairy', packageBase: 500, packageDim: 'mass', verifiedAt: new Date().toISOString() },
  ]
  const ambiguous = matchIngredient({ canonical: 'paneer', displayName: 'Paneer', dim: 'mass' }, { catalogEntries: catalog })
  assert.equal(ambiguous.needsApproval, true)
  assert.equal(pickDefaultCandidate(ambiguous), null)

  const single = matchIngredient({ canonical: 'paneer', displayName: 'Paneer', dim: 'mass' }, { catalogEntries: [catalog[0]] })
  const auto = pickDefaultCandidate(single)
  assert.equal(auto.autoSelected, true)

  // stale single match is NOT auto-selected
  const staleSingle = matchIngredient(
    { canonical: 'paneer', displayName: 'Paneer', dim: 'mass' },
    { catalogEntries: [{ ...catalog[0], verifiedAt: '2026-01-01T00:00:00Z' }] }
  )
  assert.equal(pickDefaultCandidate(staleSingle), null)
})

test('package dimension filters candidates honestly', () => {
  const catalog = [
    { id: '1', canonical: 'egg', packageBase: 6, packageDim: 'count', verifiedAt: new Date().toISOString() },
    { id: '2', canonical: 'egg', packageBase: 300, packageDim: 'mass', verifiedAt: new Date().toISOString() },
  ]
  const matched = matchIngredient({ canonical: 'egg', displayName: 'Egg', dim: 'count' }, { catalogEntries: catalog })
  assert.equal(matched.candidates.length, 1)
  assert.equal(matched.candidates[0].packageDim, 'count')
})

test('optimizer: minimum cost that covers the requirement', () => {
  // one 1 kg pack (₹100) beats two 500 g packs (₹110) for 750 g
  const a = optimizePackages(750, [
    { packageBase: 500, price: 55 },
    { packageBase: 1000, price: 100 },
  ])
  assert.deepEqual(a.packages.map((p) => p.packageBase), [1000])
  assert.equal(a.totalCost, 100)
  assert.equal(a.deltaBase, 250)

  // two 500 g packs (₹80) beat one 1 kg pack (₹100)
  const b = optimizePackages(750, [
    { packageBase: 500, price: 40 },
    { packageBase: 1000, price: 100 },
  ])
  assert.equal(b.totalCost, 80)
  assert.equal(b.totalBase, 1000)

  // exact cover with mixed sizes
  const c = optimizePackages(750, [
    { packageBase: 500, price: 40 },
    { packageBase: 250, price: 22 },
    { packageBase: 1000, price: 100 },
  ])
  assert.equal(c.totalCost, 62)
  assert.equal(c.deltaBase, 0)

  // degenerate inputs
  assert.equal(optimizePackages(0, [{ packageBase: 500, price: 40 }]), null)
  assert.equal(optimizePackages(500, []), null)
})

test('cart estimate separates verified, estimated and unpriced; reports rounding', () => {
  const cart = estimateShoppingCart(
    [
      {
        id: 'a', name: 'Paneer', dim: 'mass', toBuyBase: 500, toBuyAmount: 0.5,
        product: {
          name: 'Malai Paneer', brand: 'Amul', packageBase: 200, packageDim: 'mass',
          price: 90, mrp: 95, priceSource: 'user-verified',
          verifiedAt: new Date().toISOString(), pincodeEntered: '411001',
        },
      },
      {
        id: 'b', name: 'Atta', dim: 'mass', toBuyBase: 2000, toBuyAmount: 2,
        product: { name: 'Chakki Atta', packageBase: 5000, packageDim: 'mass', price: 285, priceSource: 'ai-estimate', verifiedAt: null },
      },
      { id: 'c', name: 'Salt', dim: null, toBuyBase: null, toBuyAmount: 1, price: null, product: null },
      { id: 'd', name: 'Rice', dim: 'mass', toBuyBase: 1000, toBuyAmount: 1, price: 60, product: null },
    ],
    { budget: 1000, pincode: '411001' }
  )
  assert.equal(cart.lines[0].packagesNeeded, 3)
  assert.equal(cart.lines[0].deltaBase, 100) // 600 g bought vs 500 g needed
  assert.equal(cart.verifiedTotal, 330) // 3×90 paneer + 1×60 manual rice
  assert.equal(cart.estimatedTotal, 285)
  assert.equal(cart.mrpTotal, 285) // 3×95
  assert.equal(cart.savings, 15) // 3×(95−90)
  assert.equal(cart.unpricedCount, 1)
  assert.equal(cart.budgetRemaining, 385) // 1000 − 615
})

test('cart estimate flags stale prices and foreign-PIN prices', () => {
  const cart = estimateShoppingCart(
    [
      {
        id: 'a', name: 'Paneer', dim: 'mass', toBuyBase: 500, toBuyAmount: 0.5,
        product: {
          packageBase: 200, packageDim: 'mass', price: 90, priceSource: 'user-verified',
          verifiedAt: '2026-10-01T00:00:00Z', pincodeEntered: '400001',
        },
      },
    ],
    { pincode: '411001' }
  )
  assert.equal(cart.stalePriceCount, 1)
  assert.equal(cart.pinStaleCount, 1)
  assert.equal(cart.lines[0].pinNote, 'price entered for PIN 400001')
})

test('unit-family mismatch is flagged, never guessed', () => {
  const cart = estimateShoppingCart([
    {
      id: 'a', name: 'Garlic', dim: 'count', toBuyBase: 10, toBuyAmount: 10,
      product: { packageBase: 250, packageDim: 'mass', price: 40, priceSource: 'user-verified' },
    },
  ])
  assert.equal(cart.lines[0].unitMismatch, true)
  assert.equal(cart.unpricedCount, 1)
})

/* ───────────────────────── DmartReadyProvider ────────────────────────── */

test('serviceability is honestly unverified; invalid PINs rejected', async () => {
  const dmart = new DmartReadyProvider()
  const ok = await dmart.getServiceability('411001')
  assert.equal(ok.status, 'unverified')
  assert.equal(ok.verified, false)
  assert.equal(ok.canCheckProgrammatically, false)
  assert.equal(ok.officialCheckUrl, 'https://www.dmart.in/')
  const bad = await dmart.getServiceability('911001') // PINs start 1-8
  assert.equal(bad.status, 'invalid')
})

test('search handoff uses supermarket terms first', async () => {
  const dmart = new DmartReadyProvider()
  const search = await dmart.searchProducts(
    { displayName: 'Chickpeas', terms: ['kabuli chana', 'chana'] },
    { pincode: '411001' }
  )
  assert.equal(search.live, false)
  assert.equal(search.searches[0].term, 'kabuli chana')
  assert.equal(search.searches[0].url, 'https://www.dmart.in/search?q=kabuli%20chana')
})

test('prices from the user catalog carry provenance; missing entries stay unverified', async () => {
  const entry = {
    id: 'rp_1', retailerId: 'dmart', price: 210, mrp: 220,
    pincode: '411001', verifiedAt: new Date().toISOString(),
    name: 'Fresh Paneer', brand: 'Mother Dairy', availability: 'user-confirmed',
  }
  const dmart = new DmartReadyProvider({
    catalog: { getEntry: async (id) => (id === 'rp_1' ? entry : null) },
  })
  const price = await dmart.getPrice('rp_1', { pincode: '411001' })
  assert.equal(price.verified, true)
  assert.equal(price.priceSource, 'user-verified')
  assert.equal(price.pinMatchesCurrent, true)
  const foreign = await dmart.getPrice('rp_1', { pincode: '400001' })
  assert.equal(foreign.pinMatchesCurrent, false)
  const missing = await dmart.getPrice('nope', {})
  assert.equal(missing.verified, false)
})

test('availability is never invented', async () => {
  const dmart = new DmartReadyProvider({
    catalog: {
      getEntry: async () => ({ retailerId: 'dmart', availability: 'unknown', verifiedAt: new Date().toISOString() }),
    },
  })
  const avail = await dmart.getAvailability('x')
  assert.equal(avail.status, 'unknown')
  assert.equal(avail.verified, false)
})

test('handoff never claims a cart transfer; links are official', async () => {
  const dmart = new DmartReadyProvider()
  const handoff = await dmart.buildShoppingHandoff(
    [
      { name: 'Malai Paneer', brand: 'Amul', packagesNeeded: 3, price: 90, priceSource: 'user-verified', searchTerm: 'fresh paneer' },
      { name: 'Good Day Cookies', url: 'https://www.dmart.in/product/britannia-good-day-butter-cookies' },
    ],
    { pincode: '411001' }
  )
  assert.equal(handoff.canTransferCart, false)
  assert.match(handoff.reason, /cart|order/)
  assert.equal(handoff.items[0].url, 'https://www.dmart.in/search?q=fresh%20paneer')
  assert.equal(handoff.items[1].url, 'https://www.dmart.in/product/britannia-good-day-butter-cookies')
})

test('product URL validation accepts only official DMart product pages', () => {
  const dmart = new DmartReadyProvider()
  assert.equal(dmart.isValidProductUrl('https://www.dmart.in/product/britannia-good-day-butter-cookies'), true)
  assert.equal(dmart.isValidProductUrl('https://dmart.in/product/anything'), true)
  assert.equal(dmart.isValidProductUrl('https://example.com/product/britannia'), false)
  assert.equal(dmart.isValidProductUrl('https://www.dmart.in/search?q=paneer'), false)
})

test('stale timestamps are detected after a week', () => {
  assert.equal(isStaleTimestamp(null), true)
  assert.equal(isStaleTimestamp(new Date().toISOString()), false)
  assert.equal(isStaleTimestamp(new Date(Date.now() - 8 * 86400000).toISOString()), true)
})
