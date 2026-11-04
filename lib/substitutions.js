import { canonicalName } from './units.js';
import { ingredientViolatesRestrictions } from './restrictionCheck.js';

/**
 * Recipe substitution engine (roadmap P0-3).
 *
 * A curated, high-confidence table of swaps that actually work in Indian home
 * kitchens. Every option carries FOUR honest notes — taste, texture,
 * nutrition, cooking — because a substitution is NEVER assumed to be
 * nutritionally identical, and quantity adjustments use an explicit ratio.
 *
 * Unknown ingredients are NOT guessed here: the /api/substitutions route
 * falls back to a schema-validated AI suggestion, clearly labelled as such.
 *
 * Pure functions, client-safe, fully unit-testable.
 */

/* ratio = multiply the original amount by this to get the substitute amount. */
const TABLE = {
  paneer: [
    {
      to: 'Tofu (firm)', ratio: 1,
      taste: 'Milder than paneer; absorbs masala well, so season the marinade generously.',
      texture: 'Slightly springier and less creamy; press it first for a firmer bite.',
      nutrition: 'Not identical — tofu is leaner (more protein, far less fat) and has no dairy calcium.',
      cooking: 'Pan-fry or marinate like paneer; needs a little longer to brown.',
    },
    {
      to: 'Soya chunks (rehydrated)', ratio: 0.5,
      taste: 'Neutral and chewy; takes on gravy flavours readily.',
      texture: 'Meatier and chewier than paneer.',
      nutrition: 'Not identical — much higher protein per gram dry; boil and squeeze before use.',
      cooking: 'Soak in hot salted water 10 min, squeeze dry, then use; dry weight is about half the paneer weight.',
    },
  ],
  milk: [
    {
      to: 'Soy milk (unsweetened)', ratio: 1,
      taste: 'Closest to dairy milk in chai and savoury dishes.',
      texture: 'Similar body; curdles acceptably for chai or kadhi-style uses.',
      nutrition: 'Not identical — comparable protein, but no lactose or dairy calcium unless fortified.',
      cooking: 'Stir while heating; avoid hard boils to prevent splitting.',
    },
    {
      to: 'Oat milk (unsweetened)', ratio: 1,
      taste: 'Slightly sweet, oaty undertone; fine in desserts and porridge.',
      texture: 'A touch thinner; can split in very hot chai.',
      nutrition: 'Not identical — lower protein than dairy milk.',
      cooking: 'Add off the heat or warm gently; best in sweet dishes.',
    },
    {
      to: 'Almond milk (unsweetened)', ratio: 1,
      taste: 'Nutty and light; good in kheer-style sweets.',
      texture: 'Thinner than milk; sauces may need a little cornflour to thicken.',
      nutrition: 'Not identical — low protein; not safe for nut-allergic households.',
      cooking: 'Warm gently; avoid boiling in acidic gravies.',
    },
  ],
  yogurt: [
    {
      to: 'Coconut yogurt (unsweetened)', ratio: 1,
      taste: 'Adds a mild coconut note; works in raita-style sides.',
      texture: 'Slightly looser; whisk before use.',
      nutrition: 'Not identical — higher fat, no dairy protein or calcium.',
      cooking: 'Do not boil; fold in at the end like regular curd.',
    },
    {
      to: 'Soy yogurt (unsweetened)', ratio: 1,
      taste: 'Closest tang to dairy curd in marinades and kadhi.',
      texture: 'Very similar body when whisked.',
      nutrition: 'Not identical — similar protein, no dairy calcium unless fortified.',
      cooking: 'Behaves like curd in tandoori marinades; still split-prone at a hard boil.',
    },
  ],
  cream: [
    {
      to: 'Coconut cream', ratio: 1,
      taste: 'Sweet coconut richness; excellent in korma and south-Indian curries.',
      texture: 'Thick and glossy like cream.',
      nutrition: 'Not identical — mostly saturated plant fat, no dairy protein.',
      cooking: 'Stir in at the end and simmer briefly; do not boil hard.',
    },
    {
      to: 'Cashew paste (soaked, ground)', ratio: 1,
      taste: 'Nutty richness that mirrors Mughlai gravies.',
      texture: 'Silky when blended fine with a little water.',
      nutrition: 'Not identical — adds protein along with fat; not safe for nut allergies.',
      cooking: 'Soak 20 min, blend smooth; add early and simmer so it thickens the gravy.',
    },
  ],
  butter: [
    {
      to: 'Ghee', ratio: 1,
      taste: 'Richer, nuttier; classic in Indian cooking.',
      texture: 'Clear when warm; slightly grainy when set.',
      nutrition: 'Not identical — nearly pure fat, minor lactose/protein removed.',
      cooking: 'Use slightly less if the dish is fat-sensitive; higher smoke point.',
    },
    {
      to: 'Coconut oil', ratio: 1,
      taste: 'Light coconut note; suits South-Indian temperings.',
      texture: 'Solid below ~24°C, clear when warm.',
      nutrition: 'Not identical — plant saturated fat, no dairy.',
      cooking: 'Swaps cleanly for tadka and baking; flavour comes through.',
    },
  ],
  ghee: [
    {
      to: 'Butter (unsalted)', ratio: 1,
      taste: 'Milkier, less nutty than ghee.',
      texture: 'Foams when heated (milk solids).',
      nutrition: 'Not identical — contains milk solids and a little water.',
      cooking: 'Lower smoke point — watch heat in tadka; not dairy-free.',
    },
    {
      to: 'Coconut oil', ratio: 1,
      taste: 'Coconut sweetness; traditional in coastal kitchens.',
      texture: 'Clear oil when warm.',
      nutrition: 'Not identical — plant fat, no dairy components.',
      cooking: 'Fully vegan; works everywhere ghee is melted, not where solid ghee is layered.',
    },
  ],
  chicken: [
    {
      to: 'Paneer', ratio: 1,
      taste: 'Mild and creamy; takes tandoori marinades beautifully.',
      texture: 'Firm-custard bite instead of meat fibres.',
      nutrition: 'Not identical — similar protein, more fat, no iron like meat.',
      cooking: 'Cut similar-sized pieces; shorten cooking — paneer only needs browning.',
    },
    {
      to: 'Soya chunks (rehydrated)', ratio: 0.5,
      taste: 'Neutral; soaks up masala like keema-style dishes.',
      texture: 'Chewy, mince-like when crumbled.',
      nutrition: 'Not identical — very high protein, high fibre, no fat.',
      cooking: 'Rehydrate, squeeze, crumble; dry weight is about half the chicken weight.',
    },
    {
      to: 'Mushrooms (button or oyster)', ratio: 1,
      taste: 'Umami-rich; excellent in chilli and Indo-Chinese sauces.',
      texture: 'Meaty when browned properly.',
      nutrition: 'Not identical — far less protein; pair with dal for protein.',
      cooking: 'Sear on high heat so they brown, not steam.',
    },
  ],
  mutton: [
    {
      to: 'Raw jackfruit (kathal)', ratio: 1,
      taste: 'Takes spices like a sponge; the classic veg "meat" of India.',
      texture: 'Fibrous and pull-apart when cooked soft.',
      nutrition: 'Not identical — much lower protein; add dal or soya to compensate.',
      cooking: 'Pressure-cook like mutton until shredding; season boldly.',
    },
    {
      to: 'Soya chunks (rehydrated)', ratio: 0.5,
      taste: 'Neutral; best in rogan-style thick gravies.',
      texture: 'Chewy bite that reads as meaty.',
      nutrition: 'Not identical — high protein, zero fat.',
      cooking: 'Dry weight is about half the mutton weight; squeeze well before browning.',
    },
  ],
  egg: [
    {
      to: 'Flax egg (ground flaxseed + water)', ratio: 1,
      taste: 'Neutral; invisible in bhaji and cutlet binders.',
      texture: 'Gel-like binder, not a set-custard bite.',
      nutrition: 'Not identical — adds omega-3 and fibre instead of complete egg protein.',
      cooking: '1 tbsp ground flax + 3 tbsp warm water, rest 5 min until gelled. Binding only — it will not make an omelette.',
    },
    {
      to: 'Paneer (crumbled)', ratio: 1,
      taste: 'Clean dairy note; natural in bhurji-style dishes.',
      texture: 'Soft crumble.',
      nutrition: 'Not identical — more fat and protein than one egg.',
      cooking: 'Great for egg-bhurji style scrambles with the same masala base.',
    },
  ],
  honey: [
    {
      to: 'Maple syrup', ratio: 1,
      taste: 'Gentle caramel sweetness; vegan-friendly.',
      texture: 'Similar pour; slightly thinner.',
      nutrition: 'Not identical — different sugar profile, similar calories.',
      cooking: 'Add off the heat where possible; fine in dressings and drizzles.',
    },
  ],
  sugar: [
    {
      to: 'Jaggery', ratio: 1,
      taste: 'Deeper, caramel-earthy sweetness.',
      texture: 'Coarse; dissolves slower.',
      nutrition: 'Not identical — traces of minerals, similar calories.',
      cooking: 'Grate or dissolve in warm liquid first; classic in dal and chutney.',
    },
  ],
  'coconut milk': [
    {
      to: 'Cashew paste (soaked, ground)', ratio: 1,
      taste: 'Nutty creaminess without coconut sweetness.',
      texture: 'Silky when blended fine.',
      nutrition: 'Not identical — more protein than coconut milk, similar fat.',
      cooking: 'Soak, blend with warm water to a milk-like pour; not safe for nut allergies.',
    },
    {
      to: 'Cream (or malai)', ratio: 1,
      taste: 'Richer, dairy-forward; suits North-Indian gravies.',
      texture: 'Thicker body.',
      nutrition: 'Not identical — dairy fat with less sweetness.',
      cooking: 'Not dairy-free; add at the end and simmer gently.',
    },
  ],
  atta: [
    {
      to: 'Gluten-free atta mix (rice + besan)', ratio: 1,
      taste: 'Slightly grainy, nutty; fine for everyday rotis.',
      texture: 'Less stretch — doughs crack instead of rolling thin.',
      nutrition: 'Not identical — protein quality differs; often more fibre.',
      cooking: 'Rest the dough 15 min, roll between parchment, handle gently.',
    },
    {
      to: 'Jowar (sorghum) flour', ratio: 1,
      taste: 'Mildly sweet, earthy; classic jowar roti.',
      texture: 'No gluten — pat by hand or roll between sheets.',
      nutrition: 'Not identical — different protein and micronutrient profile.',
      cooking: 'Use warm water for the dough; cook on medium heat.',
    },
  ],
  sooji: [
    {
      to: 'Rice rava', ratio: 1,
      taste: 'Neutral; upma stays light.',
      texture: 'Similar grain size when using medium rava.',
      nutrition: 'Not identical — rice is lower in protein and fibre than wheat.',
      cooking: 'Roast the same way before adding hot water.',
    },
    {
      to: 'Besan (for savoury batters)', ratio: 1,
      taste: 'Deeper, earthier; great in chilla-style dishes.',
      texture: 'Finer grain — batters turn denser.',
      nutrition: 'Not identical — much more protein than sooji.',
      cooking: 'Best in chilla/pakora directions rather than upma.',
    },
  ],
  'toor dal': [
    {
      to: 'Moong dal (split, yellow)', ratio: 1,
      taste: 'Lighter, sweeter dal.',
      texture: 'Softer; cooks much faster.',
      nutrition: 'Not identical — comparable protein, a little less fibre.',
      cooking: 'Cooks in roughly half the whistles; watch that it does not turn mushy.',
    },
    {
      to: 'Masoor dal (red)', ratio: 1,
      taste: 'Earthier, heartier.',
      texture: 'Softer grain that breaks down into a creamy dal.',
      nutrition: 'Not identical — similar protein, slightly different iron and fibre.',
      cooking: 'Cooks quickly; ideal when you are short on time.',
    },
  ],
  'moong dal': [
    {
      to: 'Toor dal', ratio: 1,
      taste: 'Nutty classic sambar-rasam flavour.',
      texture: 'Firmer grain; holds shape more.',
      nutrition: 'Not identical — a little more fibre.',
      cooking: 'Needs a couple more whistles than moong.',
    },
    {
      to: 'Masoor dal (red)', ratio: 1,
      taste: 'Earthier, creamier when whisked.',
      texture: 'Breaks down faster.',
      nutrition: 'Not identical — similar protein.',
      cooking: 'Shorter cook time; great for quick dals.',
    },
  ],
  tofu: [
    {
      to: 'Paneer', ratio: 1,
      taste: 'Richer, creamier, dairy-sweet.',
      texture: 'Softer-firm with a custard bite.',
      nutrition: 'Not identical — more fat, dairy calcium, less protein per gram.',
      cooking: 'Same treatment — marinate and brown briefly.',
    },
  ],
};

