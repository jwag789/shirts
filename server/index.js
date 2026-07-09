import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Stripe from 'stripe'
import { config } from 'dotenv'
import pg from 'pg'
import OpenAI, { toFile } from 'openai'
import { fal } from '@fal-ai/client'
import { products } from '../src/data/products.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')

config({ path: path.join(rootDir, '.env.local') })
config({ path: path.join(rootDir, '.env') })

const app = express()
const port = Number(process.env.PORT ?? 4242)
const siteUrl = process.env.SITE_URL ?? `http://localhost:${port}`

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' })

fal.config({ credentials: process.env.FAL_KEY ?? '' })

const PET_PORTRAIT_PRICE = 38
const PET_PORTRAIT_DAILY_LIMIT = 10
// How many portrait options to generate per request (each is a separate gpt-image-1 image → separate cost)
const PET_PORTRAIT_OPTION_COUNT = 1

// ip → { count, date } — resets each calendar day
const generateRateLimit = new Map()

function checkRateLimit(ip) {
  const today = new Date().toISOString().slice(0, 10)
  const entry = generateRateLimit.get(ip)
  if (!entry || entry.date !== today) {
    generateRateLimit.set(ip, { count: 1, date: today })
    return true
  }
  if (entry.count >= PET_PORTRAIT_DAILY_LIMIT) return false
  entry.count += 1
  return true
}

const PET_PORTRAIT_STYLES = {
  superhero: 'a caped superhero in a bright hero costume with a chest emblem and eye mask, striking a bold heroic pose with the cape billowing dynamically and a few speed-lines and sparks',
  viking: 'a fierce Viking warrior in a horned helmet and fur cloak, raising a battle axe, with swirling snow, ravens and a couple of Norse rune accents around them',
  pirate: 'a swashbuckling pirate captain in a tricorn hat brandishing a cutlass, with a tattered flag, crossed swords and a splash of sea spray flowing around them',
  astronaut: 'a brave astronaut in a detailed white spacesuit with a glowing helmet visor, drifting heroically with a few orbiting planets, stars and a comet streak around them',
  samurai: 'an honorable Japanese samurai in ornate armor holding a katana, with drifting cherry blossom petals and a bold rising-sun accent swirling around them',
  wizard: 'a powerful wizard in a starry pointed hat and flowing robes, holding a glowing crystal staff and conjuring swirling colorful magic sparks and arcane symbols around them',
  princess: 'a royal princess wearing a sparkling jeweled tiara and an elegant flowing gown, with a delicate rose and drifting golden sparkles around them',
  fairy: 'a delicate fairy with shimmering translucent iridescent wings and a flower crown, surrounded by glowing pixie-dust sparkles and blooming flowers',
  mermaid: 'a graceful mermaid with a shimmering iridescent fish tail and a pearl-and-seashell crown, with bubbles, coral and a swirl of ocean water around them',
  angel: 'a serene angel in flowing white-and-gold robes with large feathered wings and a glowing golden halo, amid soft clouds, heavenly light rays and drifting golden sparkles',
  popstar: 'a glamorous pop star in a sparkling sequined jacket and heart-shaped sunglasses, holding a microphone on a dazzling concert stage with spotlights, lasers and confetti',
  geisha: 'an elegant geisha in an ornate floral kimono holding a delicate folding fan, with a decorative floral hair ornament, drifting cherry blossom petals and a traditional pagoda behind them',
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

const productBySlug = new Map(products.map((product) => [product.slug, product]))

function generateOrderNumber() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }
  return `INK-${suffix}`
}

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function normalizeQuantity(quantity) {
  const parsed = Number(quantity)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
    return null
  }
  return parsed
}

