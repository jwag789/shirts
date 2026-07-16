// Provider-agnostic analytics. No-ops until an ID is provided at BUILD time via
// a Vite env var. Set any of:
//   VITE_GTM_ID              (Google Tag Manager container, e.g. GTM-XXXXXXX)
//   VITE_PLAUSIBLE_DOMAIN    (Plausible, e.g. inkspirit.shop)
//
// Google Tag Manager is the single tag-management entry point: it owns
// loading and configuring GA4, Google Ads, and any other downstream
// pixels/tags via the GTM workspace UI. This module never talks to gtag.js
// or loads Google scripts directly — it only ever pushes events onto
// window.dataLayer. The GTM container script (loaded in index.html) is what
// reads dataLayer and forwards events to GA4/Ads/etc. Configure tags +
// triggers for the event names below inside the GTM workspace; this file
// just emits them.
//
// Plausible is a separate, non-Google, script-based tool kept as an
// alternative to GTM (not used alongside it).

const GTM_ID = import.meta.env.VITE_GTM_ID
const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN

const useDataLayer = Boolean(GTM_ID)
let ready = false

export function initAnalytics() {
  if (ready || typeof window === 'undefined') return

  if (useDataLayer) {
    // The GTM container script itself is loaded synchronously in index.html
    // (Google's recommended placement, before the app boots) — just make
    // sure the queue exists so any early pushes aren't lost.
    window.dataLayer = window.dataLayer || []
    ready = true
  } else if (PLAUSIBLE_DOMAIN) {
    // Queue stub so calls before the script loads aren't lost.
    window.plausible =
      window.plausible ||
      function plausible() {
        ;(window.plausible.q = window.plausible.q || []).push(arguments)
      }
    const s = document.createElement('script')
    s.defer = true
    s.setAttribute('data-domain', PLAUSIBLE_DOMAIN)
    s.src = 'https://plausible.io/js/script.manual.js'
    document.head.appendChild(s)
    ready = true
  }
}

export function trackPageview(path) {
  if (!ready) return
  if (useDataLayer) {
    // Manual page_view push — this is an SPA, so GTM/GA4's automatic
    // pageview on container load would miss every route change after the
    // first. We fire this instead on every router.afterEach (see main.js).
    window.dataLayer.push({
      event: 'page_view',
      page_path: path,
      page_location: window.location.href,
    })
  } else if (PLAUSIBLE_DOMAIN && window.plausible) {
    window.plausible('pageview', { u: window.location.origin + path })
  }
}

export function trackEvent(name, params = {}) {
  if (!ready) return
  if (useDataLayer) {
    window.dataLayer.push({ event: name, ...params })
  } else if (PLAUSIBLE_DOMAIN && window.plausible) {
    window.plausible(name, { props: params })
  }
}

const CURRENCY = 'USD'

// Shared shape for GA4 ecommerce `items[]` entries. Callers pass whatever they
// have (catalog product, cart line, AI-generated line) through this so every
// event — view, select, cart, checkout, purchase — reports the same fields.
export function makeItem({ id, name, category, variant, price, quantity = 1, brand = 'InkSpirit' }) {
  return {
    item_id: id,
    item_name: name,
    item_brand: brand,
    item_category: category,
    item_variant: variant,
    price: Number(price) || 0,
    quantity,
  }
}

function itemsValue(items) {
  return items.reduce((sum, it) => sum + (Number(it.price) || 0) * (it.quantity ?? 1), 0)
}

// Shared sender for the GA4 recommended ecommerce events (everything except
// `purchase`, which needs its own transaction_id/shipping handling below).
function ecommerceEvent(name, items, extra = {}) {
  if (!ready) return
  const payload = { currency: CURRENCY, value: itemsValue(items), items, ...extra }
  if (useDataLayer) {
    window.dataLayer.push({ event: name, ...payload })
  } else if (PLAUSIBLE_DOMAIN && window.plausible) {
    window.plausible(name, { props: { value: payload.value, items: items.length, ...extra } })
  }
}

// Product page view.
export function trackViewItem(item) {
  ecommerceEvent('view_item', [item])
}

// Click from a product list (collection grid, home rail, related products).
export function trackSelectItem(item, listName) {
  ecommerceEvent('select_item', [item], { item_list_name: listName })
}

// A list of products is presented (collection/category page).
export function trackViewItemList(items, listName) {
  ecommerceEvent('view_item_list', items, { item_list_name: listName })
}

export function trackAddToCart(item) {
  ecommerceEvent('add_to_cart', [item])
}

export function trackRemoveFromCart(item) {
  ecommerceEvent('remove_from_cart', [item])
}

// Cart drawer opened.
export function trackViewCart(items) {
  ecommerceEvent('view_cart', items)
}

export function trackBeginCheckout(items) {
  ecommerceEvent('begin_checkout', items)
}

// Fire once per completed order. Sends the GA4-standard `purchase` event
// (GTM tags configured for GA4 / Google Ads conversion import should trigger
// off this event name and read transaction_id/value/currency from it).
export function trackPurchase({ transactionId, value, currency = 'USD', shipping, items = [] } = {}) {
  if (!ready) return
  const revenue = Number(value) || 0
  if (useDataLayer) {
    const purchase = { event: 'purchase', transaction_id: transactionId, value: revenue, currency, items }
    if (shipping != null) purchase.shipping = Number(shipping) || 0
    window.dataLayer.push(purchase)
  } else if (PLAUSIBLE_DOMAIN && window.plausible) {
    window.plausible('purchase', {
      props: { transaction_id: transactionId, value: revenue },
      revenue: { currency, amount: revenue },
    })
  }
}
