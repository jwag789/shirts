import { describe, it, expect, beforeEach } from 'vitest'
import { useCart } from '../src/composables/useCart.js'

const { state, itemCount, subtotal, addItem, addPetPortraitItem, addTeamShirtItem, updateQuantity, removeItem } = useCart()

const product = { slug: 'zen-tee', name: 'Zen Tee', priceValue: 34, cardImage: '/i.png', colors: [{ name: 'Sand', swatch: '#ddd' }], printify: { variantsBySize: { M: 1 } } }

beforeEach(() => {
  state.items.splice(0)
})

describe('useCart', () => {
  it('adds a catalog item and reflects count + subtotal', () => {
    addItem(product, product.colors[0], 'M')
    expect(itemCount.value).toBe(1)
    expect(subtotal.value).toBe(34)
  })

  it('increments quantity for the same variant instead of duplicating', () => {
    addItem(product, product.colors[0], 'M')
    addItem(product, product.colors[0], 'M')
    expect(state.items).toHaveLength(1)
    expect(itemCount.value).toBe(2)
    expect(subtotal.value).toBe(68)
  })

  it('treats different sizes as separate lines', () => {
    addItem(product, product.colors[0], 'M')
    addItem(product, product.colors[0], 'L')
    expect(state.items).toHaveLength(2)
  })

  it('adds pet + team custom items at their prices', () => {
    addPetPortraitItem('superhero', 'https://fal.media/a.png', 'M')
    addTeamShirtItem({ generatedImageUrl: 'https://fal.media/b.png', teamName: 'Wolves', size: 'L' })
    expect(subtotal.value).toBe(38 + 42)
    expect(state.items.find((i) => i.isPetPortrait)).toBeTruthy()
    expect(state.items.find((i) => i.isTeamShirt)).toBeTruthy()
  })

  it('updates and removes quantities', () => {
    addItem(product, product.colors[0], 'M')
    const id = state.items[0].id
    updateQuantity(id, 5)
    expect(itemCount.value).toBe(5)
    updateQuantity(id, 0) // 0 removes
    expect(state.items).toHaveLength(0)
    addItem(product, product.colors[0], 'M')
    removeItem(state.items[0].id)
    expect(state.items).toHaveLength(0)
  })
})
