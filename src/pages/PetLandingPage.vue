<script setup>
import { RouterLink } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'
import ReviewStrip from '../components/ReviewStrip.vue'
import Icon from '../components/Icon.vue'
import { setDocumentHead } from '../composables/useDocumentHead'

setDocumentHead({
  title: 'Custom Pet Portrait Shirts — Turn Your Pet Into a Legend · InkSpirit',
  description:
    'Upload one photo and our AI turns your pet into a superhero, samurai, astronaut and more — hand-finished and printed on a premium tee. Free preview, no signup, ready in ~30 seconds.',
  path: '/pet-portrait',
})

// Example images live in /public/images/pet-styles/ — swap freely.
const STYLES = [
  { key: 'superhero', label: 'Superhero' },
  { key: 'wizard', label: 'Wizard' },
  { key: 'astronaut', label: 'Astronaut' },
  { key: 'samurai', label: 'Samurai' },
  { key: 'pirate', label: 'Pirate' },
  { key: 'viking', label: 'Viking' },
  { key: 'mermaid', label: 'Mermaid' },
  { key: 'princess', label: 'Princess' },
  { key: 'fairy', label: 'Fairy' },
  { key: 'angel', label: 'Angel' },
  { key: 'geisha', label: 'Geisha' },
  { key: 'popstar', label: 'Pop Star' },
]

const FAQS = [
  { q: 'What kind of photo works best?', a: 'A clear, well-lit photo of your pet facing the camera gives the best results. One pet per photo, minimal background clutter. You can regenerate if the first result isn’t perfect.' },
  { q: 'Do you store my photo?', a: 'No. Your uploaded photo is used only to generate your portrait and isn’t kept afterward. The finished design is hosted so it can be printed.' },
  { q: 'How long until it ships?', a: 'Every shirt is made to order and ships in about 3–5 business days, with tracking emailed to you when it’s on the way.' },
  { q: 'What if I don’t love the result?', a: 'You preview your portrait before paying, and you can regenerate or try a different photo for free. If a print ever arrives damaged or wrong, we remake or refund it.' },
]
</script>

