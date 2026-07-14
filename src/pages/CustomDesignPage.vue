<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'
import ShirtMockup from '../components/ShirtMockup.vue'
import Icon from '../components/Icon.vue'
import { useCart } from '../composables/useCart'
import { recordDesign } from '../composables/useDesigns'
import { trackEvent } from '../analytics'
import { setDocumentHead } from '../composables/useDocumentHead'

setDocumentHead({
  title: 'Design Your Own Custom Shirt · InkSpirit',
  description: 'Pick a style, describe any idea, and our AI designs a one-of-a-kind graphic tee — free preview, no signup, ready in ~30 seconds.',
  path: '/design',
})

const { addCustomDesignItem } = useCart()
const route = useRoute()

const STYLES = [
  { key: 'bold-graphic', label: 'Bold Graphic', desc: 'Heavy shapes, high contrast' },
  { key: 'retro', label: 'Retro', desc: 'Warm, faded, groovy 70s/80s' },
  { key: 'vintage', label: 'Vintage Print', desc: 'Distressed screen-print look' },
  { key: 'line-art', label: 'Minimal Line', desc: 'Clean one or two-color linework' },
  { key: 'anime', label: 'Anime', desc: 'Manga linework, cel shading' },
  { key: 'watercolor', label: 'Watercolor', desc: 'Soft washes, gentle color' },
  { key: 'streetwear', label: 'Streetwear', desc: 'Bold, oversized, hype energy' },
  { key: 'kawaii', label: 'Kawaii', desc: 'Cute chibi, pastel palette' },
  { key: 'typographic', label: 'Typographic', desc: 'Expressive lettering only' },
]

const IDEA_EXAMPLES = [
  'A corgi surfing a big wave',
  'Powered by coffee and chaos',
  'A skull made of flowers',
  'Mountains, pine trees and a rising sun',
  'A cat astronaut floating in space',
  'Vintage ramen shop sign',
]

const PALETTES = [
  { label: 'Black / White', primary: '#111111', secondary: '#ffffff' },
  { label: 'Cream / Ink', primary: '#f4ecd8', secondary: '#1b1630' },
  { label: 'Sunset', primary: '#ff6a3c', secondary: '#7646e2' },
  { label: 'Ocean', primary: '#1565c0', secondary: '#1ec1fa' },
  { label: 'Forest', primary: '#2e7d32', secondary: '#f9a825' },
  { label: 'Berry', primary: '#880e4f', secondary: '#ffb3c1' },
]

const TOTAL_STEPS = 4
const step = ref(1)

watch(step, async () => {
  await nextTick()
  window.scrollTo(0, 0)
})

// Build state
const selectedStyle = ref(null)
const subject = ref('')
const shirtText = ref('')
const selectedPalette = ref(PALETTES[0])
const aiChoose = ref(false)
const primary = ref(PALETTES[0].primary)
const secondary = ref(PALETTES[0].secondary)

const activeStyle = computed(() => STYLES.find((s) => s.key === selectedStyle.value))
const canGenerate = computed(() => subject.value.trim().length > 0 && selectedStyle.value)

// Generation / result state
const isGenerating = ref(false)
const generatedUrl = ref(null)
const generatedDesignId = ref(null)
const shareCopied = ref(false)
const generateError = ref('')

// Shirt options
const colors = ref([])
const sizes = ref(['S', 'M', 'L', 'XL', '2XL'])
const selectedColor = ref(null)
const selectedSize = ref('M')
const mockupPhotoUrl = ref(null)
const isAdding = ref(false)
const addedCount = ref(0)

const availableSizes = computed(() => {
  if (!selectedColor.value) return sizes.value
  const colorSizes = Object.keys(selectedColor.value.variantsBySize ?? {})
  if (!colorSizes.length) return sizes.value
  return sizes.value.filter((s) => colorSizes.includes(s))
})

const previewSwatch = computed(() => {
  const s = selectedColor.value?.swatch ?? '#ececec'
  return s === '#ffffff' || s === '#fff' ? '#ebebeb' : s
})

const shareableDesignId = computed(() => generatedDesignId.value)

