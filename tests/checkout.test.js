import { describe, it, expect } from 'vitest'
import { buildCheckoutItems, normalizeQuantity, generateOrderNumber } from '../server/index.js'
import { products } from '../src/data/products.js'

const catalogWithPrintify = products.find((p) => p.printify?.variantsBySize)

describe('normalizeQuantity', () => {
  it('accepts 1..10, rejects everything else', () => {
    expect(normalizeQuantity(1)).toBe(1)
    expect(normalizeQuantity(10)).toBe(10)
    expect(normalizeQuantity(0)).toBe(null)
    expect(normalizeQuantity(11)).toBe(null)
    expect(normalizeQuantity(2.5)).toBe(null)
    expect(normalizeQuantity('x')).toBe(null)
  })
})

describe('generateOrderNumber', () => {
  it('matches INK- + 6 unambiguous chars', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateOrderNumber()).toMatch(/^INK-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/)
    }
  })
})

describe('buildCheckoutItems', () => {
  it('throws on an empty cart', () => {
    expect(() => buildCheckoutItems([])).toThrow(/empty/i)
    expect(() => buildCheckoutItems(null)).toThrow(/empty/i)
  })

  it('builds a valid catalog line item', () => {
    const size = Object.keys(catalogWithPrintify.printify.variantsBySize)[0]
    const out = buildCheckoutItems([{ productSlug: catalogWithPrintify.slug, size, quantity: 2 }])
    expect(out).toHaveLength(1)
    expect(out[0].quantity).toBe(2)
    expect(out[0].unitAmount).toBe(Math.round(catalogWithPrintify.priceValue * 100))
  })

  it('rejects unknown products', () => {
    expect(() => buildCheckoutItems([{ productSlug: 'does-not-exist', size: 'M', quantity: 1 }])).toThrow()
  })

  describe('pet portrait', () => {
    const base = { isPetPortrait: true, style: 'superhero', generatedImageUrl: 'https://fal.media/a.png', size: 'M', quantity: 1 }
    it('accepts a valid item', () => {
      const out = buildCheckoutItems([base])
      expect(out[0].isPetPortrait).toBe(true)
      expect(out[0].unitAmount).toBe(3800)
    })
    it('rejects an invalid size', () => {
      expect(() => buildCheckoutItems([{ ...base, size: 'XXS' }])).toThrow(/size/i)
    })
    it('rejects a non-https image', () => {
      expect(() => buildCheckoutItems([{ ...base, generatedImageUrl: 'http://x/a.png' }])).toThrow(/image/i)
    })
    it('rejects an invalid style', () => {
      expect(() => buildCheckoutItems([{ ...base, style: 'nope' }])).toThrow(/style/i)
    })
    it('rejects an invalid quantity', () => {
      expect(() => buildCheckoutItems([{ ...base, quantity: 99 }])).toThrow(/quantity/i)
    })
  })

  describe('team shirt', () => {
    const base = { isTeamShirt: true, generatedImageUrl: 'https://fal.media/b.png', teamName: 'Wolves', size: 'L', quantity: 1 }
    it('accepts a valid item and prices at $42', () => {
      const out = buildCheckoutItems([base])
      expect(out[0].isTeamShirt).toBe(true)
      expect(out[0].unitAmount).toBe(4200)
      expect(out[0].name).toContain('Wolves')
    })
    it('rejects a bad size', () => {
      expect(() => buildCheckoutItems([{ ...base, size: 'HUGE' }])).toThrow(/size/i)
    })
    it('rejects a missing design', () => {
      expect(() => buildCheckoutItems([{ ...base, generatedImageUrl: '' }])).toThrow(/design/i)
    })
  })
})
