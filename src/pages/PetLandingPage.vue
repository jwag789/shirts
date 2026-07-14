<script setup>
import { RouterLink } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'
import ReviewStrip from '../components/ReviewStrip.vue'
import { setDocumentHead } from '../composables/useDocumentHead'

setDocumentHead({
  title: 'Custom Pet Portrait Shirts — Turn Your Pet Into a Legend · InkSpirit',
  description:
    'Upload one photo and our AI turns your pet into a superhero, samurai, astronaut and more — hand-finished and printed on a premium tee. Free preview, no signup, ready in ~30 seconds.',
  path: '/pet-portrait',
})

// Swap these example images for your own hero/portrait photos anytime — the
// filenames in /public/images/pet-styles/ drive this gallery.
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

const FEATURES = [
  { icon: '🎨', title: 'Hand-finished quality', desc: 'Every portrait is AI-generated then reviewed so your pet looks unmistakably like themselves.' },
  { icon: '👕', title: 'Premium tees', desc: 'Printed to order on soft, durable shirts — built to survive the wash and look great for years.' },
  { icon: '⚡', title: 'Ready in ~30 seconds', desc: 'See your portrait on the shirt instantly. No waiting, no back-and-forth with a designer.' },
  { icon: '💛', title: 'Free preview, no signup', desc: 'Generate and preview your design before you pay a cent. Only buy it if you love it.' },
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
      <section class="lp-hero">
        <div class="lp-hero__inner">
          <div class="lp-hero__copy">
            <p class="eyebrow">Custom pet portraits · AI-powered</p>
            <h1 class="lp-hero__title">Turn your pet<br />into a <span>legend.</span></h1>
            <p class="lp-hero__sub">
              Upload one photo and watch your best friend become a superhero, samurai, pirate or
              astronaut — hand-finished and printed on a premium tee.
            </p>
            <div class="lp-hero__actions">
              <RouterLink class="button" to="/pet-portrait/create">Create my portrait →</RouterLink>
              <span class="lp-hero__note">Free preview · No signup needed</span>
            </div>
          </div>

          <div class="lp-hero__media">
            <RouterLink to="/pet-portrait/create" class="lp-hero__frame" aria-label="Create a custom pet portrait">
              <img
                src="/images/dog-ai.png"
                alt="A dog's photo transformed into superhero, viking, pirate, astronaut and samurai portraits printed on a t-shirt"
              />
            </RouterLink>
            <div class="lp-badge lp-badge--tl">✨ 12 legendary styles</div>
            <div class="lp-badge lp-badge--br">⚡ Ready in ~30s</div>
          </div>
        </div>
      </section>

      <!-- How it works -->
      <section class="lp-section">
        <div class="lp-section__head">
          <p class="eyebrow">How it works</p>
          <h2>Three steps to a one-of-a-kind shirt</h2>
          <p>No design skills, no account, no waiting on a human artist.</p>
        </div>
        <div class="lp-steps">
          <div class="lp-step">
            <span class="lp-step__num">1</span>
            <h3>Upload a photo</h3>
            <p>Pick a clear photo of your pet. One upload is all it takes.</p>
          </div>
          <div class="lp-step">
            <span class="lp-step__num">2</span>
            <h3>Pick a style</h3>
            <p>Choose from 12 legendary looks — superhero, samurai, astronaut and more.</p>
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
            <RouterLink class="button" to="/pet-portrait/create">Start with my photo →</RouterLink>
          </div>
        </div>
      </section>

      <!-- Why -->
      <section class="lp-section">
        <div class="lp-section__head">
          <p class="eyebrow">Why InkSpirit</p>
          <h2>Made to be worn, not just admired</h2>
        </div>
        <div class="lp-features">
          <div v-for="f in FEATURES" :key="f.title" class="lp-feature">
            <div class="lp-feature__icon">{{ f.icon }}</div>
            <h3>{{ f.title }}</h3>
            <p>{{ f.desc }}</p>
          </div>
        </div>
      </section>

      <ReviewStrip />

      <!-- FAQ -->
      <section class="lp-section">
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