// Loading experience — tuned for ~30-45s generation.
const loadingSteps = [
  { at: 0, msg: 'Warming up the studio…' },
  { at: 5, msg: 'Sketching your idea…' },
  { at: 12, msg: 'Choosing the perfect colors…' },
  { at: 22, msg: 'Inking the details…' },
  { at: 33, msg: 'Almost ready…' },
]
const loadingMsg = ref(loadingSteps[0].msg)
const loadingProgress = ref(0)
let loadingTimers = []

function startLoadingAnimation() {
  stopLoadingAnimation()
  const start = Date.now()
  loadingProgress.value = 0
  loadingMsg.value = loadingSteps[0].msg
  const tick = setInterval(() => {
    const t = (Date.now() - start) / 1000
    loadingProgress.value = Math.min(94, 100 * (1 - Math.exp(-t / 15)))
    for (let i = loadingSteps.length - 1; i >= 0; i--) {
      if (t >= loadingSteps[i].at) { loadingMsg.value = loadingSteps[i].msg; break }
    }
  }, 250)
  loadingTimers = [tick]
}
function stopLoadingAnimation() {
  loadingTimers.forEach(clearInterval)
  loadingTimers = []
}

onMounted(async () => {
  const preStyle = route.query.style
  if (typeof preStyle === 'string' && STYLES.some((s) => s.key === preStyle)) {
    selectedStyle.value = preStyle
  }
  try {
    const res = await fetch('/api/team-shirt/variants')
    const data = await res.json()
    colors.value = data.colors ?? []
    sizes.value = data.sizes ?? ['S', 'M', 'L', 'XL', '2XL']
    if (data.colors?.length) selectColor(data.colors[0])
  } catch { /* defaults */ }
})

onUnmounted(stopLoadingAnimation)

async function fetchMockupPhoto(color) {
  const variantId = color?.variantsBySize?.[selectedSize.value]
    ?? color?.variantsBySize?.['M']
    ?? Object.values(color?.variantsBySize ?? {})[0]
  mockupPhotoUrl.value = color?.mockupUrls?.[0] ?? null
  if (!variantId) return
  try {
    const res = await fetch('/api/team-shirt/mockup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId }),
    })
    const data = await res.json()
    if (data.mockupUrl) mockupPhotoUrl.value = data.mockupUrl
  } catch { /* keep fallback */ }
}

function selectStyle(key) {
  selectedStyle.value = key
  setTimeout(() => { if (step.value === 1) step.value = 2 }, 320)
}

function selectPalette(p) {
  selectedPalette.value = p
  aiChoose.value = false
  primary.value = p.primary
  secondary.value = p.secondary
}
function chooseAiColors() {
  aiChoose.value = true
  selectedPalette.value = null
}

function selectColor(color) {
  selectedColor.value = color
  addedCount.value = 0
  if (!availableSizes.value.includes(selectedSize.value)) {
    selectedSize.value = availableSizes.value.includes('M') ? 'M' : availableSizes.value[0] ?? 'M'
  }
  fetchMockupPhoto(color)
}

function next() { if (step.value < TOTAL_STEPS) step.value += 1 }
function back() { if (step.value > 1) step.value -= 1 }

async function generate() {
  if (!canGenerate.value || isGenerating.value) return
  isGenerating.value = true
  generateError.value = ''
  generatedUrl.value = null
  addedCount.value = 0
  step.value = TOTAL_STEPS
  startLoadingAnimation()
  trackEvent('generate_custom_design', { style: selectedStyle.value })

  try {
    const body = {
      style: selectedStyle.value,
      subject: subject.value.trim(),
      text: shirtText.value.trim(),
      colors: aiChoose.value
        ? { aiChoose: true }
        : { primary: primary.value, secondary: secondary.value },
    }
    const res = await fetch('/api/custom-design/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Generation failed.')

    generatedUrl.value = data.imageUrl
    generatedDesignId.value = data.designId ?? null
    shareCopied.value = false
    if (data.designId) recordDesign(data.designId)
    if (selectedColor.value) fetchMockupPhoto(selectedColor.value)
    loadingProgress.value = 100
    await new Promise((resolve) => setTimeout(resolve, 450))
  } catch (err) {
    generateError.value = err.message
  } finally {
    stopLoadingAnimation()
    isGenerating.value = false
    window.scrollTo(0, 0)
  }
}

