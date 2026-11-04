import { RetailerProvider } from './base.js'

/**
 * DmartReadyProvider — the DMart Ready (India) retailer integration.
 *
 * Investigation summary (2026-11, documented in docs/RETAILER-INTEGRATION.md):
 *   • DMart / Avenue Supermarts publishes NO official developer API, partner
 *     programme or affiliate catalogue access for DMart Ready.
 *   • robots.txt allows general pages but disallows /cart, /checkout, /pdp/,
 *     /orders and friends; search pages are a client-rendered SPA.
 *   • Therefore: no scraping, no private-app endpoints, no third-party
 *     unofficial "DMart APIs" (they resell scraped data — not permitted).
 *
 * What this provider DOES do (the clean-alternative architecture):
 *   • serviceability + fulfilment options with honest unverified status and
 *     user-confirmed serviceability;
 *   • official DMart Ready search links per ingredient (supermarket terms);
 *   • user-verified prices from the local product catalog (clearly labeled
 *     with entry date + PIN the price was entered for);
 *   • a link-based shopping handoff — it NEVER claims a cart was populated
 *     and never collects credentials or payment details.
 */

const DMART_BASE = 'https://www.dmart.in/'
const DMART_SEARCH = 'https://www.dmart.in/search?q='
const DMART_PRODUCT_PREFIXES = ['https://www.dmart.in/product/', 'https://dmart.in/product/']

/** Indian postal PIN codes: 6 digits, first digit 1-8. */
const PIN_RE = /^[1-8][0-9]{5}$/

const NO_API_REASON =
  'DMart Ready has no official public developer API for catalogue prices or serviceability, so this cannot be verified automatically. Prices here are only ever user-confirmed entries or clearly-labeled AI estimates.'

const PRICE_STALE_DAYS = 7

const isStale = (isoString) => {
  if (!isoString) return true
  const age = Date.now() - new Date(isoString).getTime()
  return Number.isFinite(age) && age > PRICE_STALE_DAYS * 86400000
}

export class DmartReadyProvider extends RetailerProvider {
  /** @param {{catalog?: {getEntry(id): Promise<object|null>}}} [deps] */
  constructor({ catalog } = {}) {
    super({
      id: 'dmart',
      label: 'DMart Ready',
      siteUrl: DMART_BASE,
      hasOfficialCatalogueApi: false,
    })
    // Local user-verified product catalog (adapter keeps the provider
    // testable — tests inject a fake, production wires lib/retailerProducts).
    this.catalog = catalog || null
  }

  /* ───────────────────────────── location ───────────────────────────── */

  /**
   * Serviceability check for a PIN code. Without an official API this can
   * only ever be honest: format-valid but UNVERIFIED, with the official
   * link the user can check themselves and confirm in the app.
   */
  async getServiceability(pincode) {
    const pin = String(pincode || '').trim()
    if (!PIN_RE.test(pin)) {
      return {
        retailerId: this.id,
        pincode: pin,
        status: 'invalid',
        verified: false,
        canCheckProgrammatically: false,
        message: 'Enter a valid 6-digit Indian PIN code (first digit 1-8).',
        checkedAt: new Date().toISOString(),
      }
    }
    return {
      retailerId: this.id,
      pincode: pin,
      status: 'unverified',
      verified: false,
      canCheckProgrammatically: false,
      reason: NO_API_REASON,
      message:
        'Cannot verify automatically. Check whether DMart Ready delivers to (or picks up from) this PIN on dmart.in or the DMart Ready app, then confirm it here.',
      officialCheckUrl: DMART_BASE,
      checkedAt: new Date().toISOString(),
    }
  }

  /**
   * Known DMart Ready fulfilment modes. Physical walk-in DMart stores are a
   * SEPARATE concept from online fulfilment and never conflated here.
   */
  async getFulfilmentOptions() {
    return {
      retailerId: this.id,
      verified: false,
      options: [
        {
          id: 'delivery',
          label: 'Home delivery',
          description: 'DMart Ready delivers to serviceable PIN codes.',
          requiresPickupPoint: false,
        },
        {
          id: 'pickup',
          label: 'Pickup from a DMart Ready point',
          description: 'Order online and collect from a chosen pickup point.',
          requiresPickupPoint: true,
        },
      ],
      note:
        'Availability of either mode depends on your PIN — confirm on DMart Ready. Physical walk-in DMart stores are separate from DMart Ready online fulfilment.',
    }
  }

  /* ─────────────────────────── product lookup ───────────────────────── */

