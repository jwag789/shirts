// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
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

// No VITE_GA_MEASUREMENT_ID / VITE_PLAUSIBLE_DOMAIN set in the test env, so
// analytics must stay completely inert and never throw.
describe('analytics (no id configured)', () => {
  it('initAnalytics injects no vendor script', () => {
    initAnalytics()
    expect(document.querySelector('script[src*="googletagmanager"]')).toBe(null)
    expect(document.querySelector('script[src*="plausible"]')).toBe(null)
    expect(window.gtag).toBeUndefined()
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
