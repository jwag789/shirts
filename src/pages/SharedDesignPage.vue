<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'
import ShirtMockup from '../components/ShirtMockup.vue'
import { useCart } from '../composables/useCart'
import { recordDesign } from '../composables/useDesigns'
import { setDocumentHead } from '../composables/useDocumentHead'
import { trackEvent } from '../analytics'

const route = useRoute()
const { addTeamShirtItem, addPetPortraitItem } = useCart()

const design = ref(null)
const error = ref('')
const isLoading = ref(true)

const colors = ref([])
const sizes = ref(['S', 'M', 'L', 'XL', '2XL'])
const selectedColor = ref(null)
const selectedSize = ref('M')
const mockupPhotoUrl = ref(null)
const addedToBag = ref(false)
const copied = ref(false)
const sharePreparing = ref(false)

const isTeam = computed(() => design.value?.kind === 'team')
const price = computed(() => (isTeam.value ? 42 : 38))

const title = computed(() => {
  if (!design.value) return 'Custom design'
  const m = design.value.meta ?? {}
  if (isTeam.value) return m.teamName?.trim() || 'Custom Team Shirt'
  const styleLabel = m.style ? m.style.charAt(0).toUpperCase() + m.style.slice(1) : 'Custom'
  return m.petName?.trim() ? `${m.petName.trim()} the ${styleLabel}` : `${styleLabel} Pet Portrait`
})

const subtitle = computed(() => {
  if (!design.value) return ''
  return isTeam.value ? 'Custom team shirt' : 'Custom pet portrait'
})

const variantsEndpoint = computed(() => (isTeam.value ? '/api/team-shirt/variants' : '/api/pet-portrait/variants'))
const mockupEndpoint = computed(() => (isTeam.value ? '/api/team-shirt/mockup' : '/api/pet-portrait/mockup'))

const availableSizes = computed(() => {
  if (!selectedColor.value) return sizes.value
  const colorSizes = Object.keys(selectedColor.value.variantsBySize ?? {})
  if (!colorSizes.length) return sizes.value
  return sizes.value.filter((s) => colorSizes.includes(s))
})

const previewSwatch = computed(() => {
  const s = selectedColor.value?.swatch ?? '#ececec'
  return s === '#ffffff' || s === '#fff' ? '#ececec' : s
})

async function loadVariants() {
  try {
    const res = await fetch(variantsEndpoint.value)
    const data = await res.json()
    colors.value = data.colors ?? []
    sizes.value = data.sizes ?? ['S', 'M', 'L', 'XL', '2XL']
    if (data.colors?.length) {
      // Default to the color this design was shared in, if any.
      const savedName = design.value?.meta?.color?.name
      const match = savedName ? data.colors.find((c) => c.name === savedName) : null
      selectColor(match ?? data.colors[0])
    }
  } catch {
    /* falls back to defaults */
  }
}

async function fetchMockupPhoto(color) {
  const variantId = color?.variantsBySize?.[selectedSize.value]
    ?? color?.variantsBySize?.['M']
    ?? Object.values(color?.variantsBySize ?? {})[0]
  mockupPhotoUrl.value = color?.mockupUrls?.[0] ?? null
  if (!variantId) return
  try {
    const res = await fetch(mockupEndpoint.value, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId }),
    })
    const data = await res.json()
    if (data.mockupUrl) mockupPhotoUrl.value = data.mockupUrl
  } catch {
    /* keep fallback */
  }
}

function selectColor(color) {
  selectedColor.value = color
  addedToBag.value = false
  if (!availableSizes.value.includes(selectedSize.value)) {
    selectedSize.value = availableSizes.value.includes('M') ? 'M' : availableSizes.value[0] ?? 'M'
  }
  fetchMockupPhoto(color)
}

