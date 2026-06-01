<script setup>
defineProps({
  collection: {
    type: Object,
    required: true,
  },
  productCount: {
    type: Number,
    required: true,
  },
})
</script>

<template>
  <RouterLink :to="`/collections/${collection.slug}`" class="collection-card">
    <div class="collection-card__media">
      <img :src="collection.heroImage" :alt="collection.name" loading="lazy" />
      <div class="collection-card__overlay">
        <span>{{ productCount }} style<span v-if="productCount !== 1">s</span></span>
        <h3>{{ collection.name }}</h3>
        <strong>Shop now</strong>
      </div>
    </div>
  </RouterLink>
</template>
