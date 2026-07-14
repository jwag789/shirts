<script setup>
import CartDrawer from './components/CartDrawer.vue'
import WelcomePopup from './components/WelcomePopup.vue'
import SiteFooter from './components/SiteFooter.vue'
</script>

<template>
  <RouterView />
  <SiteFooter />
  <CartDrawer />
  <WelcomePopup />
</template>
