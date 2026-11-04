import test from 'node:test'
import assert from 'node:assert/strict'
import {
  deriveLearnedProfile,
  filterLearnedByRestrictions,
  buildPersonalizationBlock,
  profileHeadline,
} from '../lib/personalization.js'
import { normalizeEvent, EVENT_TYPES } from '../lib/interactionStore.js'

const ev = (type, extra = {}) => normalizeEvent({ type, ...extra })

test('normalizeEvent whitelists types and rejects junk', () => {
  assert.ok(ev('recipe_cooked', { title: 'Dal tadka' }))
  assert.equal(ev('hacked_event', { title: 'x' }), null)
  assert.equal(ev('recipe_rated', { title: 'x' }), null) // rating required
  assert.equal(ev('recipe_rated', { title: 'x', rating: 4 }).rating, 4)
  assert.equal(ev('recipe_rated', { title: 'x', rating: 99 }).rating, 5) // clamped
  assert.equal(ev('recipe_cooked', {}), null) // needs a subject
})

test('positive signals build cuisine affinity and enjoyed recipes', () => {
  const events = [
    ev('recipe_cooked', { title: 'Paneer Bhurji', cuisine: 'North Indian', totalTimeMinutes: 30 }),
    ev('recipe_liked', { title: 'Dal Tadka', cuisine: 'North Indian' }),
    ev('recipe_saved', { title: 'Poha', cuisine: 'Maharashtrian' }),
    ev('recipe_rated', { title: 'Upma', cuisine: 'South Indian', rating: 5 }),
  ]
  const p = deriveLearnedProfile(events)
  assert.equal(p.eventCount, 4)
  assert.ok(p.cuisines.length >= 2)
  assert.equal(p.cuisines[0].name, 'North Indian') // cooked+liked = strongest
  assert.equal(p.typicalCookMinutes, 30)
  const enjoyed = p.enjoyedRecipes.map((r) => r.title)
  assert.ok(enjoyed.includes('Paneer Bhurji'))
  assert.ok(enjoyed.includes('Upma')) // rating 5 → affinity +4
})

test('negative signals lower affinity and rejected ingredients accumulate', () => {
  const events = [
    ev('recipe_disliked', { title: 'Karela Sabzi', cuisine: 'North Indian' }),
    ev('recipe_skipped', { title: 'Bitter Gourd Stir Fry', cuisine: 'North Indian' }),
    ev('meal_replaced', { title: 'Cauliflower Curry', cuisine: 'North Indian' }),
    ev('ingredient_rejected', { fromIngredient: 'cauliflower', toIngredient: 'broccoli' }),
    ev('ingredient_rejected', { fromIngredient: 'cauliflower' }),
  ]
  const p = deriveLearnedProfile(events)
  const north = p.cuisines.find((c) => c.name === 'North Indian')
  assert.equal(north, undefined) // net negative → not in positive list
  assert.deepEqual(
    p.rejectedIngredients.map((i) => i.name),
    ['cauliflower']
  )
  assert.equal(p.rejectedIngredients[0].count, 2)
})

test('tired recipes are detected from repeat cooking', () => {
  const events = [
    ev('recipe_cooked', { title: 'Dal tadka' }),
    ev('recipe_cooked', { title: 'Dal tadka' }),
    ev('recipe_cooked', { title: 'Dal tadka' }),
  ]
  const p = deriveLearnedProfile(events)
  assert.equal(p.tiredRecipes[0]?.title, 'Dal tadka')
  assert.equal(p.tiredRecipes[0]?.count, 3)
})

test('filterLearnedByRestrictions never lets an allergen into learned hints', () => {
  const raw = {
    eventCount: 5,
    cuisines: [{ name: 'North Indian', score: 9 }],
    likedIngredients: [{ name: 'Paneer', score: 3 }, { name: 'Spinach', score: 2 }],
    enjoyedRecipes: [{ title: 'Paneer Butter Masala', cuisine: 'North Indian' }],
    rejectedIngredients: [],
  }
  const filtered = filterLearnedByRestrictions(raw, {
    diet: 'vegan',
    allergies: ['dairy'],
    dislikes: [],
  })
  assert.deepEqual(
    filtered.likedIngredients.map((i) => i.name),
    ['Spinach']
  )
  assert.equal(filtered.enjoyedRecipes.length, 0) // dairy dish filtered
  assert.equal(filtered.cuisines.length, 1) // positive cuisine stays
})

test('prompt block renders only available signals, empty when none', () => {
  const empty = deriveLearnedProfile([])
  assert.equal(buildPersonalizationBlock(empty), '')

  const p = {
    eventCount: 12,
    cuisines: [{ name: 'Maharashtrian', score: 7 }],
    enjoyedRecipes: [{ title: 'Misal Pav', cuisine: 'Maharashtrian' }],
    likedIngredients: [{ name: 'Spinach', score: 2 }],
    rejectedIngredients: [{ name: 'cauliflower', count: 3 }],
    tiredRecipes: [],
    typicalCookMinutes: 35,
  }
  const block = buildPersonalizationBlock(p)
  assert.ok(block.startsWith('<learned_preferences>'))
  assert.ok(block.includes('Maharashtrian (strongly)'))
  assert.ok(block.includes('Misal Pav'))
  assert.ok(block.includes('about 35 minutes'))
  assert.ok(block.includes('NEVER override'))
})

test('headline describes learning state for UI', () => {
  assert.match(profileHeadline(null), /No cooking history/)
  const p = deriveLearnedProfile([
    ev('recipe_cooked', { title: 'X', cuisine: 'Goan', totalTimeMinutes: 40 }),
  ])
  assert.match(profileHeadline(p), /1 interaction/)
  assert.match(profileHeadline(p), /Goan/)
  assert.match(profileHeadline(p), /~40 min/)
})

test('plan feedback tallies are tracked', () => {
  const p = deriveLearnedProfile([
    ev('plan_feedback', { rating: 5 }),
    ev('plan_feedback', { rating: 4 }),
    ev('plan_feedback', { rating: 1 }),
  ])
  assert.deepEqual(p.planFeedback, { up: 2, down: 1 })
})

test('EVENT_TYPES covers the interaction surface the UI records', () => {
  for (const t of ['recipe_generated', 'recipe_saved', 'recipe_cooked', 'recipe_skipped',
    'meal_replaced', 'recipe_rated', 'recipe_liked', 'recipe_disliked',
    'ingredient_rejected', 'plan_feedback']) {
    assert.ok(EVENT_TYPES.includes(t), `missing ${t}`)
  }
})
