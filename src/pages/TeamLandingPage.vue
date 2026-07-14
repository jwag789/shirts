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
  'Summer league', 'Charity run', 'Bachelor party', 'Startup crew',
]

const FEATURES = [
  { icon: 'trophy', title: 'Authentic team look', desc: 'Pro-grade crests, wordmarks and mascots — the kind of design you’d pay an agency for.' },
  { icon: 'palette', title: 'Your name & colors', desc: 'Your team name, subtitle and color palette baked into every design. Or let the AI choose.' },
  { icon: 'zap', title: 'Ready in ~30 seconds', desc: 'Go from an idea to a shirt-ready graphic instantly — no designer, no revisions queue.' },
  { icon: 'shirt', title: 'Made-to-order tees', desc: 'Printed on premium shirts and shipped with tracking. Order one or outfit the whole squad.' },
]

const FAQS = [
  { q: 'Do I need a logo already?', a: 'Nope. Just enter your team name and, optionally, a logo idea (like “bobcat” or “crossed bats”). The AI builds the graphic for you — or leave it blank for a clean typographic design.' },
  { q: 'Can I match our team colors?', a: 'Yes. Pick a color palette or fine-tune your own primary and secondary colors. Prefer a surprise? Let the AI choose a palette that fits your style.' },
  { q: 'Can I order for a whole team?', a: 'Absolutely. Preview your design, then order as many shirts as you need in the sizes and colors you want — each one printed to order.' },
  { q: 'How long until it ships?', a: 'Every shirt is made to order and ships in about 3–5 business days, with tracking emailed to you when it’s on the way.' },
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
            <p class="eyebrow">Custom team shirts · AI-powered</p>
            <h1 class="lp-hero__title">Design custom<br /><span>team shirts.</span></h1>
            <p class="lp-hero__sub">
              Beer league, family reunion, company softball or fantasy football — enter your team
              name, pick a style, and get merch you’d be proud to wear.
            </p>
            <div class="lp-hero__actions">
              <RouterLink class="button" to="/team-shirt/create">Design my team shirt →</RouterLink>
              <span class="lp-hero__note">Free preview · No signup needed</span>
            </div>
          </div>

          <div class="lp-hero__media">
            <RouterLink to="/team-shirt/create" class="lp-hero__frame" aria-label="Design a custom team shirt">
              <img
                src="/images/team-banner.png"
                alt="A team name and logo concept turned into a sports crest and printed on a navy t-shirt"
              />
            </RouterLink>
            <div class="lp-badge lp-badge--tl"><Icon name="trophy" /> 8 pro styles</div>
            <div class="lp-badge lp-badge--br"><Icon name="zap" /> Ready in ~30s</div>
          </div>
        </div>
      </section>

      <!-- How it works -->
      <section class="lp-section">
        <div class="lp-section__head">
          <p class="eyebrow">How it works</p>
          <h2>From team name to team merch</h2>
          <p>No designer, no order minimums, no account required.</p>
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

      <!-- Why -->
      <section class="lp-section lp-section--tint">
        <div class="lp-section__body">
          <div class="lp-section__head">
            <p class="eyebrow">Why InkSpirit</p>
            <h2>Agency-quality, in seconds</h2>
          </div>
          <div class="lp-features">
            <div v-for="f in FEATURES" :key="f.title" class="lp-feature">
              <div class="lp-feature__icon"><Icon :name="f.icon" /></div>
              <h3>{{ f.title }}</h3>
              <p>{{ f.desc }}</p>
            </div>
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
          <h2>Rally the team.</h2>
          <p>Enter your team name and see your design in about 30 seconds — free to preview.</p>
          <RouterLink class="button" to="/team-shirt/create">Design my team shirt →</RouterLink>
          <p class="lp-cta__note">No signup · Free preview · Ships in 3–5 business days</p>
        </div>
      </section>
    </main>
  </div>
</template>
