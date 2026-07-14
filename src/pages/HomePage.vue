<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import CollectionCard from '../components/CollectionCard.vue'
import ShirtCard from '../components/ShirtCard.vue'
import SiteHeader from '../components/SiteHeader.vue'
import EmailSignup from '../components/EmailSignup.vue'
import ReviewStrip from '../components/ReviewStrip.vue'
import { collections, getProductsByCollection } from '../data/products'
import { setDocumentHead } from '../composables/useDocumentHead'
import banner1 from '../../images/banner-1.png'
import banner2 from '../../images/banner-2.png'
import banner3 from '../../images/banner-3.png'
import bannerTorii from '../../images/banner-torii-category.jpg'
import bannerFunnyBusiness from '../../images/banner-funny-business-category.jpg'
import bannerFineLines from '../../images/banner-fine-lines-category.jpg'

const CATEGORY_BANNERS = {
  'japanese-style': { src: bannerTorii, alt: 'Zen Journey collection banner — Japanese-inspired graphic tees' },
  'pun-shirts': { src: bannerFunnyBusiness, alt: 'Funny Business collection banner — illustrated pun tees' },
  'ink-art': { src: bannerFineLines, alt: 'Fine Lines collection banner — raw ink illustration tees' },
}

setDocumentHead({
  title: 'InkSpirit Studio — Original Graphic T-Shirts & Custom Pet Portraits',
  description: 'Original, made-to-order graphic t-shirts: Japanese-inspired art, illustrated puns, raw ink designs, and custom AI-generated pet portrait tees.',
  path: '/',
  image: '/images/mockups/cherry-horizon-1-lifestyle.jpg',
})

const HERO_BANNERS = [
  { src: banner1, alt: 'InkSpirit banner featuring graphic t-shirt designs' },
  { src: banner2, alt: 'InkSpirit banner showcasing bold illustrated apparel' },
  { src: banner3, alt: 'InkSpirit banner with signature streetwear-inspired artwork' },
]

const HERO_AUTOPLAY_MS = 5000
const activeHeroSlide = ref(0)
let heroCarouselInterval = null

const goToHeroSlide = (index) => {
  activeHeroSlide.value = index
}

const nextHeroSlide = () => {
  activeHeroSlide.value = (activeHeroSlide.value + 1) % HERO_BANNERS.length
}

const stopHeroCarousel = () => {
  if (heroCarouselInterval === null) return
  window.clearInterval(heroCarouselInterval)
  heroCarouselInterval = null
}

const startHeroCarousel = () => {
  if (heroCarouselInterval !== null || HERO_BANNERS.length < 2) return
  heroCarouselInterval = window.setInterval(nextHeroSlide, HERO_AUTOPLAY_MS)
}

const selectHeroSlide = (index) => {
  goToHeroSlide(index)
  stopHeroCarousel()
  startHeroCarousel()
}

const pauseHeroCarousel = () => {
  stopHeroCarousel()
}

const resumeHeroCarousel = () => {
  startHeroCarousel()
}
// ── Personalize carousel (pet portrait + team shirt promos) ──────────────────
const PERSONALIZE_SLIDES = 2
const PERSONALIZE_AUTOPLAY_MS = 7000
const activePersonalizeSlide = ref(0)
let personalizeInterval = null

const nextPersonalizeSlide = () => {
  activePersonalizeSlide.value = (activePersonalizeSlide.value + 1) % PERSONALIZE_SLIDES
}

const stopPersonalizeCarousel = () => {
  if (personalizeInterval === null) return
  window.clearInterval(personalizeInterval)
  personalizeInterval = null
}

const startPersonalizeCarousel = () => {
  if (personalizeInterval !== null) return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  personalizeInterval = window.setInterval(nextPersonalizeSlide, PERSONALIZE_AUTOPLAY_MS)
}

const selectPersonalizeSlide = (index) => {
  activePersonalizeSlide.value = index
  stopPersonalizeCarousel()
  startPersonalizeCarousel()
}

const stepPersonalizeSlide = (direction) => {
  activePersonalizeSlide.value =
    (activePersonalizeSlide.value + direction + PERSONALIZE_SLIDES) % PERSONALIZE_SLIDES
  stopPersonalizeCarousel()
  startPersonalizeCarousel()
}

const categoryRail = ref(null)

