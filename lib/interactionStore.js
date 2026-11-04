import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const INTERACTIONS_FILE = path.join(DATA_DIR, 'interactions.json');

/**
 * Interaction store — the raw behavioural signal the personalization engine
 * learns from. Deliberately SEPARATE from household.json: the household
 * profile is what the user explicitly saved; this file is what the app
 * observed. Resetting learning never touches saved preferences, and saving
 * preferences never fabricates history.
 *
 * Single-user deployment (same as every other store here); owner-keyed shape
 * so a future auth layer can scope records without schema surgery.
 */

const MAX_EVENTS = 500;

/** Whitelisted interaction types — anything else is rejected, never guessed. */
export const EVENT_TYPES = [
  'recipe_generated',
  'recipe_saved',
  'recipe_cooked',
  'recipe_skipped',
  'meal_replaced',
  'recipe_rated',
  'recipe_liked',
  'recipe_disliked',
  'ingredient_rejected',
  'plan_feedback',
];

const cleanStr = (v, max = 120) =>
  typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').trim().slice(0, max) : '';

const cleanStrList = (v, max = 40) =>
  Array.isArray(v)
    ? v.map((s) => cleanStr(s, 80)).filter(Boolean).slice(0, max)
    : [];

/**
 * Validate + normalize one interaction event. Returns null when unusable.
 * @param {object} raw
 */
export function normalizeEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const type = EVENT_TYPES.includes(raw.type) ? raw.type : null;
  if (!type) return null;

  const rating = Number(raw.rating);

  const totalMinutes = parseInt(raw.totalTimeMinutes, 10);

  const event = {
    type,
    title: cleanStr(raw.title, 120),
    dishName: cleanStr(raw.dishName, 80),
    cuisine: cleanStr(raw.cuisine, 60),
    mealType: cleanStr(raw.mealType, 20),
    ingredients: cleanStrList(raw.ingredients),
    fromIngredient: cleanStr(raw.fromIngredient, 80),
    toIngredient: cleanStr(raw.toIngredient, 80),
    totalTimeMinutes:
      Number.isFinite(totalMinutes) ? Math.min(600, Math.max(1, totalMinutes)) : null,
    rating:
      ['recipe_rated', 'plan_feedback'].includes(type) && Number.isFinite(rating)
        ? Math.min(5, Math.max(1, Math.round(rating)))
        : null,
    note: cleanStr(raw.note, 200),
    createdAt: raw.createdAt || new Date().toISOString(),
  };

  // Events that are meaningless without a subject.
  if (!event.title && !event.dishName && !event.fromIngredient && type !== 'plan_feedback') {
    return null;
  }
  // Ratings require a rating; feedback requires a rating.
  if ((type === 'recipe_rated' || type === 'plan_feedback') && event.rating == null) return null;

  return event;
}

async function readAll() {
  try {
    const data = JSON.parse(await fs.readFile(INTERACTIONS_FILE, 'utf-8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeAll(events) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(INTERACTIONS_FILE, JSON.stringify(events, null, 2), 'utf-8');
}

/** @returns {Promise<Array>} newest-last, bounded to MAX_EVENTS */
export async function listInteractions() {
  const events = await readAll();
  return events.slice(-MAX_EVENTS);
}

/** Record one normalized event (or a small batch). Returns the stored events. */
export async function recordInteractions(rawEvents) {
  const list = (Array.isArray(rawEvents) ? rawEvents : [rawEvents])
    .map(normalizeEvent)
    .filter(Boolean)
    .slice(0, 10);
  if (!list.length) return [];

  const events = await readAll();
  const stored = list.map((e) => ({ ...e, createdAt: new Date().toISOString() }));
  const merged = [...events, ...stored].slice(-MAX_EVENTS); // bounded, oldest trimmed
  await writeAll(merged);
  return stored;
}

/** Reset all learned history. Saved household preferences are untouched. */
export async function clearInteractions() {
  await writeAll([]);
  return true;
}
