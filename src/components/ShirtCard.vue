<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  shirt: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <RouterLink :to="`/products/${shirt.slug}`" class="shirt-card">
    <div class="shirt-card__media">
      <img class="shirt-card__image" :src="shirt.cardImage" :alt="shirt.name" loading="lazy" />
      <span class="shirt-card__badge">{{ shirt.tag }}</span>
    </div>
    <div class="shirt-card__copy">
      <div class="shirt-card__meta">
        <span>{{ shirt.price }}</span>
        <span>{{ shirt.collection }}</span>
      </div>
      <h3>{{ shirt.name }}</h3>
    </div>
  </RouterLink>
</template>
