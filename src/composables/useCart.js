import { computed, reactive } from 'vue'
import { trackEvent } from '../analytics'

const state = reactive({
  isOpen: false,
  items: [],
})

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

function buildVariantKey(product, color, size) {
  return `${product.slug}::${color.name}::${size}`
}

function getFulfillmentColor(product) {
  return product.colors?.[0] ?? { name: 'Default', swatch: '#d9d3ca', tone: 'tee-sand' }
}

function createLineItem(product, color, size) {
  return {
    id: buildVariantKey(product, color, size),
    productSlug: product.slug,
    name: product.name,
    collection: product.collection,
    priceValue: product.priceValue,
    price: currency.format(product.priceValue),
    color: color.name,
    colorSwatch: color.swatch,
    tone: color.tone,
    image: product.cardImage,
    size,
    quantity: 1,
    isPrintifyConnected: Boolean(product.printify?.variantsBySize?.[size]),
  }
}

function openCart() {
  state.isOpen = true
}

function closeCart() {
  state.isOpen = false
}

function toggleCart() {
  state.isOpen = !state.isOpen
}

function addItem(product, color, size) {
  const resolvedColor = color ?? getFulfillmentColor(product)
  const id = buildVariantKey(product, resolvedColor, size)
  const existing = state.items.find((item) => item.id === id)

  if (existing) {
    existing.quantity += 1
  } else {
    state.items.push(createLineItem(product, resolvedColor, size))
  }

  trackEvent('add_to_cart', { kind: 'catalog', item: product.slug, value: product.priceValue })
  openCart()
}

function addPetPortraitItem(style, generatedImageUrl, size, color = 'White', printifyVariantId = null) {
  const id = `pet-portrait::${style}::${color}::${size}::${generatedImageUrl.slice(-24)}`
  const existing = state.items.find((item) => item.id === id)

  if (existing) {
    existing.quantity += 1
  } else {
    state.items.push({
      id,
      isPetPortrait: true,
      productSlug: 'pet-portrait',
      name: `Custom Pet Portrait — ${style.charAt(0).toUpperCase() + style.slice(1)}`,
      collection: 'Pet Portraits',
      priceValue: 38,
      price: currency.format(38),
      style,
      generatedImageUrl,
      image: generatedImageUrl,
      size,
      color,
      printifyVariantId,
      quantity: 1,
      isPrintifyConnected: true,
    })
  }

  trackEvent('add_to_cart', { kind: 'pet_portrait', style, value: 38 })
  openCart()
}

function addTeamShirtItem({ generatedImageUrl, teamName, playerName = '', playerNumber = '', style = '', size, color = 'White', printifyVariantId = null }) {
  const suffix = [playerName, playerNumber].filter(Boolean).join(' ')
  const id = `team-shirt::${style}::${color}::${size}::${playerName}::${playerNumber}::${generatedImageUrl.slice(-24)}`
  const existing = state.items.find((item) => item.id === id)

  if (existing) {
    existing.quantity += 1
  } else {
    state.items.push({
      id,
      isTeamShirt: true,
      productSlug: 'team-shirt',
      name: `${teamName || 'Team'} Team Shirt${suffix ? ` — ${suffix}` : ''}`,
      collection: 'Team Shirts',
      priceValue: 42,
      price: currency.format(42),
      teamName,
      playerName,
      playerNumber,
      style,
      generatedImageUrl,
      image: generatedImageUrl,
      size,
      color,
      printifyVariantId,
      quantity: 1,
      isPrintifyConnected: true,
    })
  }

  trackEvent('add_to_cart', { kind: 'team_shirt', style, value: 42 })
  openCart()
}

function updateQuantity(id, nextQuantity) {
  const item = state.items.find((entry) => entry.id === id)
  if (!item) {
    return
  }

  if (nextQuantity <= 0) {
    removeItem(id)
    return
  }

  item.quantity = nextQuantity
}

function removeItem(id) {
  const index = state.items.findIndex((item) => item.id === id)
  if (index >= 0) {
    state.items.splice(index, 1)
  }
}

const itemCount = computed(() =>
  state.items.reduce((total, item) => total + item.quantity, 0),
)

const subtotal = computed(() =>
  state.items.reduce((total, item) => total + item.quantity * item.priceValue, 0),
)

const subtotalLabel = computed(() => currency.format(subtotal.value))

export function useCart() {
  return {
    state,
    itemCount,
    subtotal,
    subtotalLabel,
    openCart,
    closeCart,
    toggleCart,
    addItem,
    addPetPortraitItem,
    addTeamShirtItem,
    updateQuantity,
    removeItem,
  }
}
