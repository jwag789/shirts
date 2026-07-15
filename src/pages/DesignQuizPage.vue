<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import SiteHeader from '../components/SiteHeader.vue'
import ShirtMockup from '../components/ShirtMockup.vue'
import { useCart } from '../composables/useCart'
import { recordDesign } from '../composables/useDesigns'
import { trackEvent } from '../analytics'
import { SUBJECT_TYPES, STYLES, MOODS, PALETTES, assemblePrompt } from '../data/shirtQuizConfig'

const { addQuizShirtItem } = useCart()

const TOTAL_STEPS = 5
const SUBJECT_DETAIL_MAX_LENGTH = 40

// ── Wizard state ─────────────────────────────────────────────────────────────
const step = ref(1)

// Reset scroll to the top after the new step renders so a step never opens
// mid-scroll, matching the pet/team wizards.
watch(step, async () => {
  await nextTick()
  window.scrollTo(0, 0)
})

const subjectType = ref(null)
const subjectDetail = ref('')
const style = ref(null)
const mood = ref(null)
const palette = ref(null)

const activeSubjectType = computed(() => SUBJECT_TYPES.find((s) => s.key === subjectType.value))

const canGenerate = computed(() => (
  Boolean(subjectType.value) && subjectDetail.value.trim().length > 0 && Boolean(style.value) && Boolean(mood.value) && Boolean(palette.value)
))

// Assembled from fixed fragments + the one free-typed field — never raw user
// text directly. Recomputes live so the debug view always reflects the
// current answers.
const assembledPrompt = computed(() => {
  try {
    return assemblePrompt({
      subjectType: subjectType.value,
      subjectDetail: subjectDetail.value,
      style: style.value,
      mood: mood.value,
      palette: palette.value,
    })
  } catch {
    return null
  }
})

// ── Generation / result state ────────────────────────────────────────────────
const isGenerating = ref(false)
const generatedUrl = ref(null)
const generatedDesignId = ref(null)
const generateError = ref('')

// ── Shirt options (buy panel) ───────────────────────────────────────────────
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
  const s = selectedColor.value?.swatch ?? '#ebebeb'
  return s === '#ffffff' || s === '#fff' ? '#ececec' : s
})

async function loadVariants() {
  try {
    const res = await fetch('/api/team-shirt/variants')
    const data = await res.json()
    colors.value = data.colors ?? []
    sizes.value = data.sizes ?? ['S', 'M', 'L', 'XL', '2XL']
    if (data.colors?.length) selectColor(data.colors[0])
  } catch { /* falls back to defaults */ }
}

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

function selectColor(color) {
  selectedColor.value = color
  addedCount.value = 0
  if (!availableSizes.value.includes(selectedSize.value)) {
    selectedSize.value = availableSizes.value.includes('M') ? 'M' : availableSizes.value[0] ?? 'M'
  }
  fetchMockupPhoto(color)
}

const loadingSteps = [
  { at: 0, msg: 'Warming up the studio…' },
  { at: 4, msg: 'Sketching your design…' },
  { at: 10, msg: 'Choosing the perfect colors…' },
  { at: 18, msg: 'Building your graphic…' },
  { at: 26, msg: 'Adding the finishing touches…' },
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
    loadingProgress.value = Math.min(94, 100 * (1 - Math.exp(-t / 13)))
    for (let i = loadingSteps.length - 1; i >= 0; i--) {
      if (t >= loadingSteps[i].at) {
        loadingMsg.value = loadingSteps[i].msg
        break
      }
    }
  }, 250)
  loadingTimers = [tick]
}

function stopLoadingAnimation() {
  loadingTimers.forEach(clearInterval)
  loadingTimers = []
}

onUnmounted(stopLoadingAnimation)
onMounted(loadVariants)

function selectSubjectType(key) {
  subjectType.value = key
  setTimeout(() => { if (step.value === 1) next() }, 220)
}

function selectStyle(key) {
  style.value = key
  setTimeout(() => { if (step.value === 3) next() }, 220)
}

function selectMood(key) {
  mood.value = key
  setTimeout(() => { if (step.value === 4) next() }, 220)
}

function next() {
  if (step.value < TOTAL_STEPS) step.value += 1
}
function back() {
  if (step.value > 1) {
    generateError.value = ''
    step.value -= 1
  }
}

