import test from 'node:test'
import assert from 'node:assert/strict'
import {
  analyzePlanQuality,
  collectMeals,
  detectIngredientReuse,
} from '../lib/planInsights.js'

const meal = (over = {}) => ({
  recipe: {
    title: over.title || 'Dal tadka',
    dishName: over.dishName || over.title || 'Dal tadka',
    cuisine: over.cuisine || 'North Indian',
    prepMinutes: over.prep ?? 10,
    cookMinutes: over.cook ?? 20,
    difficulty: over.difficulty || 'Easy',
    servings: over.servings || 2,
    nutrition: over.nutrition || null,
    ingredients: over.ingredients || [{ name: 'Toor dal', amount: 1, unit: 'cup' }],
  },
  servings: over.mealServings || over.servings || 2,
  makesLeftovers: Boolean(over.makesLeftovers),
  leftoverNote: over.leftoverNote || null,
})

const plan = (days) => ({ days, configSnapshot: { maxPrepMinutes: 20, maxCookMinutes: 45 } })
const day = (date, meals) => ({ date, meals })

test('collectMeals flattens plan with serving factors and minutes', () => {
  const meals = collectMeals(plan([day('2026-11-04', { lunch: meal({ servings: 4, mealServings: 8 }) })]))
  assert.equal(meals.length, 1)
  assert.equal(meals[0].minutes, 30)
  assert.equal(meals[0].servingFactor, 2)
})

test('variety scores full marks for all-unique dishes and flags repeats', () => {
  const unique = analyzePlanQuality({
    plan: plan([
      day('2026-11-04', { lunch: meal({ title: 'A', dishName: 'A', cuisine: 'North Indian' }) }),
      day('2026-11-05', { lunch: meal({ title: 'B', dishName: 'B', cuisine: 'South Indian' }) }),
    ]),
  })
  const variety = unique.dimensions.find((d) => d.key === 'variety')
  assert.equal(variety.score, 100)
  assert.match(variety.explanation, /no repeats/)

  const repeated = analyzePlanQuality({
    plan: plan([
      day('2026-11-04', { lunch: meal({ title: 'A', dishName: 'A' }) }),
      day('2026-11-05', { lunch: meal({ title: 'A', dishName: 'A' }) }),
    ]),
  })
  const v2 = repeated.dimensions.find((d) => d.key === 'variety')
  assert.ok(v2.score < 100)
  assert.match(v2.explanation, /repeated: a/)
  assert.ok(repeated.insights.some((i) => i.startsWith('Repetition')))
})

test('pantry fit scores stocked ingredients and never invents coverage', () => {
  const p = analyzePlanQuality({
    plan: plan([
      day('2026-11-04', {
        lunch: meal({
          ingredients: [
            { name: 'Toor dal', amount: 1, unit: 'cup' },
            { name: 'Onion', amount: 2, unit: 'piece' },
          ],
        }),
      }),
    ]),
    pantry: [{ name: 'toor dal', quantity: 2, unit: 'cup' }],
  })
  const pantryDim = p.dimensions.find((d) => d.key === 'pantry')
  assert.equal(pantryDim.score, 50) // 1 of 2 covered
  assert.match(pantryDim.explanation, /1 of 2/)
})

test('budget stays null without priced data — honest missing-data note', () => {
  const p = analyzePlanQuality({
    plan: plan([day('2026-11-04', { lunch: meal() })]),
    household: { weeklyBudget: 2000 },
  })
  const budget = p.dimensions.find((d) => d.key === 'budget')
  assert.equal(budget.score, null)
  assert.match(budget.missingData, /never invent prices/)

  const priced = analyzePlanQuality({
    plan: plan([day('2026-11-04', { lunch: meal() })]),
    household: { weeklyBudget: 2000 },
    cost: { total: 1500, budget: 2000 },
  })
  const budget2 = priced.dimensions.find((d) => d.key === 'budget')
  assert.equal(budget2.score, 100)

  const over = analyzePlanQuality({
    plan: plan([day('2026-11-04', { lunch: meal() })]),
    household: { weeklyBudget: 1000 },
    cost: { total: 1500, budget: 1000 },
  })
  assert.equal(over.dimensions.find((d) => d.key === 'budget').score, 67) // 100/1.5
})

