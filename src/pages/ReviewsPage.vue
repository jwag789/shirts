<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'
import ReviewStars from '../components/ReviewStars.vue'
import { setDocumentHead } from '../composables/useDocumentHead'

setDocumentHead({
  title: 'Customer Reviews — InkSpirit Studio',
  description: 'Real reviews from verified InkSpirit customers.',
  path: '/reviews',
})

const summary = ref({ count: 0, average: 0 })
const reviews = ref([])
const isLoading = ref(true)

const hasReviews = computed(() => reviews.value.length > 0)

function formatDate(d) {
  try {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

onMounted(async () => {
  try {
    const res = await fetch('/api/reviews?limit=50')
    const data = await res.json()
    summary.value = data.summary ?? { count: 0, average: 0 }
    reviews.value = data.reviews ?? []
  } catch {
    /* leave empty */
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div id="top">
    <SiteHeader />

    <main class="reviews-page">
      <div class="reviews-page__head">
        <p class="eyebrow">What customers say</p>
        <h1>Reviews</h1>
        <div v-if="hasReviews" class="reviews-page__summary">
          <ReviewStars :rating="summary.average" />
          <strong>{{ summary.average.toFixed(1) }}</strong>
          <span>· {{ summary.count }} review<span v-if="summary.count !== 1">s</span></span>
        </div>
      </div>

      <div v-if="isLoading" class="reviews-empty"><p>Loading reviews…</p></div>

      <div v-else-if="!hasReviews" class="reviews-empty">
        <h2>No reviews yet.</h2>
        <p>Be the first — if you've ordered, share your thoughts.</p>
        <RouterLink class="button" to="/review">Leave a review</RouterLink>
      </div>

      <div v-else class="reviews-grid">
        <article v-for="(rv, i) in reviews" :key="i" class="review-card">
          <div class="review-card__top">
            <ReviewStars :rating="rv.rating" />
            <span class="review-card__date">{{ formatDate(rv.createdAt) }}</span>
          </div>
          <h3 v-if="rv.title">{{ rv.title }}</h3>
          <p class="review-card__body">{{ rv.body }}</p>
          <p class="review-card__author">{{ rv.author }} <span class="review-card__badge">✓ Verified buyer</span></p>
        </article>
      </div>
    </main>
  </div>
</template>
