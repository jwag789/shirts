<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'
import ShirtMockup from '../components/ShirtMockup.vue'
import Icon from '../components/Icon.vue'
import { useCart } from '../composables/useCart'
import { recordDesign } from '../composables/useDesigns'
import { trackEvent } from '../analytics'

const { addTeamShirtItem } = useCart()
const route = useRoute()

const TOTAL_STEPS = 5

const STYLES = [
  { key: 'modern-pro', label: 'Modern Pro', desc: 'Clean, bold, premium', img: '/images/team-styles/modern-pro.png' },
  { key: 'vintage', label: 'Vintage Sports', desc: 'Distressed, retro, timeless', img: '/images/team-styles/vintage.png' },
  { key: 'varsity', label: 'Varsity', desc: 'Block letters, collegiate', img: '/images/team-styles/varsity.png' },
  { key: 'streetwear', label: 'Streetwear', desc: 'Bold oversized graphics', img: '/images/team-styles/streetwear.png' },
  { key: 'heritage', label: 'Heritage Crest', desc: 'Shield, banner, elegant', img: '/images/team-styles/heritage.png' },
  { key: 'championship', label: 'Championship', desc: 'Trophy-inspired, layered', img: '/images/team-styles/championship.png' },
  { key: 'esports', label: 'Esports', desc: 'Aggressive, angular mascot', img: '/images/team-styles/esports.png' },
  { key: 'minimal', label: 'Minimal', desc: 'Clean, understated logo', img: '/images/team-styles/minimal.png' },
]

const LOGO_EXAMPLES = [
  'Bobcat', 'Dragon', 'Mountain', 'Lightning Bolt', 'Crossed Baseball Bats',
  'Phoenix', 'Kraken', 'Bull', 'Compass', 'Anchor', 'Rocket', 'Oak Tree',
  'Skull', 'Wolf', 'Eagle', 'Monogram', 'No logo (typography only)',
]

const SUBTITLE_EXAMPLES = ['EST. 2026', 'Beer League', 'Fantasy Football', 'Company Softball', 'Summer League', 'Family Reunion']

const PALETTES = [
  { label: 'Red / Black', primary: '#c62828', secondary: '#111111' },
  { label: 'Blue / White', primary: '#1565c0', secondary: '#ffffff' },
  { label: 'Green / Gold', primary: '#2e7d32', secondary: '#f9a825' },
  { label: 'Black / Gold', primary: '#111111', secondary: '#f9a825' },
  { label: 'Orange / Navy', primary: '#f57c00', secondary: '#1a237e' },
  { label: 'Purple / Silver', primary: '#6a1b9a', secondary: '#c0c0c0' },
  { label: 'Maroon / White', primary: '#880e4f', secondary: '#ffffff' },
  { label: 'Navy / Red', primary: '#1a237e', secondary: '#c62828' },
]

// ── Wizard state ─────────────────────────────────────────────────────────────
const step = ref(1)

// Reset scroll to the top after the new step renders so a step never opens
// mid-scroll. Instant (not smooth) — smooth scrolling is unreliable on mobile
// during the step's layout swap and can land part-way down.
watch(step, async () => {
  await nextTick()
  window.scrollTo(0, 0)
})
const teamName = ref('')
const subtitle = ref('')
const selectedStyle = ref(null)
const logoConcept = ref('')
const selectedPalette = ref(PALETTES[0])
const aiChoose = ref(false)
const primary = ref(PALETTES[0].primary)
const secondary = ref(PALETTES[0].secondary)
const accent = ref('')

// ── Generation / result state ────────────────────────────────────────────────
const isGenerating = ref(false)
const generatedUrl = ref(null)
const generatedDesignId = ref(null)
const shareCopied = ref(false)
const sharePreparing = ref(false)
const generateError = ref('')