test('balance requires nutrition data and counts protein-forward days', () => {
  const noNutrition = analyzePlanQuality({
    plan: plan([day('2026-11-04', { lunch: meal() })]),
  })
  const balance = noNutrition.dimensions.find((d) => d.key === 'balance')
  assert.equal(balance.score, null)
  assert.match(balance.missingData, /AI estimates/)

  const withNutrition = analyzePlanQuality({
    plan: plan([
      day('2026-11-04', { lunch: meal({ nutrition: { calories: 400, protein: 18, carbs: 50, fat: 12 } }) }),
      day('2026-11-05', { lunch: meal({ title: 'B', dishName: 'B', nutrition: { calories: 450, protein: 8, carbs: 70, fat: 10 } }) }),
    ]),
  })
  const b2 = withNutrition.dimensions.find((d) => d.key === 'balance')
  assert.equal(b2.score, 50) // protein-forward on 1 of 2 days
  assert.match(b2.explanation, /1 of 2 cooking days/)
})

test('ingredient reuse detection finds shared ingredients across meals', () => {
  const meals = collectMeals(plan([
    day('2026-11-04', {
      lunch: meal({ title: 'A', dishName: 'A', ingredients: [{ name: 'Onion', amount: 1, unit: 'piece' }, { name: 'Tomato', amount: 1, unit: 'piece' }] }),
      dinner: meal({ title: 'B', dishName: 'B', ingredients: [{ name: 'onions', amount: 2, unit: 'piece' }, { name: 'Rice', amount: 1, unit: 'cup' }] }),
    }),
    day('2026-11-05', {
      lunch: meal({ title: 'C', dishName: 'C', ingredients: [{ name: 'Tomatoes (chopped)', amount: 2, unit: 'piece' }] }),
    }),
  ]))
  const reuse = detectIngredientReuse(meals)
  const onion = reuse.find((r) => r.name === 'Onion')
  const tomato = reuse.find((r) => r.name === 'Tomato')
  assert.equal(onion.count, 2)
  assert.equal(tomato.count, 2) // plural + parenthetical canonicalized
  assert.ok(!reuse.some((r) => r.name === 'Rice'))
})

test('overall score is a weighted mean that excludes missing dimensions', () => {
  const p = analyzePlanQuality({
    plan: plan([
      day('2026-11-04', { lunch: meal({ title: 'A', dishName: 'A', ingredients: [{ name: 'Toor dal', amount: 1, unit: 'cup' }] }) }),
      day('2026-11-05', { lunch: meal({ title: 'B', dishName: 'B', ingredients: [{ name: 'toor dal', amount: 1, unit: 'cup' }] }) }),
    ]),
    pantry: [{ name: 'Toor dal', quantity: 2, unit: 'cup' }],
  })
  assert.ok(p.overall != null)
  assert.ok(p.overall >= 0 && p.overall <= 100)
  // budget + balance are null → only variety/pantry/effort contribute
  const scored = p.dimensions.filter((d) => d.score != null)
  assert.deepEqual(scored.map((d) => d.key).sort(), ['effort', 'pantry', 'variety'])
})

test('leftover-friendly dinners and expiry-aware usage surface as insights', () => {
  const p = analyzePlanQuality({
    plan: plan([
      day('2026-11-04', {
        lunch: meal({ title: 'A', dishName: 'A', ingredients: [{ name: 'Spinach', amount: 2, unit: 'cup' }] }),
        dinner: meal({
          title: 'Big Batch Dal', dishName: 'Dal',
          makesLeftovers: true,
          leftoverNote: 'Extra dal thins into soup for tomorrow',
          ingredients: [{ name: 'Toor dal', amount: 2, unit: 'cup' }],
        }),
      }),
    ]),
    pantry: [{ name: 'spinach', quantity: 1, unit: 'cup', expiryDate: '2026-11-06' }],
    todayStr: '2026-11-04',
  })
  assert.equal(p.leftovers.length, 1)
  assert.match(p.leftovers[0].note, /soup/)
  assert.equal(p.expiringUsed[0]?.name, 'spinach')
  assert.ok(p.insights.some((i) => i.startsWith('Uses spinach before it expires')))
  assert.ok(p.insights.some((i) => i.startsWith('2 ingredients') || i.startsWith('1 ingredient')))
  assert.match(p.disclaimer, /not a nutritional assessment/)
})

test('empty plan yields null overall without crashing', () => {
  const p = analyzePlanQuality({ plan: plan([]) })
  assert.equal(p.overall, null)
  assert.equal(p.mealCount, 0)
  assert.deepEqual(p.ingredientReuse, [])
})