const scrollCategoryRail = (direction) => {
  const rail = categoryRail.value
  if (!rail) return
  rail.scrollBy({ left: direction * Math.round(rail.clientWidth * 0.88), behavior: 'smooth' })
}

onMounted(() => {
  startHeroCarousel()
  startPersonalizeCarousel()
})

onBeforeUnmount(() => {
  stopHeroCarousel()
  stopPersonalizeCarousel()
})
</script>

<template>
  <div id="top">
    <SiteHeader />

    <main>
      <!-- Personalize carousel — pet portraits + team shirts -->
      <div
        class="personalize-carousel"
        v-reveal
        @mouseenter="stopPersonalizeCarousel"
        @mouseleave="startPersonalizeCarousel"
        @focusin="stopPersonalizeCarousel"
        @focusout="startPersonalizeCarousel"
      >
        <div class="personalize-carousel__viewport">
          <div
            class="personalize-carousel__track"
            :style="{ transform: `translateX(${-activePersonalizeSlide * (100 / PERSONALIZE_SLIDES)}%)` }"
          >
      <!-- Personalize — flagship feature -->
      <section class="personalize">
        <div class="personalize__inner">
          <div class="personalize__copy">
            <p class="eyebrow">Custom · AI-powered</p>
            <h2 class="personalize__title">Turn your pet<br>into a <span>legend.</span></h2>
            <p class="personalize__desc">
              Upload one photo and watch your best friend become a superhero, samurai,
              pirate, or astronaut — hand-finished and printed on a premium tee.
            </p>
            <div class="personalize__steps">
              <span><b>1</b> Upload a photo</span>
              <span><b>2</b> Pick a style</span>
              <span><b>3</b> Wear it</span>
            </div>
            <div class="personalize__actions">
              <RouterLink class="button personalize__cta" to="/pet-portrait">Create my portrait →</RouterLink>
              <span class="personalize__note">Free preview · No signup needed</span>
            </div>
          </div>

          <div class="personalize__showcase">
            <RouterLink to="/pet-portrait" class="personalize__frame" aria-label="Create a custom pet portrait">
              <img
                src="/images/dog-ai.png"
                alt="A dog's photo transformed into superhero, viking, pirate, astronaut and samurai portraits, printed on a t-shirt"
              />
            </RouterLink>
            <div class="personalize__badge personalize__badge--tl">✨ 12 legendary styles</div>
            <div class="personalize__badge personalize__badge--br">⚡ Ready in ~30s</div>
          </div>
        </div>
      </section>

      <!-- AI Team Shirt Generator -->
      <section class="personalize personalize--team">
        <div class="personalize__inner">
          <div class="personalize__copy">
            <p class="eyebrow">New · AI-powered</p>
            <h2 class="personalize__title">Design custom<br><span>team shirts.</span></h2>
            <p class="personalize__desc">
              Beer league, family reunion, company softball, or fantasy football — enter your
              team name, pick a style, and get authentic team merchandise you'd be proud to wear.
              Add each player's name &amp; number, too.
            </p>
            <div class="personalize__steps">
              <span><b>1</b> Name your team</span>
              <span><b>2</b> Pick a style</span>
              <span><b>3</b> Wear it</span>
            </div>
            <div class="personalize__actions">
              <RouterLink class="button personalize__cta" to="/team-shirt">Design my team shirt →</RouterLink>
              <span class="personalize__note">Free preview · No signup needed</span>
            </div>
          </div>

          <div class="personalize__showcase">
            <RouterLink to="/team-shirt" class="personalize__frame" aria-label="Design a custom team shirt">
              <img
                src="/images/team-banner.png"
                alt="A team name and logo concept typed into the generator, turned into an Ironhawks sports crest and printed on a navy t-shirt"
              />
            </RouterLink>
            <div class="personalize__badge personalize__badge--tl">🏆 8 pro styles</div>
            <div class="personalize__badge personalize__badge--br">⚡ Ready in ~30s</div>
          </div>
        </div>
      </section>
          </div>
        </div>

        <button
          class="personalize-carousel__arrow personalize-carousel__arrow--prev"
          type="button"
          aria-label="Previous"
          @click="stepPersonalizeSlide(-1)"
        >‹</button>
        <button
          class="personalize-carousel__arrow personalize-carousel__arrow--next"
          type="button"
          aria-label="Next"
          @click="stepPersonalizeSlide(1)"
        >›</button>

        <div class="personalize-carousel__dots" aria-label="Featured tools">
          <button
            v-for="index in PERSONALIZE_SLIDES"
            :key="`personalize-dot-${index}`"
            type="button"
            :class="{ 'is-active': index - 1 === activePersonalizeSlide }"
            :aria-label="`Show slide ${index}`"
            @click="selectPersonalizeSlide(index - 1)"
          />
        </div>
      </div>

      <!-- Hero carousel — temporarily hidden
      <section
        class="hero-carousel"
        @mouseenter="pauseHeroCarousel"
        @mouseleave="resumeHeroCarousel"
        @focusin="pauseHeroCarousel"
        @focusout="resumeHeroCarousel"
      >
        <div class="hero-carousel__slides" aria-hidden="true">
          <div
            v-for="(banner, index) in HERO_BANNERS"
            :key="banner.src"
            class="hero-carousel__slide"
            :class="{ 'is-active': index === activeHeroSlide }"
          >
            <img :src="banner.src" :alt="banner.alt" />
          </div>
        </div>
        <div class="hero-carousel__content">
          <p class="eyebrow">Original graphic tees</p>
          <h1>Wear art. Stand out.</h1>
          <p>Bold graphics, clean cuts — shirts for every style, made to order.</p>
          <RouterLink class="button" to="/collections">Shop all collections</RouterLink>
        </div>
        <div class="hero-carousel__controls" aria-label="Hero banner controls">
          <button
            v-for="(banner, index) in HERO_BANNERS"
            :key="`banner-control-${index}`"
            type="button"
            :class="{ 'is-active': index === activeHeroSlide }"
            @click="selectHeroSlide(index)"
          >
            <span class="sr-only">Show banner {{ index + 1 }}</span>
          </button>
        </div>
      </section>
      -->

      <section
        v-for="collection in collections"
        :key="collection.slug"
        class="content-section"
      >
        <RouterLink
          v-if="CATEGORY_BANNERS[collection.slug]"
          v-reveal
          :to="`/collections/${collection.slug}`"
          class="category-banner"
          :aria-label="`Shop the ${collection.name} collection`"
        >
          <img
            :src="CATEGORY_BANNERS[collection.slug].src"
            :alt="CATEGORY_BANNERS[collection.slug].alt"
            loading="lazy"
          />
        </RouterLink>

        <div v-if="!CATEGORY_BANNERS[collection.slug]" v-reveal class="section-heading">
          <div>
            <h2>{{ collection.name }}</h2>
          </div>
          <RouterLink class="button button--outline" :to="`/collections/${collection.slug}`">
            Shop all
          </RouterLink>
        </div>
        <div class="product-rail">
          <ShirtCard
            v-for="(shirt, i) in getProductsByCollection(collection.slug).slice(0, 4)"
            :key="shirt.slug"
            v-reveal="i * 80"
            :shirt="shirt"
          />
        </div>
      </section>

      <ReviewStrip />

      <section class="newsletter" v-reveal>
        <div class="newsletter__inner">
          <p class="eyebrow">Stay in the loop</p>
          <h2 class="newsletter__title">New designs, <span>weekly.</span></h2>
          <p class="newsletter__sub">
            Get first look at fresh drops, custom AI tools, and the occasional discount.
            No spam — unsubscribe anytime.
          </p>
          <EmailSignup source="home-footer" />
        </div>
      </section>

      <section class="site-footer">
        <div>
          <img src="/images/is-logo-2.png" alt="InkSpirit" class="footer-logo" />
          <p>Original graphic t-shirts, made to order and organized by artwork style.</p>
        </div>
        <nav aria-label="Footer">
          <RouterLink to="/collections">Collections</RouterLink>
          <RouterLink to="/pet-portrait">Custom Pet Portraits</RouterLink>
          <RouterLink to="/team-shirt">AI Team Shirts</RouterLink>
          <RouterLink to="/my-designs">My Designs</RouterLink>
          <RouterLink to="/reviews">Reviews</RouterLink>
          <RouterLink to="/orders">Track Your Order</RouterLink>
          <RouterLink to="/contact">Contact Us</RouterLink>
        </nav>
      </section>
      <div class="site-credit">
        <a href="https://www.kingdomwebbuilders.com" target="_blank" rel="noopener">
          <img src="/images/KW-logo.png" alt="Kingdom Web Builders" class="site-credit__logo" />
          <span>A Kingdom Web Builders site</span>
        </a>
      </div>
    </main>
  </div>
</template>
