// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { initAnalytics, trackEvent, trackPageview, trackPurchase } from '../src/analytics.js'

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
})