/** Canonical aliases → table keys. */
const KEY_ALIASES = {
  'cottage cheese': 'paneer',
  curd: 'yogurt',
  yoghurt: 'yogurt',
  dahi: 'yogurt',
  'heavy cream': 'cream',
  malai: 'cream',
  lamb: 'mutton',
  'wheat flour': 'atta',
  'wheat atta': 'atta',
  semolina: 'sooji',
  'split pigeon pea': 'toor dal',
  'yellow moong dal': 'moong dal',
  'bean curd': 'tofu',
};

/** Curated options for an ingredient; filtered against household restrictions. */
export function getSubstitutions(ingredientName, restrictions = null) {
  const canonical = canonicalName(ingredientName);
  if (!canonical) return [];
  const key = KEY_ALIASES[canonical] || (TABLE[canonical] ? canonical : null);
  if (!key) return [];

  const options = TABLE[key].filter(
    (o) => !restrictions || !ingredientViolatesRestrictions(o.to, restrictions)
  );
  return options.map((o) => ({ ...o, source: 'curated', replaces: String(ingredientName).trim() }));
}

/**
 * Return the substituted ingredient object (does NOT mutate the array).
 * Ratio applies only to numeric amounts; "to taste" passes through.
 */
export function substitutedIngredient(ingredient, option) {
  if (!ingredient || !option) return ingredient;
  const amount =
    typeof ingredient.amount === 'number' && ingredient.amount > 0 && Number.isFinite(option.ratio)
      ? Math.round(ingredient.amount * option.ratio * 100) / 100
      : ingredient.amount;
  const note = [ingredient.note, `substituted for ${ingredient.name}`].filter(Boolean).join(' — ');
  return { ...ingredient, name: option.to, amount, note };
}

/** Apply a map of {index → option} to an ingredient array. */
export function applySubstitutions(ingredients, applied) {
  if (!Array.isArray(ingredients) || !applied || applied.size === 0) return ingredients || [];
  return ingredients.map((ing, index) => {
    const option = applied.get(index);
    return option ? substitutedIngredient(ing, option) : ing;
  });
}

/** Exposed for data-integrity tests. */
export const SUBSTITUTION_TABLE = TABLE;
