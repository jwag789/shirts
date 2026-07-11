<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  shirt: {
    type: Object,
    required: true,
  },
})

const badgeClass = computed(() => ({
  'shirt-card__badge--new': props.shirt.tag === 'New',
  'shirt-card__badge--limited': props.shirt.tag === 'Limited',
  'shirt-card__badge--popular': props.shirt.tag === 'Popular',
  'shirt-card__badge--bestseller': props.shirt.tag === 'Best Seller',
}))
</script>

<template>
  <RouterLink :to="`/products/${shirt.slug}`" class="shirt-card">
    <div class="shirt-card__media">
      <img class="shirt-card__image" :src="shirt.cardImage" :alt="shirt.name" loading="lazy" />
      <img
        v-if="shirt.gallery?.[1]"
        class="shirt-card__image shirt-card__image--hover"
        :src="shirt.gallery[1]"
        :alt="shirt.name"
        loading="lazy"
      />
      <span class="shirt-card__badge" :class="badgeClass">{{ shirt.tag }}</span>
    </div>
    <div class="shirt-card__copy">
      <h3>{{ shirt.name }}</h3>
    </div>
  </RouterLink>
</template>
