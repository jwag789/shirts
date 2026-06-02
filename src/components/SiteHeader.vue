<script setup>
import { useCart } from '../composables/useCart'

const { itemCount, toggleCart } = useCart()
</script>

<template>
  <div class="announcement-bar">
    <span>Ships in 3–6 business days</span>
    <span>Made to order</span>
    <span>New designs weekly</span>
  </div>

  <header class="site-header">
    <RouterLink class="brand-lockup" to="/" aria-label="InkSpirit home">InkSpirit</RouterLink>

    <nav class="site-nav" aria-label="Primary">
      <RouterLink to="/collections/japanese-style">Torii</RouterLink>
      <RouterLink to="/collections/pun-shirts">Funny Business</RouterLink>
      <RouterLink to="/collections/ink-art">Fine Lines</RouterLink>
      <RouterLink to="/collections/anime">Frame Rate</RouterLink>
      <RouterLink class="nav-collections" to="/collections">Collections</RouterLink>
    </nav>

    <button class="cart-trigger" type="button" @click="toggleCart">
      Bag
      <span>{{ itemCount }}</span>
    </button>
  </header>
</template>
