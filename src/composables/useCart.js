import { computed, reactive } from 'vue'

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
    updateQuantity,
    removeItem,
  }
}