// Loading experience: status copy + a faux progress bar, both driven by elapsed
// time and tuned for the real ~20-40s team-graphic generation (a bit faster than
// pet portraits). Progress eases toward ~94% and fills to 100% when the result
// lands; messages advance at set elapsed-time marks.
const loadingSteps = [
  { at: 0, msg: 'Warming up the studio…' },
  { at: 4, msg: 'Sketching the logo…' },
  { at: 10, msg: 'Choosing the perfect colors…' },
  { at: 18, msg: 'Building your team graphic…' },
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
    // ~32% at 5s, ~54% at 10s, ~79% at 20s, ~90% at 30s; capped 94.
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

// ── Shirt options ────────────────────────────────────────────────────────────
const colors = ref([])
const sizes = ref(['S', 'M', 'L', 'XL', '2XL'])
const selectedColor = ref(null)
const selectedSize = ref('M')
const mockupPhotoUrl = ref(null)

const isAdding = ref(false)
const addedCount = ref(0)

const activeStyle = computed(() => STYLES.find((s) => s.key === selectedStyle.value))

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

const canGenerate = computed(() => teamName.value.trim().length > 0 && selectedStyle.value)

onMounted(async () => {
  // Deep-link from the landing page's style gallery: preselect it so it's
  // already chosen when they reach the style step (step 1 is the team name).
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
  } catch { /* falls back to defaults */ }
})

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
  // Auto-advance after a beat so the selection check is visible, matching the
  // pet wizard — no separate Continue click needed.
  setTimeout(() => { if (step.value === 2) next() }, 320)
}

function selectPalette(p) {
  selectedPalette.value = p
  aiChoose.value = false
  primary.value = p.primary
  secondary.value = p.secondary
  accent.value = ''
}

function chooseAiColors() {
  aiChoose.value = true
  selectedPalette.value = null
}

