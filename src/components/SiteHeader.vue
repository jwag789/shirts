<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCart } from '../composables/useCart'

const { itemCount, toggleCart } = useCart()
const route = useRoute()

const menuOpen = ref(false)
const openMenu = () => { menuOpen.value = true }
const closeMenu = () => { menuOpen.value = false }

// Close on navigation, and lock background scroll while open.
watch(() => route.fullPath, closeMenu)
watch(menuOpen, (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
})

const NAV_LINKS = [
  { to: '/collections', label: 'Collections' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/pet-portrait', label: 'Pet Portraits' },
  { to: '/team-shirt', label: 'Team Shirts' },
  { to: '/my-designs', label: 'My Designs' },
]
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

    <div class="site-header__actions">
      <button class="cart-trigger" type="button" @click="toggleCart">
        Bag
        <span>{{ itemCount }}</span>
      </button>
      <button
        class="nav-toggle"
        type="button"
        aria-label="Open menu"
        aria-controls="mobile-menu"
        :aria-expanded="menuOpen"
        @click="openMenu"
      >
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>

  <Teleport to="body">
    <transition name="menu-fade">
      <div v-if="menuOpen" class="mobile-menu__overlay" @click="closeMenu"></div>
    </transition>
    <transition name="menu-slide">
      <aside v-if="menuOpen" id="mobile-menu" class="mobile-menu" aria-label="Menu">
        <div class="mobile-menu__head">
          <img src="/images/is-logo-2.png" alt="InkSpirit" class="mobile-menu__logo" />
          <button class="mobile-menu__close" type="button" aria-label="Close menu" @click="closeMenu">✕</button>
        </div>
        <nav class="mobile-menu__nav" aria-label="Primary">
          <RouterLink
            v-for="(link, i) in NAV_LINKS"
            :key="link.to"
            :to="link.to"
            :style="{ '--i': i }"
            @click="closeMenu"
          >
            <span class="mobile-menu__label">{{ link.label }}</span>
            <span aria-hidden="true" class="mobile-menu__chevron">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </span>
          </RouterLink>
        </nav>
      </aside>
    </transition>
  </Teleport>
</template>
