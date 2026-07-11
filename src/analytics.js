// Provider-agnostic analytics. No-ops until an ID is provided at BUILD time via
// a Vite env var — set ONE of:
//   VITE_GA_MEASUREMENT_ID   (Google Analytics 4, e.g. G-XXXXXXXXXX)
//   VITE_PLAUSIBLE_DOMAIN    (Plausible, e.g. inkspirit.studio)
// Nothing loads and no requests are made if neither is set.

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID
const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN

let ready = false

export function initAnalytics() {
  if (ready || typeof window === 'undefined') return

  if (GA_ID) {
    const s = document.createElement('script')
    s.async = true
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
    document.head.appendChild(s)
    window.dataLayer = window.dataLayer || []
    window.gtag = function gtag() {
      window.dataLayer.push(arguments)
    }
    window.gtag('js', new Date())
    // We send page_view manually on router changes (this is an SPA).
    window.gtag('config', GA_ID, { send_page_view: false })
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
  if (GA_ID && window.gtag) {
    window.gtag('event', 'page_view', { page_path: path, page_location: window.location.href })
  } else if (PLAUSIBLE_DOMAIN && window.plausible) {
    window.plausible('pageview', { u: window.location.origin + path })
  }
}

export function trackEvent(name, params = {}) {
  if (!ready) return
  if (GA_ID && window.gtag) {
    window.gtag('event', name, params)
  } else if (PLAUSIBLE_DOMAIN && window.plausible) {
    window.plausible(name, { props: params })
  }
}