function onCustomColor() {
  aiChoose.value = false
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

function next() {
  if (step.value < TOTAL_STEPS) step.value += 1
}
function back() {
  if (step.value > 1) step.value -= 1
}

async function generate() {
  if (!canGenerate.value || isGenerating.value) return
  isGenerating.value = true
  generateError.value = ''
  generatedUrl.value = null
  addedCount.value = 0
  step.value = TOTAL_STEPS
  startLoadingAnimation()
  trackEvent('generate_team_shirt', { style: selectedStyle.value })

  try {
    const body = {
      teamName: teamName.value.trim(),
      subtitle: subtitle.value.trim(),
      style: selectedStyle.value,
      logoConcept: logoConcept.value.trim(),
      colors: aiChoose.value
        ? { aiChoose: true }
        : {
            primary: `${selectedPalette.value?.label?.split(' / ')[0] ?? ''} ${primary.value}`.trim(),
            secondary: `${selectedPalette.value?.label?.split(' / ')[1] ?? ''} ${secondary.value}`.trim(),
            accent: accent.value || undefined,
          },
    }

    const res = await fetch('/api/team-shirt/generate', {
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
    // Fill the bar and let it read 100% for a beat before revealing the result.
    loadingProgress.value = 100
    await new Promise((resolve) => setTimeout(resolve, 450))
  } catch (err) {
    // Stay on step 5 so the error state is visible with a Try again button,
    // instead of silently bouncing back to the colors step.
    generateError.value = err.message
  } finally {
    stopLoadingAnimation()
    isGenerating.value = false
    // Result/error and loading share step 5, so the step watcher won't fire —
    // reset scroll here so the result or error opens at the top.
    window.scrollTo(0, 0)
  }
}

async function shareDesign() {
  if (!generatedDesignId.value || sharePreparing.value) return
  trackEvent('share_design', { kind: 'team_shirt' })
  // Build a shirt-mockup preview in the chosen color so the shared link unfurls
  // with the actual shirt, not the bare artwork.
  sharePreparing.value = true
  try {
    await fetch(`/api/designs/${generatedDesignId.value}/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        swatch: selectedColor.value?.swatch ?? '#ececec',
        colorName: selectedColor.value?.name ?? 'White',
      }),
    })
  } catch {
    /* preview is best-effort — still share the link */
  }
  sharePreparing.value = false

  const url = `${window.location.origin}/d/${generatedDesignId.value}`
  if (navigator.share) {
    try {
      await navigator.share({ title: `${teamName.value.trim()} — Custom Team Shirt`, url })
      return
    } catch {
      /* cancelled — fall through to copy */
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    shareCopied.value = true
    setTimeout(() => { shareCopied.value = false }, 2000)
  } catch {
    /* clipboard blocked */
  }
}

async function addToBag() {
  if (!generatedUrl.value || isAdding.value) return
  isAdding.value = true
  const variantId = selectedColor.value?.variantsBySize?.[selectedSize.value] ?? null

  try {
    addTeamShirtItem({
      generatedImageUrl: generatedUrl.value,
      teamName: teamName.value.trim(),
      style: selectedStyle.value,
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
  teamName.value = ''
  subtitle.value = ''
  selectedStyle.value = null
  logoConcept.value = ''
  selectPalette(PALETTES[0])
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
            v-for="i in TOTAL_STEPS"
            :key="i"
            class="pet-step-dot"
            :class="{ 'is-active': step === i, 'is-done': step > i }"
          />
        </div>

        <div class="pet-back-btn--ghost"></div>
      </div>

      <div class="pet-slides-viewport">
        <!-- Step 1 — Team information -->
        <div v-if="step === 1" class="pet-slide__inner pet-slide__inner--narrow ts-fade">
          <div class="pet-slide__heading">
            <p class="eyebrow">Step 1 of 5</p>
            <h1 class="pet-slide__title">Name your <span>team</span></h1>
            <p class="pet-slide__sub">This is the hero of your design. Make it count.</p>
          </div>

          <div class="ts-field">
            <label for="ts-team-name">Team name <em>(required)</em></label>
            <input
              id="ts-team-name"
              v-model="teamName"
              class="ts-input"
              type="text"
              maxlength="40"
              placeholder="e.g. Wagner Wolves"
              @keyup.enter="canGenerate && next()"
            />
          </div>

          <div class="ts-field">
            <label for="ts-subtitle">Subtitle <em>(optional)</em></label>
            <input
              id="ts-subtitle"
              v-model="subtitle"
              class="ts-input"
              type="text"
              maxlength="30"
              placeholder="e.g. EST. 2026"
            />
            <div class="ts-chips">
              <button
                v-for="ex in SUBTITLE_EXAMPLES"
                :key="ex"
                class="ts-chip"
                type="button"
                @click="subtitle = ex"
              >{{ ex }}</button>
            </div>
          </div>

          <button
            class="button ts-next"
            type="button"
            :disabled="!teamName.trim()"
            @click="next"
          >Continue →</button>
        </div>

        <!-- Step 2 — Style -->
        <div v-else-if="step === 2" class="pet-slide__inner ts-fade">
          <div class="pet-slide__heading">
            <p class="eyebrow">Step 2 of 5</p>
            <h1 class="pet-slide__title">Choose a <span>style</span></h1>
            <p class="pet-slide__sub">The design language for your team's look.</p>
          </div>

          <div class="style-grid">
            <button
              v-for="s in STYLES"
              :key="s.key"
              class="style-card"
              :class="{ 'is-selected': selectedStyle === s.key }"
              type="button"
              @click="selectStyle(s.key)"
            >
              <span class="style-card__medallion ts-style-medallion">
                <img :src="s.img" :alt="`${s.label} team logo style`" loading="lazy" />
              </span>
              <span class="style-card__copy">
                <strong>{{ s.label }}</strong>
                <span>{{ s.desc }}</span>
              </span>
              <span class="style-card__check" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </button>
          </div>
        </div>

        <!-- Step 3 — Logo concept -->
        <div v-else-if="step === 3" class="pet-slide__inner pet-slide__inner--narrow ts-fade">
          <div class="pet-slide__heading">
            <p class="eyebrow">Step 3 of 5</p>
            <h1 class="pet-slide__title">Your <span>logo</span> concept</h1>
            <p class="pet-slide__sub">Describe what you'd like featured in your team's logo. Leave it blank for a typography-only design.</p>
          </div>

          <div class="ts-field">
            <label for="ts-logo">Logo concept <em>(optional)</em></label>
            <input
              id="ts-logo"
              v-model="logoConcept"
              class="ts-input"
              type="text"
              maxlength="60"
              placeholder="e.g. Bobcat, Dragon, Crossed Baseball Bats…"
            />
            <div class="ts-chips">
              <button
                v-for="ex in LOGO_EXAMPLES"
                :key="ex"
                class="ts-chip"
                :class="{ 'is-active': logoConcept === ex }"
                type="button"
                @click="logoConcept = ex"
              >{{ ex }}</button>
            </div>
          </div>

          <button class="button ts-next" type="button" @click="next">Continue →</button>
        </div>

        <!-- Step 4 — Colors -->
        <div v-else-if="step === 4" class="pet-slide__inner pet-slide__inner--narrow ts-fade">
          <div class="pet-slide__heading">
            <p class="eyebrow">Step 4 of 5</p>
            <h1 class="pet-slide__title">Team <span>colors</span></h1>
            <p class="pet-slide__sub">Pick a preset, fine-tune it, or let the AI choose.</p>
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

          <div v-if="!aiChoose" class="ts-colorpickers">
            <label>
              <span>Primary</span>
              <input v-model="primary" type="color" @input="onCustomColor" />
            </label>
            <label>
              <span>Secondary</span>
              <input v-model="secondary" type="color" @input="onCustomColor" />
            </label>
            <label>
              <span>Accent <em>(optional)</em></span>
              <input :value="accent || '#cccccc'" type="color" @input="(e) => { accent = e.target.value; onCustomColor() }" />
            </label>
          </div>

          <button class="button ts-generate" type="button" :disabled="!canGenerate" @click="generate">
            Generate my design →
          </button>
          <p class="pet-generate-hint" style="margin-top: 12px">
            One AI-designed team graphic, ready in about 20–40 seconds.
          </p>
        </div>

        <!-- Step 5 — Generating / Result -->
        <template v-else-if="step === 5">
          <!-- Generating -->
          <div v-if="isGenerating" class="pet-slide__inner pet-loading ts-fade">
            <div class="pet-loading__stage">
              <div class="pet-loading__orb pet-generating__orb">
                <span class="pet-generating__spinner" aria-hidden="true"></span>
                <span class="pet-generating__avatar ts-style-medallion">
                  <img :src="activeStyle?.img" :alt="`${activeStyle?.label} team logo style`" />
                </span>
              </div>
              <transition name="pet-msg" mode="out-in">
                <h2 class="pet-loading__title" :key="loadingMsg">{{ loadingMsg }}</h2>
              </transition>
              <p class="pet-loading__sub">
                Building an authentic {{ activeStyle?.label }} look for {{ teamName }} — this usually takes 20–40 seconds.
              </p>
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
              <h1 class="pet-slide__title">{{ teamName }} — <span>ready to wear</span></h1>
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
                  <template v-else>Add to bag — $42</template>
                </button>

                <p v-if="addedCount > 0" class="ts-added">
                  ✓ Added to bag.
                </p>

                <button
                  v-if="generatedDesignId"
                  class="button button--outline ts-share"
                  type="button"
                  :disabled="sharePreparing"
                  @click="shareDesign"
                >
                  <template v-if="sharePreparing">Preparing preview…</template>
                  <template v-else-if="shareCopied">✓ Link copied</template>
                  <template v-else>Share this design</template>
                </button>

                <div class="ts-footlinks">
                  <button class="pet-regen-btn" type="button" @click="generate">↻ Regenerate design</button>
                  <button class="pet-start-over" type="button" @click="startOver">Start over</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Error (first generation failed) -->
          <div v-else class="pet-slide__inner pet-slide__inner--center ts-fade">
            <div class="ts-genfail">
              <div class="ts-genfail__icon" aria-hidden="true">!</div>
              <h2 class="pet-loading__title">That didn't work</h2>
              <p class="pet-loading__sub">{{ generateError || 'Something went wrong generating your design. Please try again.' }}</p>
              <button class="button ts-generate" type="button" @click="generate">↻ Try again</button>
              <button class="pet-start-over" type="button" @click="step = 4">← Back to colors</button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
