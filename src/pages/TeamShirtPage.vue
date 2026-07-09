<script setup>
import { ref, computed, onMounted } from 'vue'
import SiteHeader from '../components/SiteHeader.vue'
import ShirtMockup from '../components/ShirtMockup.vue'
import { useCart } from '../composables/useCart'

const { addTeamShirtItem } = useCart()

const TOTAL_STEPS = 5

const STYLES = [
  { key: 'modern-pro', label: 'Modern Pro', desc: 'Clean, bold, premium', icon: '🏆', art: 'linear-gradient(135deg,#0f172a,#1e40af)' },
  { key: 'vintage', label: 'Vintage Sports', desc: 'Distressed, retro, timeless', icon: '🎽', art: 'linear-gradient(135deg,#7c2d12,#b45309)' },
  { key: 'varsity', label: 'Varsity', desc: 'Block letters, collegiate', icon: '🎓', art: 'linear-gradient(135deg,#1e3a8a,#b91c1c)' },
  { key: 'streetwear', label: 'Streetwear', desc: 'Bold oversized graphics', icon: '🔥', art: 'linear-gradient(135deg,#111827,#4b5563)' },
  { key: 'heritage', label: 'Heritage Crest', desc: 'Shield, banner, elegant', icon: '🛡️', art: 'linear-gradient(135deg,#064e3b,#065f46)' },
  { key: 'championship', label: 'Championship', desc: 'Trophy-inspired, layered', icon: '🥇', art: 'linear-gradient(135deg,#78350f,#ca8a04)' },
  { key: 'esports', label: 'Esports', desc: 'Aggressive, angular mascot', icon: '🎮', art: 'linear-gradient(135deg,#4c1d95,#db2777)' },
  { key: 'minimal', label: 'Minimal', desc: 'Clean, understated logo', icon: '⚪', art: 'linear-gradient(135deg,#374151,#111827)' },
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
const generateError = ref('')

// ── Shirt options ────────────────────────────────────────────────────────────
const colors = ref([])
const sizes = ref(['S', 'M', 'L', 'XL', '2XL'])
const selectedColor = ref(null)
const selectedSize = ref('M')
const mockupPhotoUrl = ref(null)

// ── Personalization ──────────────────────────────────────────────────────────
const playerName = ref('')
const playerNumber = ref('')
const playerRole = ref('')
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

// The name line shown on the plate falls back to the role when no name is given.
const plateName = computed(() => (playerName.value.trim() || playerRole.value.trim()).toUpperCase().slice(0, 16))
const plateNumber = computed(() => playerNumber.value.trim().slice(0, 4))
const hasPersonalization = computed(() => Boolean(plateName.value || plateNumber.value))

function relLuminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '')
  if (!m) return 0.5
  const n = parseInt(m[1], 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Use the darker team color as the letter fill and a light keyline so the
// nameplate reads on any shirt color.
const plateColors = computed(() => {
  if (aiChoose.value) return { fill: '#111111', outline: '#ffffff' }
  const p = primary.value, s = secondary.value
  const fill = relLuminance(p) <= relLuminance(s) ? p : s
  const outline = relLuminance(fill) < 0.4 ? '#ffffff' : '#111111'
  return { fill, outline }
})

onMounted(async () => {
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
    if (selectedColor.value) fetchMockupPhoto(selectedColor.value)
  } catch (err) {
    generateError.value = err.message
    step.value = 4
  } finally {
    isGenerating.value = false
  }
}

async function addToBag() {
  if (!generatedUrl.value || isAdding.value) return
  isAdding.value = true
  const variantId = selectedColor.value?.variantsBySize?.[selectedSize.value] ?? null

  try {
    let imageUrl = generatedUrl.value

    // Composite the player name/number onto the design server-side so the print
    // file matches the preview exactly.
    if (hasPersonalization.value) {
      const res = await fetch('/api/team-shirt/personalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseImageUrl: generatedUrl.value,
          name: plateName.value,
          number: plateNumber.value,
          fill: plateColors.value.fill,
          outline: plateColors.value.outline,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not personalize the shirt.')
      imageUrl = data.imageUrl
    }

    addTeamShirtItem({
      generatedImageUrl: imageUrl,
      teamName: teamName.value.trim(),
      playerName: playerName.value.trim() || playerRole.value.trim(),
      playerNumber: plateNumber.value,
      style: selectedStyle.value,
      size: selectedSize.value,
      color: selectedColor.value?.name ?? 'White',
      printifyVariantId: variantId,
    })

    addedCount.value += 1
    // Clear the player fields so the next teammate can be added quickly.
    playerName.value = ''
    playerNumber.value = ''
    playerRole.value = ''
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
  playerName.value = ''
  playerNumber.value = ''
  playerRole.value = ''
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
              <span class="style-card__medallion" :style="{ background: s.art }">
                <span class="ts-style-icon">{{ s.icon }}</span>
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

          <button class="button ts-next" type="button" :disabled="!selectedStyle" @click="next">Continue →</button>
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
              <span class="ts-palette__swatches ts-palette__swatches--ai">✨</span>
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
          <div v-if="isGenerating" class="pet-slide__inner pet-slide__inner--center ts-fade">
            <div class="pet-generating">
              <div class="pet-generating__orb">
                <span class="pet-generating__spinner" aria-hidden="true"></span>
                <span class="pet-generating__avatar" :style="{ background: activeStyle?.art }">
                  <span class="ts-style-icon ts-style-icon--lg">{{ activeStyle?.icon }}</span>
                </span>
              </div>
              <h2 class="pet-generating__title">Designing your team graphic<span class="pet-generating__dots"><i>.</i><i>.</i><i>.</i></span></h2>
              <p class="pet-generating__sub">
                Building an authentic {{ activeStyle?.label }} look for {{ teamName }}. This usually takes 20–40 seconds.
              </p>
              <div class="pet-generating__bar" aria-hidden="true"><span></span></div>
            </div>
          </div>

          <!-- Result -->
          <div v-else-if="generatedUrl" class="pet-slide__inner pet-slide__inner--result ts-fade">
            <div class="pet-slide__heading">
              <p class="eyebrow">Your design is ready</p>
              <h1 class="pet-slide__title">{{ teamName }} — <span>ready to wear</span></h1>
              <p class="pet-slide__sub">Preview it on the shirt, personalize per player, then add each teammate to your bag.</p>
            </div>

            <div class="ts-result">
              <!-- Shirt preview with live personalization overlay -->
              <div class="ts-preview">
                <div class="ts-mockup">
                  <ShirtMockup :color="previewSwatch" :art-url="generatedUrl" :photo-url="mockupPhotoUrl" />
                  <div v-if="hasPersonalization" class="ts-plate" aria-hidden="true">
                    <span
                      v-if="plateName"
                      class="ts-plate__name"
                      :style="{ color: plateColors.fill, '-webkit-text-stroke': `1.5px ${plateColors.outline}` }"
                    >{{ plateName }}</span>
                    <span
                      v-if="plateNumber"
                      class="ts-plate__number"
                      :style="{ color: plateColors.fill, '-webkit-text-stroke': `2px ${plateColors.outline}` }"
                    >{{ plateNumber }}</span>
                  </div>
                </div>
                <p v-if="hasPersonalization" class="ts-preview__note">
                  Preview — your name &amp; number are printed into the design.
                </p>
              </div>

              <!-- Buy + personalize panel -->
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

                <div class="ts-persona">
                  <div class="product-options__label">
                    <span>Personalize <em>(optional)</em></span>
                  </div>
                  <div class="ts-persona__grid">
                    <label>
                      <span>Name</span>
                      <input v-model="playerName" type="text" maxlength="16" placeholder="JUSTIN" />
                    </label>
                    <label class="ts-persona__num">
                      <span>Number</span>
                      <input v-model="playerNumber" type="text" inputmode="numeric" maxlength="4" placeholder="17" />
                    </label>
                    <label>
                      <span>Role</span>
                      <input v-model="playerRole" type="text" maxlength="16" placeholder="Coach (optional)" />
                    </label>
                  </div>
                </div>

                <p v-if="generateError" class="pet-error" style="margin-top: 14px">{{ generateError }}</p>

                <button class="button ts-add" type="button" :disabled="isAdding" @click="addToBag">
                  <template v-if="isAdding">Adding…</template>
                  <template v-else-if="hasPersonalization">Add {{ plateName || 'shirt' }} {{ plateNumber }} to bag — $42</template>
                  <template v-else>Add to bag — $42</template>
                </button>

                <p v-if="addedCount > 0" class="ts-added">
                  ✓ {{ addedCount }} shirt<span v-if="addedCount !== 1">s</span> added — change the name &amp; number above to add another teammate.
                </p>

                <div class="ts-footlinks">
                  <button class="pet-regen-btn" type="button" @click="generate">↻ Regenerate design</button>
                  <button class="pet-start-over" type="button" @click="startOver">Start over</button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
