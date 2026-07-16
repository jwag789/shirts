<script setup>
import { computed, watchEffect } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'
import ShirtCard from '../components/ShirtCard.vue'
import { getSeoPageBySlug } from '../data/seoPages'
import { products, getProductsByCollection, getCollectionBySlug } from '../data/products'
import { setDocumentHead } from '../composables/useDocumentHead'

const route = useRoute()

const page = computed(() => getSeoPageBySlug(route.params.slug))

const relatedProducts = computed(() => {
  if (!page.value) return []
  if (page.value.type === 'collection') return getProductsByCollection(page.value.refSlug)
  if (page.value.type === 'product') {
    const product = products.find((p) => p.slug === page.value.refSlug)
    return product ? [product] : []
  }
  return []
})

const collection = computed(() => {
  if (page.value?.type !== 'collection') return null
  return getCollectionBySlug(page.value.refSlug)
})

watchEffect(() => {
  if (!page.value) return
  const product = page.value.type === 'product' ? products.find((p) => p.slug === page.value.refSlug) : null
  setDocumentHead({
    title: page.value.metaTitle,
    description: page.value.metaDescription,
    path: `/info/${page.value.slug}`,
    image: product?.cardImage,
  })
})
</script>

<template>
  <div id="top" v-if="page">
    <SiteHeader />

    <main>
      <section class="collection-title">
        <p class="eyebrow">InkSpirit Studio</p>
        <h1>{{ page.h1 }}</h1>
        <p>{{ page.intro }}</p>
      </section>

      <section class="content-section">
        <ul class="seo-bullets">
          <li v-for="bullet in page.bullets" :key="bullet">{{ bullet }}</li>
        </ul>
        <p v-if="page.extra" class="seo-extra">{{ page.extra }}</p>

        <div v-if="relatedProducts.length" class="product-grid" style="margin-top: 32px">
          <ShirtCard
            v-for="shirt in relatedProducts"
            :key="shirt.slug"
            :shirt="shirt"
            :list-name="collection?.name ?? page.h1"
          />
        </div>

        <div class="seo-cta">
          <RouterLink v-if="page.type === 'collection'" :to="`/collections/${collection.slug}`" class="button">
            Shop the {{ collection.name }} collection
          </RouterLink>
          <RouterLink v-else-if="page.type === 'product'" :to="`/products/${page.refSlug}`" class="button">
            View this shirt
          </RouterLink>
          <RouterLink v-else to="/pet-portrait/create" class="button">
            Create your pet portrait
          </RouterLink>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.seo-bullets {
  margin: 0 0 20px;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.seo-extra {
  max-width: 70ch;
}

.seo-cta {
  margin-top: 32px;
}
</style>
