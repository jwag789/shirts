<script setup>
import { RouterLink } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'
import ReviewStrip from '../components/ReviewStrip.vue'
import Icon from '../components/Icon.vue'
import { setDocumentHead } from '../composables/useDocumentHead'

setDocumentHead({
  title: 'Custom Team Shirts — Design Your Team’s Look in Seconds · InkSpirit',
  description:
    'Enter your team name, pick a style, and our AI designs authentic team merchandise — beer league, family reunion, company softball and more. Free preview, no signup, ready in ~30 seconds.',
  path: '/team-shirt',
})

// Example images live in /public/images/team-styles/ — swap freely.
const STYLES = [
  { key: 'modern-pro', label: 'Modern Pro' },
  { key: 'vintage', label: 'Vintage Sports' },
  { key: 'varsity', label: 'Varsity' },
  { key: 'streetwear', label: 'Streetwear' },
  { key: 'heritage', label: 'Heritage Crest' },
  { key: 'championship', label: 'Championship' },
  { key: 'esports', label: 'Esports' },
  { key: 'minimal', label: 'Minimal' },
]

const USE_CASES = [
  'Beer league', 'Family reunion', 'Company softball', 'Fantasy football',
  'Intramurals', 'Charity run', 'Bachelor party', 'Startup crew',
]

const FAQS = [
  { q: 'Do I need a logo already?', a: 'Nope. Just enter your team name and, optionally, a logo idea (like “bobcat” or “crossed bats”). The AI builds the graphic for you — or leave it blank for a clean typographic design.' },
  { q: 'Can I match our team colors?', a: 'Yes. Pick a color palette or fine-tune your own primary and secondary colors. Prefer a surprise? Let the AI choose a palette that fits your style.' },
  { q: 'Can I order for a whole team?', a: 'Absolutely. Preview your design, then order as many shirts as you need in the sizes and colors you want — each one printed to order, no minimums.' },
  { q: 'How long until it ships?', a: 'Every shirt is made to order and ships in about 3–5 business days, with tracking emailed to you when it’s on the way.' },
]
</script>

<template>
  <div id="top" class="lp">
    <SiteHeader />

    <main>
      <!-- Hero -->
      <section class="lp-phero">
        <div class="lp-phero__copy">
          <p class="eyebrow">Custom team shirts</p>
          <h1 class="lp-phero__title">Design custom <span>team shirts.</span></h1>
          <p class="lp-phero__sub">
            Enter your team name, pick a style, and our AI designs authentic team merch — beer
            league, family reunion, company softball and more.
          </p>
          <div class="lp-phero__actions">
            <RouterLink class="button" to="/team-shirt/create">Design my team shirt →</RouterLink>
          </div>
          <p class="lp-phero__trust">Free preview · No signup · Ships in 3–5 days</p>
        </div>
        <div class="lp-phero__photo">
          <img
            src="/images/team-lifestyle/volleyball.jpg"
            alt="An intramural volleyball team walking on the beach at sunset in matching custom team shirts"
          />
        </div>
      </section>

      <!-- Trust strip -->
      <div class="lp-trust">
        <span class="lp-trust__item"><Icon name="trophy" /> Authentic team look</span>
        <span class="lp-trust__item"><Icon name="palette" /> Your name &amp; colors</span>
        <span class="lp-trust__item"><Icon name="zap" /> Ready in ~30 seconds</span>
        <span class="lp-trust__item"><Icon name="shirt" /> Made-to-order tees</span>
      </div>

      <!-- How it works -->
      <section class="lp-section">
        <div class="lp-section__head">
          <p class="eyebrow">How it works</p>
          <h2>From team name to team merch</h2>
        </div>
        <div class="lp-steps">
          <div class="lp-step">
            <span class="lp-step__num">1</span>
            <h3>Name your team</h3>
            <p>Add your team name and an optional subtitle or logo idea.</p>
          </div>
          <div class="lp-step">
            <span class="lp-step__num">2</span>
            <h3>Pick a style &amp; colors</h3>
            <p>Choose from 8 pro styles and set your palette — or let the AI decide.</p>
          </div>
          <div class="lp-step">
            <span class="lp-step__num">3</span>
            <h3>Wear it</h3>
            <p>Preview it on the shirt, choose sizes, and we print each one to order.</p>
          </div>
        </div>
      </section>

      <!-- Styles gallery -->
      <section class="lp-section lp-section--tint">
        <div class="lp-section__body">
          <div class="lp-section__head">
            <p class="eyebrow">8 pro styles</p>
            <h2>Pick your team’s vibe</h2>
            <p>From vintage collegiate to aggressive esports — there’s a look for every squad.</p>
          </div>
          <div class="lp-styles">
            <RouterLink
              v-for="s in STYLES"
              :key="s.key"
              class="lp-style"
              :to="`/team-shirt/create?style=${s.key}`"
              :aria-label="`Design a ${s.label} team shirt`"
            >
              <img :src="`/images/team-styles/${s.key}.png`" :alt="`${s.label} team logo style`" loading="lazy" />
              <span class="lp-style__label">{{ s.label }}</span>
            </RouterLink>
          </div>
          <div class="lp-section__head" style="margin-top: 40px; margin-bottom: 0">
            <RouterLink class="button" to="/team-shirt/create">Name my team →</RouterLink>
          </div>
        </div>
      </section>

      <!-- Lifestyle stories -->
      <section class="lp-story">
        <div class="lp-story__row">
          <div class="lp-story__photo">
            <img src="/images/team-lifestyle/family.jpg" alt="A large multigenerational family at a reunion, all wearing matching custom Pinecrest team shirts" loading="lazy" />
          </div>
          <div class="lp-story__text">
            <p class="eyebrow">Reunions &amp; groups</p>
            <h2>Everyone in matching merch</h2>
            <p>From family reunions to company retreats, outfit the whole crew in a design that looks pro — no order minimums, no setup fees.</p>
            <RouterLink class="button button--outline" to="/team-shirt/create">Design for a group →</RouterLink>
          </div>
        </div>
        <div class="lp-story__row lp-story__row--reverse">
          <div class="lp-story__photo">
            <img src="/images/team-lifestyle/mascot.jpg" alt="A rec-league team celebrating with their mascot, wearing matching Apex team shirts" loading="lazy" />
          </div>
          <div class="lp-story__text">
            <p class="eyebrow">Rec leagues &amp; clubs</p>
            <h2>Bring your team to life</h2>
            <p>Beer league, intramurals, esports — give your squad an authentic crest, mascot and colors worth showing off, ready in seconds.</p>
            <RouterLink class="button button--outline" to="/team-shirt/create">Name my team →</RouterLink>
          </div>
        </div>
      </section>

      <!-- Use cases -->
      <section class="lp-section">
        <div class="lp-section__head">
          <p class="eyebrow">Made for every crew</p>
          <h2>Perfect for…</h2>
        </div>
        <div class="lp-usecases">
          <span v-for="u in USE_CASES" :key="u" class="lp-usecase">{{ u }}</span>
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
          <h2>Rally the team.</h2>
          <p>Enter your team name and see your design in about 30 seconds — free to preview.</p>
          <RouterLink class="button" to="/team-shirt/create">Design my team shirt →</RouterLink>
          <p class="lp-cta__note">No signup · Free preview · Ships in 3–5 business days</p>
        </div>
      </section>
    </main>
  </div>
</template>
