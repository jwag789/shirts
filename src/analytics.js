// Provider-agnostic analytics. No-ops until an ID is provided at BUILD time via
// a Vite env var. Set any of:
//   VITE_GA_MEASUREMENT_ID            (Google Analytics 4, e.g. G-XXXXXXXXXX)
//   VITE_PLAUSIBLE_DOMAIN             (Plausible, e.g. inkspirit.shop)
//   VITE_GOOGLE_ADS_ID               (Google Ads, e.g. AW-XXXXXXXXX)
//   VITE_GOOGLE_ADS_PURCHASE_LABEL   (Ads conversion label for a purchase)
// Nothing loads and no requests are made if none are set. GA4 and Google Ads
// share the same gtag loader, so you can run either or both.

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID
const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN
const ADS_ID = import.meta.env.VITE_GOOGLE_ADS_ID
const ADS_PURCHASE_LABEL = import.meta.env.VITE_GOOGLE_ADS_PURCHASE_LABEL

const useGtag = Boolean(GA_ID || ADS_ID)
let ready = false

export function initAnalytics() {
  if (ready || typeof window === 'undefined') return

  if (useGtag) {
    const s = document.createElement('script')
    s.async = true
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID || ADS_ID}`
    document.head.appendChild(s)
    window.dataLayer = window.dataLayer || []
    window.gtag = function gtag() {
      window.dataLayer.push(arguments)
    }
    window.gtag('js', new Date())
    // We send page_view manually on router changes (this is an SPA).
    if (GA_ID) window.gtag('config', GA_ID, { send_page_view: false })
    if (ADS_ID) window.gtag('config', ADS_ID)
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
  if (useGtag && window.gtag) {
    window.gtag('event', 'page_view', { page_path: path, page_location: window.location.href })
  } else if (PLAUSIBLE_DOMAIN && window.plausible) {
    window.plausible('pageview', { u: window.location.origin + path })
  }
}

export function trackEvent(name, params = {}) {
  if (!ready) return
  if (useGtag && window.gtag) {
    window.gtag('event', name, params)
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
  if (useGtag && window.gtag) {
    window.gtag('event', name, payload)
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

// Fire once per completed order. Sends the GA4-standard `purchase` event (which
// Google Ads imports as a conversion once GA4 is linked) and, if a Google Ads
// conversion is configured directly, an Ads `conversion` event too.
export function trackPurchase({ transactionId, value, currency = 'USD', shipping, items = [] } = {}) {
  if (!ready) return
  const revenue = Number(value) || 0
  if (useGtag && window.gtag) {
    const purchase = { transaction_id: transactionId, value: revenue, currency, items }
    if (shipping != null) purchase.shipping = Number(shipping) || 0
    window.gtag('event', 'purchase', purchase)
    if (ADS_ID && ADS_PURCHASE_LABEL) {
      window.gtag('event', 'conversion', {
        send_to: `${ADS_ID}/${ADS_PURCHASE_LABEL}`,
        value: revenue,
        currency,
        transaction_id: transactionId,
      })
    }
  } else if (PLAUSIBLE_DOMAIN && window.plausible) {
    window.plausible('purchase', {
      props: { transaction_id: transactionId, value: revenue },
      revenue: { currency, amount: revenue },
    })
  }
}