async function load() {
  isLoading.value = true
  error.value = ''
  design.value = null
  try {
    const res = await fetch(`/api/designs/${route.params.id}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Design not found.')
    design.value = data
    setDocumentHead({
      title: `${title.value} — InkSpirit Studio`,
      description: isTeam.value
        ? 'A custom AI team shirt made on InkSpirit. Order this one or design your own.'
        : 'A custom AI pet portrait tee made on InkSpirit. Order this one or design your own.',
      path: `/d/${data.id}`,
      image: data.imageUrl,
    })
    await loadVariants()
  } catch (err) {
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
watch(() => route.params.id, load)

function addToBag() {
  if (!design.value) return
  const variantId = selectedColor.value?.variantsBySize?.[selectedSize.value] ?? null
  const colorName = selectedColor.value?.name ?? 'White'
  if (isTeam.value) {
    addTeamShirtItem({
      generatedImageUrl: design.value.imageUrl,
      teamName: design.value.meta?.teamName ?? '',
      style: design.value.meta?.style ?? '',
      size: selectedSize.value,
      color: colorName,
      printifyVariantId: variantId,
    })
  } else {
    addPetPortraitItem(
      design.value.meta?.style ?? 'custom',
      design.value.imageUrl,
      selectedSize.value,
      colorName,
      variantId,
    )
  }
  addedToBag.value = true
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    /* clipboard blocked — the URL is still in the address bar */
  }
}

async function shareLink() {
  if (sharePreparing.value || !design.value) return
  trackEvent('share_design', { kind: design.value.kind, source: 'share_page' })
  // Refresh the mockup preview to the currently selected color before sharing.
  sharePreparing.value = true
  try {
    await fetch(`/api/designs/${design.value.id}/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        swatch: selectedColor.value?.swatch ?? '#ececec',
        colorName: selectedColor.value?.name ?? 'White',
      }),
    })
  } catch {
    /* best-effort */
  }
  sharePreparing.value = false

  if (navigator.share) {
    try {
      await navigator.share({ title: title.value, url: window.location.href })
      return
    } catch {
      /* user cancelled — fall through to copy */
    }
  }
  copyLink()
}
</script>

<template>
  <div class="pet-journey-page">
    <SiteHeader />

    <main class="shared-design">
      <div v-if="isLoading" class="shared-design__loading">
        <p class="eyebrow">Loading</p>
        <h1>Fetching this design…</h1>
      </div>

      <div v-else-if="error" class="shared-design__loading">
        <p class="eyebrow">Not found</p>
        <h1>This design isn't available.</h1>
        <p>{{ error }}</p>
        <div class="shared-design__cta">
          <RouterLink class="button" to="/team-shirt">Design a team shirt</RouterLink>
          <RouterLink class="button button--outline" to="/pet-portrait">Create a pet portrait</RouterLink>
        </div>
      </div>

      <div v-else class="shared-design__inner">
        <div class="pet-slide__heading" style="text-align:center; margin: 0 auto 28px">
          <p class="eyebrow">{{ subtitle }}</p>
          <h1 class="pet-slide__title">{{ title }}</h1>
          <p class="pet-slide__sub" style="margin: 0 auto">Order this exact design, or make your own in a minute.</p>
        </div>

        <div class="ts-result">
          <div class="ts-preview">
            <div class="ts-mockup">
              <ShirtMockup :color="previewSwatch" :art-url="design.imageUrl" :photo-url="mockupPhotoUrl" />
            </div>
            <div class="shared-design__share">
              <button class="button button--outline" type="button" :disabled="sharePreparing" @click="shareLink">
                <template v-if="sharePreparing">Preparing preview…</template>
                <template v-else-if="copied">✓ Link copied</template>
                <template v-else>Share this design</template>
              </button>
            </div>
          </div>

          <div class="ts-buy">
            <div v-if="colors.length" class="product-options">
              <div class="product-options__label">
                <span>Shirt color</span>
                <strong>{{ selectedColor?.name }}</strong>
              </div>
              <div class="color-swatches">
                <button
                  v-for="color in colors"
                  :key="color.name"
                  class="color-swatch"
                  :class="{ 'is-active': selectedColor?.name === color.name }"
                  :style="{ background: color.swatch }"
                  :title="color.name"
                  type="button"
                  @click="selectColor(color)"
                />
              </div>
            </div>

            <div class="product-options" style="margin-top: 18px">
              <div class="product-options__label">
                <span>Size</span>
                <strong>{{ selectedSize }}</strong>
              </div>
              <div class="product-sizes">
                <button
                  v-for="size in availableSizes"
                  :key="size"
                  class="product-sizes__item"
                  :class="{ 'is-active': size === selectedSize }"
                  type="button"
                  @click="selectedSize = size"
                >{{ size }}</button>
              </div>
            </div>

            <button class="button ts-add" type="button" :disabled="addedToBag" @click="addToBag">
              <template v-if="addedToBag">✓ Added to bag</template>
              <template v-else>Add to bag — ${{ price }}</template>
            </button>

            <div class="shared-design__make">
              <span>Want your own?</span>
              <RouterLink :to="isTeam ? '/team-shirt' : '/pet-portrait'">
                {{ isTeam ? 'Design a team shirt →' : 'Create a pet portrait →' }}
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
