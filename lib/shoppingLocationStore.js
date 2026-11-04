import fs from 'fs/promises'
import path from 'path'
import { listRetailers, getRetailerProvider } from './retailers/index.js'

const DATA_DIR = path.join(process.cwd(), 'data')
const LOCATION_FILE = path.join(DATA_DIR, 'shoppingLocation.json')

/**
 * Shopping location store — the user's saved retailer + PIN code + preferred
 * fulfilment mode. Kept SEPARATE from household preferences because it is
 * retailer-scoped configuration, not family profile data.
 *
 * { retailerId, pincode, fulfilment: 'delivery'|'pickup'|null, pickupPoint,
 *   serviceability: { status: 'unknown'|'user-confirmed', confirmedAt, note },
 *   updatedAt }
 */

const PIN_RE = /^[1-8][0-9]{5}$/

const DEFAULT_LOCATION = {
  retailerId: 'dmart',
  pincode: null,
  fulfilment: null,
  pickupPoint: '',
  serviceability: { status: 'unknown', confirmedAt: null, note: '' },
  updatedAt: null,
}

const cleanStr = (v, max = 80) =>
  typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').trim().slice(0, max) : ''

export async function getShoppingLocation() {
  try {
    const data = JSON.parse(await fs.readFile(LOCATION_FILE, 'utf-8'))
    return { ...DEFAULT_LOCATION, ...data }
  } catch {
    return { ...DEFAULT_LOCATION }
  }
}

/**
 * Validate + save a location update. Throws readable errors.
 * `serviceabilityConfirmed: true` records the USER's own confirmation that
 * DMart Ready serves their PIN (the only honest confirmation available
 * without an official API).
 */
export async function saveShoppingLocation(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Location must be an object.')

  const current = await getShoppingLocation()

  const retailerId = cleanStr(raw.retailerId, 30).toLowerCase() || current.retailerId
  const provider = getRetailerProvider(retailerId)
  if (!provider) {
    const supported = listRetailers().map((r) => r.id).join(', ')
    throw new Error(`retailerId must be one of: ${supported}`)
  }

  let pincode = current.pincode
  if (raw.pincode !== undefined) {
    const pin = cleanStr(raw.pincode, 6)
    if (pin && !PIN_RE.test(pin)) {
      throw new Error('Enter a valid 6-digit Indian PIN code (first digit 1-8).')
    }
    pincode = pin || null
  }

  let fulfilmentOptions = []
  try {
    fulfilmentOptions = (await provider.getFulfilmentOptions(pincode)).options
  } catch {
    fulfilmentOptions = []
  }
  let fulfilment = current.fulfilment
  if (raw.fulfilment !== undefined) {
    const wanted = cleanStr(raw.fulfilment, 30).toLowerCase()
    if (wanted === '') fulfilment = null
    else if (!fulfilmentOptions.some((o) => o.id === wanted)) {
      throw new Error('Unknown fulfilment option for this retailer.')
    } else fulfilment = wanted
  }

  const requiresPickup = fulfilmentOptions.find((o) => o.id === fulfilment)?.requiresPickupPoint
  const pickupPoint = cleanStr(raw.pickupPoint ?? current.pickupPoint, 80)

  let serviceability = current.serviceability || DEFAULT_LOCATION.serviceability
  if (raw.serviceabilityConfirmed === true) {
    serviceability = {
      status: 'user-confirmed',
      confirmedAt: new Date().toISOString(),
      note: `User confirmed ${provider.label} serves PIN ${pincode || '(not set)'} on the official site/app.`,
    }
  } else if (raw.serviceabilityConfirmed === false) {
    serviceability = { status: 'unknown', confirmedAt: null, note: '' }
  }

  const location = {
    retailerId,
    pincode,
    fulfilment,
    pickupPoint: requiresPickup ? pickupPoint : '',
    serviceability,
    updatedAt: new Date().toISOString(),
  }

  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(LOCATION_FILE, JSON.stringify(location, null, 2), 'utf-8')
  return location
}
