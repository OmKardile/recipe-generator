import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getSubstitutions,
  substitutedIngredient,
  applySubstitutions,
  SUBSTITUTION_TABLE,
} from '../lib/substitutions.js'

test('curated lookups resolve through case, plurals, preps and aliases', () => {
  assert.ok(getSubstitutions('Paneer').length >= 1)
  assert.ok(getSubstitutions('paneer (cubed)').length >= 1)
  assert.ok(getSubstitutions('Cottage Cheese').length >= 1)
  assert.ok(getSubstitutions('Curd').length >= 1) // alias → yogurt
  assert.ok(getSubstitutions('Heavy Cream').length >= 1) // alias → cream
  assert.ok(getSubstitutions('Wheat Flour').length >= 1) // alias → atta
  assert.ok(getSubstitutions('Semolina').length >= 1) // alias → sooji
  assert.ok(getSubstitutions('Toor Dal').length >= 1)
  assert.deepEqual(getSubstitutions('truffle oil'), []) // unknown → honest empty
  assert.deepEqual(getSubstitutions(''), [])
})

test('every curated option carries the four honest notes and a sane ratio', () => {
  for (const [key, options] of Object.entries(SUBSTITUTION_TABLE)) {
    assert.ok(options.length >= 1, `${key} has no options`)
    for (const o of options) {
      assert.ok(o.to && typeof o.to === 'string', `${key}: missing target name`)
      assert.ok(Number.isFinite(o.ratio) && o.ratio > 0 && o.ratio <= 3, `${key}→${o.to}: bad ratio`)
      for (const field of ['taste', 'texture', 'nutrition', 'cooking']) {
        assert.ok(typeof o[field] === 'string' && o[field].length > 10, `${key}→${o.to}: weak ${field} note`)
      }
      // The engine must never claim nutritional equivalence.
      assert.match(o.nutrition, /not identical/i, `${key}→${o.to}: nutrition note must be honest`)
    }
  }
})

test('restrictions filter swaps — vegan never gets offered paneer', () => {
  const vegan = { diet: 'vegan', allergies: [], dislikes: [] }
  const paneerSwaps = getSubstitutions('Paneer', vegan)
  assert.ok(paneerSwaps.length >= 1) // tofu + soya chunks remain
  assert.ok(!paneerSwaps.some((o) => /paneer/i.test(o.to)))

  // paneer AS a chicken substitute must disappear for vegans
  const chickenSwaps = getSubstitutions('Chicken', vegan)
  assert.ok(chickenSwaps.length >= 1)
  assert.ok(!chickenSwaps.some((o) => /paneer/i.test(o.to)))

  // dairy-allergic household: plant milks are safe swaps (not dairy)
  const dairyAllergy = { diet: '', allergies: ['dairy'], dislikes: [] }
  const milkSwaps = getSubstitutions('Milk', dairyAllergy)
  assert.ok(milkSwaps.length >= 1)
  assert.ok(!milkSwaps.some((o) => /dairy/i.test(o.to)))
})

test('substitutedIngredient scales amounts by ratio and stamps the note', () => {
  const ing = { name: 'Paneer', amount: 200, unit: 'g', note: 'cubed' }
  const tofu = { to: 'Tofu (firm)', ratio: 1, taste: '', texture: '', nutrition: '', cooking: '' }
  const out = substitutedIngredient(ing, tofu)
  assert.equal(out.name, 'Tofu (firm)')
  assert.equal(out.amount, 200)
  assert.match(out.note, /substituted for Paneer/)

  const soya = { to: 'Soya chunks (rehydrated)', ratio: 0.5, taste: '', texture: '', nutrition: '', cooking: '' }
  const out2 = substitutedIngredient(ing, soya)
  assert.equal(out2.amount, 100) // 200 × 0.5

  // "to taste" style entries keep amount 0 untouched
  const toTaste = substitutedIngredient({ name: 'Salt', amount: 0, unit: 'to taste' }, tofu)
  assert.equal(toTaste.amount, 0)
  assert.equal(toTaste.name, 'Tofu (firm)')
})

test('applySubstitutions maps index → option across the array', () => {
  const ingredients = [
    { name: 'Paneer', amount: 200, unit: 'g', note: null },
    { name: 'Onion', amount: 2, unit: 'piece', note: null },
    { name: 'Cream', amount: 0.5, unit: 'cup', note: null },
  ]
  const applied = new Map([
    [0, { to: 'Tofu (firm)', ratio: 1 }],
    [2, { to: 'Coconut cream', ratio: 1 }],
  ])
  const out = applySubstitutions(ingredients, applied)
  assert.equal(out[0].name, 'Tofu (firm)')
  assert.equal(out[1].name, 'Onion') // untouched
  assert.equal(out[2].name, 'Coconut cream')
  assert.equal(ingredients[0].name, 'Paneer') // original array never mutated
})

test('curated options are labelled with source and provenance', () => {
  const options = getSubstitutions('Butter')
  assert.ok(options.every((o) => o.source === 'curated'))
  assert.ok(options.every((o) => o.replaces === 'Butter'))
})
