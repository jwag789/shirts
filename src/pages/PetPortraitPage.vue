<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import SiteHeader from '../components/SiteHeader.vue'
import ShirtMockup from '../components/ShirtMockup.vue'
import { useCart } from '../composables/useCart'

const { addPetPortraitItem } = useCart()

const STYLES = [
  { key: 'superhero', label: 'Superhero', desc: 'Cape, mask, heroic pose', abbr: 'SH', gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #e94560 100%)' },
  { key: 'viking', label: 'Viking', desc: 'Horned helmet, battle axe', abbr: 'VK', gradient: 'linear-gradient(135deg, #2d1b00 0%, #6b3a2a 50%, #c8a96e 100%)' },
  { key: 'pirate', label: 'Pirate', desc: 'Tricorn hat, cutlass, sea', abbr: 'PR', gradient: 'linear-gradient(135deg, #0a1628 0%, #1e3a5f 50%, #4a9eca 100%)' },
  { key: 'astronaut', label: 'Astronaut', desc: 'Spacesuit, stars, planets', abbr: 'AS', gradient: 'linear-gradient(135deg, #0b0b1a 0%, #1a1a4e 50%, #6e6ef0 100%)' },
  { key: 'samurai', label: 'Samurai', desc: 'Katana, armor, cherry blossoms', abbr: 'SM', gradient: 'linear-gradient(135deg, #1a0a0a 0%, #4a1a1a 50%, #c0392b 100%)' },
  { key: 'wizard', label: 'Wizard', desc: 'Robes, staff, magic spells', abbr: 'WZ', gradient: 'linear-gradient(135deg, #0d0d2b 0%, #2d1b4e 50%, #9b59b6 100%)' },
]

// Shirt options — loaded from /api/pet-portrait/variants
const colors = ref([])
const sizes = ref(['S', 'M', 'L', 'XL', '2XL'])
const selectedColor = ref(null)

const availableSizes = computed(() => {
  if (!selectedColor.value) return sizes.value
  const colorSizes = Object.keys(selectedColor.value.variantsBySize ?? {})
  if (!colorSizes.length) return sizes.value
  return sizes.value.filter((s) => colorSizes.includes(s))
})

// Map very-light swatches to a visible minimum so white shirts don't vanish into the page
const previewSwatch = computed(() => {
  const s = selectedColor.value?.swatch ?? '#f0f0f0'
  // Treat near-white as light gray so the container boundary is always visible
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
  } catch {
    // server returns a safe fallback; ignore network errors
  }
})

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

function onKeydown(e) {
  if (e.key === 'Escape') showLightbox.value = false
}
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

async function fetchMockupPhoto(color) {
  const variantId = color?.variantsBySize?.[selectedSize.value]
    ?? color?.variantsBySize?.['M']
    ?? Object.values(color?.variantsBySize ?? {})[0]
  // Use locally cached mockup URL first (instant), then confirm via endpoint
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
  } catch { /* keep local value */ }
}

