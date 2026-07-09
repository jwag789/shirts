<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import SiteHeader from '../components/SiteHeader.vue'
import ShirtMockup from '../components/ShirtMockup.vue'
import { useCart } from '../composables/useCart'

const { addPetPortraitItem } = useCart()

const STYLES = [
  { key: 'superhero', label: 'Superhero', desc: 'Cape, mask, heroic pose', icon: '⚡', img: '/images/pet-styles/superhero.png' },
  { key: 'viking', label: 'Viking', desc: 'Horned helmet, battle axe', icon: '🪓', img: '/images/pet-styles/viking.png' },
  { key: 'pirate', label: 'Pirate', desc: 'Tricorn hat, cutlass, sea', icon: '☠️', img: '/images/pet-styles/pirate.png' },
  { key: 'astronaut', label: 'Astronaut', desc: 'Spacesuit, deep space', icon: '🚀', img: '/images/pet-styles/astronaut.png' },
  { key: 'samurai', label: 'Samurai', desc: 'Katana, armor, cherry blossoms', icon: '⛩️', img: '/images/pet-styles/samurai.png' },
  { key: 'wizard', label: 'Wizard', desc: 'Robes, staff, magic spells', icon: '🔮', img: '/images/pet-styles/wizard.png' },
]

const colors = ref([])
const sizes = ref(['S', 'M', 'L', 'XL', '2XL'])
const selectedColor = ref(null)

const availableSizes = computed(() => {
  if (!selectedColor.value) return sizes.value
  const colorSizes = Object.keys(selectedColor.value.variantsBySize ?? {})
  if (!colorSizes.length) return sizes.value
  return sizes.value.filter((s) => colorSizes.includes(s))
})

const previewSwatch = computed(() => {
  const s = selectedColor.value?.swatch ?? '#f0f0f0'
  return s === '#ffffff' || s === '#fff' ? '#ebebeb' : s
})

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  try {
    const res = await fetch('/api/pet-portrait/variants')
    const data = await res.json()
    colors.value = data.colors ?? []
    sizes.value = data.sizes ?? ['S', 'M', 'L', 'XL', '2XL']
    if (data.colors?.length) selectedColor.value = data.colors[0]
  } catch { }
})

const step = ref(1)
const selectedStyle = ref(null)
const uploadedFile = ref(null)
const uploadedPreview = ref(null)
const isGenerating = ref(false)
const generatedImageUrl = ref(null)
const generateError = ref('')
const selectedSize = ref('M')
const addedToBag = ref(false)
const mockupPhotoUrl = ref(null)
const showLightbox = ref(false)
const petName = ref('')

function onKeydown(e) {
  if (e.key === 'Escape') showLightbox.value = false
}
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

async function fetchMockupPhoto(color) {
  const variantId = color?.variantsBySize?.[selectedSize.value]
    ?? color?.variantsBySize?.['M']
    ?? Object.values(color?.variantsBySize ?? {})[0]
  mockupPhotoUrl.value = color?.mockupUrls?.[0] ?? null
  if (!variantId) return
  try {
    const res = await fetch('/api/pet-portrait/mockup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId }),
    })
    const data = await res.json()
    if (data.mockupUrl) mockupPhotoUrl.value = data.mockupUrl
  } catch { }
}

function selectStyle(key) {
  selectedStyle.value = key
  addedToBag.value = false
  generatedImageUrl.value = null
  generateError.value = ''
  setTimeout(() => { step.value = 2 }, 360)
}

function selectColor(color) {
  selectedColor.value = color
  addedToBag.value = false
  if (!availableSizes.value.includes(selectedSize.value)) {
    selectedSize.value = availableSizes.value.includes('M') ? 'M' : availableSizes.value[0] ?? 'M'
  }
  fetchMockupPhoto(color)
}

function onFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return
  handleFile(file)
}

function onDrop(event) {
  event.preventDefault()
  const file = event.dataTransfer.files?.[0]
  if (file) handleFile(file)
}

