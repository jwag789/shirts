<script setup>
import CollectionCard from '../components/CollectionCard.vue'
import SiteHeader from '../components/SiteHeader.vue'
import { collections, getProductsByCollection } from '../data/products'
</script>

<template>
  <div id="top">
    <SiteHeader />

    <main>
      <section class="collection-title">
        <p class="eyebrow">Collections</p>
        <h1>Shop every category</h1>
        <p>Browse by artwork style, from Japanese-inspired graphics and anime pieces to puns and ink art.</p>
      </section>

      <section class="content-section">
        <div class="collection-feature-grid">
          <CollectionCard
            v-for="collection in collections"
            :key="collection.slug"
            :collection="collection"
            :product-count="getProductsByCollection(collection.slug).length"
          />
        </div>
      </section>
    </main>
  </div>
</template>
