/**
 * RetailerProvider — the abstraction every grocery retailer integration
 * implements. The meal planner, grocery list and pantry modules only ever
 * talk to this interface, so adding a second retailer (BigBasket, a local
 * kirana chain, …) means writing ONE new provider class and registering it —
 * never touching core planning logic.
 *
 * Interface (all methods async, all return plain serializable objects):
 *
 *   getServiceability(pincode)
 *     → { status: 'ok'|'unverified'|'invalid', verified: boolean, message,
 *         officialCheckUrl?, checkedAt }
 *     Honest serviceability for a PIN code. `verified: false` means the
 *     retailer exposes no permitted programmatic check — NEVER guess.
 *
 *   getFulfilmentOptions(pincode)
 *     → { verified: boolean, options: [{ id, label, description,
 *         requiresPickupPoint }], note }
 *
 *   searchProducts(ingredientDescriptor, location)
 *     ingredientDescriptor: { canonical, displayName, terms: string[],
 *       requiredBase, dim }
 *     → { live: boolean, searches: [{ term, url }], siteUrl, note }
 *     Live catalogue search when an official API exists; otherwise official
 *     search links (the shopping handoff).
 *
 *   getProductDetails(productId, location)
 *   getPrice(productId, location)
 *     → { verified: boolean, price?, mrp?, priceSource?, verifiedAt?, ... }
 *     Real catalogue data when verified; user-confirmed entries from the
 *     local product catalog when that is all we have.
 *
 *   getAvailability(productId, location)
 *     → { verified: boolean, status: 'in-stock'|'out-of-stock'|'unknown' }
 *     NEVER fabricate stock information — 'unknown' is a valid answer.
 *
 *   buildShoppingHandoff(selectedProducts, location)
 *     → { canTransferCart: boolean, reason, items: [...], siteUrl }
 *     Cart transfer ONLY when a legitimate official integration confirms it;
 *     otherwise per-product links + an organized list. `canTransferCart`
 *     must never be true unless the retailer's API actually confirmed the
 *     transfer.
 *
 * Data-honesty contract for every provider:
 *   - prices are either retailer-verified, user-verified or clearly-labeled
 *     AI estimates — never presented as another source than they are;
 *   - availability is never invented;
 *   - user credentials / payment details are NEVER collected or stored.
 */
export class RetailerProvider {
  constructor(meta = {}) {
    this.id = String(meta.id || '')
    this.label = String(meta.label || '')
    this.siteUrl = String(meta.siteUrl || '')
    this.hasOfficialCatalogueApi = Boolean(meta.hasOfficialCatalogueApi)
  }

  async getServiceability() {
    throw new Error('RetailerProvider.getServiceability must be implemented')
  }

  async getFulfilmentOptions() {
    throw new Error('RetailerProvider.getFulfilmentOptions must be implemented')
  }

  async searchProducts() {
    throw new Error('RetailerProvider.searchProducts must be implemented')
  }

  async getProductDetails() {
    throw new Error('RetailerProvider.getProductDetails must be implemented')
  }

  async getPrice() {
    throw new Error('RetailerProvider.getPrice must be implemented')
  }

  async getAvailability() {
    throw new Error('RetailerProvider.getAvailability must be implemented')
  }

  async buildShoppingHandoff() {
    throw new Error('RetailerProvider.buildShoppingHandoff must be implemented')
  }
}
