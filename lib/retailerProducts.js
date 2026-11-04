import fs from 'fs/promises'
import path from 'path'
import { normalizeUnit, unitDef } from './units.js'

const DATA_DIR = path.join(process.cwd(), 'data')
const PRODUCTS_FILE = path.join(DATA_DIR, 'retailerProducts.json')

/**
 * User-verified retailer product catalog (data/retailerProducts.json).
 *
 * Entries are prices/products the USER confirmed on the retailer's site for
 * THEIR pin code — the only "real" price data we are allowed to have without
 * an official retailer API. Every entry carries its provenance (pincode,
 * verifiedAt) so the UI can honestly mark staleness and PIN mismatches.
 *
 * Shape:
 * { id, retailerId, canonical, name, brand, packageAmount, packageUnit,
 *   packageBase, packageDim, price, mrp, url, searchTerm, pincode,
 *   availability: 'user-confirmed'|'unknown', verifiedAt, notes }
 */

const RETAILER_ID_RE = /^[a-z][a-z0-9-]{0,30}$/
const PIN_RE = /^[1-8][0-9]{5}$/

const cleanStr = (v, max = 80) =>
  typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').trim().slice(0, max) : ''

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.min(n, 1_000_000) : null
}

/** Validate + normalize one catalog entry. Throws with a readable message. */
export function normalizeProductEntry(raw, id) {
  if (!raw || typeof raw !== 'object') throw new Error('Product must be an object.')

  const retailerId = cleanStr(raw.retailerId, 30).toLowerCase()
  if (!RETAILER_ID_RE.test(retailerId)) throw new Error('Unknown retailer.')

  const name = cleanStr(raw.name, 100)
  if (!name) throw new Error('Product name is required.')

  const canonical = cleanStr(raw.canonical, 80).toLowerCase()
  if (!canonical) throw new Error('Product must be linked to an ingredient.')

  const packageAmount = num(raw.packageAmount)
  if (!packageAmount) throw new Error('Package size must be a positive number.')
  const packageUnit = normalizeUnit(raw.packageUnit)
  const def = unitDef(packageUnit)
  if (!def) throw new Error('Package unit must be one of g, kg, ml, L, piece.')

  const price = num(raw.price)
  if (price == null) throw new Error('Price must be a positive number.')

  const mrpRaw = Number(raw.mrp)
  const mrp = Number.isFinite(mrpRaw) && mrpRaw >= price ? Math.round(mrpRaw * 100) / 100 : null

  let url = cleanStr(raw.url, 300)
  if (url && !/^https:\/\//.test(url)) url = ''

  const pincode = PIN_RE.test(cleanStr(raw.pincode, 6)) ? cleanStr(raw.pincode, 6) : ''

  return {
    id: id || `rp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    retailerId,
    canonical,
    name,
    brand: cleanStr(raw.brand, 60),
    packageAmount,
    packageUnit,
    packageBase: Math.round(packageAmount * def.base * 1000) / 1000,
    packageDim: def.dim,
    price: Math.round(price * 100) / 100,
    mrp,
    url,
    searchTerm: cleanStr(raw.searchTerm, 60) || canonical,
    pincode,
    availability: raw.availability === 'user-confirmed' ? 'user-confirmed' : 'unknown',
    verifiedAt:
      typeof raw.verifiedAt === 'string' && !Number.isNaN(Date.parse(raw.verifiedAt))
        ? raw.verifiedAt
        : new Date().toISOString(),
    notes: cleanStr(raw.notes, 120),
  }
}

async function readAll() {
  try {
    const data = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf-8'))
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

async function writeAll(products) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8')
}

export async function listProducts({ retailerId, canonical } = {}) {
  const all = await readAll()
  return all.filter(
    (p) =>
      (!retailerId || p.retailerId === retailerId) && (!canonical || p.canonical === canonical)
  )
}

export async function getEntry(id) {
  return (await readAll()).find((p) => p.id === id) || null
}

export async function addProduct(raw) {
  const entry = normalizeProductEntry(raw)
  const products = await readAll()
  // Merge duplicates: same retailer + ingredient + name + package size.
  const dup = products.find(
    (p) =>
      p.retailerId === entry.retailerId &&
      p.canonical === entry.canonical &&
      p.name.toLowerCase() === entry.name.toLowerCase() &&
      p.packageBase === entry.packageBase
  )
  if (dup) {
    Object.assign(dup, {
      price: entry.price,
      mrp: entry.mrp,
      brand: entry.brand || dup.brand,
      url: entry.url || dup.url,
      pincode: entry.pincode || dup.pincode,
      availability: entry.availability,
      verifiedAt: entry.verifiedAt,
      notes: entry.notes || dup.notes,
    })
    await writeAll(products)
    return dup
  }
  products.unshift(entry)
  await writeAll(products.slice(0, 500))
  return entry
}

export async function updateProduct(id, updates) {
  const products = await readAll()
  const index = products.findIndex((p) => p.id === id)
  if (index === -1) return null
  const merged = normalizeProductEntry(
    { ...products[index], ...updates, verifiedAt: updates?.reverified ? new Date().toISOString() : products[index].verifiedAt },
    id
  )
  products[index] = merged
  await writeAll(products)
  return merged
}

export async function deleteProduct(id) {
  const products = (await readAll()).filter((p) => p.id !== id)
  await writeAll(products)
  return products
}
