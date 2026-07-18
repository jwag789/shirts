<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'
import ShirtMockup from '../components/ShirtMockup.vue'
import { getDesignIds } from '../composables/useDesigns'
import { setDocumentHead } from '../composables/useDocumentHead'

setDocumentHead({
  title: 'My Designs — InkSpirit Studio',
  description: 'Every custom AI design you\'ve created on InkSpirit, ready to share or order.',
  path: '/my-designs',
})

const designs = ref([])
const isLoading = ref(true)

// A real blank-tee photo to composite designs onto (same product the result
// pages use). Pet/team share one blank product, so a single default is enough.
const mockupPhoto = ref(null)

const hasDesigns = computed(() => designs.value.length > 0)

function titleFor(d) {
  const m = d.meta ?? {}
  if (d.kind === 'team') return m.teamName?.trim() || 'Custom Team Shirt'
  const styleLabel = m.style ? m.style.charAt(0).toUpperCase() + m.style.slice(1) : 'Custom'
  return m.petName?.trim() ? `${m.petName.trim()} the ${styleLabel}` : `${styleLabel} Portrait`
}

function kindLabel(d) {
  return d.kind === 'team' ? 'Team shirt' : 'Pet portrait'
}

function mockupColor(d) {
  const s = d.meta?.color?.swatch
  if (!s) return '#ececec'
  return s === '#ffffff' || s === '#fff' ? '#ececec' : s
}

// Grab a real garment photo once — prefer a white/light tee, else the first color.
async function loadMockupPhoto() {
  try {
    const res = await fetch('/api/pet-portrait/variants')
    const data = await res.json()
    const colors = data.colors ?? []
    const white = colors.find((c) => /white/i.test(c.name ?? ''))
    mockupPhoto.value = white?.mockupUrls?.[0] ?? colors[0]?.mockupUrls?.[0] ?? null
  } catch {
    /* fall back to the SVG silhouette */
  }
}

onMounted(async () => {
  const ids = getDesignIds()
  if (!ids.length) {
    isLoading.value = false
    return
  }
  loadMockupPhoto()
  try {
    const res = await fetch(`/api/designs?ids=${encodeURIComponent(ids.join(','))}`)
    const data = await res.json()
    designs.value = data.designs ?? []
  } catch {
    /* leave empty on error */
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="pet-journey-page">
    <SiteHeader />

    <main class="my-designs">
      <div class="my-designs__head">
        <p class="eyebrow">Your studio</p>
        <h1>My designs</h1>
        <p class="my-designs__sub">Every design you've created on this device. Open one to order it or share the link.</p>
      </div>

      <div v-if="isLoading" class="my-designs__empty">
        <h2>Loading your designs…</h2>
      </div>

      <div v-else-if="!hasDesigns" class="my-designs__empty">
        <h2>No designs yet.</h2>
        <p>Generate a team shirt or a pet portrait and it'll show up here automatically.</p>
        <div class="my-designs__cta">
          <RouterLink class="button" to="/team-shirt/create">Design a team shirt</RouterLink>
          <RouterLink class="button button--outline" to="/pet-portrait/create">Create a pet portrait</RouterLink>
        </div>
      </div>

      <div v-else class="my-designs__grid">
        <RouterLink
          v-for="d in designs"
          :key="d.id"
          class="design-card"
          :to="`/d/${d.id}`"
        >
          <div class="design-card__art">
            <ShirtMockup :color="mockupColor(d)" :art-url="d.imageUrl" :photo-url="mockupPhoto" />
          </div>
          <div class="design-card__copy">
            <strong>{{ titleFor(d) }}</strong>
            <span>{{ kindLabel(d) }}</span>
          </div>
        </RouterLink>
      </div>
    </main>
  </div>
</template>
