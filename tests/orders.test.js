import { describe, it, expect } from 'vitest'
import {
  extractShippingFromSession,
  extractAmountsFromSession,
  deriveFulfillmentStatus,
  friendlyGenerationError,
} from '../server/index.js'

describe('friendlyGenerationError', () => {
  it('maps OpenAI quota/rate-limit (429) to a capacity message, not billing text', () => {
    expect(friendlyGenerationError({ status: 429, message: 'You exceeded your current quota, check billing' }))
      .toEqual({ status: 503, message: 'Our design studio is briefly at capacity — please try again in a moment.' })
    expect(friendlyGenerationError({ code: 'insufficient_quota' }).status).toBe(503)
  })

  it('maps other failures to a generic retry message without leaking internals', () => {
    const out = friendlyGenerationError(new Error('Missing required environment variable: FAL_KEY'))
    expect(out.status).toBe(500)
    expect(out.message).not.toMatch(/FAL_KEY/)
  })
})

describe('extractShippingFromSession', () => {
  it('prefers shipping_details over billing', () => {
    const s = {
      shipping_details: { name: 'Ship To', address: { line1: '1 Ship St', city: 'Austin', state: 'TX', postal_code: '78701', country: 'US' } },
      customer_details: { name: 'Bill To', address: { line1: '9 Bill Ave' } },
    }
    const out = extractShippingFromSession(s)
    expect(out.name).toBe('Ship To')
    expect(out.address.line1).toBe('1 Ship St')
    expect(out.address.postalCode).toBe('78701')
  })

  it('falls back to customer_details when no shipping', () => {
    const s = { customer_details: { name: 'Bill', address: { line1: '9 Bill Ave', city: 'X' } } }
    expect(extractShippingFromSession(s).address.line1).toBe('9 Bill Ave')
  })

  it('reads the newer collected_information.shipping_details shape', () => {
    const s = { collected_information: { shipping_details: { name: 'New', address: { line1: '5 New Rd' } } } }
    expect(extractShippingFromSession(s).address.line1).toBe('5 New Rd')
  })

  it('returns null with no address', () => {
    expect(extractShippingFromSession({})).toBe(null)
    expect(extractShippingFromSession(null)).toBe(null)
  })
})

describe('extractAmountsFromSession', () => {
  const order = { items: [{ unitAmount: 4200, quantity: 2 }, { unitAmount: 3800, quantity: 1 }] }

  it('prefers Stripe figures', () => {
    const s = { amount_subtotal: 12200, amount_total: 12699, total_details: { amount_shipping: 499 } }
    expect(extractAmountsFromSession(s, order)).toEqual({ amountSubtotal: 12200, amountShipping: 499, amountDiscount: 0, amountTotal: 12699 })
  })

  it('surfaces a promotion-code discount from Stripe', () => {
    const s = { amount_subtotal: 12200, amount_total: 11699, total_details: { amount_shipping: 499, amount_discount: 1000 } }
    expect(extractAmountsFromSession(s, order)).toEqual({ amountSubtotal: 12200, amountShipping: 499, amountDiscount: 1000, amountTotal: 11699 })
  })

  it('falls back to item math with default shipping', () => {
    const out = extractAmountsFromSession(null, order)
    expect(out.amountSubtotal).toBe(12200)
    expect(out.amountShipping).toBe(499)
    expect(out.amountTotal).toBe(12699)
  })
})

describe('deriveFulfillmentStatus', () => {
  const order = { status: 'printify_created' }
  it('delivered when a shipment is delivered', () => {
    expect(deriveFulfillmentStatus(order, { tracking: [{ deliveredAt: '2026-01-01' }] })).toBe('delivered')
  })
  it('shipped when tracking exists but not delivered', () => {
    expect(deriveFulfillmentStatus(order, { tracking: [{ deliveredAt: null }] })).toBe('shipped')
  })
  it('in_production from printify status', () => {
    expect(deriveFulfillmentStatus(order, { tracking: [], printifyStatus: 'in-production' })).toBe('in_production')
  })
  it('confirmed once the order is created with no tracking', () => {
    expect(deriveFulfillmentStatus(order, { tracking: [] })).toBe('confirmed')
  })
})