function buildCheckoutItems(cartItems) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new Error('Your bag is empty.')
  }

  return cartItems.map((item) => {
    if (item.isPetPortrait) {
      const quantity = normalizeQuantity(item.quantity)
      if (!quantity) throw new Error('Invalid quantity for Custom Pet Portrait.')

      const size = String(item.size ?? '')
      const validSizes = ['S', 'M', 'L', 'XL', '2XL']
      if (!validSizes.includes(size)) throw new Error(`Custom Pet Portrait is not available in size ${size}.`)

      const styleKey = String(item.style ?? '')
      if (!PET_PORTRAIT_STYLES[styleKey]) throw new Error('Invalid portrait style.')

      const generatedImageUrl = String(item.generatedImageUrl ?? '')
      if (!generatedImageUrl.startsWith('https://')) throw new Error('Missing generated image for pet portrait.')

      return {
        isPetPortrait: true,
        style: styleKey,
        generatedImageUrl,
        name: `Custom Pet Portrait — ${styleKey.charAt(0).toUpperCase() + styleKey.slice(1)}`,
        size,
        color: String(item.color ?? ''),
        printifyVariantId: Number(item.printifyVariantId) || null,
        quantity,
        unitAmount: Math.round(PET_PORTRAIT_PRICE * 100),
        image: generatedImageUrl,
      }
    }

    const product = productBySlug.get(item.productSlug)
    const quantity = normalizeQuantity(item.quantity)

    if (!product) {
      throw new Error('One of the items in your bag is no longer available.')
    }

    if (!product.printify) {
      throw new Error(`${product.name} is not connected to Printify yet.`)
    }

    if (!quantity) {
      throw new Error(`Invalid quantity for ${product.name}.`)
    }

    const size = String(item.size ?? '')
    const variantId = product.printify.variantsBySize[size]

    if (!variantId) {
      throw new Error(`${product.name} is not available in size ${size}.`)
    }

    return {
      productSlug: product.slug,
      name: product.name,
      size,
      quantity,
      unitAmount: Math.round(product.priceValue * 100),
      image: product.cardImage,
      printifyProductId: product.printify.productId,
      printifyVariantId: variantId,
    }
  })
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      session_id   TEXT        PRIMARY KEY,
      order_number TEXT        NOT NULL,
      status       TEXT        NOT NULL,
      data         JSONB       NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function saveOrder(sessionId, order) {
  await pool.query(
    `INSERT INTO orders (session_id, order_number, status, data)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (session_id) DO UPDATE SET status = EXCLUDED.status, data = EXCLUDED.data`,
    [sessionId, order.orderNumber, order.status, JSON.stringify(order)],
  )
}

async function readOrder(sessionId) {
  const { rows } = await pool.query('SELECT data FROM orders WHERE session_id = $1', [sessionId])
  if (!rows.length) throw new Error('Order not found')
  return rows[0].data
}

function splitCustomerName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return { firstName: 'Customer', lastName: '' }
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  }
}

async function uploadImageToPrintify(imageUrl) {
  const token = requireEnv('PRINTIFY_API_TOKEN')
  const response = await fetch('https://api.printify.com/v1/uploads/images.json', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file_name: 'pet-portrait.png', url: imageUrl }),
  })
  const body = await response.json()
  if (!response.ok) throw new Error(`Printify image upload failed (${response.status}): ${JSON.stringify(body)}`)
  return body
}

function buildPrintifyOrderPayload(session, order, printifyUploads, petPortraitMeta) {
  const customer = session.customer_details ?? {}
  const address = session.shipping_details?.address ?? customer.address
  const name = splitCustomerName(session.shipping_details?.name ?? customer.name)

  if (!address) {
    throw new Error('Stripe checkout did not return a shipping address.')
  }

  const petPortraitVariants = process.env.PRINTIFY_PET_PORTRAIT_VARIANTS
    ? JSON.parse(process.env.PRINTIFY_PET_PORTRAIT_VARIANTS)
    : null
  const { blueprintId, printProviderId } = petPortraitMeta ?? {}

  const lineItems = order.items.map((item, index) => {
    if (item.isPetPortrait) {
      const upload = printifyUploads?.[index]
      const variantId = item.printifyVariantId || petPortraitVariants?.[item.size] || null
      // Custom images require ordering by blueprint + print provider so Printify
      // applies the per-order artwork. Ordering by product_id reuses the product's
      // saved (blank) design and silently drops the uploaded image.
      if (!upload || !blueprintId || !printProviderId || !variantId) {
        console.warn(`Pet portrait item ${index + 1} cannot be auto-fulfilled (upload=${!!upload}, blueprint=${blueprintId}, provider=${printProviderId}, variant=${variantId}).`)
        return null
      }
      return {
        blueprint_id: blueprintId,
        print_provider_id: printProviderId,
        variant_id: variantId,
        quantity: item.quantity,
        external_id: `${session.id}-${index + 1}`,
        print_areas: { front: [{ src: upload.preview_url, x: 0.5, y: 0.5, scale: 0.9, angle: 0 }] },
      }
    }
    return {
      product_id: item.printifyProductId,
      variant_id: item.printifyVariantId,
      quantity: item.quantity,
      external_id: `${session.id}-${index + 1}`,
    }
  }).filter(Boolean)

  return {
    external_id: session.id,
    label: session.id,
    line_items: lineItems,
    shipping_method: 1,
    is_printify_express: false,
    is_economy_shipping: false,
    send_shipping_notification: true,
    address_to: {
      first_name: name.firstName,
      last_name: name.lastName,
      email: customer.email,
      phone: customer.phone ?? '',
      country: address.country,
      region: address.state ?? '',
      address1: address.line1,
      address2: address.line2 ?? '',
      city: address.city,
      zip: address.postal_code,
    },
  }
}

