<script setup>
defineProps({
  rating: { type: Number, default: 0 },
})
</script>

<template>
  <span class="review-stars-display" :aria-label="`${rating} out of 5 stars`">
    <span
      v-for="n in 5"
      :key="n"
      class="review-stars-display__star"
      :class="{ 'is-on': n <= Math.round(rating) }"
    >★</span>
  </span>
</template>
