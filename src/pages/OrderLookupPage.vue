<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'
import OrderSummary from '../components/OrderSummary.vue'
import { setDocumentHead } from '../composables/useDocumentHead'

setDocumentHead({
  title: 'Track Your Order — InkSpirit Studio',
  description: 'Look up your InkSpirit order status with your order number and email.',
  path: '/orders',
})

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

const orderNumber = ref('')
const email = ref('')
const order = ref(null)
const error = ref('')
const isLoading = ref(false)

const FULFILLMENT_LABELS = {
  confirmed: 'Order confirmed',
  processing: 'Processing',
  in_production: 'In production',
  shipped: 'Shipped',
  delivered: 'Delivered',
}

const statusLabel = computed(() => {
  if (!order.value) return ''
  if (order.value.fulfillmentStatus) {
    return FULFILLMENT_LABELS[order.value.fulfillmentStatus] ?? 'Order confirmed'
  }
  return order.value.status === 'printify_created' ? 'Sent to fulfillment' : 'Order confirmed'
})

function carrierLabel(t) {
  return (t.carrier || 'Carrier').toUpperCase()
}

const orderDisplay = computed(() => order.value?.orderNumber ?? order.value?.id ?? '')

async function lookup() {
  if (isLoading.value) return
  if (!orderNumber.value.trim() || !email.value.trim()) {
    error.value = 'Enter your order number and email.'
    return
  }
  error.value = ''
  isLoading.value = true
  try {
    const response = await fetch('/api/orders/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNumber: orderNumber.value.trim(), email: email.value.trim() }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? 'Order could not be found.')
    order.value = data
  } catch (requestError) {
    error.value = requestError.message
  } finally {
    isLoading.value = false
  }
}

function reset() {
  order.value = null
  error.value = ''
}
</script>

<template>
  <div id="top">
    <SiteHeader />

    <main>
      <section class="checkout-status">
        <template v-if="order">
          <p class="eyebrow">Your order</p>
          <h1>{{ orderDisplay }}</h1>

          <div class="checkout-summary">
            <span>Status</span>
            <strong>{{ statusLabel }}</strong>
            <template v-if="order.customerEmail">
              <span>Email</span>
              <strong>{{ order.customerEmail }}</strong>
            </template>
          </div>

          <div v-if="order.tracking?.length" class="order-tracking">
            <span class="order-tracking__label">Tracking</span>
            <a
              v-for="(t, i) in order.tracking"
              :key="i"
              class="order-tracking__link"
              :href="t.url"
              target="_blank"
              rel="noopener"
            >
              {{ carrierLabel(t) }}<template v-if="t.number"> · {{ t.number }}</template>
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          <div v-if="order.items?.length" class="checkout-items">
            <div
              v-for="(item, i) in order.items"
              :key="i"
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

          <OrderSummary :order="order" />

          <div class="order-lookup__actions">
            <button class="button button--outline" type="button" @click="reset">Look up another order</button>
            <RouterLink class="button" to="/collections">Keep shopping</RouterLink>
          </div>
        </template>

        <template v-else>
          <p class="eyebrow">Order status</p>
          <h1>Track your order</h1>
          <p>Enter your order number and the email you checked out with to see your order status.</p>

          <form class="order-lookup__form" @submit.prevent="lookup">
            <div class="ts-field">
              <label for="ol-number">Order number</label>
              <input
                id="ol-number"
                v-model="orderNumber"
                class="ts-input"
                type="text"
                autocomplete="off"
                placeholder="INK-XXXXXX"
              />
            </div>
            <div class="ts-field">
              <label for="ol-email">Email</label>
              <input
                id="ol-email"
                v-model="email"
                class="ts-input"
                type="email"
                autocomplete="email"
                placeholder="you@example.com"
              />
            </div>

            <p v-if="error" class="cart-error">{{ error }}</p>

            <button class="button" type="submit" :disabled="isLoading">
              {{ isLoading ? 'Looking up…' : 'Find my order' }}
            </button>
          </form>
        </template>
      </section>
    </main>
  </div>
</template>
