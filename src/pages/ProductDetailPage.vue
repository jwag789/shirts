<script setup>
import { computed, ref, watch, watchEffect } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import ShirtCard from '../components/ShirtCard.vue'
import SiteHeader from '../components/SiteHeader.vue'
import { useCart } from '../composables/useCart'
import { products } from '../data/products'
import { setDocumentHead } from '../composables/useDocumentHead'
import { trackViewItem, makeItem } from '../analytics'

const route = useRoute()
const { addItem } = useCart()

const product = computed(() => products.find((item) => item.slug === route.params.slug) ?? products[0])

const activeSize = ref(product.value.sizes[2] ?? product.value.sizes[0])
const activeGallery = ref(product.value.gallery[0])

watch(
  product,
  (nextProduct) => {
    activeSize.value = nextProduct.sizes[2] ?? nextProduct.sizes[0]
    activeGallery.value = nextProduct.gallery[0]
    trackViewItem(makeItem({
      id: nextProduct.slug,
      name: nextProduct.name,
      category: nextProduct.collection,
      price: nextProduct.priceValue,
    }))
  },
  { immediate: true },
)

const relatedProducts = computed(() =>
  [...products.filter((item) => item.slug !== product.value.slug)]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3),
)

const addToBag = () => {
  addItem(product.value, undefined, activeSize.value)
}

watchEffect(() => {
  setDocumentHead({
    title: `${product.value.name} — ${product.value.collection} T-Shirt | InkSpirit Studio`,
    description: `${product.value.headline} ${product.value.price}, ${product.value.shipping}.`,
    path: `/products/${product.value.slug}`,
    image: product.value.cardImage,
  })
})
</script>

<template>
  <div id="top">
    <SiteHeader />

    <main>
      <section class="product-detail">
        <div class="product-gallery">
          <div class="product-thumbs" aria-label="Product images">
            <button
              v-for="image in product.gallery"
              :key="image"
              type="button"
              :class="{ 'is-active': image === activeGallery }"
              @click="activeGallery = image"
            >
              <img :src="image" :alt="`${product.name} thumbnail`" />
            </button>
          </div>

          <Transition name="gallery-fade" mode="out-in">
            <img :key="activeGallery" class="product-gallery__main" :src="activeGallery" :alt="product.name" />
          </Transition>
        </div>

        <div class="product-summary">
          <RouterLink class="eyebrow eyebrow--link" :to="`/collections/${product.collectionSlug}`">
            {{ product.collection }}
          </RouterLink>
          <div class="product-summary__title">
            <h1>{{ product.name }}</h1>
            <span>{{ product.price }}</span>
          </div>
          <p class="product-summary__headline">{{ product.headline }}</p>

          <div class="product-highlights">
            <article>
              <span>Ships</span>
              <strong>{{ product.shipping }}</strong>
            </article>
          </div>

          <div class="product-options">
            <div class="product-options__label">
              <span>Size</span>
              <strong>{{ activeSize }}</strong>
            </div>
            <div class="product-sizes">
              <button
                v-for="size in product.sizes"
                :key="size"
                class="product-sizes__item"
                :class="{ 'is-active': size === activeSize }"
                type="button"
                @click="activeSize = size"
              >
                {{ size }}
              </button>
            </div>
          </div>

          <div class="product-actions">
            <button class="button" type="button" @click="addToBag">Add to bag</button>
            <button class="button button--outline" type="button">Size guide</button>
          </div>

          <div class="product-accordion">
            <details open>
              <summary>Description</summary>
              <p>{{ product.longDescription }}</p>
            </details>
            <details>
              <summary>Details</summary>
              <ul>
                <li v-for="detail in product.details" :key="detail">{{ detail }}</li>
              </ul>
            </details>
            <details>
              <summary>Shipping</summary>
              <p>{{ product.shipping }}</p>
            </details>
          </div>
        </div>
      </section>

      <section class="content-section">
        <div class="section-heading">
          <div>
            <p class="eyebrow">You may also like</p>
            <h2>More picks</h2>
          </div>
        </div>

        <div class="product-grid">
          <ShirtCard v-for="shirt in relatedProducts" :key="shirt.slug" :shirt="shirt" list-name="Related products" />
        </div>
      </section>
    </main>
  </div>
</template>