async function generate() {
  if (!canGenerate.value || isGenerating.value) return
  isGenerating.value = true
  generateError.value = ''
  generatedUrl.value = null
  addedCount.value = 0
  step.value = TOTAL_STEPS
  startLoadingAnimation()
  trackEvent('generate_design_quiz', { subjectType: subjectType.value, style: style.value, mood: mood.value, palette: palette.value })

  try {
    const res = await fetch('/api/design-quiz/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subjectType: subjectType.value,
        subjectDetail: subjectDetail.value.trim(),
        style: style.value,
        mood: mood.value,
        palette: palette.value,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Generation failed.')

    generatedUrl.value = data.imageUrl
    generatedDesignId.value = data.designId ?? null
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

async function addToBag() {
  if (!generatedUrl.value || isAdding.value) return
  isAdding.value = true
  const variantId = selectedColor.value?.variantsBySize?.[selectedSize.value] ?? null

  try {
    addQuizShirtItem({
      generatedImageUrl: generatedUrl.value,
      subjectDetail: subjectDetail.value.trim(),
      style: style.value,
      mood: mood.value,
      palette: palette.value,
      size: selectedSize.value,
      color: selectedColor.value?.name ?? 'White',
      printifyVariantId: variantId,
    })

    addedCount.value += 1
  } catch (err) {
    generateError.value = err.message
  } finally {
    isAdding.value = false
  }
}

function startOver() {
  step.value = 1
  subjectType.value = null
  subjectDetail.value = ''
  style.value = null
  mood.value = null
  palette.value = null
  generatedUrl.value = null
  generateError.value = ''
  addedCount.value = 0
}
</script>

<template>
  <div class="pet-journey-page">
    <SiteHeader />

    <div class="pet-journey">
      <!-- Top bar: back + step dots -->
      <div class="pet-journey__topbar">
        <button
          v-if="step > 1 && !isGenerating && !generatedUrl"
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
            v-for="i in TOTAL_STEPS"
            :key="i"
            class="pet-step-dot"
            :class="{ 'is-active': step === i, 'is-done': step > i }"
          />
        </div>

        <div class="pet-back-btn--ghost"></div>
      </div>

      <div class="pet-slides-viewport">
        <!-- Step 1 — Subject type -->
        <div v-if="step === 1" class="pet-slide__inner ts-fade">
          <div class="pet-slide__heading">
            <p class="eyebrow">Step 1 of {{ TOTAL_STEPS }}</p>
            <h1 class="pet-slide__title">What's the <span>subject</span>?</h1>
            <p class="pet-slide__sub">Pick what your design is built around.</p>
          </div>

          <div class="style-grid quiz-tile-grid">
            <button
              v-for="s in SUBJECT_TYPES"
              :key="s.key"
              class="style-card quiz-tile"
              :class="{ 'is-selected': subjectType === s.key }"
              type="button"
              @click="selectSubjectType(s.key)"
            >
              <span class="style-card__copy">
                <strong>{{ s.label }}</strong>
              </span>
              <span class="style-card__check" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </button>
          </div>
        </div>

        <!-- Step 2 — Subject detail -->
        <div v-else-if="step === 2" class="pet-slide__inner pet-slide__inner--narrow ts-fade">
          <div class="pet-slide__heading">
            <p class="eyebrow">Step 2 of {{ TOTAL_STEPS }}</p>
            <h1 class="pet-slide__title">Describe your <span>{{ activeSubjectType?.label?.toLowerCase() }}</span></h1>
            <p class="pet-slide__sub">A few words is plenty.</p>
          </div>

          <div class="ts-field">
            <label for="quiz-subject-detail">Subject detail</label>
            <input
              id="quiz-subject-detail"
              v-model="subjectDetail"
              class="ts-input"
              type="text"
              :maxlength="SUBJECT_DETAIL_MAX_LENGTH"
              :placeholder="activeSubjectType?.placeholder"
              @keyup.enter="subjectDetail.trim() && next()"
            />
          </div>

          <button
            class="button ts-next"
            type="button"
            :disabled="!subjectDetail.trim()"
            @click="next"
          >Continue →</button>
        </div>

        <!-- Step 3 — Style -->
        <div v-else-if="step === 3" class="pet-slide__inner ts-fade">
          <div class="pet-slide__heading">
            <p class="eyebrow">Step 3 of {{ TOTAL_STEPS }}</p>
            <h1 class="pet-slide__title">Choose a <span>style</span></h1>
            <p class="pet-slide__sub">The visual language for your graphic.</p>
          </div>

          <div class="style-grid quiz-tile-grid">
            <button
              v-for="s in STYLES"
              :key="s.key"
              class="style-card quiz-tile"
              :class="{ 'is-selected': style === s.key }"
              type="button"
              @click="selectStyle(s.key)"
            >
              <span class="style-card__copy">
                <strong>{{ s.label }}</strong>
              </span>
              <span class="style-card__check" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </button>
          </div>
        </div>

        <!-- Step 4 — Mood -->
        <div v-else-if="step === 4" class="pet-slide__inner ts-fade">
          <div class="pet-slide__heading">
            <p class="eyebrow">Step 4 of {{ TOTAL_STEPS }}</p>
            <h1 class="pet-slide__title">Pick the <span>mood</span></h1>
            <p class="pet-slide__sub">What vibe should it give off?</p>
          </div>

          <div class="style-grid quiz-tile-grid">
            <button
              v-for="m in MOODS"
              :key="m.key"
              class="style-card quiz-tile"
              :class="{ 'is-selected': mood === m.key }"
              type="button"
              @click="selectMood(m.key)"
            >
              <span class="style-card__copy">
                <strong>{{ m.label }}</strong>
              </span>
              <span class="style-card__check" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </button>
          </div>
        </div>

        <!-- Step 5 — Color palette / Generating / Result -->
        <template v-else-if="step === 5">
          <div v-if="!generatedUrl && !isGenerating && !generateError" class="pet-slide__inner pet-slide__inner--narrow ts-fade">
            <div class="pet-slide__heading">
              <p class="eyebrow">Step 5 of {{ TOTAL_STEPS }}</p>
              <h1 class="pet-slide__title">Color <span>palette</span></h1>
              <p class="pet-slide__sub">Last step — pick the palette for your design.</p>
            </div>

            <div class="ts-palettes">
              <button
                v-for="p in PALETTES"
                :key="p.key"
                class="ts-palette"
                :class="{ 'is-active': palette === p.key }"
                type="button"
                @click="palette = p.key"
              >
                <span class="ts-palette__swatches">
                  <span v-for="(c, i) in p.swatches" :key="i" :style="{ background: c }"></span>
                </span>
                <span>{{ p.label }}</span>
              </button>
            </div>

            <button class="button ts-generate" type="button" :disabled="!canGenerate" @click="generate">
              Generate →
            </button>
            <p class="pet-generate-hint" style="margin-top: 12px">
              One AI-designed graphic, ready in about 20–40 seconds.
            </p>

            <details v-if="assembledPrompt" class="quiz-debug">
              <summary>Assembled prompt (debug)</summary>
              <p>{{ assembledPrompt }}</p>
            </details>
          </div>

          <!-- Generating -->
          <div v-else-if="isGenerating" class="pet-slide__inner pet-loading ts-fade">
            <div class="pet-loading__stage">
              <div class="pet-loading__orb pet-generating__orb">
                <span class="pet-generating__spinner" aria-hidden="true"></span>
              </div>
              <transition name="pet-msg" mode="out-in">
                <h2 class="pet-loading__title" :key="loadingMsg">{{ loadingMsg }}</h2>
              </transition>
              <p class="pet-loading__sub">Building your design — this usually takes 20–40 seconds.</p>
              <div class="pet-loading__bar">
                <span :style="{ width: loadingProgress + '%' }"></span>
              </div>
              <div class="pet-loading__pct">{{ Math.round(loadingProgress) }}%</div>
            </div>
          </div>

          <!-- Result -->
          <div v-else-if="generatedUrl" class="pet-slide__inner pet-slide__inner--result ts-fade">
            <div class="pet-slide__heading">
              <p class="eyebrow">Your design is ready</p>
              <h1 class="pet-slide__title">Here's your <span>design</span></h1>
              <p class="pet-slide__sub">Preview it on the shirt, pick your color and size, then add it to your bag.</p>
            </div>

            <div class="ts-result">
              <!-- Shirt preview -->
              <div class="ts-preview">
                <div class="ts-mockup">
                  <ShirtMockup :color="previewSwatch" :art-url="generatedUrl" :photo-url="mockupPhotoUrl" />
                </div>
              </div>

              <!-- Buy panel -->
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

                <p v-if="generateError" class="pet-error" style="margin-top: 14px">{{ generateError }}</p>

                <button class="button ts-add" type="button" :disabled="isAdding" @click="addToBag">
                  <template v-if="isAdding">Adding…</template>
                  <template v-else>Add to bag — $38</template>
                </button>

                <p v-if="addedCount > 0" class="ts-added">
                  ✓ Added to bag.
                </p>

                <div class="ts-footlinks">
                  <button class="pet-regen-btn" type="button" @click="generate">↻ Regenerate design</button>
                  <button class="pet-start-over" type="button" @click="startOver">Start over</button>
                </div>

                <details v-if="assembledPrompt" class="quiz-debug">
                  <summary>Assembled prompt (debug)</summary>
                  <p>{{ assembledPrompt }}</p>
                </details>
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
              <button class="pet-start-over" type="button" @click="generateError = ''; step = 4">← Back to mood</button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
