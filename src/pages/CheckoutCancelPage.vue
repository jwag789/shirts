<script setup>
import { RouterLink } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'
</script>

<template>
  <div id="top">
    <SiteHeader />

    <main>
      <section class="checkout-status">
        <p class="eyebrow">Checkout canceled</p>
        <h1>No payment was made.</h1>
        <p>Your bag was not charged. You can return to the shop and start checkout again.</p>
        <RouterLink class="button" to="/collections">Back to shop</RouterLink>
      </section>
    </main>
  </div>
</template>

