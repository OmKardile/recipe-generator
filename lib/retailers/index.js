import { DmartReadyProvider } from './dmart.js'
import { getEntry } from '../retailerProducts.js'

/**
 * Retailer registry — the ONLY place that knows which retailers exist.
 * Core meal-planning / grocery logic resolves providers from here and never
 * imports a concrete provider itself. Adding a retailer later = one import,
 * one registry entry, zero changes elsewhere.
 */

const dmart = new DmartReadyProvider({ catalog: { getEntry } })

const REGISTRY = new Map([[dmart.id, dmart]])

/** @returns {RetailerProvider|null} */
export function getRetailerProvider(id) {
  return REGISTRY.get(String(id || '').toLowerCase()) || null
}

export function listRetailers() {
  return [...REGISTRY.values()].map((p) => ({
    id: p.id,
    label: p.label,
    siteUrl: p.siteUrl,
    hasOfficialCatalogueApi: p.hasOfficialCatalogueApi,
  }))
}

export function isSupportedRetailer(id) {
  return REGISTRY.has(String(id || '').toLowerCase())
}
