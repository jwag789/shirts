<script setup>
defineProps({
  order: { type: Object, required: true },
})

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
function money(cents) {
  return currency.format((cents ?? 0) / 100)
}
function cityLine(a) {
  return [a.city, a.state, a.postalCode].filter(Boolean).join(', ')
}
</script>

<template>
  <div>
    <div v-if="order.amountTotal != null" class="order-totals">
      <div><span>Subtotal</span><span>{{ money(order.amountSubtotal) }}</span></div>
      <div v-if="order.amountDiscount"><span>Discount</span><span>−{{ money(order.amountDiscount) }}</span></div>
      <div><span>Shipping</span><span>{{ money(order.amountShipping) }}</span></div>
      <div class="order-totals__total"><span>Total</span><span>{{ money(order.amountTotal) }}</span></div>
    </div>

    <div v-if="order.shipping?.address?.line1" class="order-address">
      <span class="order-address__label">Ship to</span>
      <address>
        <template v-if="order.shipping.name">{{ order.shipping.name }}<br /></template>
        {{ order.shipping.address.line1 }}<br />
        <template v-if="order.shipping.address.line2">{{ order.shipping.address.line2 }}<br /></template>
        <template v-if="cityLine(order.shipping.address)">{{ cityLine(order.shipping.address) }}<br /></template>
        {{ order.shipping.address.country }}
      </address>
    </div>
  </div>
</template>
