<script setup>
defineProps({
  color: { type: String, default: '#ebebeb' },
  artUrl: { type: String, default: null },
  photoUrl: { type: String, default: null },
})
</script>

<template>
  <!--
    When photoUrl is set: shows a real Printify shirt photo with the portrait
    overlaid in the chest print area.
    When not: falls back to the SVG shirt silhouette with fill color.
    Portrait position on photo approximates Printify's standard front-view print area.
  -->
  <div class="shirt-mockup-wrap">

    <!-- Real Printify shirt photo -->
    <template v-if="photoUrl">
      <img :src="photoUrl" class="shirt-photo-bg" alt="Shirt" />
      <img v-if="artUrl" :src="artUrl" class="shirt-photo-art" alt="Custom pet portrait" />
    </template>

    <!-- SVG fallback when no photo available -->
    <template v-else>
      <svg
        viewBox="0 0 240 270"
        xmlns="http://www.w3.org/2000/svg"
        class="shirt-svg"
        aria-hidden="true"
      >
        <defs>
          <filter id="sm-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="rgba(0,0,0,0.18)" />
          </filter>
        </defs>
        <path
          d="M 52 260 L 52 112 L 16 90 L 6 50 L 52 32 L 80 24
             Q 96 52 120 54
             Q 144 52 160 24
             L 188 32 L 234 50 L 224 90 L 188 112 L 188 260 Z"
          :fill="color"
          stroke="rgba(0,0,0,0.13)"
          stroke-width="1.5"
          stroke-linejoin="round"
          filter="url(#sm-shadow)"
        />
      </svg>
      <img v-if="artUrl" :src="artUrl" class="shirt-art-overlay" alt="Custom pet portrait" />
    </template>

  </div>
</template>