async function createPrintifyOrder(session, order) {
  const token = requireEnv('PRINTIFY_API_TOKEN')
  const shopId = requireEnv('PRINTIFY_SHOP_ID')

  // Upload custom images for any pet portrait items
  const printifyUploads = await Promise.all(
    order.items.map(async (item) => {
      if (item.isPetPortrait && process.env.PRINTIFY_PET_PORTRAIT_PRODUCT_ID) {
        try {
          return await uploadImageToPrintify(item.generatedImageUrl)
        } catch (err) {
          console.error('Failed to upload pet portrait image to Printify:', err.message)
          return null
        }
      }
      return null
    }),
  )

  const hasPetPortrait = order.items.some((item) => item.isPetPortrait)
  const petPortraitMeta = hasPetPortrait ? await getPetPortraitVariantData() : null

  const payload = buildPrintifyOrderPayload(session, order, printifyUploads, petPortraitMeta)

  if (payload.line_items.length === 0) {
    console.warn('No Printify line items after filtering — order may need manual fulfillment')
    return { id: null, manual_fulfillment_required: true }
  }

  const response = await fetch(`https://api.printify.com/v1/shops/${shopId}/orders.json`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const body = await response.text()
  if (!response.ok) {
    throw new Error(`Printify order failed (${response.status}): ${body}`)
  }

  return JSON.parse(body)
}

async function fulfillCheckoutSession(session) {
  const order = await readOrder(session.id)

  if (order.status === 'printify_created') {
    return order
  }

  const printifyOrder = await createPrintifyOrder(session, order)
  const nextOrder = {
    ...order,
    status: 'printify_created',
    stripePaymentStatus: session.payment_status,
    customerEmail: session.customer_details?.email ?? null,
    printifyOrder,
    fulfilledAt: new Date().toISOString(),
  }

  await saveOrder(session.id, nextOrder)
  return nextOrder
}

// Themed lettering styles — how gpt-image-1 should render the pet's name in-artwork.
const PET_PORTRAIT_NAME_STYLES = {
  superhero: 'bold chunky comic-book emblem lettering with a thick outline and a pop of color, like a superhero logo',
  viking: 'rugged hand-carved Norse-style capital letters on a weathered wooden or stone banner, worn and battle-scarred',
  pirate: 'weathered golden treasure-map lettering on a tattered, curling parchment ribbon banner',
  astronaut: 'sleek futuristic metallic sci-fi lettering with a subtle glow, like a mission patch badge',
  samurai: 'elegant bold brush-stroke lettering with ink-painted flair on a small cloth banner',
  wizard: 'ornate glowing enchanted lettering with magical sparkles and a mystical aura',
  princess: 'elegant sparkling royal script with jeweled flourishes on a delicate ribbon banner',
  fairy: 'whimsical glowing script lettering trailing pixie-dust sparkles and tiny flowers',
  mermaid: 'flowing pearlescent script with an iridescent shimmer on a scalloped seashell banner',
  angel: 'elegant glowing golden serif lettering with a soft heavenly halo and drifting feathers',
  popstar: 'bold glittering sequined lettering with a neon glow and sparkles, like a concert marquee',
  geisha: 'graceful brush-painted lettering with delicate cherry-blossom accents on a small silk banner',
}

app.post('/api/pet-portrait/generate', express.json({ limit: '15mb' }), async (req, res) => {
  try {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: `Limit reached — you can generate up to ${PET_PORTRAIT_DAILY_LIMIT} portraits per day. Try again tomorrow.` })
    }

    const { imageBase64, mimeType, style, petName } = req.body
    const safePetName = typeof petName === 'string' ? petName.trim().slice(0, 20) : ''

    if (!imageBase64 || !mimeType || !style) {
      return res.status(400).json({ error: 'Missing imageBase64, mimeType, or style.' })
    }

    if (!PET_PORTRAIT_STYLES[style]) {
      return res.status(400).json({ error: 'Invalid style.' })
    }

    requireEnv('OPENAI_API_KEY')
    requireEnv('FAL_KEY')

    // Step 1: validate this is a pet photo
    const validation = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'low' } },
            { type: 'text', text: 'Is this a photo of a pet or animal (dog, cat, bird, rabbit, etc.)? Reply only YES or NO.' },
          ],
        },
      ],
      max_tokens: 5,
    })

    const isAnimal = validation.choices[0].message.content.trim().toUpperCase().startsWith('YES')
    if (!isAnimal) {
      return res.status(400).json({ error: 'Please upload a photo of your pet — this feature is for animals only.' })
    }

    // Step 2: describe the pet in detail
    const vision = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'low' } },
            { type: 'text', text: 'Describe this pet for a portrait painter. Include: species, breed if identifiable, exact coat/fur color and texture, distinctive markings, ear shape, eye color, size/build, and any standout features. Be precise and specific. 2–3 sentences.' },
          ],
        },
      ],
      max_tokens: 200,
    })

    const petDescription = vision.choices[0].message.content.trim()

    // Step 3: generate the portrait with gpt-image-1, editing from the real pet photo
    // so the likeness is preserved, and prompting for a full immersive background.
    const petBuffer = Buffer.from(imageBase64, 'base64')
    const petImageFile = await toFile(petBuffer, 'pet.png', { type: mimeType })

    const stylePrompt = PET_PORTRAIT_STYLES[style]

    // If the customer gave a name, ask gpt-image-1 to render it in-artwork with
    // themed lettering; otherwise forbid all text. gpt-image-1 handles short text well.
    const nameStyle = PET_PORTRAIT_NAME_STYLES[style] ?? PET_PORTRAIT_NAME_STYLES.superhero
    const spelledOut = safePetName ? [...safePetName.toUpperCase()].join('-') : ''
    const textDirective = safePetName
      ? `Prominently feature the pet's name "${safePetName}" as themed lettering — ${nameStyle}. Render it on a banner, ribbon or emblem that sits across the lower portion of the design and overlaps the character's body a little, so it feels integrated (not floating in empty space). Make it large, bold and easy to read. Spell the name EXACTLY, letter by letter: ${spelledOut}. This name is the ONLY text anywhere in the image — no other words, letters, numbers or signatures.`
      : `Absolutely no text, no words, no letters, no numbers, no signature anywhere in the image.`

    const prompt = `Turn the pet in this photo into a richly detailed, semi-photorealistic character portrait, reimagined as ${stylePrompt}.

The pet is this exact animal — ${petDescription}. Keep its real face, fur/coat color, markings and expression clearly recognizable, with realistic fur texture and lifelike eyes.

Render it like premium movie-poster art: painterly photorealism with cinematic lighting, real material textures on the fur, costume and props, and rich depth. Avoid flat cartoon shading and heavy cartoon outlines. The pet is the hero — large and centered in an energetic pose, with the themed props and effects flowing outward from the character into an organic, irregular, die-cut silhouette — NOT a rectangle, square, circle or scenery box.

The background must be FULLY TRANSPARENT (alpha). Isolate the artwork with a natural, ragged outer edge like a sticker or die-cut print. No background fill, no backdrop, no scenery, no border, no frame.

${textDirective}`

    const generation = await openai.images.edit({
      model: 'gpt-image-1',
      image: petImageFile,
      prompt,
      size: '1024x1024',
      quality: 'high',
      background: 'transparent',
      n: PET_PORTRAIT_OPTION_COUNT,
    })

    const b64List = (generation.data ?? []).map((d) => d.b64_json).filter(Boolean)
    if (!b64List.length) throw new Error('Image generation returned no result.')

    // Host each option so Printify (and the browser) can load it by URL.
    const imageUrls = await Promise.all(
      b64List.map((b64) =>
        fal.storage.upload(new Blob([Buffer.from(b64, 'base64')], { type: 'image/png' })),
      ),
    )

    res.json({ imageUrls, petDescription })
  } catch (error) {
    console.error('Pet portrait generation error:', error)
    res.status(500).json({ error: error.message ?? 'Generation failed.' })
  }
})

