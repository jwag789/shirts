<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

// Only surface the Reviews link once we actually have published reviews —
// fails closed (stays hidden) if the request errors or the count is zero.
const hasReviews = ref(false)

onMounted(async () => {
  try {
    const res = await fetch('/api/reviews?limit=1')
    if (!res.ok) return
    const data = await res.json()
    hasReviews.value = (data?.summary?.count ?? 0) > 0
  } catch {
    // ignore — link just stays hidden
  }
})
</script>

<template>
  <footer class="site-footer">
    <div class="site-footer__brand">
      <img src="/images/is-logo-2.png" alt="InkSpirit" class="footer-logo" />
      <p>Original graphic t-shirts, made to order and organized by artwork style.</p>
    </div>

    <nav class="footer-nav" aria-label="Footer">
      <div class="footer-col">
        <span class="footer-col__title">Shop</span>
        <RouterLink to="/collections">Collections</RouterLink>
        <RouterLink to="/how-it-works">How It Works</RouterLink>
      </div>
      <div class="footer-col">
        <span class="footer-col__title">Create</span>
        <RouterLink to="/pet-portrait">Custom Pet Portraits</RouterLink>
        <RouterLink to="/team-shirt">AI Team Shirts</RouterLink>
        <RouterLink to="/design">Design Studio</RouterLink>
        <RouterLink to="/my-designs">My Designs</RouterLink>
      </div>
      <div class="footer-col">
        <span class="footer-col__title">Support</span>
        <RouterLink to="/orders">Track Your Order</RouterLink>
        <RouterLink to="/returns">Returns &amp; Refunds</RouterLink>
        <RouterLink to="/contact">Contact Us</RouterLink>
        <RouterLink v-if="hasReviews" to="/reviews">Reviews</RouterLink>
      </div>
      <div class="footer-col">
        <span class="footer-col__title">Legal</span>
        <RouterLink to="/terms">Terms &amp; Conditions</RouterLink>
        <RouterLink to="/privacy">Privacy Policy</RouterLink>
      </div>
    </nav>
  </footer>

  <div class="site-credit">
    <a href="https://www.kingdomwebbuilders.com" target="_blank" rel="noopener">
      <img src="/images/KW-logo.png" alt="Kingdom Web Builders" class="site-credit__logo" />
      <span>A Kingdom Web Builders site</span>
    </a>
  </div>
</template>
