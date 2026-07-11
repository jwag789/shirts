<script setup>
// Minimal, truthful trust row: card entry happens on Stripe's PCI-compliant
// hosted checkout over HTTPS, so this is an honest assurance (no third-party
// seal that would require certification).
</script>

<template>
  <div class="trust-badge">
    <span class="trust-badge__item">
      <svg class="trust-badge__lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      Secure checkout
    </span>
    <span class="trust-badge__sep" aria-hidden="true">·</span>
    <span class="trust-badge__item">Powered by <span class="trust-badge__stripe">Stripe</span></span>
  </div>
</template>
