<script setup>
import { useCart } from '../composables/useCart'

const { itemCount, toggleCart } = useCart()
</script>

<template>
  <div class="announcement-bar">
    <span>Ships in 3–5 business days</span>
    <span>Made to order</span>
    <span>New designs weekly</span>
  </div>

  <header class="site-header">
    <RouterLink class="brand-lockup" to="/" aria-label="InkSpirit home">
      <img src="/images/is-logo-2.png" alt="InkSpirit" class="brand-logo" />
    </RouterLink>

    <nav class="site-nav" aria-label="Primary">
      <RouterLink class="nav-collections" to="/collections">Collections</RouterLink>
      <RouterLink to="/how-it-works">How It Works</RouterLink>
      <RouterLink class="nav-pet-portraits" to="/pet-portrait">Pet Portraits</RouterLink>
      <RouterLink class="nav-pet-portraits" to="/team-shirt">Team Shirts</RouterLink>
      <RouterLink to="/my-designs">My Designs</RouterLink>
    </nav>

    <button class="cart-trigger" type="button" @click="toggleCart">
      Bag
      <span>{{ itemCount }}</span>
    </button>
  </header>
</template>
