<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'
import { setDocumentHead } from '../composables/useDocumentHead'

setDocumentHead({
  title: 'Leave a Review — InkSpirit Studio',
  description: 'Share your honest review of your InkSpirit order.',
  path: '/review',
})

const route = useRoute()
const orderNumber = ref('')
const email = ref('')
const rating = ref(0)
const hover = ref(0)
const title = ref('')
const body = ref('')
const name = ref('')
const status = ref('idle') // idle | loading | done | error
const error = ref('')

onMounted(() => {
  const q = route.query.order
  if (typeof q === 'string') orderNumber.value = q
})

async function submit() {
  if (status.value === 'loading') return
  if (!rating.value) {
    status.value = 'error'
    error.value = 'Please choose a star rating.'
    return
  }
  if (!orderNumber.value.trim() || !email.value.trim() || !body.value.trim()) {
    status.value = 'error'
    error.value = 'Order number, email, and a short review are required.'
    return
  }
  status.value = 'loading'
  error.value = ''
  try {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber: orderNumber.value.trim(),
        email: email.value.trim(),
        rating: rating.value,
        title: title.value.trim(),
        body: body.value.trim(),
        name: name.value.trim(),
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Could not submit your review.')
    status.value = 'done'
  } catch (err) {
    status.value = 'error'
    error.value = err.message
  }
}
</script>

<template>
  <div id="top">
    <SiteHeader />

    <main>
      <section class="checkout-status">
        <template v-if="status === 'done'">
          <p class="eyebrow">Thank you</p>
          <h1>Review submitted 🎉</h1>
          <p>We really appreciate you taking the time — it helps other customers a lot.</p>
          <div class="order-lookup__actions">
            <RouterLink class="button" to="/reviews">Read all reviews</RouterLink>
            <RouterLink class="button button--outline" to="/collections">Keep shopping</RouterLink>
          </div>
        </template>

        <template v-else>
          <p class="eyebrow">Your feedback</p>
          <h1>Leave a review</h1>
          <p>How was your order? Your honest review helps other customers decide.</p>

          <form class="review-form" @submit.prevent="submit">
            <div class="review-stars" role="radiogroup" aria-label="Rating">
              <button
                v-for="n in 5"
                :key="n"
                type="button"
                class="review-stars__star"
                :class="{ 'is-on': n <= (hover || rating) }"
                :aria-label="`${n} star${n > 1 ? 's' : ''}`"
                @click="rating = n"
                @mouseenter="hover = n"
                @mouseleave="hover = 0"
              >★</button>
            </div>

            <div class="ts-field">
              <label for="rv-order">Order number</label>
              <input id="rv-order" v-model="orderNumber" class="ts-input" type="text" placeholder="INK-XXXXXX" autocomplete="off" />
            </div>
            <div class="ts-field">
              <label for="rv-email">Email <em>(the one you ordered with)</em></label>
              <input id="rv-email" v-model="email" class="ts-input" type="email" placeholder="you@example.com" autocomplete="email" />
            </div>
            <div class="ts-field">
              <label for="rv-name">Display name <em>(optional)</em></label>
              <input id="rv-name" v-model="name" class="ts-input" type="text" maxlength="40" placeholder="How your name appears" />
            </div>
            <div class="ts-field">
              <label for="rv-title">Headline <em>(optional)</em></label>
              <input id="rv-title" v-model="title" class="ts-input" type="text" maxlength="80" placeholder="Sum it up" />
            </div>
            <div class="ts-field">
              <label for="rv-body">Your review</label>
              <textarea id="rv-body" v-model="body" class="ts-input review-textarea" maxlength="1000" rows="5" placeholder="What did you think of the design, quality, and fit?"></textarea>
            </div>

            <p v-if="status === 'error'" class="cart-error">{{ error }}</p>

            <button class="button" type="submit" :disabled="status === 'loading'">
              {{ status === 'loading' ? 'Submitting…' : 'Submit review' }}
            </button>
          </form>
        </template>
      </section>
    </main>
  </div>
</template>
