<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import CollectionCard from '../components/CollectionCard.vue'
import ShirtCard from '../components/ShirtCard.vue'
import SiteHeader from '../components/SiteHeader.vue'
import { collections, getProductsByCollection, products } from '../data/products'

const heroSlides = [
  {
    title: 'Graphic tees with a sharper point of view.',
    copy: 'Original artwork, clean categories, and statement shirts made for everyday rotation.',
    image: '/images/IMG_2110.PNG',
    position: 'center 42%',
    fit: 'cover',
    scale: 1.005,
    overlay: 'linear-gradient(90deg, rgba(0, 0, 0, 0.64) 0%, rgba(0, 0, 0, 0.34) 42%, rgba(0, 0, 0, 0.12) 100%)',
    cta: 'Shop Graphic Tees',
    to: '/collections/japanese-style',
  },
  {
    title: 'Ink lines, anime heat, and graphics that hit.',
    copy: 'Browse collections built around distinct artwork styles instead of generic shirt listings.',
    image: '/images/SKETCH-1.png',
    position: '50% 50%',
    fit: 'cover',
    scale: 0.99,
    overlay: 'linear-gradient(90deg, rgba(0, 0, 0, 0.78) 0%, rgba(0, 0, 0, 0.48) 42%, rgba(0, 0, 0, 0.08) 100%)',
    cta: 'Shop Ink Art',
    to: '/collections/ink-art',
  },
  {
    title: 'Fresh designs without the clutter.',
    copy: 'Find new pieces quickly, compare the artwork clearly, and jump straight into the collection that fits your style.',
    image: '/images/IMG_2096.PNG',
    position: 'center center',
    fit: 'cover',
    scale: 0.985,
    overlay: 'linear-gradient(90deg, rgba(0, 0, 0, 0.62) 0%, rgba(0, 0, 0, 0.36) 46%, rgba(0, 0, 0, 0.14) 100%)',
    cta: 'Shop New Arrivals',
    to: '/collections',
  },
]

const activeSlide = ref(0)
const slide = computed(() => heroSlides[activeSlide.value])
const freshRail = ref(null)
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

const scrollFreshRail = (direction) => {
  const rail = freshRail.value
  if (!rail) {
    return
  }

  const amount = Math.round(rail.clientWidth * 0.88)
  rail.scrollBy({
    left: direction * amount,
    behavior: 'smooth',
  })
}

const scrollCategoryRail = (direction) => {
  const rail = categoryRail.value
  if (!rail) {
    return
  }

  const amount = Math.round(rail.clientWidth * 0.88)
  rail.scrollBy({
    left: direction * amount,
    behavior: 'smooth',
  })
}

onMounted(() => {
  startHeroTimer()
})

onBeforeUnmount(() => {
  window.clearInterval(heroTimer)
})
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
              '--slide-fit': heroSlide.fit ?? 'cover',
              '--slide-width': heroSlide.width ?? '100%',
              '--slide-scale': heroSlide.scale,
              '--slide-overlay': heroSlide.overlay,
            }"
          >
            <img :src="heroSlide.image" :alt="heroSlide.title" />
          </div>
        </div>

        <Transition name="hero-copy" mode="out-in">
          <div :key="slide.title" class="hero-carousel__content">
            <p class="eyebrow">New release</p>
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
        <div class="section-heading section-heading--rail">
          <div>
            <p class="eyebrow">Shop collections</p>
            <h2>Shop by category</h2>
          </div>

          <div class="rail-controls" aria-label="Category controls">
            <button type="button" @click="scrollCategoryRail(-1)" aria-label="Scroll categories left">
              ‹
            </button>
            <button type="button" @click="scrollCategoryRail(1)" aria-label="Scroll categories right">
              ›
            </button>
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

      <section class="image-banner image-banner--dark">
        <img src="/images/IMG_2095.PNG" alt="Japanese Style collection" loading="lazy" />
        <div>
          <p class="eyebrow">Japanese Style</p>
          <h2>Artwork-forward tees with clean contrast.</h2>
          <RouterLink class="button button--light" to="/collections/japanese-style">
            Shop Japanese Style
          </RouterLink>
        </div>
      </section>

      <section id="new" class="content-section">
        <div class="section-heading section-heading--rail">
          <div>
            <p class="eyebrow">New arrivals</p>
            <h2>Fresh shirts</h2>
          </div>

          <div class="rail-controls" aria-label="Fresh shirts controls">
            <button type="button" @click="scrollFreshRail(-1)" aria-label="Scroll fresh shirts left">
              ‹
            </button>
            <button type="button" @click="scrollFreshRail(1)" aria-label="Scroll fresh shirts right">
              ›
            </button>
          </div>
        </div>

        <div ref="freshRail" class="product-rail" tabindex="0" aria-label="Fresh shirts carousel">
          <ShirtCard v-for="shirt in products" :key="shirt.slug" :shirt="shirt" />
        </div>
      </section>

      <section class="split-feature">
        <img src="/images/IMG_2119.PNG" alt="Pun Shirts collection" loading="lazy" />
        <div>
          <p class="eyebrow">Pun Shirts</p>
          <h2>Sharp jokes, clean art, no throwaway novelty feel.</h2>
          <p>
            Pun shirts should be easy to read, easy to wear, and still feel designed. This collection
            keeps the humor clear and the artwork clean.
          </p>
          <RouterLink class="button" to="/collections/pun-shirts">Shop Pun Shirts</RouterLink>
        </div>
      </section>

      <section class="image-banner">
        <img src="/images/SKETCH-2.png" alt="Featured shirt banner" loading="lazy" />
        <div>
          <p class="eyebrow">Limited run</p>
          <h2>Raw ink artwork with a stronger gallery feel.</h2>
          <RouterLink class="button button--light" to="/products/sketch-two">
            Shop the featured tee
          </RouterLink>
        </div>
      </section>

      <section class="site-footer">
        <div>
          <h2>InkSpirit</h2>
          <p>Original graphic t-shirts, made to order and organized by artwork style.</p>
        </div>
        <nav aria-label="Footer">
          <RouterLink to="/collections">Collections</RouterLink>
          <RouterLink to="/collections/japanese-style">Japanese Style</RouterLink>
          <RouterLink to="/collections/pun-shirts">Pun Shirts</RouterLink>
          <RouterLink to="/collections/ink-art">Ink Art</RouterLink>
          <RouterLink to="/collections/anime">Anime</RouterLink>
        </nav>
      </section>
    </main>
  </div>
</template>