<template>
  <div id="top" class="lp">
    <SiteHeader />

    <main>
      <!-- Hero -->
      <section class="lp-phero">
        <div class="lp-phero__copy">
          <p class="eyebrow">Custom pet portraits</p>
          <h1 class="lp-phero__title">Turn your pet into a <span>legend.</span></h1>
          <p class="lp-phero__sub">
            Upload one photo and watch your best friend become a superhero, samurai, pirate or
            astronaut — hand-finished and printed on a premium tee.
          </p>
          <div class="lp-phero__actions">
            <RouterLink class="button" to="/pet-portrait/create">Create my portrait →</RouterLink>
          </div>
          <p class="lp-phero__trust">Free preview · No signup · Ships in 3–5 days</p>
        </div>
        <div class="lp-phero__photo">
          <img
            src="/images/pet-lifestyle/kitchen.jpg"
            alt="A couple cooking together, both wearing custom pet portrait shirts of their golden retriever named Charlie"
          />
        </div>
      </section>

      <!-- Trust strip -->
      <div class="lp-trust">
        <span class="lp-trust__item"><Icon name="sparkles" /> Hand-finished quality</span>
        <span class="lp-trust__item"><Icon name="shirt" /> Premium made-to-order tees</span>
        <span class="lp-trust__item"><Icon name="zap" /> Ready in ~30 seconds</span>
        <span class="lp-trust__item"><Icon name="heart" /> Free preview, no signup</span>
      </div>

      <!-- How it works -->
      <section class="lp-section">
        <div class="lp-section__head">
          <p class="eyebrow">How it works</p>
          <h2>Three steps to a one-of-a-kind shirt</h2>
        </div>
        <div class="lp-steps">
          <div class="lp-step">
            <span class="lp-step__num">1</span>
            <h3>Pick a style</h3>
            <p>Choose from 12 legendary looks — superhero, samurai, astronaut and more.</p>
          </div>
          <div class="lp-step">
            <span class="lp-step__num">2</span>
            <h3>Upload a photo</h3>
            <p>Add a clear photo of your pet. One upload is all it takes.</p>
          </div>
          <div class="lp-step">
            <span class="lp-step__num">3</span>
            <h3>Wear it</h3>
            <p>Preview it on the shirt, pick your color and size, and we print it to order.</p>
          </div>
        </div>
      </section>

      <!-- Styles gallery -->
      <section class="lp-section lp-section--tint">
        <div class="lp-section__body">
          <div class="lp-section__head">
            <p class="eyebrow">12 legendary styles</p>
            <h2>Which legend is your pet?</h2>
            <p>A world for every personality. Try as many as you like — previews are always free.</p>
          </div>
          <div class="lp-styles">
            <RouterLink
              v-for="s in STYLES"
              :key="s.key"
              class="lp-style"
              :to="`/pet-portrait/create?style=${s.key}`"
              :aria-label="`Create a ${s.label} pet portrait`"
            >
              <img :src="`/images/pet-styles/${s.key}.png`" :alt="`${s.label} pet portrait style`" loading="lazy" />
              <span class="lp-style__label">{{ s.label }}</span>
            </RouterLink>
          </div>
          <div class="lp-section__head" style="margin-top: 40px; margin-bottom: 0">
            <RouterLink class="button" to="/pet-portrait/create">Pick your style →</RouterLink>
          </div>
        </div>
      </section>

      <!-- Lifestyle stories -->
      <section class="lp-story">
        <div class="lp-story__row">
          <div class="lp-story__photo">
            <img src="/images/pet-lifestyle/park.jpg" alt="Four friends walking their dogs in the park, each wearing a different custom pet portrait shirt" loading="lazy" />
          </div>
          <div class="lp-story__text">
            <p class="eyebrow">Real people, real pets</p>
            <h2>A shirt the whole crew wants</h2>
            <p>From dog-park meetups to family game night, InkSpirit shirts are made to actually be worn — soft, premium, and unmistakably yours.</p>
            <RouterLink class="button button--outline" to="/pet-portrait/create">Make yours →</RouterLink>
          </div>
        </div>
        <div class="lp-story__row lp-story__row--reverse">
          <div class="lp-story__photo">
            <img src="/images/pet-lifestyle/cozy.jpg" alt="A woman relaxing on the couch with her dog, wearing a pirate pet portrait shirt" loading="lazy" />
          </div>
          <div class="lp-story__text">
            <p class="eyebrow">The perfect gift</p>
            <h2>It hits home</h2>
            <p>There’s nothing like seeing your best friend turned into a legend on a shirt. It’s the gift people actually keep — and wear.</p>
            <RouterLink class="button button--outline" to="/pet-portrait/create">Start a gift →</RouterLink>
          </div>
        </div>
      </section>

      <ReviewStrip />

      <!-- FAQ -->
      <section class="lp-section lp-section--tint">
        <div class="lp-section__body">
          <div class="lp-section__head">
            <p class="eyebrow">Good to know</p>
            <h2>Questions, answered</h2>
          </div>
          <div class="lp-faq">
            <details v-for="(f, i) in FAQS" :key="i" class="lp-faq__item">
              <summary>{{ f.q }}</summary>
              <p>{{ f.a }}</p>
            </details>
          </div>
        </div>
      </section>

      <!-- Closing CTA -->
      <section class="lp-cta">
        <div class="lp-cta__inner">
          <h2>Your pet deserves the spotlight.</h2>
          <p>Upload a photo and see the magic in about 30 seconds — free to preview.</p>
          <RouterLink class="button" to="/pet-portrait/create">Create my portrait →</RouterLink>
          <p class="lp-cta__note">No signup · Free preview · Ships in 3–5 business days</p>
        </div>
      </section>
    </main>
  </div>
</template>
