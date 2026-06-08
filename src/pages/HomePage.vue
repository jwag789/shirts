<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import CollectionCard from '../components/CollectionCard.vue'
import ShirtCard from '../components/ShirtCard.vue'
import SiteHeader from '../components/SiteHeader.vue'
import { collections, getProductsByCollection } from '../data/products'

const PET_STYLES = [
  { icon: '⚡', label: 'Superhero', gradient: 'linear-gradient(160deg, #0f0c29 0%, #302b63 55%, #c0392b 100%)' },
  { icon: '🪓', label: 'Viking',    gradient: 'linear-gradient(160deg, #1a0a00 0%, #5c3317 55%, #c8972a 100%)' },
  { icon: '☠️', label: 'Pirate',    gradient: 'linear-gradient(160deg, #020b18 0%, #0d2137 55%, #1a6b8a 100%)' },
  { icon: '🚀', label: 'Astronaut', gradient: 'linear-gradient(160deg, #000005 0%, #0a0a2e 55%, #3535a0 100%)' },
  { icon: '⛩️', label: 'Samurai',   gradient: 'linear-gradient(160deg, #0d0000 0%, #3d0000 55%, #a0001a 100%)' },
  { icon: '🔮', label: 'Wizard',    gradient: 'linear-gradient(160deg, #070012 0%, #1e0040 55%, #7b2fff 100%)' },
]

const heroSlides = [
  {
    eyebrow: 'Torii',
    title: 'Shirts built around the artwork.',
    copy: 'Japanese-inspired graphics with clean contrast and an everyday feel that doesn\'t try too hard.',
    image: '/images/IMG_2110.PNG',
    scale: 1.005,
    overlay: 'linear-gradient(90deg, rgba(0, 0, 0, 0.64) 0%, rgba(0, 0, 0, 0.34) 42%, rgba(0, 0, 0, 0.12) 100%)',
    cta: 'Shop Torii',
    to: '/collections/japanese-style',
  },
  {
    eyebrow: 'Fine Lines',
    title: 'Bold lines, raw marks, strong graphics.',
    copy: 'Sketch energy and heavy ink turned into shirts worth wearing — not just owning.',
    image: '/images/SKETCH-1.png',
    scale: 0.99,
    overlay: 'linear-gradient(90deg, rgba(0, 0, 0, 0.78) 0%, rgba(0, 0, 0, 0.48) 42%, rgba(0, 0, 0, 0.08) 100%)',
    cta: 'Shop Fine Lines',
    to: '/collections/ink-art',
  },
  {
    eyebrow: 'All collections',
    title: 'Four collections worth a look.',
    copy: 'Torii, Funny Business, Fine Lines, and Frame Rate — all made to order, all with the artwork up front.',
    image: '/images/IMG_2096.PNG',
    scale: 0.985,
    overlay: 'linear-gradient(90deg, rgba(0, 0, 0, 0.62) 0%, rgba(0, 0, 0, 0.36) 46%, rgba(0, 0, 0, 0.14) 100%)',
    cta: 'Browse all collections',
    to: '/collections',
  },
]

const activeSlide = ref(0)
const slide = computed(() => heroSlides[activeSlide.value])
const categoryRail = ref(null)

let heroTimer

const startHeroTimer = () => {
  window.clearInterval(heroTimer)
  heroTimer = window.setInterval(nextSlide, 7000)
}

const showSlide = (index) => {
  activeSlide.value = index
  startHeroTimer()
}

const nextSlide = () => {
  activeSlide.value = (activeSlide.value + 1) % heroSlides.length
}

const scrollCategoryRail = (direction) => {
  const rail = categoryRail.value
  if (!rail) return
  rail.scrollBy({ left: direction * Math.round(rail.clientWidth * 0.88), behavior: 'smooth' })
}

onMounted(() => startHeroTimer())
onBeforeUnmount(() => window.clearInterval(heroTimer))
</script>

<template>
  <div id="top">
    <SiteHeader />

    <main>
      <section class="hero-carousel">
        <div class="hero-carousel__slides" aria-hidden="true">
          <div
            v-for="(heroSlide, index) in heroSlides"
            :key="heroSlide.title"
            class="hero-carousel__slide"
            :class="{ 'is-active': index === activeSlide }"
            :style="{
              '--slide-position': heroSlide.position,
              '--slide-scale': heroSlide.scale,
              '--slide-overlay': heroSlide.overlay,
            }"
          >
            <img :src="heroSlide.image" :alt="heroSlide.title" />
          </div>
        </div>

        <Transition name="hero-copy" mode="out-in">
          <div :key="slide.title" class="hero-carousel__content">
            <p class="eyebrow">{{ slide.eyebrow }}</p>
            <h1>{{ slide.title }}</h1>
            <p>{{ slide.copy }}</p>
            <RouterLink class="button" :to="slide.to">{{ slide.cta }}</RouterLink>
          </div>
        </Transition>

        <div class="hero-carousel__controls" aria-label="Hero slides">
          <button
            v-for="(heroSlide, index) in heroSlides"
            :key="heroSlide.title"
            type="button"
            :class="{ 'is-active': index === activeSlide }"
            :aria-label="`Show slide ${index + 1}`"
            @click="showSlide(index)"
          ></button>
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
