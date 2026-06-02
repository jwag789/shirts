<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import ShirtCard from '../components/ShirtCard.vue'
import SiteHeader from '../components/SiteHeader.vue'
import { getCollectionBySlug, getProductsByCollection } from '../data/products'

const route = useRoute()

const collection = computed(() => getCollectionBySlug(route.params.slug))
const collectionProducts = computed(() => getProductsByCollection(collection.value.slug))
</script>

<template>
  <div id="top">
    <SiteHeader />

    <main>
      <section class="collection-title">
        <p class="eyebrow">{{ collection.eyebrow }}</p>
        <h1>{{ collection.name }}</h1>
        <p>{{ collection.description }}</p>
      </section>

      <section class="content-section">
        <div class="collection-toolbar">
          <span>{{ collectionProducts.length }} product<span v-if="collectionProducts.length !== 1">s</span></span>
          <RouterLink to="/collections">All collections</RouterLink>
        </div>

        <div class="product-grid">
          <ShirtCard v-for="shirt in collectionProducts" :key="shirt.slug" :shirt="shirt" />
        </div>
      </section>
    </main>
  </div>
</template>
