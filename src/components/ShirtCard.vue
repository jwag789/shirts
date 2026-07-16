<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { trackSelectItem, makeItem } from '../analytics'

const props = defineProps({
  shirt: {
    type: Object,
    required: true,
  },
  listName: {
    type: String,
    default: 'Products',
  },
})

const badgeClass = computed(() => ({
  'shirt-card__badge--new': props.shirt.tag === 'New',
  'shirt-card__badge--limited': props.shirt.tag === 'Limited',
  'shirt-card__badge--popular': props.shirt.tag === 'Popular',
  'shirt-card__badge--bestseller': props.shirt.tag === 'Best Seller',
}))

function onSelect() {
  trackSelectItem(
    makeItem({
      id: props.shirt.slug,
      name: props.shirt.name,
      category: props.shirt.collection,
      price: props.shirt.priceValue,
    }),
    props.listName,
  )
}
</script>

<template>
  <RouterLink :to="`/products/${shirt.slug}`" class="shirt-card" @click="onSelect">
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