  /**
   * Search the DMart Ready catalogue for an ingredient. With no official
   * API this returns official search links (the shopping handoff), built
   * from supermarket-friendly terms resolved by the matching engine.
   */
  async searchProducts(ingredientDescriptor, location) {
    const { displayName, terms = [] } = ingredientDescriptor || {}
    // Supermarket alias terms first ("Fresh Tomatoes", "Atta", "Jeera") —
    // they match how the retailer shelves and searches products; the raw
    // ingredient name is only a final fallback.
    const searchTerms = [...new Set([...terms, displayName].filter(Boolean).map((t) => String(t).trim()).filter(Boolean))]
      .slice(0, 4)
    return {
      retailerId: this.id,
      live: false,
      reason: NO_API_REASON,
      searches: searchTerms.map((term) => ({ term, url: this.buildSearchUrl(term) })),
      siteUrl: DMART_BASE,
      pincode: location?.pincode || null,
    }
  }

  /** Official DMart Ready search URL for a term (public page, no auth). */
  buildSearchUrl(term) {
    return `${DMART_SEARCH}${encodeURIComponent(String(term || '').trim())}`
  }

  /** True when a URL is an official DMart product page we may deep-link to. */
  isValidProductUrl(url) {
    const u = String(url || '').trim()
    return DMART_PRODUCT_PREFIXES.some((prefix) => u.startsWith(prefix))
  }

  async _catalogEntry(productId) {
    if (!this.catalog || !productId) return null
    try {
      const entry = await this.catalog.getEntry(String(productId))
      return entry && entry.retailerId === this.id ? entry : null
    } catch {
      return null
    }
  }

  /** Product details — user-verified catalog entry or honest unverified. */
  async getProductDetails(productId, location) {
    const entry = await this._catalogEntry(productId)
    if (!entry) {
      return { retailerId: this.id, verified: false, reason: NO_API_REASON }
    }
    const pin = location?.pincode ? String(location.pincode) : null
    return {
      retailerId: this.id,
      verified: true,
      priceSource: 'user-verified',
      name: entry.name,
      brand: entry.brand,
      packageAmount: entry.packageAmount,
      packageUnit: entry.packageUnit,
      url: entry.url || null,
      searchUrl: this.buildSearchUrl(entry.searchTerm || entry.name),
      availability: entry.availability,
      pincodeEntered: entry.pincode || null,
      pinMatchesCurrent: pin ? !entry.pincode || entry.pincode === pin : null,
      verifiedAt: entry.verifiedAt,
      priceStale: isStale(entry.verifiedAt),
    }
  }

  async getPrice(productId, location) {
    const entry = await this._catalogEntry(productId)
    if (!entry) {
      return { retailerId: this.id, verified: false, reason: NO_API_REASON }
    }
    const pin = location?.pincode ? String(location.pincode) : null
    return {
      retailerId: this.id,
      verified: true,
      price: entry.price,
      mrp: entry.mrp ?? null,
      priceSource: 'user-verified',
      verifiedAt: entry.verifiedAt,
      priceStale: isStale(entry.verifiedAt),
      pincodeEntered: entry.pincode || null,
      // A price entered for a different PIN is surfaced as such — never
      // silently reused as a local price.
      pinMatchesCurrent: pin ? !entry.pincode || entry.pincode === pin : null,
    }
  }

  /** Availability is never invented — only a user confirmation counts. */
  async getAvailability(productId) {
    const entry = await this._catalogEntry(productId)
    if (!entry || entry.availability !== 'user-confirmed') {
      return { retailerId: this.id, verified: false, status: 'unknown', reason: NO_API_REASON }
    }
    return {
      retailerId: this.id,
      verified: true,
      status: 'in-stock',
      basis: 'user-confirmed at the saved PIN',
      verifiedAt: entry.verifiedAt,
    }
  }

  /* ─────────────────────────── shopping handoff ─────────────────────── */

  /**
   * Build the shopping handoff for selected products. There is no official
   * cart API, so `canTransferCart` is false and every product gets its
   * official DMart link (product URL when known, search URL otherwise).
   * This method can NEVER report that an order was placed or a cart filled.
   */
  async buildShoppingHandoff(selectedProducts, location) {
    const items = (Array.isArray(selectedProducts) ? selectedProducts : [])
      .filter(Boolean)
      .map((p) => {
        const url =
          (p.url && this.isValidProductUrl(p.url) && p.url) ||
          (p.searchTerm ? this.buildSearchUrl(p.searchTerm) : null) ||
          this.buildSearchUrl(p.name)
        return {
          name: p.name,
          brand: p.brand || null,
          quantityText: p.quantityText || null,
          packagesNeeded: p.packagesNeeded ?? null,
          estimatedPrice: p.price != null ? p.price : null,
          priceSource: p.priceSource || null,
          url,
        }
      })
    return {
      retailerId: this.id,
      canTransferCart: false,
      reason:
        'DMart Ready has no official public cart or deep-link API, so products cannot be transferred automatically. Open each product on DMart Ready and add it to your cart there — nothing has been ordered or added.',
      items,
      siteUrl: DMART_BASE,
      pincode: location?.pincode || null,
    }
  }
}

export { DMART_BASE, PIN_RE as DMART_PIN_RE, NO_API_REASON as DMART_NO_API_REASON }