// ── Pet Portrait Variants & Mockup ──────────────────────────────────────────

const COLOR_SWATCHES = {
  White: '#ffffff', Black: '#111111', Navy: '#1a237e', 'Navy Blue': '#1a237e',
  Red: '#c62828', Royal: '#1565c0', 'Royal Blue': '#1565c0',
  'Forest Green': '#2e7d32', Green: '#388e3c', Gray: '#9e9e9e', Grey: '#9e9e9e',
  'Sport Grey': '#b0bec5', 'Dark Heather': '#455a64', Heather: '#90a4ae',
  Gold: '#f9a825', Orange: '#f57c00', Purple: '#6a1b9a', Maroon: '#880e4f',
  Pink: '#e91e63', 'Light Pink': '#f8bbd0', Charcoal: '#37474f', Sand: '#d7c7b5',
  Natural: '#f0e8d8', 'Military Green': '#558b2f', Brown: '#6d4c41',
  'Light Blue': '#81d4fa', Yellow: '#ffeb3b', Ash: '#e0e0e0',
  'Athletic Heather': '#cfd8dc', Cardinal: '#9b2335',
}

const SIZE_ORDER_LIST = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL']

let petVariantsCache = null
let petVariantsCachedAt = 0

async function getPetPortraitVariantData() {
  const now = Date.now()
  if (petVariantsCache && now - petVariantsCachedAt < 60 * 60 * 1000) return petVariantsCache

  const productId = process.env.PRINTIFY_PET_PORTRAIT_PRODUCT_ID
  const token = process.env.PRINTIFY_API_TOKEN
  const shopId = process.env.PRINTIFY_SHOP_ID
  if (!productId || !token || !shopId) return null

  const res = await fetch(`https://api.printify.com/v1/shops/${shopId}/products/${productId}.json`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const product = await res.json()

  // Build option-value lookup from the product's top-level options array
  const optionValueMap = new Map()
  for (const optGroup of product.options ?? []) {
    const isColor = optGroup.type === 'color'
    const isSize = optGroup.type === 'size'
    for (const val of optGroup.values ?? []) {
      optionValueMap.set(val.id, { title: val.title, isColor, isSize, hex: val.colors?.[0] ?? null })
    }
  }

  const colorMap = new Map()
  const allSizes = new Set()

  for (const variant of product.variants.filter((v) => v.is_enabled)) {
    let colorName = null, sizeName = null, colorHex = null

    for (const optId of variant.options ?? []) {
      const opt = optionValueMap.get(optId)
      if (!opt) continue
      if (opt.isColor) { colorName = opt.title; colorHex = opt.hex }
      if (opt.isSize) sizeName = opt.title
    }

    // Fallback: parse "Color / Size" or "Size / Color" from title
    if (!colorName || !sizeName) {
      const parts = variant.title.split(' / ')
      colorName = colorName ?? parts[0]
      sizeName = sizeName ?? parts[1]
    }

    if (!colorName || !sizeName) continue

    if (!colorMap.has(colorName)) {
      colorMap.set(colorName, {
        name: colorName,
        swatch: colorHex ?? COLOR_SWATCHES[colorName] ?? '#cccccc',
        variantsBySize: {},
        mockupUrls: [],
      })
    }
    colorMap.get(colorName).variantsBySize[sizeName] = variant.id
    allSizes.add(sizeName)
  }

  // Map variant IDs → color name so we can attach mockup images
  const variantColorMap = new Map()
  for (const [colorName, colorData] of colorMap) {
    for (const vid of Object.values(colorData.variantsBySize)) {
      variantColorMap.set(vid, colorName)
    }
  }

  for (const img of product.images ?? []) {
    for (const vid of img.variant_ids ?? []) {
      const colorName = variantColorMap.get(vid)
      if (!colorName) continue
      const color = colorMap.get(colorName)
      if (color && !color.mockupUrls.includes(img.src)) color.mockupUrls.push(img.src)
    }
  }

  const sizes = [...allSizes].sort((a, b) => {
    const ai = SIZE_ORDER_LIST.indexOf(a)
    const bi = SIZE_ORDER_LIST.indexOf(b)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  petVariantsCache = {
    colors: [...colorMap.values()],
    sizes,
    blueprintId: product.blueprint_id ?? null,
    printProviderId: product.print_provider_id ?? null,
  }
  petVariantsCachedAt = now
  return petVariantsCache
}

app.get('/api/pet-portrait/variants', async (req, res) => {
  try {
    const data = await getPetPortraitVariantData()
    if (!data) {
      // Placeholder colors shown when PRINTIFY_PET_PORTRAIT_PRODUCT_ID is not configured.
      // variantsBySize values are null — Printify fulfillment falls back to PRINTIFY_PET_PORTRAIT_VARIANTS env var.
      const nullSizes = { S: null, M: null, L: null, XL: null, '2XL': null }
      return res.json({
        colors: [
          { name: 'White', swatch: '#ffffff', variantsBySize: nullSizes, mockupUrls: [] },
          { name: 'Black', swatch: '#111111', variantsBySize: nullSizes, mockupUrls: [] },
          { name: 'Navy', swatch: '#1a237e', variantsBySize: nullSizes, mockupUrls: [] },
          { name: 'Forest Green', swatch: '#2e7d32', variantsBySize: nullSizes, mockupUrls: [] },
          { name: 'Red', swatch: '#c62828', variantsBySize: nullSizes, mockupUrls: [] },
          { name: 'Charcoal', swatch: '#37474f', variantsBySize: nullSizes, mockupUrls: [] },
        ],
        sizes: ['S', 'M', 'L', 'XL', '2XL'],
      })
    }
    res.json(data)
  } catch (err) {
    console.error('Pet portrait variants error:', err)
    res.status(500).json({ error: 'Failed to fetch shirt options.' })
  }
})

app.post('/api/pet-portrait/mockup', express.json(), async (req, res) => {
  try {
    const { variantId } = req.body ?? {}
    if (!variantId) return res.status(400).json({ error: 'Missing variantId.' })

    const data = await getPetPortraitVariantData()
    if (!data) return res.json({ mockupUrl: null, swatch: '#ffffff', colorName: 'White' })

    for (const color of data.colors) {
      for (const vid of Object.values(color.variantsBySize)) {
        if (vid === variantId) {
          return res.json({ mockupUrl: color.mockupUrls[0] ?? null, swatch: color.swatch, colorName: color.name })
        }
      }
    }

    res.status(404).json({ error: 'Variant not found.' })
  } catch (err) {
    console.error('Pet portrait mockup error:', err)
    res.status(500).json({ error: 'Failed to get mockup.' })
  }
})

app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = req.headers['stripe-signature']

  let event
  try {
    event = webhookSecret
      ? stripe.webhooks.constructEvent(req.body, signature, webhookSecret)
      : JSON.parse(req.body.toString('utf8'))
  } catch (error) {
    res.status(400).send(`Webhook error: ${error.message}`)
    return
  }

  if (event.type === 'checkout.session.completed') {
    try {
      await fulfillCheckoutSession(event.data.object)
    } catch (error) {
      console.error(error)
      res.status(500).send('Fulfillment failed')
      return
    }
  }

  res.json({ received: true })
})

app.use(express.json())

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    requireEnv('STRIPE_SECRET_KEY')
    const items = buildCheckoutItems(req.body.items)

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: 'usd',
          unit_amount: item.unitAmount,
          product_data: {
            name: `${item.name} - ${item.size}`,
            images: [item.image.startsWith('http') ? item.image : `${siteUrl}${item.image}`],
          },
        },
      })),
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
      phone_number_collection: {
        enabled: true,
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 499,
              currency: 'usd',
            },
            display_name: 'Standard shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 10 },
            },
          },
        },
      ],
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout/cancel`,
      metadata: {
        source: 'inkspirit-storefront',
      },
    })

    await saveOrder(session.id, {
      id: session.id,
      orderNumber: generateOrderNumber(),
      status: 'checkout_created',
      items,
      createdAt: new Date().toISOString(),
    })

    res.json({ url: session.url })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/orders/:sessionId', async (req, res) => {
  try {
    const order = await readOrder(req.params.sessionId)

    let customerEmail = order.customerEmail ?? null
    if (!customerEmail) {
      try {
        const session = await stripe.checkout.sessions.retrieve(req.params.sessionId)
        customerEmail = session.customer_details?.email ?? null
      } catch {
        // not critical — just won't show email yet
      }
    }

    res.json({
      id: order.id,
      orderNumber: order.orderNumber ?? null,
      status: order.status,
      customerEmail,
      items: order.items,
      printifyOrderId: order.printifyOrder?.id ?? null,
    })
  } catch {
    res.status(404).json({ error: 'Order not found.' })
  }
})

app.use(express.static(distDir, { extensions: ['html'] }))

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

async function start() {
  await initDb()
  app.listen(port, () => {
    console.log(`Store server running at ${siteUrl}`)
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
