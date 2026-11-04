import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validateMealAgainstRestrictions, normalizeAllergyLabel,
} from '../lib/restrictionCheck.js'

const meal = (ingredients, title = 'Test dish') => ({
  title,
  dishName: title,
  ingredients: ingredients.map((name) => ({ name })),
})

test('allergies are hard exclusions checked on ingredients AND title', () => {
  const check = validateMealAgainstRestrictions(meal(['milk', 'rice'], 'Kheer'), { allergies: ['dairy'] })
  assert.equal(check.ok, false)
  assert.ok(check.violations.some((v) => v.includes('dairy')))

  const titleOnly = validateMealAgainstRestrictions(meal(['rice', 'sugar'], 'Palak Paneer'), { allergies: ['dairy'] })
  assert.equal(titleOnly.ok, false)
})

test('whole-word matching: egg never flags eggplant', () => {
  const check = validateMealAgainstRestrictions(meal(['eggplant', 'tomato'], 'Bhartha'), { allergies: ['egg'] })
  assert.equal(check.ok, true)
  const realEgg = validateMealAgainstRestrictions(meal(['egg', 'onion'], 'Omelette'), { allergies: ['egg'] })
  assert.equal(realEgg.ok, false)
})

test('gluten whitelist: rice flour and besan are not gluten', () => {
  const check = validateMealAgainstRestrictions(meal(['rice flour', 'besan'], 'Chilla'), { allergies: ['gluten'] })
  assert.equal(check.ok, true)
  const bad = validateMealAgainstRestrictions(meal(['atta'], 'Roti'), { allergies: ['gluten'] })
  assert.equal(bad.ok, false)
})

test('diets block violating ingredients', () => {
  const veg = validateMealAgainstRestrictions(meal(['chicken', 'onion'], 'Curry'), { diet: 'vegetarian' })
  assert.equal(veg.ok, false)
  const vegan = validateMealAgainstRestrictions(meal(['paneer', 'tomato'], 'Masala'), { diet: 'vegan' })
  assert.equal(vegan.ok, false)
  const pesc = validateMealAgainstRestrictions(meal(['fish', 'rice'], 'Fish curry'), { diet: 'pescatarian' })
  assert.equal(pesc.ok, true)
  const keto = validateMealAgainstRestrictions(meal(['potato', 'oil'], 'Fries'), { diet: 'keto' })
  assert.equal(keto.ok, false)
})

test('dislikes are excluded like allergies', () => {
  const check = validateMealAgainstRestrictions(meal(['bitter gourd', 'onion']), { dislikes: ['bitter gourd'] })
  assert.equal(check.ok, false)
})

test('allergies are not interchangeable with diet preferences', () => {
  // dairy allergy blocks paneer even with NO diet set…
  assert.equal(validateMealAgainstRestrictions(meal(['paneer']), { allergies: ['dairy'] }).ok, false)
  // …and a vegetarian diet blocks chicken even with no allergies.
  assert.equal(validateMealAgainstRestrictions(meal(['chicken']), { diet: 'vegetarian' }).ok, false)
  // dairy allergy blocks a dish a vegetarian diet would happily allow.
  assert.equal(
    validateMealAgainstRestrictions(meal(['paneer']), { diet: 'vegetarian', allergies: ['dairy'] }).ok,
    false
  )
})

test('friendly allergy labels map to families', () => {
  assert.equal(normalizeAllergyLabel('lactose'), 'dairy')
  assert.equal(normalizeAllergyLabel('Wheat'), 'gluten')
  assert.equal(normalizeAllergyLabel('tree nuts'), 'nuts')
  assert.equal(normalizeAllergyLabel('something custom'), 'something custom')
})

test('custom free-text allergies still block', () => {
  const check = validateMealAgainstRestrictions(meal(['banana flower', 'oil']), { allergies: ['banana'] })
  assert.equal(check.ok, false)
})

test('plant dairy analogues are not flagged as dairy allergens', () => {
  const check = (ingredients) =>
    validateMealAgainstRestrictions(
      { title: 'Curry', dishName: '', ingredients: ingredients.map((name) => ({ name })) },
      { allergies: ['dairy'] }
    )
  assert.equal(check(['coconut milk', 'rice']).ok, true)
  assert.equal(check(['Soy milk (unsweetened)']).ok, true)
  assert.equal(check(['peanut butter']).ok, true)
  assert.equal(check(['Coconut cream']).ok, true)
  // Real dairy is still blocked
  assert.equal(check(['milk', 'rice']).ok, false)
  assert.equal(check(['Paneer']).ok, false)
  assert.equal(check(['condensed milk']).ok, false)
})

test('vegan meals with plant dairy analogues pass; real dairy still blocked', () => {
  const check = (ingredients, diet = 'vegan') =>
    validateMealAgainstRestrictions(
      { title: 'Curry', dishName: '', ingredients: ingredients.map((name) => ({ name })) },
      { diet }
    )
  assert.equal(check(['coconut milk', 'tofu', 'rice']).ok, true)
  assert.equal(check(['Soy yogurt', 'besan']).ok, true)
  assert.equal(check(['oat milk']).ok, true)
  assert.equal(check(['oat milk with honey']).ok, false) // honey still caught
  assert.equal(check(['Paneer', 'rice']).ok, false)
  assert.equal(check(['milk']).ok, false)
  assert.equal(check(['ghee']).ok, false)
})
