<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'

const route = useRoute()
const order = ref(null)
const error = ref('')
const isLoading = ref(true)

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

const statusLabel = computed(() => {
  if (!order.value) return ''
  return order.value.status === 'printify_created' ? 'Sent to fulfillment' : 'Order confirmed'
})

const orderDisplay = computed(() => order.value?.orderNumber ?? order.value?.id ?? '')

onMounted(async () => {
  const sessionId = route.query.session_id

  if (!sessionId) {
    error.value = 'Missing checkout session.'
    isLoading.value = false
    return
  }

  try {
    const response = await fetch(`/api/orders/${sessionId}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error ?? 'Order could not be loaded.')
    }

    order.value = data
  } catch (requestError) {
    error.value = requestError.message
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div id="top">
    <SiteHeader />

    <main>
      <section class="checkout-status">
        <template v-if="isLoading">
          <p class="eyebrow">One moment</p>
          <h1>Confirming your order</h1>
        </template>

        <template v-else-if="error">
          <p class="eyebrow">Something went wrong</p>
          <h1>We couldn't load your order.</h1>
          <p>{{ error }}</p>
          <RouterLink class="button" to="/collections">Back to shop</RouterLink>
        </template>

        <template v-else>
          <p class="eyebrow">Order placed</p>
          <h1>Thanks for the order.</h1>
          <p>
            Your payment went through. We'll start preparing your shirts right away. Check your
            email for a confirmation receipt from Stripe.
          </p>

          <div class="checkout-summary">
            <span>Order #</span>
            <strong>{{ orderDisplay }}</strong>
            <span>Status</span>
            <strong>{{ statusLabel }}</strong>
            <template v-if="order.customerEmail">
              <span>Email</span>
              <strong>{{ order.customerEmail }}</strong>
            </template>
          </div>

          <div v-if="order.items?.length" class="checkout-items">
            <div
              v-for="item in order.items"
              :key="item.productSlug + item.size"
              class="checkout-item"
            >
              <img :src="item.image" :alt="item.name" />
              <div class="checkout-item__info">
                <strong>{{ item.name }}</strong>
                <span>Size {{ item.size }} &nbsp;·&nbsp; Qty {{ item.quantity }}</span>
              </div>
              <strong>{{ currency.format((item.unitAmount / 100) * item.quantity) }}</strong>
            </div>
          </div>

          <div class="order-lookup__actions">
            <RouterLink class="button" to="/collections">Keep shopping</RouterLink>
            <RouterLink class="button button--outline" to="/orders">Track your order</RouterLink>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>