function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    generateError.value = 'Please upload a JPG, PNG, or WEBP image.'
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    generateError.value = 'Image must be under 10MB.'
    return
  }
  generateError.value = ''
  uploadedFile.value = file
  generatedImageUrl.value = null
  addedToBag.value = false
  uploadedPreview.value = URL.createObjectURL(file)
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function generate() {
  if (!uploadedFile.value || !selectedStyle.value || isGenerating.value) return
  isGenerating.value = true
  generateError.value = ''
  generatedImageUrl.value = null
  addedToBag.value = false
  step.value = 3

  try {
    const imageBase64 = await toBase64(uploadedFile.value)
    const mimeType = uploadedFile.value.type

    const response = await fetch('/api/pet-portrait/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mimeType, style: selectedStyle.value, petName: petName.value.trim() }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? 'Generation failed.')

    generatedImageUrl.value = data.imageUrl
    if (selectedColor.value) fetchMockupPhoto(selectedColor.value)
  } catch (err) {
    generateError.value = err.message
    step.value = 2
  } finally {
    isGenerating.value = false
  }
}

function addToBag() {
  if (!generatedImageUrl.value || !selectedStyle.value) return
  const variantId = selectedColor.value?.variantsBySize?.[selectedSize.value] ?? null
  addPetPortraitItem(
    selectedStyle.value,
    generatedImageUrl.value,
    selectedSize.value,
    selectedColor.value?.name ?? 'White',
    variantId,
  )
  addedToBag.value = true
}

function startOver() {
  step.value = 1
  selectedStyle.value = null
  uploadedFile.value = null
  uploadedPreview.value = null
  generatedImageUrl.value = null
  generateError.value = ''
  addedToBag.value = false
  selectedSize.value = 'M'
  petName.value = ''
  if (colors.value.length) selectedColor.value = colors.value[0]
}

const activeStyle = computed(() => STYLES.find(s => s.key === selectedStyle.value))
</script>

<template>
  <div class="pet-journey-page">
    <SiteHeader />

    <div class="pet-journey">

      <!-- Top bar: back button + step dots -->
      <div class="pet-journey__topbar">
        <button
          v-if="step > 1 && !isGenerating"
          class="pet-back-btn"
          type="button"
          aria-label="Back"
          @click="step--"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
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

      <!-- Slides -->
      <div class="pet-slides-viewport">
        <div class="pet-slides-track" :style="{ transform: `translateX(${-(step - 1) * (100 / 3)}%)` }">

          <!-- Slide 1: Choose style -->
          <div class="pet-slide">
            <div class="pet-slide__inner">
              <div class="pet-slide__heading">
                <p class="eyebrow">Step 1 of 3</p>
                <h1 class="pet-slide__title">Choose your <span>style</span></h1>
                <p class="pet-slide__sub">What legendary world should your pet live in?</p>
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
                  <span class="style-card__medallion">
                    <img :src="s.img" :alt="`${s.label} pet portrait example`" loading="lazy" />
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
          </div>

          <!-- Slide 2: Upload photo -->
          <div class="pet-slide">
            <div class="pet-slide__inner pet-slide__inner--narrow">
              <div class="pet-slide__heading">
                <p class="eyebrow">Step 2 of 3</p>
                <h1 class="pet-slide__title">Upload your pet's photo</h1>
                <p class="pet-slide__sub">A clear, well-lit photo of your pet's face gives the best results.</p>
              </div>

              <div
                class="upload-zone"
                :class="{ 'has-preview': uploadedPreview }"
                @dragover.prevent
                @drop="onDrop"
              >
                <template v-if="uploadedPreview">
                  <img :src="uploadedPreview" class="upload-preview" alt="Your pet" />
                  <div class="upload-preview__overlay">
                    <label class="button button--light" for="pet-file-input">Change photo</label>
                  </div>
                </template>
                <template v-else>
                  <div class="upload-zone__inner">
                    <div class="upload-zone__icon">+</div>
                    <p>Drag your photo here or</p>
                    <label class="button button--outline" for="pet-file-input">Browse files</label>
                    <p class="upload-zone__hint">JPG, PNG or WEBP · Max 10MB · Clear photos work best</p>
                  </div>
                </template>
                <input
                  id="pet-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style="display: none"
                  @change="onFileChange"
                />
              </div>

              <div class="pet-name-field">
                <label for="pet-name-input">What's your pet's name? <span>(optional)</span></label>
                <input
                  id="pet-name-input"
                  v-model="petName"
                  type="text"
                  maxlength="20"
                  placeholder="e.g. Biscuit"
                />
              </div>

              <p v-if="generateError" class="pet-error" style="margin-top: 16px">{{ generateError }}</p>

              <button
                class="button pet-generate-btn"
                type="button"
                :disabled="!uploadedFile"
                style="margin-top: 28px"
                @click="generate"
              >
                Create my portrait — Free preview →
              </button>
              <p class="pet-generate-hint" style="margin-top: 12px">
                Takes about 15–30 seconds. Your photo is never stored.
              </p>
            </div>
          </div>

          <!-- Slide 3: Generating / Result -->
          <div class="pet-slide">

            <!-- Generating state -->
            <div v-if="isGenerating" class="pet-slide__inner pet-slide__inner--center">
              <div class="pet-generating">
                <div class="pet-generating__orb">
                  <span class="pet-generating__spinner" aria-hidden="true"></span>
                  <span class="pet-generating__avatar">
                    <img :src="activeStyle?.img" :alt="`${activeStyle?.label} style`" />
                  </span>
                </div>
                <h2 class="pet-generating__title">Painting your portrait<span class="pet-generating__dots"><i>.</i><i>.</i><i>.</i></span></h2>
                <p class="pet-generating__sub">
                  Turning your pet into a {{ activeStyle?.label }}. This usually takes 15–30 seconds.
                </p>
                <div class="pet-generating__bar" aria-hidden="true"><span></span></div>
              </div>
            </div>

            <!-- Result state -->
            <div v-else-if="generatedImageUrl" class="pet-slide__inner pet-slide__inner--result">
              <div class="pet-result-layout">

                <div class="pet-result__mockup">
                  <div class="shirt-mockup-container">
                    <ShirtMockup :color="previewSwatch" :art-url="generatedImageUrl" :photo-url="mockupPhotoUrl" />
                    <button class="mockup-zoom-btn" type="button" title="View larger" @click="showLightbox = true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                    </button>
                  </div>
                  <button class="pet-regen-btn" type="button" @click="step = 2">← Try a different photo</button>
                </div>

                <div class="pet-result__buy">
                  <p class="eyebrow">Your portrait is ready</p>
                  <h2 class="pet-result__title">Custom Pet Portrait</h2>
                  <p class="pet-result__style">{{ activeStyle?.label }} edition</p>
                  <p class="pet-result__price">$38</p>

                  <div v-if="colors.length > 0" class="product-options" style="margin-top: 24px">
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

                  <div class="product-options" style="margin-top: 20px">
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

                  <div class="pet-result__actions">
                    <button
                      class="button"
                      type="button"
                      :disabled="addedToBag"
                      @click="addToBag"
                    >
                      {{ addedToBag ? '✓ Added to bag' : 'Add to bag — $38' }}
                    </button>
                  </div>

                  <button class="pet-start-over" type="button" @click="startOver">Start over</button>
                </div>

              </div>
            </div>

          </div>

        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showLightbox" class="mockup-lightbox" @click.self="showLightbox = false">
        <div class="mockup-lightbox__inner">
          <button class="mockup-lightbox__close" type="button" @click="showLightbox = false">✕</button>
          <ShirtMockup :color="previewSwatch" :art-url="generatedImageUrl" :photo-url="mockupPhotoUrl" />
        </div>
      </div>
    </Teleport>
  </div>
</template>
