<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import ShirtCard from '../components/ShirtCard.vue'
import SiteHeader from '../components/SiteHeader.vue'
import { getCollectionBySlug, getProductsByCollection } from '../data/products'

const route = useRoute()

const collection = computed(() => getCollectionBySlug(route.params.slug))
const collectionProducts = computed(() => getProductsByCollection(collection.value.slug))

const selectedSizes = ref([])
const selectedPrices = ref([])

const sizeFilters = ['XS', 'S', 'M', 'L', 'XL', '2XL']
const priceFilters = [
  { label: 'Under $35', value: 'under-35' },
  { label: '$35 and up', value: '35-up' },
]

const toggleFilter = (group, value) => {
  const index = group.value.indexOf(value)
  if (index >= 0) {
    group.value.splice(index, 1)
  } else {
    group.value.push(value)
  }
}

const clearFilters = () => {
  selectedSizes.value = []
  selectedPrices.value = []
}

const filteredProducts = computed(() =>
  collectionProducts.value.filter((product) => {
    const matchesSize =
      selectedSizes.value.length === 0 ||
      selectedSizes.value.some((size) => product.sizes.includes(size))
    const matchesPrice =
      selectedPrices.value.length === 0 ||
      selectedPrices.value.some((price) =>
        price === 'under-35' ? product.priceValue < 35 : product.priceValue >= 35,
      )

    return matchesSize && matchesPrice
  }),
)
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

      <section class="collection-layout">
        <aside class="filter-sidebar" aria-label="Collection filters">
          <div class="filter-sidebar__header">
            <h2>Filter</h2>
            <button type="button" @click="clearFilters">Clear</button>
          </div>

          <div class="filter-group">
            <h3>Size</h3>
            <label v-for="size in sizeFilters" :key="size">
              <input
                type="checkbox"
                :checked="selectedSizes.includes(size)"
                @change="toggleFilter(selectedSizes, size)"
              />
              <span>{{ size }}</span>
            </label>
          </div>

          <div class="filter-group">
            <h3>Price</h3>
            <label v-for="price in priceFilters" :key="price.value">
              <input
                type="checkbox"
                :checked="selectedPrices.includes(price.value)"
                @change="toggleFilter(selectedPrices, price.value)"
              />
              <span>{{ price.label }}</span>
            </label>
          </div>
        </aside>

        <div class="collection-products">
          <div class="collection-toolbar">
            <span>{{ filteredProducts.length }} product<span v-if="filteredProducts.length !== 1">s</span></span>
            <RouterLink to="/collections">All collections</RouterLink>
          </div>

          <div class="product-grid">
            <ShirtCard v-for="shirt in filteredProducts" :key="shirt.slug" :shirt="shirt" />
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
