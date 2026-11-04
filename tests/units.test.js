import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeUnit, unitDef, unitsCompatible, toBase, formatBase, fromBase,
  displayUnitFor, canonicalName, aggregateIngredients,
} from '../lib/units.js'

test('unit aliases normalize to canonical keys', () => {
  assert.equal(normalizeUnit('Tablespoons'), 'tbsp')
  assert.equal(normalizeUnit('GRAMS'), 'g')
  assert.equal(normalizeUnit('kilogram'), 'kg')
  assert.equal(normalizeUnit('litres'), 'l')
  assert.equal(normalizeUnit('tsps'), 'tsp')
  assert.equal(normalizeUnit('pcs'), 'piece')
  assert.equal(normalizeUnit('nos'), 'piece')
  assert.equal(normalizeUnit(''), '')
})

test('same dimension merges, different dimensions never merge', () => {
  assert.equal(unitsCompatible('kg', 'g'), true)
  assert.equal(unitsCompatible('tbsp', 'ml'), true)
  assert.equal(unitsCompatible('g', 'ml'), false)
  assert.equal(unitsCompatible('piece', 'kg'), false)
  assert.equal(unitsCompatible('cup', 'g'), false)
})

test('base conversion is exact', () => {
  assert.equal(toBase(1.5, 'kg'), 1500)
  assert.equal(toBase(2, 'tbsp'), 30)
  assert.equal(toBase(1, 'cup'), 240)
  assert.equal(toBase(3, 'piece'), 3)
  assert.equal(toBase(1, 'bogus'), null)
})

test('formatting picks human-friendly units', () => {
  assert.equal(formatBase(1500, 'mass'), '1.5 kg')
  assert.equal(formatBase(800, 'mass'), '800 g')
  assert.equal(formatBase(2500, 'volume'), '2.5 L')
  assert.equal(displayUnitFor(1500, 'mass'), 'kg')
  assert.equal(fromBase(1500, 'kg'), 1.5)
})

test('canonicalName handles plurals, preps and casing', () => {
  assert.equal(canonicalName('Fresh Tomatoes (chopped)'), 'fresh tomato')
  assert.equal(canonicalName('Green Chillies'), 'green chilly')
  assert.equal(canonicalName('Kabuli Chana'), 'kabuli chana')
})

test('aggregation merges only compatible units per ingredient', () => {
  const buckets = aggregateIngredients([
    { name: 'Rice', amount: 500, unit: 'g' },
    { name: 'rice', amount: 300, unit: 'g' },
    { name: 'Milk', amount: 1, unit: 'cup' },
    { name: 'Milk', amount: 250, unit: 'ml' },
    { name: 'Paneer', amount: 2, unit: 'piece' },
  ])
  const rice = buckets.get('rice|mass')
  assert.equal(rice.base, 800) // 500 g + 300 g — "basmati rice" would NOT merge
  const milk = buckets.get('milk|volume')
  assert.equal(milk.base, 490) // 1 cup + 250 ml
  // pieces stay in their own dimension bucket
  assert.equal(buckets.get('paneer|count').base, 2)
  // grams of paneer would NOT merge with pieces of paneer
  const both = aggregateIngredients([
    { name: 'Paneer', amount: 200, unit: 'g' },
    { name: 'Paneer', amount: 2, unit: 'piece' },
  ])
  assert.equal(both.size, 2)
})

test('unknown units never merge into known buckets', () => {
  const buckets = aggregateIngredients([
    { name: 'Salt', amount: 1, unit: 'to taste' },
    { name: 'Salt', amount: 1, unit: 'to taste' },
  ])
  const salt = [...buckets.values()][0]
  assert.equal(salt.base, null)
  assert.equal(salt.rawAmount, 2)
})
