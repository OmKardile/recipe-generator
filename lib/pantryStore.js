import fs from 'fs/promises';
import path from 'path';
import { normalizeUnit, unitDef } from './units';

const DATA_DIR = path.join(process.cwd(), 'data');
const PANTRY_FILE = path.join(DATA_DIR, 'pantry.json');

/**
 * Pantry store — what the household already owns. Quantities are only ever
 * DEDUCTED through the explicit /api/pantry/consume endpoint (user-confirmed
 * "I cooked this"), never silently by plan generation.
 */

const CATEGORIES = ['produce', 'dairy', 'meat', 'grains', 'spices', 'bakery', 'frozen', 'beverages', 'other'];

const clampNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 100000) : fallback;
};

const cleanStr = (v, max = 80) =>
  typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').trim().slice(0, max) : '';

const isoDateOrNull = (v) => {
  const s = cleanStr(v, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

export function normalizePantryItem(raw, id) {
  const name = cleanStr(raw?.name, 80);
  if (!name) return null;
  const unit = normalizeUnit(raw?.unit) || cleanStr(raw?.unit, 20) || 'piece';
  const category = CATEGORIES.includes(raw?.category) ? raw.category : 'other';
  return {
    id: id || `pan_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    name,
    quantity: clampNum(raw?.quantity),
    unit,
    category,
    purchaseDate: isoDateOrNull(raw?.purchaseDate),
    expiryDate: isoDateOrNull(raw?.expiryDate),
    storage: cleanStr(raw?.storage, 40),
    addedAt: raw?.addedAt || new Date().toISOString(),
  };
}

async function readAll() {
  try {
    const data = JSON.parse(await fs.readFile(PANTRY_FILE, 'utf-8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeAll(items) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(PANTRY_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

export async function getPantry() {
  return readAll();
}

/** Add one item; merges quantity when name+unit already present. */
export async function addPantryItem(raw) {
  const item = normalizePantryItem(raw);
  if (!item) throw new Error('Pantry item needs a name.');

  const items = await readAll();
  const existing = items.find(
    (i) => i.name.toLowerCase() === item.name.toLowerCase() && i.unit === item.unit
  );
  if (existing) {
    existing.quantity = Math.round((existing.quantity + item.quantity) * 100) / 100;
    existing.expiryDate = item.expiryDate || existing.expiryDate;
    existing.purchaseDate = item.purchaseDate || existing.purchaseDate;
    existing.category = item.category !== 'other' ? item.category : existing.category;
    await writeAll(items);
    return existing;
  }
  items.unshift(item);
  await writeAll(items);
  return item;
}

export async function updatePantryItem(id, updates) {
  const items = await readAll();
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) return null;
  const merged = normalizePantryItem(
    { ...items[index], ...updates, addedAt: items[index].addedAt },
    id
  );
  if (!merged) throw new Error('Pantry item needs a name.');
  items[index] = merged;
  await writeAll(items);
  return merged;
}

export async function deletePantryItem(id) {
  const items = (await readAll()).filter((i) => i.id !== id);
  await writeAll(items);
  return items;
}

/**
 * Explicit, user-confirmed consumption: subtract the given quantities.
 * @param {Array<{name: string, amount: number, unit: string}>} consumedLines
 * @returns {{updated: Array, skipped: string[]}} skipped = unconvertible leftovers of unit mismatch
 */
export async function consumeFromPantry(consumedLines) {
  const items = await readAll();
  const skipped = [];

  for (const line of Array.isArray(consumedLines) ? consumedLines : []) {
    const target = items.find(
      (i) =>
        i.name.toLowerCase().startsWith(String(line.name || '').toLowerCase().slice(0, 12)) ||
        String(line.name || '').toLowerCase().startsWith(i.name.toLowerCase().slice(0, 12))
    );
    if (!target) continue;

    const fromDef = unitDef(line.unit);
    const toDef = unitDef(target.unit);
    if (fromDef && toDef && fromDef.dim === toDef.dim) {
      const consumedInTargetUnit = (Number(line.amount) * fromDef.base) / toDef.base;
      target.quantity = Math.max(0, Math.round((target.quantity - consumedInTargetUnit) * 100) / 100);
    } else {
      // Incompatible units (500 g rice vs pantry in kg? handled; g vs pieces? no) —
      // flag rather than guess.
      skipped.push(`${line.name} (unit mismatch)`);
    }
  }

  await writeAll(items);
  return { updated: items, skipped };
}

/** Days until each item's expiry (null when no date). Items expiring soon first. */
export function pantryExpiryInfo(items, todayStr = new Date().toISOString().slice(0, 10)) {
  const today = new Date(`${todayStr}T00:00:00Z`).getTime();
  return (items || [])
    .filter((i) => i.expiryDate)
    .map((i) => {
      const days = Math.round((new Date(`${i.expiryDate}T00:00:00Z`).getTime() - today) / 86400000);
      return { ...i, daysToExpiry: days };
    })
    .filter((i) => i.daysToExpiry <= 3)
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry);
}
