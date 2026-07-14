<script setup>
import { RouterLink } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'
import { setDocumentHead } from '../composables/useDocumentHead'

setDocumentHead({
  title: 'How It Works · InkSpirit',
  description:
    'How InkSpirit works — original designs, made-to-order printing, secure checkout, tracked shipping, and a no-nonsense reprint promise. No dead stock, no guesswork.',
  path: '/how-it-works',
})

const steps = [
  {
    icon: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    title: 'We design something worth wearing',
    body:
      "Every design starts in our studio. We use AI as a creative tool — generating, refining, and hand-picking until an idea becomes art we'd actually wear ourselves. Nothing earns a spot in a collection until it looks right on a shirt.",
  },
  {
    icon: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    title: 'You find the one',
    body:
      "Browse by style, or make it personal — turn your pet into a legend or rally your whole team with a custom design in about 30 seconds. Pick your size, drop it in your bag, and check out securely through Stripe.",
  },
  {
    icon: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
    title: "It's printed just for you",
    body:
      "The moment your order lands, it goes into production and gets printed on a quality blank — made to order, one at a time. No warehouse of unsold tees, no landfill. Most orders ship in 3–5 business days.",
  },
  {
    icon: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    title: 'It shows up — and we keep you posted',
    body:
      "You'll get an order confirmation right away, then a shipping email with live tracking the moment your tee is on its way. Something not right? A real person reads every message.",
  },
]

const promises = [
  { label: 'Secure checkout', detail: 'Payments handled by Stripe — we never see your card.' },
  { label: 'Made to order', detail: 'Printed fresh for you, never mass-produced or overstocked.' },
  { label: 'Tracked shipping', detail: 'Confirmation and tracking emails at every step.' },
  { label: 'Reprint promise', detail: 'Misprinted or damaged? We remake it or refund you.' },
]
</script>

<template>
  <div id="top">
    <SiteHeader />

    <main>
      <section class="collection-title">
        <p class="eyebrow">How it works</p>
        <h1>Made for you, not for a warehouse.</h1>
        <p>
          InkSpirit is a small studio with a simple idea: never print a shirt nobody asked for.
          Every design is created with intention and produced the moment you order it — so what
          lands at your door is fresh, yours, and built to last wash after wash.
        </p>
      </section>

      <section class="content-section hiw-steps">
        <ol class="hiw-step-grid">
          <li v-for="(step, index) in steps" :key="step.title" class="hiw-step">
            <div class="hiw-step__num">{{ index + 1 }}</div>
            <svg
              class="hiw-step__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              v-html="step.icon"
            ></svg>
            <h2 class="hiw-step__title">{{ step.title }}</h2>
            <p class="hiw-step__body">{{ step.body }}</p>
          </li>
        </ol>
      </section>

      <section class="content-section hiw-promise">
        <div class="hiw-promise__inner">
          <div class="hiw-promise__copy">
            <p class="eyebrow">Our promise</p>
            <h2 class="hiw-promise__title">If it's not right, we make it right.</h2>
            <p>
              Made to order doesn't mean made carelessly — it means made for you. If your shirt
              shows up misprinted, damaged, or just not what you expected, reach out and we'll
              remake it or refund you. No runaround.
            </p>
          </div>
          <ul class="hiw-promise__grid">
            <li v-for="item in promises" :key="item.label" class="hiw-promise__item">
              <span class="hiw-promise__label">{{ item.label }}</span>
              <span class="hiw-promise__detail">{{ item.detail }}</span>
            </li>
          </ul>
        </div>
      </section>

      <section class="content-section hiw-cta">
        <h2 class="hiw-cta__title">Ready when you are.</h2>
        <div class="hiw-cta__actions">
          <RouterLink class="button" to="/collections">Shop all collections</RouterLink>
          <RouterLink class="button button--outline" to="/pet-portrait/create">Make it custom →</RouterLink>
        </div>
      </section>
    </main>
  </div>
</template>
