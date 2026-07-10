<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import ReviewStars from './ReviewStars.vue'

const summary = ref({ count: 0, average: 0 })
const reviews = ref([])

// Hidden entirely until there are real reviews — an empty widget hurts trust.
const show = computed(() => summary.value.count > 0 && reviews.value.length > 0)

onMounted(async () => {
  try {
    const res = await fetch('/api/reviews?limit=3')
    const data = await res.json()
    summary.value = data.summary ?? { count: 0, average: 0 }
    reviews.value = data.reviews ?? []
  } catch {
    /* stay hidden */
  }
})
</script>

<template>
  <section v-if="show" class="review-strip" v-reveal>
    <div class="review-strip__head">
      <div class="review-strip__score">
        <ReviewStars :rating="summary.average" />
        <strong>{{ summary.average.toFixed(1) }}</strong>
        <span>from {{ summary.count }} verified review<span v-if="summary.count !== 1">s</span></span>
      </div>
      <RouterLink class="review-strip__all" to="/reviews">Read all reviews →</RouterLink>
    </div>

    <div class="review-strip__grid">
      <article v-for="(rv, i) in reviews" :key="i" class="review-card">
        <div class="review-card__top">
          <ReviewStars :rating="rv.rating" />
        </div>
        <h3 v-if="rv.title">{{ rv.title }}</h3>
        <p class="review-card__body">{{ rv.body }}</p>
        <p class="review-card__author">{{ rv.author }} <span class="review-card__badge">✓ Verified buyer</span></p>
      </article>
    </div>
  </section>
</template>