function addToBag() {
  if (!generatedUrl.value || isAdding.value) return
  isAdding.value = true
  const variantId = selectedColor.value?.variantsBySize?.[selectedSize.value] ?? null
  addCustomDesignItem({
    generatedImageUrl: generatedUrl.value,
    style: selectedStyle.value,
    styleLabel: activeStyle.value?.label ?? 'Custom',
    size: selectedSize.value,
    color: selectedColor.value?.name ?? 'White',
    printifyVariantId: variantId,
  })
  addedCount.value += 1
  isAdding.value = false
}

async function shareDesign() {
  if (!generatedDesignId.value) return
  trackEvent('share_design', { kind: 'custom_design' })
  const url = `${window.location.origin}/d/${generatedDesignId.value}`
  try {
    await navigator.clipboard.writeText(url)
    shareCopied.value = true
    setTimeout(() => { shareCopied.value = false }, 2500)
  } catch { /* ignore */ }
}

function startOver() {
  step.value = 1
  selectedStyle.value = null
  subject.value = ''
  shirtText.value = ''
  generatedUrl.value = null
  generateError.value = ''
  addedCount.value = 0
}
</script>

<template>
  <div id="top" class="pet-journey-page">
    <SiteHeader />

    <div class="pet-journey">
      <div class="pet-journey__topbar">
        <button
          v-if="step > 1 && !isGenerating"
          class="pet-back-btn"
          type="button"
          aria-label="Back"
          @click="back"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div v-else class="pet-back-btn--ghost"></div>

        <div class="pet-step-dots">
          <span
            v-for="i in 3"
            :key="i"
            class="pet-step-dot"
            :class="{ 'is-active': step === i, 'is-done': step > i }"
          />
        </div>
        <div class="pet-back-btn--ghost"></div>
      </div>

      <div class="pet-slides-viewport">
        <!-- Step 1 — Style -->
        <div v-if="step === 1" class="pet-slide__inner ts-fade">
          <div class="pet-slide__heading">
            <p class="eyebrow">Step 1 of 3</p>
            <h1 class="pet-slide__title">Pick a <span>style</span></h1>
            <p class="pet-slide__sub">The art direction for your design. You can change your idea later.</p>
          </div>
          <div class="cd-styles">
            <button
              v-for="s in STYLES"
              :key="s.key"
              class="cd-style"
              :class="{ 'is-selected': selectedStyle === s.key }"
              type="button"
              @click="selectStyle(s.key)"
            >
              <strong>{{ s.label }}</strong>
              <span>{{ s.desc }}</span>
              <span class="cd-style__check" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </button>
          </div>
        </div>

        <!-- Step 2 — Idea -->
        <div v-else-if="step === 2" class="pet-slide__inner pet-slide__inner--narrow ts-fade">
          <div class="pet-slide__heading">
            <p class="eyebrow">Step 2 of 3</p>
            <h1 class="pet-slide__title">What's it <span>about?</span></h1>
            <p class="pet-slide__sub">Describe your idea in a sentence — the more specific, the better.</p>
          </div>

          <div class="ts-field">
            <label for="cd-subject">Your idea <em>(required)</em></label>
            <textarea
              id="cd-subject"
              v-model="subject"
              class="ts-input cd-textarea"
              maxlength="200"
              rows="3"
              placeholder="e.g. A corgi surfing a big wave at sunset"
            ></textarea>
            <div class="ts-chips">
              <button
                v-for="ex in IDEA_EXAMPLES"
                :key="ex"
                class="ts-chip"
                type="button"
                @click="subject = ex"
              >{{ ex }}</button>
            </div>
          </div>

          <div class="ts-field">
            <label for="cd-text">Text on the shirt <em>(optional)</em></label>
            <input
              id="cd-text"
              v-model="shirtText"
              class="ts-input"
              type="text"
              maxlength="40"
              placeholder="e.g. Stay Weird"
            />
          </div>

          <button class="button ts-next" type="button" :disabled="!subject.trim()" @click="next">Continue →</button>
        </div>

        <!-- Step 3 — Colors -->
        <div v-else-if="step === 3" class="pet-slide__inner pet-slide__inner--narrow ts-fade">
          <div class="pet-slide__heading">
            <p class="eyebrow">Step 3 of 3</p>
            <h1 class="pet-slide__title">Choose a <span>palette</span></h1>
            <p class="pet-slide__sub">Pick a color direction, or let the AI decide what fits your idea.</p>
          </div>

          <div class="ts-palettes">
            <button
              v-for="p in PALETTES"
              :key="p.label"
              class="ts-palette"
              :class="{ 'is-active': !aiChoose && selectedPalette?.label === p.label }"
              type="button"
              @click="selectPalette(p)"
            >
              <span class="ts-palette__swatches">
                <span :style="{ background: p.primary }"></span>
                <span :style="{ background: p.secondary }"></span>
              </span>
              <span>{{ p.label }}</span>
            </button>
            <button
              class="ts-palette ts-palette--ai"
              :class="{ 'is-active': aiChoose }"
              type="button"
              @click="chooseAiColors"
            >
              <span class="ts-palette__swatches ts-palette__swatches--ai"><Icon name="sparkles" /></span>
              <span>AI Choose</span>
            </button>
          </div>

          <button class="button ts-generate" type="button" :disabled="!canGenerate" @click="generate">
            Generate my design →
          </button>
          <p class="pet-generate-hint" style="margin-top: 12px">
            One AI-designed graphic, ready in about 30–45 seconds. Free to preview.
          </p>
        </div>

        <!-- Step 4 — Generating / Result / Error -->
        <template v-else-if="step === 4">
          <!-- Generating -->
          <div v-if="isGenerating" class="pet-slide__inner pet-loading ts-fade">
            <div class="pet-loading__stage">
              <div class="pet-loading__orb pet-generating__orb">
                <span class="pet-generating__spinner" aria-hidden="true"></span>
                <span class="pet-generating__avatar cd-orb-avatar">
                  <Icon name="sparkles" />
                </span>
              </div>
              <transition name="pet-msg" mode="out-in">
                <h2 class="pet-loading__title" :key="loadingMsg">{{ loadingMsg }}</h2>
              </transition>
              <p class="pet-loading__sub">
                Designing a {{ activeStyle?.label }} graphic from your idea — this usually takes 30–45 seconds.
              </p>
              <div class="pet-loading__bar"><span :style="{ width: loadingProgress + '%' }"></span></div>
              <div class="pet-loading__pct">{{ Math.round(loadingProgress) }}%</div>
            </div>
          </div>

          <!-- Result -->
          <div v-else-if="generatedUrl" class="pet-slide__inner pet-slide__inner--result ts-fade">
            <div class="pet-slide__heading">
              <p class="eyebrow">Your design is ready</p>
              <h1 class="pet-slide__title">Here's your <span>tee</span></h1>
              <p class="pet-slide__sub">Preview it on the shirt, pick your color and size, then add it to your bag.</p>
            </div>

            <div class="ts-result">
              <div class="ts-preview">
                <div class="ts-mockup">
                  <ShirtMockup :color="previewSwatch" :art-url="generatedUrl" :photo-url="mockupPhotoUrl" />
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

                <button class="button ts-add" type="button" :disabled="isAdding" @click="addToBag">
                  <template v-if="isAdding">Adding…</template>
                  <template v-else>Add to bag — $38</template>
                </button>
                <p v-if="addedCount > 0" class="ts-added">✓ Added to bag.</p>

                <button
                  v-if="shareableDesignId"
                  class="button button--outline ts-share"
                  type="button"
                  @click="shareDesign"
                >
                  <template v-if="shareCopied">✓ Link copied</template>
                  <template v-else>Share this design</template>
                </button>

                <div class="ts-footlinks">
                  <button class="pet-regen-btn" type="button" @click="generate">↻ Regenerate</button>
                  <button class="pet-start-over" type="button" @click="startOver">Start over</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Error -->
          <div v-else class="pet-slide__inner pet-slide__inner--center ts-fade">
            <div class="ts-genfail">
              <div class="ts-genfail__icon" aria-hidden="true">!</div>
              <h2 class="pet-loading__title">That didn't work</h2>
              <p class="pet-loading__sub">{{ generateError || 'Something went wrong generating your design. Please try again.' }}</p>
              <button class="button ts-generate" type="button" @click="generate">↻ Try again</button>
              <button class="pet-start-over" type="button" @click="step = 2">← Edit my idea</button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
