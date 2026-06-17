<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import CollectionCard from '../components/CollectionCard.vue'
import ShirtCard from '../components/ShirtCard.vue'
import SiteHeader from '../components/SiteHeader.vue'
import { collections, getProductsByCollection } from '../data/products'
import { setDocumentHead } from '../composables/useDocumentHead'
import banner1 from '../../images/banner-1.png'
import banner2 from '../../images/banner-2.png'
import banner3 from '../../images/banner-3.png'

setDocumentHead({
  title: 'InkSpirit Studio — Original Graphic T-Shirts & Custom Pet Portraits',
  description: 'Original, made-to-order graphic t-shirts: Japanese-inspired art, illustrated puns, raw ink designs, and custom AI-generated pet portrait tees.',
  path: '/',
  image: '/images/mockups/cherry-horizon-1-lifestyle.jpg',
})

const PET_STYLES = [
  { icon: '⚡', label: 'Superhero', gradient: 'linear-gradient(160deg, #0f0c29 0%, #302b63 55%, #c0392b 100%)' },
  { icon: '🪓', label: 'Viking',    gradient: 'linear-gradient(160deg, #1a0a00 0%, #5c3317 55%, #c8972a 100%)' },
  { icon: '☠️', label: 'Pirate',    gradient: 'linear-gradient(160deg, #020b18 0%, #0d2137 55%, #1a6b8a 100%)' },
  { icon: '🚀', label: 'Astronaut', gradient: 'linear-gradient(160deg, #000005 0%, #0a0a2e 55%, #3535a0 100%)' },
  { icon: '⛩️', label: 'Samurai',   gradient: 'linear-gradient(160deg, #0d0000 0%, #3d0000 55%, #a0001a 100%)' },
  { icon: '🔮', label: 'Wizard',    gradient: 'linear-gradient(160deg, #070012 0%, #1e0040 55%, #7b2fff 100%)' },
]

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
const categoryRail = ref(null)

const scrollCategoryRail = (direction) => {
  const rail = categoryRail.value
  if (!rail) return
  rail.scrollBy({ left: direction * Math.round(rail.clientWidth * 0.88), behavior: 'smooth' })
}

onMounted(() => {
  startHeroCarousel()
})

onBeforeUnmount(() => {
  stopHeroCarousel()
})
</script>

<template>
  <div id="top">
    <SiteHeader />

    <main>
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

      <section id="shop" class="content-section">
        <div v-reveal class="section-heading section-heading--rail">
          <div>
            <p class="eyebrow">Shop collections</p>
            <h2>Shop by category</h2>
          </div>
          <div class="rail-controls" aria-label="Category controls">
            <button type="button" @click="scrollCategoryRail(-1)" aria-label="Scroll categories left">‹</button>
            <button type="button" @click="scrollCategoryRail(1)" aria-label="Scroll categories right">›</button>
          </div>
        </div>
        <div ref="categoryRail" class="product-rail category-rail" tabindex="0" aria-label="Categories carousel">
          <CollectionCard
            v-for="collection in collections"
            :key="collection.slug"
            :collection="collection"
            :product-count="getProductsByCollection(collection.slug).length"
          />
        </div>
      </section>

      <!-- Pet Portrait promo -->
      <section class="pet-promo" v-reveal>
        <div class="pet-promo__inner">
          <div class="pet-promo__copy">
            <p class="eyebrow eyebrow--light">Custom — AI powered</p>
            <h2 class="pet-promo__title">Your pet,<br>legendary.</h2>
            <p class="pet-promo__desc">Upload a photo of your pet and we'll transform them into a one-of-a-kind fantasy portrait — printed on a premium tee. Superhero, pirate, samurai, and more.</p>
            <RouterLink class="button pet-promo__cta" to="/pet-portrait">Create my portrait →</RouterLink>
          </div>
          <div class="pet-promo__grid">
            <RouterLink
              v-for="s in PET_STYLES"
              :key="s.icon"
              class="pet-promo__chip"
              :style="{ background: s.gradient }"
              to="/pet-portrait"
              :aria-label="s.label"
            >
              <span class="pet-promo__chip-icon">{{ s.icon }}</span>
              <span class="pet-promo__chip-label">{{ s.label }}</span>
            </RouterLink>
          </div>
        </div>
      </section>

      <section
        v-for="collection in collections"
        :key="collection.slug"
        class="content-section"
      >
        <div v-reveal class="section-heading">
          <div>
            <p class="eyebrow">{{ collection.eyebrow }}</p>
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

      <section class="site-footer">
        <div>
          <img src="/images/is-logo-2.png" alt="InkSpirit" class="footer-logo" />
          <p>Original graphic t-shirts, made to order and organized by artwork style.</p>
        </div>
        <nav aria-label="Footer">
          <RouterLink to="/collections">Collections</RouterLink>
          <RouterLink to="/collections/japanese-style">Torii</RouterLink>
          <RouterLink to="/collections/pun-shirts">Funny Business</RouterLink>
          <RouterLink to="/collections/ink-art">Fine Lines</RouterLink>
          <RouterLink to="/pet-portrait">Custom Pet Portraits</RouterLink>
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
