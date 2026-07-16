// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  initAnalytics,
  trackEvent,
  trackPageview,
  trackPurchase,
  makeItem,
  trackViewItem,
  trackSelectItem,
  trackViewItemList,
  trackAddToCart,
  trackRemoveFromCart,
  trackViewCart,
  trackBeginCheckout,
} from '../src/analytics.js'

// No VITE_GTM_ID / VITE_PLAUSIBLE_DOMAIN set in the test env, so
// analytics must stay completely inert and never throw.
describe('analytics (no id configured)', () => {
  it('initAnalytics injects no vendor script', () => {
    initAnalytics()
    expect(document.querySelector('script[src*="googletagmanager"]')).toBe(null)
    expect(document.querySelector('script[src*="plausible"]')).toBe(null)
  })

  it('trackEvent / trackPageview / trackPurchase are safe no-ops', () => {
    expect(() => trackEvent('add_to_cart', { value: 42 })).not.toThrow()
    expect(() => trackPageview('/reviews')).not.toThrow()
    expect(() => trackPurchase({ transactionId: 'ORD-1', value: 38.99, items: [] })).not.toThrow()
    expect(window.dataLayer).toBeUndefined()
  })

  it('makeItem builds the GA4 item shape', () => {
    const item = makeItem({ id: 'shirt-1', name: 'Shrine Walk', category: 'Zen Journey', variant: 'Ink / M', price: '38', quantity: 2 })
    expect(item).toEqual({
      item_id: 'shirt-1',
      item_name: 'Shrine Walk',
      item_brand: 'InkSpirit',
      item_category: 'Zen Journey',
      item_variant: 'Ink / M',
      price: 38,
      quantity: 2,
    })
  })

  it('the ecommerce funnel events are safe no-ops', () => {
    const item = makeItem({ id: 'shirt-1', name: 'Shrine Walk', category: 'Zen Journey', price: 38 })
    expect(() => trackViewItem(item)).not.toThrow()
    expect(() => trackSelectItem(item, 'Zen Journey')).not.toThrow()
    expect(() => trackViewItemList([item], 'Zen Journey')).not.toThrow()
    expect(() => trackAddToCart(item)).not.toThrow()
    expect(() => trackRemoveFromCart(item)).not.toThrow()
    expect(() => trackViewCart([item])).not.toThrow()
    expect(() => trackBeginCheckout([item])).not.toThrow()
    expect(window.dataLayer).toBeUndefined()
  })
})

// With VITE_GTM_ID configured, every tracker must push a plain object onto
// window.dataLayer (never call gtag/load a script directly) — GTM itself
// owns forwarding these to GA4/Ads via tags configured in the GTM workspace.
describe('analytics (GTM configured)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_GTM_ID', 'GTM-TEST123')
    delete window.dataLayer
  })

  it('does not load gtag.js directly', async () => {
    const { initAnalytics } = await import('../src/analytics.js')
    initAnalytics()
    expect(document.querySelector('script[src*="gtag/js"]')).toBe(null)
    expect(window.gtag).toBeUndefined()
    expect(Array.isArray(window.dataLayer)).toBe(true)
  })

  it('trackEvent pushes a flat event onto dataLayer', async () => {
    const { initAnalytics, trackEvent } = await import('../src/analytics.js')
    initAnalytics()
    trackEvent('add_to_cart', { currency: 'USD', value: 29.99 })
    expect(window.dataLayer.at(-1)).toEqual({ event: 'add_to_cart', currency: 'USD', value: 29.99 })
  })

  it('trackPageview pushes a page_view event', async () => {
    const { initAnalytics, trackPageview } = await import('../src/analytics.js')
    initAnalytics()
    trackPageview('/reviews')
    expect(window.dataLayer.at(-1)).toMatchObject({ event: 'page_view', page_path: '/reviews' })
  })

  it('trackPurchase pushes the GA4 ecommerce purchase shape', async () => {
    const { initAnalytics, trackPurchase, makeItem } = await import('../src/analytics.js')
    initAnalytics()
    const item = makeItem({ id: 'shirt-1', name: 'Shrine Walk', category: 'Zen Journey', variant: 'Ink / M', price: 38, quantity: 1 })
    trackPurchase({ transactionId: 'ORD-1', value: 38, currency: 'USD', shipping: 4.99, items: [item] })
    expect(window.dataLayer.at(-1)).toEqual({
      event: 'purchase',
      transaction_id: 'ORD-1',
      value: 38,
      currency: 'USD',
      shipping: 4.99,
      items: [item],
    })
  })
})
