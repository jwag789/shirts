<script setup>
import { useCart } from '../composables/useCart'

const { itemCount, toggleCart } = useCart()
</script>

<template>
  <div class="announcement-bar">
    <span>Free US shipping over $60</span>
    <span>Made to order</span>
    <span>New designs weekly</span>
  </div>

  <header class="site-header">
    <RouterLink class="brand-lockup" to="/" aria-label="InkSpirit home">InkSpirit</RouterLink>

    <nav class="site-nav" aria-label="Primary">
      <RouterLink to="/collections/japanese-style">Japanese Style</RouterLink>
      <RouterLink to="/collections/pun-shirts">Pun Shirts</RouterLink>
      <RouterLink to="/collections/ink-art">Ink Art</RouterLink>
      <RouterLink to="/collections/anime">Anime</RouterLink>
      <RouterLink to="/collections">Collections</RouterLink>
      <RouterLink to="/#new">New</RouterLink>
    </nav>

    <button class="cart-trigger" type="button" @click="toggleCart">
      Bag
      <span>{{ itemCount }}</span>
    </button>
  </header>
</template>
