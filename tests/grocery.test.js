import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildGroceryRequirement, planIngredientLines, mergeWithPreviousList, computeCostSummary,
} from '../lib/grocery.js'

const recipe = (overrides = {}) => ({
  title: 'Test curry',
  servings: 4,
  ingredients: [
    { name: 'Rice', amount: 500, unit: 'g', note: null },
    { name: 'Rice', amount: 300, unit: 'g', note: 'rinsed' },
    { name: 'Onion', amount: 2, unit: 'piece', note: null },
    { name: 'Salt', amount: 1, unit: 'to taste', note: null },
  ],
  ...overrides,
})

const plan = (meals) => ({
  days: [
    {
      date: '2026-11-05',
      meals,
    },
  ],
})

test('planIngredientLines scales ingredients to meal servings', () => {
  const lines = planIngredientLines(
    plan({ dinner: { recipe: recipe(), servings: 8 } }) // 8 / 4 = ×2
  )
  const rice = lines.find((l) => l.name === 'Rice')
  assert.equal(rice.amount, 1000)
})

test('buildGroceryRequirement aggregates, dedupes and subtracts pantry', () => {
  const { items } = buildGroceryRequirement(
    plan({
      dinner: { recipe: recipe(), servings: 4 },
      lunch: { recipe: recipe({ title: 'Other', servings: 2 }), servings: 4 }, // ×2 again
    }),
    [
      { name: 'rice', quantity: 250, unit: 'g' }, // canonical match, mass dim
      { name: 'onion', quantity: 10, unit: 'piece' }, // more than enough
    ]
  )
  const rice = items.find((i) => i.canonical === 'rice')
  // dinner ×1 → 800 g; lunch ×2 (4 servings from a 2-serving recipe) → 1600 g
  assert.equal(rice.requiredBase, 2400)
  assert.equal(rice.pantryBase, 250)
  assert.equal(rice.toBuyBase, 2150)

  const onion = items.find((i) => i.canonical === 'onion')
  assert.equal(onion.toBuyBase, 0)
  assert.equal(onion.toBuyText, '0 (in pantry)')

  // "to taste" items stay on the list but without base quantities
  const salt = items.find((i) => i.canonical === 'salt')
  assert.equal(salt.requiredBase, null)
  assert.equal(salt.toBuyBase, null)
})

test('pantry in incompatible units warns instead of silently merging', () => {
  const { warnings } = buildGroceryRequirement(
    plan({ dinner: { recipe: recipe(), servings: 4 } }),
    [{ name: 'rice', quantity: 2, unit: 'piece' }]
  )
  assert.ok(warnings.some((w) => w.includes('rice')))
})

test('mergeWithPreviousList preserves purchased, price, note and product', () => {
  const fresh = [
    { id: 'a', name: 'Rice', toBuyBase: 1000, purchased: false, price: null, note: null, product: null },
    { id: 'b', name: 'Salt', toBuyBase: null, purchased: false, price: null, note: null, product: null },
  ]
  const previous = [
    { id: 'a', name: 'Rice', purchased: true, price: 60, note: 'buy basmati', product: { name: 'Sona Masoori' }, productCleared: false },
    { id: 'b', name: 'Salt', purchased: true, price: 20, note: null, product: null, productCleared: false },
    { id: 'custom_1', name: 'Dishwash bar', custom: true, purchased: false },
  ]
  const merged = mergeWithPreviousList(fresh, previous)
  const rice = merged.find((i) => i.id === 'a')
  assert.equal(rice.purchased, true)
  assert.equal(rice.price, 60)
  assert.equal(rice.note, 'buy basmati')
  assert.deepEqual(rice.product, { name: 'Sona Masoori' })
  // custom items carry over untouched
  assert.equal(merged.filter((i) => i.custom).length, 1)
})

test('cleared products are not re-attached on regeneration', () => {
  const fresh = [{ id: 'a', name: 'Rice', toBuyBase: 1000 }]
  const previous = [{ id: 'a', name: 'Rice', product: null, productCleared: true }]
  const merged = mergeWithPreviousList(fresh, previous)
  assert.equal(merged[0].product, null)
  assert.equal(merged[0].productCleared, true)
})

test('computeCostSummary uses manual per-unit prices only', () => {
  const summary = computeCostSummary(
    [
      { custom: false, price: 60, toBuyAmount: 1.5 }, // ₹90
      { custom: false, price: null, toBuyAmount: 2 }, // unpriced
      { custom: true, price: 25, toBuyAmount: 1 }, // custom — excluded from plan lines
    ],
    { weeklyBudget: 100 }
  )
  assert.equal(summary.total, 90)
  assert.equal(summary.pricedCount, 1)
  assert.equal(summary.unpricedCount, 1)
  assert.equal(summary.overBudget, false)
})