function selectStyle(key) {
  selectedStyle.value = key
  addedToBag.value = false
  generatedImageUrl.value = null
  generateError.value = ''
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

  try {
    const imageBase64 = await toBase64(uploadedFile.value)
    const mimeType = uploadedFile.value.type

    const response = await fetch('/api/pet-portrait/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mimeType, style: selectedStyle.value }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? 'Generation failed.')

    generatedImageUrl.value = data.imageUrl
    if (selectedColor.value) fetchMockupPhoto(selectedColor.value)
  } catch (err) {
    generateError.value = err.message
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
  selectedStyle.value = null
  uploadedFile.value = null
  uploadedPreview.value = null
  generatedImageUrl.value = null
  generateError.value = ''
  addedToBag.value = false
  selectedSize.value = 'M'
  if (colors.value.length) selectedColor.value = colors.value[0]
}
</script>

<template>
  <div>
    <SiteHeader />

    <main>
      <div class="pet-portrait-hero">
        <p class="eyebrow">Custom — One of a kind</p>
        <h1>Pet Portrait<br>Shirts</h1>
        <p class="pet-portrait-hero__sub">Upload a photo of your pet, pick a style, and we'll turn them into legendary artwork — printed on a premium tee.</p>
      </div>

      <div class="pet-portrait-layout">

        <!-- Step 1: Style picker -->
        <section class="pet-portrait-section">
          <div class="pet-portrait-section__label">
            <span class="pet-step-num" :class="{ 'is-done': selectedStyle }">1</span>
            <h2 class="pet-section-title">Choose a style</h2>
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
              <div class="style-card__art" :style="{ background: s.gradient }">
                <span class="style-card__icon">{{ s.abbr }}</span>
              </div>
              <div class="style-card__copy">
                <strong>{{ s.label }}</strong>
                <span>{{ s.desc }}</span>
              </div>
              <div v-if="selectedStyle === s.key" class="style-card__check">✓</div>
            </button>
          </div>
        </section>

        <!-- Step 2: Photo upload -->
        <section class="pet-portrait-section">
          <div class="pet-portrait-section__label">
            <span class="pet-step-num" :class="{ 'is-done': uploadedFile }">2</span>
            <h2 class="pet-section-title">Upload your pet's photo</h2>
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
        </section>

        <!-- Step 3: Generate -->
        <section class="pet-portrait-section">
          <div class="pet-portrait-section__label">
            <span class="pet-step-num" :class="{ 'is-done': generatedImageUrl }">3</span>
            <h2 class="pet-section-title">Generate your portrait</h2>
          </div>

          <p v-if="!selectedStyle || !uploadedFile" class="pet-generate-hint">
            Complete steps 1 and 2 above to unlock generation.
          </p>

          <template v-else>
            <button
              class="button pet-generate-btn"
              type="button"
              :disabled="isGenerating"
              @click="generate"
            >
              <template v-if="isGenerating">
                <span class="pet-spinner"></span>
                AI is painting your pet...
              </template>
              <template v-else-if="generatedImageUrl">
                Regenerate
              </template>
              <template v-else>
                Create my portrait — Free preview
              </template>
            </button>

            <p v-if="generateError" class="pet-error">{{ generateError }}</p>

            <p class="pet-generate-hint" style="margin-top: 12px">
              Takes about 15–30 seconds. Your photo is never stored.
            </p>
          </template>
        </section>

        <!-- Step 4: Mockup preview + purchase -->
        <section v-if="generatedImageUrl" class="pet-portrait-section pet-preview-section">
          <div class="pet-portrait-section__label">
            <span class="pet-step-num is-done">4</span>
            <h2 class="pet-section-title">Your portrait</h2>
          </div>

          <div class="pet-preview-layout">

            <!-- Shirt mockup preview -->
            <div class="shirt-mockup-container">
              <ShirtMockup :color="previewSwatch" :art-url="generatedImageUrl" :photo-url="mockupPhotoUrl" />
              <button class="mockup-zoom-btn" type="button" title="View larger" @click="showLightbox = true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>
            </div>

            <Teleport to="body">
              <div v-if="showLightbox" class="mockup-lightbox" @click.self="showLightbox = false">
                <div class="mockup-lightbox__inner">
                  <button class="mockup-lightbox__close" type="button" @click="showLightbox = false">✕</button>
                  <ShirtMockup :color="previewSwatch" :art-url="generatedImageUrl" :photo-url="mockupPhotoUrl" />
                </div>
              </div>
            </Teleport>

            <!-- Options + buy -->
            <div class="pet-preview-buy">
              <p class="eyebrow">Ready to print</p>
              <h3 class="pet-preview-title">Custom Pet Portrait</h3>
              <p class="pet-preview-style">Style: {{ STYLES.find(s => s.key === selectedStyle)?.label }}</p>
              <p class="pet-preview-price">$38</p>

              <!-- Color picker -->
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

              <!-- Size picker -->
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
                  >
                    {{ size }}
                  </button>
                </div>
              </div>

              <div class="pet-preview-actions">
                <button
                  class="button"
                  type="button"
                  :disabled="addedToBag"
                  @click="addToBag"
                >
                  {{ addedToBag ? '✓ Added to bag' : 'Add to bag — $38' }}
                </button>
              </div>

              <p class="pet-preview-info">Not what you wanted? Hit Regenerate above for another attempt.</p>
              <button class="pet-start-over" type="button" @click="startOver">Start over</button>
            </div>
          </div>
        </section>

      </div>
    </main>
  </div>
</template>
