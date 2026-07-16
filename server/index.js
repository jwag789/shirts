import express from 'express'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import Stripe from 'stripe'
import { config } from 'dotenv'
import pg from 'pg'
import OpenAI, { toFile } from 'openai'
import { fal } from '@fal-ai/client'
import sharp from 'sharp'
import { products } from '../src/data/products.js'
import {
  renderShippingEmailHtml,
  renderShippingEmailText,
  renderOrderConfirmationHtml,
  renderOrderConfirmationText,
  renderReviewRequestHtml,
  renderReviewRequestText,
  renderWelcomeEmailHtml,
  renderWelcomeEmailText,
  renderContactNotificationHtml,
  renderContactNotificationText,
} from './emails.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')

config({ path: path.join(rootDir, '.env.local') })
config({ path: path.join(rootDir, '.env') })

const app = express()
// Behind Railway's proxy the real client IP is in X-Forwarded-For; trust one
// hop so req.ip is the visitor (per-IP rate limits depend on this).
app.set('trust proxy', 1)
const port = Number(process.env.PORT ?? 4242)
const siteUrl = process.env.SITE_URL ?? `http://localhost:${port}`

// Canonicalize away trailing slashes (e.g. /collections/japanese-style/ →
// /collections/japanese-style) so we never serve the same page at two URLs —
// left unhandled, the catch-all below would silently 200 the homepage at
// every trailing-slash variant, which reads to Googlebot as duplicate content.
app.use((req, res, next) => {
  if (req.method === 'GET' && req.path !== '/' && req.path.endsWith('/') && !req.path.startsWith('/api/')) {
    return res.redirect(301, req.path.slice(0, -1) + req.url.slice(req.path.length))
  }
  next()
})

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' })

fal.config({ credentials: process.env.FAL_KEY ?? '' })

const PET_PORTRAIT_PRICE = 38
const PET_PORTRAIT_DAILY_LIMIT = 10
// How many portrait options to generate per request (each is a separate gpt-image-1 image → separate cost)
const PET_PORTRAIT_OPTION_COUNT = 1

const TEAM_SHIRT_PRICE = 42
const TEAM_SHIRT_DAILY_LIMIT = 20

// ip → { count, date } — resets each calendar day. Keyed maps let the two AI
// features keep independent daily budgets per visitor.
const generateRateLimit = new Map()
const teamGenerateRateLimit = new Map()

function checkRateLimitFor(map, ip, limit) {
  const today = new Date().toISOString().slice(0, 10)
  const entry = map.get(ip)
  if (!entry || entry.date !== today) {
    map.set(ip, { count: 1, date: today })
    return true
  }
  if (entry.count >= limit) return false
  entry.count += 1
  return true
}

function checkRateLimit(ip) {
  return checkRateLimitFor(generateRateLimit, ip, PET_PORTRAIT_DAILY_LIMIT)
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

    if (item.isTeamShirt) {
      const quantity = normalizeQuantity(item.quantity)
      if (!quantity) throw new Error('Invalid quantity for Custom Team Shirt.')

      const size = String(item.size ?? '')
      const validSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL']
      if (!validSizes.includes(size)) throw new Error(`Custom Team Shirt is not available in size ${size}.`)

      const generatedImageUrl = String(item.generatedImageUrl ?? '')
      if (!generatedImageUrl.startsWith('https://')) throw new Error('Missing generated design for team shirt.')

      const teamName = String(item.teamName ?? '').trim().slice(0, 40) || 'Team'
      const player = String(item.playerName ?? '').trim().slice(0, 16)
      const number = String(item.playerNumber ?? '').trim().slice(0, 4)
      const suffix = [player, number].filter(Boolean).join(' ')

      return {
        isTeamShirt: true,
        generatedImageUrl,
        teamName,
        playerName: player,
        playerNumber: number,
        style: String(item.style ?? ''),
        name: `${teamName} Team Shirt${suffix ? ` — ${suffix}` : ''}`,
        size,
        color: String(item.color ?? ''),
        printifyVariantId: Number(item.printifyVariantId) || null,
        quantity,
        unitAmount: Math.round(TEAM_SHIRT_PRICE * 100),
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
      collection: product.collection,
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
  // Customers look orders up by order number, so index it.
  await pool.query('CREATE INDEX IF NOT EXISTS orders_order_number_idx ON orders (order_number)')

  // Shareable AI designs (pet portraits + team shirts).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS designs (
      id         TEXT        PRIMARY KEY,
      kind       TEXT        NOT NULL,
      image_url  TEXT        NOT NULL,
      data       JSONB       NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // Marketing email signups. We own the list here; syncing to an ESP later
  // (Mailchimp/Klaviyo/etc.) just reads from this table.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscribers (
      email      TEXT        PRIMARY KEY,
      source     TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // Customer reviews — one per order, only from verified buyers.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id           BIGSERIAL   PRIMARY KEY,
      order_id     TEXT        UNIQUE NOT NULL,
      order_number TEXT,
      rating       SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
      title        TEXT,
      body         TEXT,
      author       TEXT,
      status       TEXT        NOT NULL DEFAULT 'published',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query('CREATE INDEX IF NOT EXISTS reviews_published_idx ON reviews (status, created_at DESC)')
}

// Short, URL-safe, hard-to-guess design id (no ambiguous chars).
function generateDesignId() {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789'
  const bytes = randomBytes(11)
  let out = ''
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length]
  return out
}

async function saveDesign({ kind, imageUrl, meta }) {
  const id = generateDesignId()
  await pool.query(
    'INSERT INTO designs (id, kind, image_url, data) VALUES ($1, $2, $3, $4)',
    [id, kind, imageUrl, JSON.stringify(meta ?? {})],
  )
  return id
}

async function readDesign(id) {
  const { rows } = await pool.query(
    'SELECT id, kind, image_url, data, created_at FROM designs WHERE id = $1',
    [id],
  )
  if (!rows.length) return null
  const r = rows[0]
  return { id: r.id, kind: r.kind, imageUrl: r.image_url, meta: r.data ?? {}, createdAt: r.created_at }
}

// Best-effort — a design-save failure must never break generation itself.
async function saveDesignSafe(payload) {
  try {
    return await saveDesign(payload)
  } catch (err) {
    console.error('Failed to save shareable design:', err.message)
    return null
  }
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
    if (item.isPetPortrait || item.isTeamShirt) {
      const upload = printifyUploads?.[index]
      const variantId = item.printifyVariantId || petPortraitVariants?.[item.size] || null
      // Custom images require ordering by blueprint + print provider so Printify
      // applies the per-order artwork. Ordering by product_id reuses the product's
      // saved (blank) design and silently drops the uploaded image.
      if (!upload || !blueprintId || !printProviderId || !variantId) {
        console.warn(`Custom item ${index + 1} cannot be auto-fulfilled (upload=${!!upload}, blueprint=${blueprintId}, provider=${printProviderId}, variant=${variantId}).`)
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
      if ((item.isPetPortrait || item.isTeamShirt) && process.env.PRINTIFY_PET_PORTRAIT_PRODUCT_ID) {
        try {
          return await uploadImageToPrintify(item.generatedImageUrl)
        } catch (err) {
          console.error('Failed to upload custom image to Printify:', err.message)
          return null
        }
      }
      return null
    }),
  )

  // Team shirts and pet portraits both print on the same blank DTG tee, so they
  // share the blueprint/print-provider/variant metadata from that product.
  const hasCustomImage = order.items.some((item) => item.isPetPortrait || item.isTeamShirt)
  const petPortraitMeta = hasCustomImage ? await getPetPortraitVariantData() : null

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

// Ship-to details from a Stripe Checkout session. Prefers the collected shipping
// address, falling back to customer (billing) details.
function extractShippingFromSession(session) {
  const sd = session?.shipping_details ?? session?.collected_information?.shipping_details ?? null
  const cd = session?.customer_details ?? null
  const src = sd?.address ? sd : cd?.address ? cd : null
  if (!src?.address) return null
  const a = src.address
  return {
    name: src.name ?? cd?.name ?? '',
    address: {
      line1: a.line1 ?? '',
      line2: a.line2 ?? '',
      city: a.city ?? '',
      state: a.state ?? '',
      postalCode: a.postal_code ?? '',
      country: a.country ?? '',
    },
  }
}

// Order totals (cents), preferring Stripe's figures, falling back to item math.
function extractAmountsFromSession(session, order) {
  const computedSubtotal = (order?.items ?? []).reduce(
    (sum, it) => sum + (it.unitAmount ?? 0) * (it.quantity ?? 1),
    0,
  )
  const amountSubtotal = session?.amount_subtotal ?? computedSubtotal
  const amountShipping = session?.total_details?.amount_shipping ?? session?.shipping_cost?.amount_total ?? 499
  const amountDiscount = session?.total_details?.amount_discount ?? 0
  const amountTotal = session?.amount_total ?? amountSubtotal + amountShipping - amountDiscount
  return { amountSubtotal, amountShipping, amountDiscount, amountTotal }
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
    shipping: extractShippingFromSession(session),
    ...extractAmountsFromSession(session, order),
    printifyOrder,
    fulfilledAt: new Date().toISOString(),
  }

  await saveOrder(session.id, nextOrder)
  return nextOrder
}

// Live shipment tracking from Printify. Tracking only exists once an order
// ships, so we fetch it on demand when a customer views their order (cached
// briefly) rather than at fulfillment time. Best-effort: any failure just
// yields no tracking rather than breaking the order view.
const trackingCache = new Map() // printifyOrderId -> { at, data }
const TRACKING_TTL_MS = 3 * 60 * 1000

async function fetchPrintifyTracking(printifyOrderId) {
  if (!printifyOrderId) return null

  const cached = trackingCache.get(printifyOrderId)
  if (cached && Date.now() - cached.at < TRACKING_TTL_MS) return cached.data

  const token = process.env.PRINTIFY_API_TOKEN
  const shopId = process.env.PRINTIFY_SHOP_ID
  if (!token || !shopId) return null

  try {
    const res = await fetch(`https://api.printify.com/v1/shops/${shopId}/orders/${printifyOrderId}.json`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const po = await res.json()
    const shipments = Array.isArray(po.shipments) ? po.shipments : []
    const tracking = shipments
      .filter((s) => s && (s.number || s.url))
      .map((s) => ({
        carrier: s.carrier ?? null,
        number: s.number ?? null,
        url: s.url ?? null,
        deliveredAt: s.delivered_at ?? null,
      }))
    const data = { printifyStatus: po.status ?? null, tracking }
    trackingCache.set(printifyOrderId, { at: Date.now(), data })
    return data
  } catch {
    return null
  }
}

function deriveFulfillmentStatus(order, live) {
  if (live?.tracking?.length) {
    return live.tracking.some((t) => t.deliveredAt) ? 'delivered' : 'shipped'
  }
  const ps = String(live?.printifyStatus ?? '')
  if (/fulfilled/i.test(ps)) return 'shipped'
  if (/production|progress/i.test(ps)) return 'in_production'
  if (order.status === 'printify_created') return 'confirmed'
  return 'processing'
}

// Enriches a stored order with live tracking + a friendly fulfillment status,
// persisting back to the row when new tracking appears so it survives even if
// Printify is later unreachable.
async function withLiveTracking(order) {
  let tracking = Array.isArray(order.tracking) ? order.tracking : []
  let fulfillmentStatus = order.fulfillmentStatus ?? 'confirmed'

  const printifyOrderId = order.printifyOrder?.id
  if (printifyOrderId && order.status === 'printify_created') {
    const live = await fetchPrintifyTracking(printifyOrderId)
    if (live) {
      fulfillmentStatus = deriveFulfillmentStatus(order, live)
      if (live.tracking.length) tracking = live.tracking

      const changed =
        JSON.stringify(order.tracking ?? []) !== JSON.stringify(tracking) ||
        order.fulfillmentStatus !== fulfillmentStatus
      if (changed && order.id) {
        try {
          await saveOrder(order.id, { ...order, tracking, fulfillmentStatus })
        } catch {
          // persistence is a nice-to-have; the response is still correct
        }
      }

      // Fallback trigger for the "shipped" email in case the Printify webhook
      // isn't configured — idempotent via shippingEmailSentAt. Fire and forget.
      if (tracking.length && (fulfillmentStatus === 'shipped' || fulfillmentStatus === 'delivered')) {
        maybeSendShippingEmail({ ...order, tracking, fulfillmentStatus }).catch(() => {})
      }
    }
  }

  return { tracking, fulfillmentStatus }
}

async function findOrderByPrintifyId(printifyOrderId) {
  const { rows } = await pool.query(
    "SELECT data FROM orders WHERE data->'printifyOrder'->>'id' = $1 LIMIT 1",
    [String(printifyOrderId)],
  )
  return rows.length ? rows[0].data : null
}

// Provider-agnostic send. Currently wired to Resend; swapping providers is just
// this function. No-op (logs) until RESEND_API_KEY is configured.
async function sendEmail({ to, subject, html, text, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM || 'InkSpirit <onboarding@resend.dev>'
  // Our sending domain has no inbox, so point customer replies at a real one.
  // Callers can override (e.g. the contact form points replies at the sender).
  const replyToAddress = replyTo || process.env.REPLY_TO || 'admin@kingdomwebbuilders.com'
  if (!apiKey) {
    console.log(`[email] RESEND_API_KEY not set — skipping "${subject}" to ${to}`)
    return { skipped: true }
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html, text, reply_to: replyToAddress }),
  })
  const body = await res.text()
  if (!res.ok) throw new Error(`Email send failed (${res.status}): ${body}`)
  return JSON.parse(body || '{}')
}

// Sends the branded "your order shipped" email once per order.
async function maybeSendShippingEmail(order) {
  try {
    if (!order?.customerEmail || !order.tracking?.length || order.shippingEmailSentAt) return
    if (!process.env.RESEND_API_KEY) return

    const result = await sendEmail({
      to: order.customerEmail,
      subject: `Your InkSpirit order ${order.orderNumber ?? ''} shipped`,
      html: renderShippingEmailHtml(order, order.tracking, siteUrl),
      text: renderShippingEmailText(order, order.tracking, siteUrl),
    })
    if (result?.skipped) return
    if (order.id) await saveOrder(order.id, { ...order, shippingEmailSentAt: new Date().toISOString() })
  } catch (err) {
    console.error('Shipping email failed:', err.message)
  }
}

// Sends the branded "order confirmed" email once, right after payment. Assembles
// totals/address from the Stripe session (falling back to item amounts).
async function maybeSendOrderConfirmationEmail(order, session) {
  try {
    const email = session?.customer_details?.email ?? order.customerEmail ?? null
    if (!email || order.confirmationEmailSentAt) return
    if (!process.env.RESEND_API_KEY) return

    const { amountSubtotal, amountShipping, amountDiscount, amountTotal } = extractAmountsFromSession(session, order)
    const shipping = extractShippingFromSession(session)
    const data = {
      orderNumber: order.orderNumber,
      items: order.items ?? [],
      subtotalCents: amountSubtotal,
      shippingCents: amountShipping,
      discountCents: amountDiscount,
      totalCents: amountTotal,
      customerName: shipping?.name ?? session?.customer_details?.name ?? '',
      address: shipping?.address ?? {},
    }

    const result = await sendEmail({
      to: email,
      subject: `Order confirmed — ${order.orderNumber ?? ''}`,
      html: renderOrderConfirmationHtml(data, siteUrl),
      text: renderOrderConfirmationText(data, siteUrl),
    })
    if (result?.skipped) return
    if (order.id) {
      await saveOrder(order.id, { ...order, customerEmail: email, confirmationEmailSentAt: new Date().toISOString() })
    }
  } catch (err) {
    console.error('Order confirmation email failed:', err.message)
  }
}

// Looks up an order by its number, verifying the email matches the order's
// Stripe customer (same guard as the customer order lookup). Returns the order
// or null — used to ensure only real buyers can review.
async function findVerifiedOrder(orderNumberRaw, emailRaw) {
  let orderNumber = String(orderNumberRaw ?? '').trim().toUpperCase()
  const email = String(emailRaw ?? '').trim().toLowerCase()
  if (!orderNumber || !email) return null
  if (!orderNumber.startsWith('INK-')) orderNumber = `INK-${orderNumber}`

  const { rows } = await pool.query('SELECT data FROM orders WHERE order_number = $1', [orderNumber])
  if (!rows.length) return null

  const order = rows[0].data
  let customerEmail = order.customerEmail ?? null
  if (!customerEmail && order.id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(order.id)
      customerEmail = session.customer_details?.email ?? null
    } catch {
      // treated as no match below
    }
  }
  if (!customerEmail || customerEmail.toLowerCase() !== email) return null
  return order
}

// Sends the "how did we do?" review invite once, after delivery.
async function maybeSendReviewRequestEmail(order) {
  try {
    if (!order?.customerEmail || order.reviewRequestEmailSentAt) return
    if (!process.env.RESEND_API_KEY) return

    const result = await sendEmail({
      to: order.customerEmail,
      subject: `How did we do? Review your InkSpirit order`,
      html: renderReviewRequestHtml(order, siteUrl),
      text: renderReviewRequestText(order, siteUrl),
    })
    if (result?.skipped) return
    if (order.id) await saveOrder(order.id, { ...order, reviewRequestEmailSentAt: new Date().toISOString() })
  } catch (err) {
    console.error('Review request email failed:', err.message)
  }
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

// Normalize an uploaded photo into a clean sRGB PNG that every OpenAI call
// will accept. iPhone photos are the common failure case: they arrive either
// as HEIC or as JPEGs tagged with a Display P3 ICC profile, and gpt-image-1's
// edit endpoint rejects both with "invalid image file or mode for image 1".
// Transcoding through sharp bakes in EXIF orientation, drops the embedded
// colour profile (PNG export strips metadata by default), caps the dimensions,
// and guarantees a standard 8-bit RGB PNG.
async function normalizePetImage(buffer) {
  return await sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .toColourspace('srgb')
    .png()
    .toBuffer()
}

// Map raw AI-generation errors to a customer-safe message. The real error is
// still logged server-side by the caller. OpenAI billing/quota and rate-limit
// failures (429) should never surface their "check your plan and billing"
// wording to a shopper — that's the store's problem, not theirs.
function friendlyGenerationError(error) {
  const status = error?.status ?? error?.statusCode
  const code = error?.code ?? error?.error?.code
  if (status === 429 || code === 'insufficient_quota' || code === 'rate_limit_exceeded') {
    return { status: 503, message: 'Our design studio is briefly at capacity — please try again in a moment.' }
  }
  return { status: 500, message: "We couldn't generate your design just now. Please try again." }
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

    // Transcode the upload up front so every downstream OpenAI call gets a
    // format it accepts (see normalizePetImage). Handles HEIC / Display P3
    // iPhone photos that would otherwise 400 at the image edit step.
    let petPngBuffer
    try {
      petPngBuffer = await normalizePetImage(Buffer.from(imageBase64, 'base64'))
    } catch (err) {
      console.error('Pet photo decode failed:', err)
      return res.status(400).json({ error: "We couldn't read that photo. Please upload a JPG, PNG, or WEBP image." })
    }
    const petPngBase64 = petPngBuffer.toString('base64')
    const petDataUrl = `data:image/png;base64,${petPngBase64}`

    // Step 1: validate this is a pet photo
    const validation = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: petDataUrl, detail: 'low' } },
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
            { type: 'image_url', image_url: { url: petDataUrl, detail: 'low' } },
            { type: 'text', text: 'Describe this pet for a portrait painter. Include: species, breed if identifiable, exact coat/fur color and texture, distinctive markings, ear shape, eye color, size/build, and any standout features. Be precise and specific. 2–3 sentences.' },
          ],
        },
      ],
      max_tokens: 200,
    })

    const petDescription = vision.choices[0].message.content.trim()

    // Step 3: generate the portrait with gpt-image-1, editing from the real pet photo
    // so the likeness is preserved, and prompting for a full immersive background.
    const petImageFile = await toFile(petPngBuffer, 'pet.png', { type: 'image/png' })

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

    const designIds = await Promise.all(
      imageUrls.map((url) =>
        saveDesignSafe({ kind: 'pet', imageUrl: url, meta: { style, petName: safePetName } }),
      ),
    )

    res.json({ imageUrls, petDescription, designIds })
  } catch (error) {
    console.error('Pet portrait generation error:', error)
    const { status, message } = friendlyGenerationError(error)
    res.status(status).json({ error: message })
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

// ── AI Team Shirt Generator ──────────────────────────────────────────────────

// Each style is a distinct apparel-design direction. The prompt fragments are
// written to read like a brief handed to a sports-apparel designer, not a
// generic "AI art" request — flat, print-ready, vector-inspired branding.
const TEAM_SHIRT_STYLES = {
  'modern-pro': {
    label: 'Modern Pro',
    prompt: 'modern professional sports branding — clean, bold and premium, with confident contemporary athletic typography and a dynamic, well-balanced layout like a pro sports team wordmark',
  },
  vintage: {
    label: 'Vintage Sports',
    prompt: 'classic vintage athletic apparel — distressed retro texture, a worn/faded screen-print look, timeless collegiate throwback styling from the 70s and 80s, muted ink',
  },
  varsity: {
    label: 'Varsity',
    prompt: 'collegiate varsity athletics — bold block letterforms, a traditional athletic-department layout, arched lettering and classic university-crest energy',
  },
  streetwear: {
    label: 'Streetwear',
    prompt: 'modern streetwear — a bold oversized graphic, fashion-forward and graphic-heavy, the look of premium boutique apparel',
  },
  heritage: {
    label: 'Heritage Crest',
    prompt: 'a traditional club heritage crest — a shield or badge framed by a banner ribbon, with elegant typography and a refined, premium emblem',
  },
  championship: {
    label: 'Championship',
    prompt: 'official championship merchandise — a trophy-inspired, celebratory, premium layered emblem with laurels, stars and banners',
  },
  esports: {
    label: 'Esports',
    prompt: 'a modern gaming organization logo — aggressive, angular and mascot-focused, a sharp esports emblem with vibrant, high-energy geometry',
  },
  minimal: {
    label: 'Minimal',
    prompt: 'minimal modern branding — a clean, simple logo mark with very few elements, understated, refined and confident',
  },
}

function buildTeamShirtPrompt({ teamName, subtitle, style, logoConcept, colors }) {
  const styleDef = TEAM_SHIRT_STYLES[style] ?? TEAM_SHIRT_STYLES['modern-pro']

  const concept = String(logoConcept ?? '').trim()
  const typographyOnly = !concept || /^no logo/i.test(concept) || /typography only/i.test(concept)

  const logoDirective = typographyOnly
    ? `Make this a TYPOGRAPHY-ONLY design with no mascot or icon — build the entire graphic from expressive, well-hierarchied lettering that carries the whole design on its own.`
    : `Feature a professional, illustrated VECTOR-STYLE logo of: ${concept}. Render it as a clean sports-branding mascot or emblem — bold solid shapes, a clear silhouette and confident linework. It must NOT be a photograph, NOT photorealistic, NOT 3D, NOT clip art. Design the logo and the lettering together as ONE integrated lockup; never just place text underneath a picture.`

  const colorDirective = colors?.aiChoose
    ? `Choose a cohesive, high-contrast palette of 2–3 colors that suits the style and reads cleanly on a t-shirt.`
    : `Use a tight, print-friendly palette built only from these team colors — primary ${colors?.primary ?? 'navy'}, secondary ${colors?.secondary ?? 'white'}${colors?.accent ? `, accent ${colors.accent}` : ''}. Do not introduce other colors.`

  const subtitleDirective = subtitle
    ? ` Include the secondary text "${subtitle}" as a smaller supporting element — a banner, an arch, or an underline integrated into the lockup.`
    : ''

  return `Design a single premium apparel graphic for a custom team t-shirt — the kind of authentic merchandise a real athletic-apparel company would sell. It must look intentionally designed by an experienced sports-apparel designer, not AI-generated.

STYLE: ${styleDef.prompt}.

TEAM NAME — the hero of the design, spelled EXACTLY: "${teamName}". Set it in strong, bold type with clear visual hierarchy, for example a large stacked lockup.${subtitleDirective}

${logoDirective}

${colorDirective}

COMPOSITION: one balanced, symmetrical, centered lockup — a crest, badge, shield, circular emblem, or stacked athletic layout — whichever best fits the style. Everything reads as a single cohesive mark with strong contrast and screen-print-ready flat color.

MUST look like: real sports branding, a professional team logo, clean apparel graphics, a balanced layout.

MUST AVOID: clip art, an AI collage, random floating objects, photorealism, 3D renders, product mockups, a t-shirt or any garment in the image, backgrounds, scenery, landscapes, soft gradients, glows, drop shadows, tiny fussy details, and any unnecessary decoration.

Deliver flat, bold, print-ready vector-style artwork on a FULLY TRANSPARENT background (alpha) — isolate the mark with no backdrop, no frame and no border. The ONLY text anywhere in the image is the team name${subtitle ? ' and the secondary text' : ''}, spelled exactly, with no other words, letters or numbers.`
}

app.post('/api/team-shirt/generate', express.json({ limit: '1mb' }), async (req, res) => {
  try {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
    if (!checkRateLimitFor(teamGenerateRateLimit, ip, TEAM_SHIRT_DAILY_LIMIT)) {
      return res.status(429).json({ error: `Limit reached — you can generate up to ${TEAM_SHIRT_DAILY_LIMIT} team designs per day. Try again tomorrow.` })
    }

    const { teamName, subtitle, style, logoConcept, colors } = req.body ?? {}
    const safeTeamName = typeof teamName === 'string' ? teamName.trim().slice(0, 40) : ''
    const safeSubtitle = typeof subtitle === 'string' ? subtitle.trim().slice(0, 30) : ''
    const safeLogoConcept = typeof logoConcept === 'string' ? logoConcept.trim().slice(0, 60) : ''

    if (!safeTeamName) return res.status(400).json({ error: 'Please enter a team name.' })
    if (!style || !TEAM_SHIRT_STYLES[style]) return res.status(400).json({ error: 'Please choose a style.' })

    requireEnv('OPENAI_API_KEY')
    requireEnv('FAL_KEY')

    const prompt = buildTeamShirtPrompt({
      teamName: safeTeamName,
      subtitle: safeSubtitle,
      style,
      logoConcept: safeLogoConcept,
      colors: colors ?? {},
    })

    const generation = await openai.images.generate({
      model: 'gpt-image-1',
      prompt,
      size: '1024x1024',
      quality: 'high',
      background: 'transparent',
      n: 1,
    })

    const b64 = generation.data?.[0]?.b64_json
    if (!b64) throw new Error('Design generation returned no result.')

    const imageUrl = await fal.storage.upload(
      new Blob([Buffer.from(b64, 'base64')], { type: 'image/png' }),
    )

    const designId = await saveDesignSafe({
      kind: 'team',
      imageUrl,
      meta: { teamName: safeTeamName, subtitle: safeSubtitle, style, logoConcept: safeLogoConcept },
    })

    res.json({ imageUrl, designId })
  } catch (error) {
    console.error('Team shirt generation error:', error)
    const { status, message } = friendlyGenerationError(error)
    res.status(status).json({ error: message })
  }
})

// Personalization is composited deterministically with sharp (not re-generated
// by the model) so the team branding is always preserved exactly and every
// player's shirt stays consistent. A player name + jersey number are drawn as a
// nameplate across the lower portion of the same transparent design canvas.
function escapeXml(str) {
  return String(str).replace(/[<>&'"]/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]
  ))
}

async function compositeTeamPersonalization({ baseBuffer, name, number, fill, outline }) {
  const meta = await sharp(baseBuffer).metadata()
  const W = meta.width ?? 1024
  const H = meta.height ?? 1024
  const cx = W / 2

  const plateFill = /^#[0-9a-fA-F]{3,8}$/.test(fill ?? '') ? fill : '#111111'
  const plateOutline = /^#[0-9a-fA-F]{3,8}$/.test(outline ?? '') ? outline : '#ffffff'

  const cleanName = String(name ?? '').trim().toUpperCase().slice(0, 16)
  const cleanNumber = String(number ?? '').trim().slice(0, 4)

  const parts = []
  // Player name sits just above the number; the number is the dominant element,
  // echoing a real jersey back print but composed on the front lockup.
  if (cleanName && cleanNumber) {
    parts.push(`<text x="${cx}" y="${H * 0.74}" font-family="'Arial Black','Arial',sans-serif" font-weight="900" font-size="${W * 0.085}" letter-spacing="${W * 0.006}" text-anchor="middle" fill="${plateFill}" stroke="${plateOutline}" stroke-width="${W * 0.006}" paint-order="stroke">${escapeXml(cleanName)}</text>`)
    parts.push(`<text x="${cx}" y="${H * 0.93}" font-family="'Arial Black','Arial',sans-serif" font-weight="900" font-size="${W * 0.19}" text-anchor="middle" fill="${plateFill}" stroke="${plateOutline}" stroke-width="${W * 0.01}" paint-order="stroke">${escapeXml(cleanNumber)}</text>`)
  } else if (cleanNumber) {
    parts.push(`<text x="${cx}" y="${H * 0.92}" font-family="'Arial Black','Arial',sans-serif" font-weight="900" font-size="${W * 0.22}" text-anchor="middle" fill="${plateFill}" stroke="${plateOutline}" stroke-width="${W * 0.011}" paint-order="stroke">${escapeXml(cleanNumber)}</text>`)
  } else if (cleanName) {
    parts.push(`<text x="${cx}" y="${H * 0.9}" font-family="'Arial Black','Arial',sans-serif" font-weight="900" font-size="${W * 0.12}" letter-spacing="${W * 0.006}" text-anchor="middle" fill="${plateFill}" stroke="${plateOutline}" stroke-width="${W * 0.008}" paint-order="stroke">${escapeXml(cleanName)}</text>`)
  }

  if (!parts.length) return baseBuffer

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${parts.join('')}</svg>`
  return await sharp(baseBuffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer()
}

app.post('/api/team-shirt/personalize', express.json({ limit: '1mb' }), async (req, res) => {
  try {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
    if (!checkRateLimitFor(designPreviewRateLimit, ip, 80)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' })
    }

    // Reference a stored design by id — we resolve the base image URL server-side
    // rather than fetching a client-supplied URL (avoids SSRF).
    const { designId, name, number, fill, outline } = req.body ?? {}
    const design = designId ? await readDesign(String(designId)) : null
    if (!design) return res.status(404).json({ error: 'Design not found.' })

    if (!String(name ?? '').trim() && !String(number ?? '').trim()) {
      // Nothing to add — hand the original design straight back.
      return res.json({ imageUrl: design.imageUrl })
    }

    requireEnv('FAL_KEY')

    const upstream = await fetch(design.imageUrl)
    if (!upstream.ok) throw new Error('Could not load the base design.')
    const baseBuffer = Buffer.from(await upstream.arrayBuffer())

    const outBuffer = await compositeTeamPersonalization({ baseBuffer, name, number, fill, outline })

    const imageUrl = await fal.storage.upload(new Blob([outBuffer], { type: 'image/png' }))
    res.json({ imageUrl })
  } catch (error) {
    console.error('Team shirt personalization error:', error)
    res.status(500).json({ error: 'Could not personalize the design.' })
  }
})

// Team shirts print on the same blank DTG tee as pet portraits, so they reuse
// its color/size/mockup catalogue.
app.get('/api/team-shirt/variants', async (req, res) => {
  try {
    const data = await getPetPortraitVariantData()
    if (!data) {
      const nullSizes = { S: null, M: null, L: null, XL: null, '2XL': null }
      return res.json({
        colors: [
          { name: 'White', swatch: '#ffffff', variantsBySize: nullSizes, mockupUrls: [] },
          { name: 'Black', swatch: '#111111', variantsBySize: nullSizes, mockupUrls: [] },
          { name: 'Navy', swatch: '#1a237e', variantsBySize: nullSizes, mockupUrls: [] },
          { name: 'Red', swatch: '#c62828', variantsBySize: nullSizes, mockupUrls: [] },
          { name: 'Forest Green', swatch: '#2e7d32', variantsBySize: nullSizes, mockupUrls: [] },
          { name: 'Gold', swatch: '#f9a825', variantsBySize: nullSizes, mockupUrls: [] },
          { name: 'Maroon', swatch: '#880e4f', variantsBySize: nullSizes, mockupUrls: [] },
          { name: 'Charcoal', swatch: '#37474f', variantsBySize: nullSizes, mockupUrls: [] },
        ],
        sizes: ['S', 'M', 'L', 'XL', '2XL'],
      })
    }
    res.json(data)
  } catch (err) {
    console.error('Team shirt variants error:', err)
    res.status(500).json({ error: 'Failed to fetch shirt options.' })
  }
})

app.post('/api/team-shirt/mockup', express.json(), async (req, res) => {
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
    console.error('Team shirt mockup error:', err)
    res.status(500).json({ error: 'Failed to get mockup.' })
  }
})

app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = req.headers['stripe-signature']

  // Fail closed in production: without a signing secret we can't verify the
  // sender, so refuse rather than trust an unsigned payload.
  if (!webhookSecret && process.env.NODE_ENV === 'production') {
    console.error('STRIPE_WEBHOOK_SECRET is not set — refusing unverified webhook in production.')
    res.status(500).send('Webhook not configured')
    return
  }

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
    const session = event.data.object

    // Send the order confirmation first, independent of Printify — the customer
    // paid, so they should get confirmation even if fulfillment errors out.
    try {
      const order = await readOrder(session.id)
      await maybeSendOrderConfirmationEmail(order, session)
    } catch (err) {
      console.error('Confirmation email step failed:', err.message)
    }

    try {
      await fulfillCheckoutSession(session)
    } catch (error) {
      console.error(error)
      res.status(500).send('Fulfillment failed')
      return
    }
  }

  res.json({ received: true })
})

// Printify fires this when an order ships. Printify has no webhook UI — register
// the order:shipment:* webhooks via the API with scripts/register-printify-webhooks.mjs.
// We look the order up by its Printify id, refresh tracking, and send the branded
// shipping email.
app.post('/api/webhooks/printify', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const secret = process.env.PRINTIFY_WEBHOOK_SECRET
    const raw = req.body // Buffer (express.raw)
    if (secret) {
      const provided = String(req.get('x-pfy-signature') ?? '')
      const expected = 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex')
      const ok =
        provided.length === expected.length &&
        timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
      if (!ok) return res.status(401).json({ error: 'Invalid signature' })
    } else if (process.env.NODE_ENV === 'production') {
      // Fail closed: unsigned webhooks can trigger fulfillment emails/status.
      console.error('PRINTIFY_WEBHOOK_SECRET is not set — refusing unverified webhook in production.')
      return res.status(500).json({ error: 'Webhook not configured' })
    }

    const event = JSON.parse(raw.toString('utf8'))
    if (event?.type === 'order:shipment:created' || event?.type === 'order:shipment:delivered') {
      const printifyOrderId = event.resource?.id
      const order = printifyOrderId ? await findOrderByPrintifyId(printifyOrderId) : null
      if (order) {
        // Pull authoritative tracking from the API rather than trusting the
        // webhook payload shape.
        const live = await fetchPrintifyTracking(printifyOrderId)
        const tracking = live?.tracking ?? order.tracking ?? []
        const fulfillmentStatus = deriveFulfillmentStatus(order, live)
        const merged = { ...order, tracking, fulfillmentStatus }
        if (order.id) {
          try {
            await saveOrder(order.id, merged)
          } catch {
            /* non-fatal */
          }
        }
        await maybeSendShippingEmail(merged)

        // Once delivered, invite a review (idempotent).
        if (event.type === 'order:shipment:delivered' || merged.fulfillmentStatus === 'delivered') {
          await maybeSendReviewRequestEmail(merged)
        }
      }
    }

    res.json({ received: true })
  } catch (err) {
    console.error('Printify webhook error:', err.message)
    // Ack so Printify doesn't retry-storm on our parse errors.
    res.status(200).json({ received: true })
  }
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
      // Show the "Add promotion code" field on the hosted checkout page.
      // The actual codes/coupons are created and managed in the Stripe
      // Dashboard (Products → Coupons → Promotion codes) — nothing to define
      // here. Stripe validates them and applies the discount automatically.
      allow_promotion_codes: true,
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

// Marketing email capture. Stores to our own `subscribers` table (idempotent);
// an ESP sync can later read from it.
const subscribeRateLimit = new Map()
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Shared first-order discount code. Create this as a Promotion Code in Stripe
// (on a 20%-off coupon) with the "first-time customer" restriction enabled.
const WELCOME_DISCOUNT_CODE = process.env.WELCOME_DISCOUNT_CODE || 'WELCOME20'

// Sends the "here's your 20% off" email once, when a visitor signs up via the
// welcome popup. No-ops (logs only) until RESEND_API_KEY is set.
async function maybeSendWelcomeEmail(email) {
  try {
    if (!process.env.RESEND_API_KEY) return
    await sendEmail({
      to: email,
      subject: `Here's your 20% off — welcome to InkSpirit`,
      html: renderWelcomeEmailHtml(WELCOME_DISCOUNT_CODE, siteUrl),
      text: renderWelcomeEmailText(WELCOME_DISCOUNT_CODE, siteUrl),
    })
  } catch (err) {
    console.error('Welcome email failed:', err.message)
  }
}

app.post('/api/subscribe', express.json(), async (req, res) => {
  try {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
    if (!checkRateLimitFor(subscribeRateLimit, ip, 30)) {
      return res.status(429).json({ error: 'Too many attempts. Please try again later.' })
    }

    const email = String(req.body?.email ?? '').trim().toLowerCase()
    const source = String(req.body?.source ?? 'site').trim().slice(0, 40) || 'site'
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return res.status(400).json({ error: 'Please enter a valid email address.' })
    }

    const result = await pool.query(
      'INSERT INTO subscribers (email, source) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING',
      [email, source],
    )

    // Only email the code to genuinely new signups from the welcome popup, so a
    // repeat submit (ON CONFLICT DO NOTHING → rowCount 0) doesn't re-send it.
    if (source === 'welcome-popup' && result.rowCount > 0) {
      await maybeSendWelcomeEmail(email)
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('Subscribe error:', err)
    res.status(500).json({ error: 'Could not sign you up. Please try again.' })
  }
})

// Contact form → emails the shop inbox. No DB row; just a notification with
// reply-to set to the sender so a reply goes straight back to the customer.
const contactRateLimit = new Map()

app.post('/api/contact', express.json(), async (req, res) => {
  try {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
    if (!checkRateLimitFor(contactRateLimit, ip, 10)) {
      return res.status(429).json({ error: 'Too many messages. Please try again later.' })
    }

    const name = String(req.body?.name ?? '').trim().slice(0, 80)
    const email = String(req.body?.email ?? '').trim().toLowerCase()
    const subject = String(req.body?.subject ?? '').trim().slice(0, 120)
    const message = String(req.body?.message ?? '').trim().slice(0, 4000)
    // Honeypot — bots fill hidden fields, humans don't. Pretend success.
    if (String(req.body?.company ?? '').trim()) return res.json({ ok: true })

    if (!name) return res.status(400).json({ error: 'Please tell us your name.' })
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return res.status(400).json({ error: 'Please enter a valid email address.' })
    }
    if (!message) return res.status(400).json({ error: 'Please write a message.' })

    const to = process.env.CONTACT_TO || 'admin@kingdomwebbuilders.com'
    const msg = { name, email, subject: subject || 'No subject', message }

    if (!process.env.RESEND_API_KEY) {
      console.log(`[contact] RESEND_API_KEY not set — would email ${to} from ${email}: ${subject}`)
      return res.json({ ok: true })
    }

    await sendEmail({
      to,
      replyTo: email,
      subject: `[Contact] ${msg.subject} — from ${name}`,
      html: renderContactNotificationHtml(msg, siteUrl),
      text: renderContactNotificationText(msg),
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('Contact form error:', err)
    res.status(500).json({ error: 'Could not send your message. Please try again.' })
  }
})

// Customer reviews. Submission is gated on a verified order (number + email),
// so only real buyers can review, one per order.
const reviewRateLimit = new Map()

app.post('/api/reviews', express.json(), async (req, res) => {
  try {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
    if (!checkRateLimitFor(reviewRateLimit, ip, 20)) {
      return res.status(429).json({ error: 'Too many attempts. Please try again later.' })
    }

    const { orderNumber, email, rating, title, body, name } = req.body ?? {}
    const r = Number(rating)
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return res.status(400).json({ error: 'Please choose a rating from 1 to 5 stars.' })
    }
    const cleanBody = String(body ?? '').trim().slice(0, 1000)
    if (!cleanBody) return res.status(400).json({ error: 'Please write a short review.' })
    const cleanTitle = String(title ?? '').trim().slice(0, 80)

    const order = await findVerifiedOrder(orderNumber, email)
    if (!order) {
      return res.status(404).json({ error: "We couldn't find an order matching that number and email." })
    }

    const author = (String(name ?? '').trim() || order.shipping?.name || 'Verified buyer').slice(0, 40)

    try {
      await pool.query(
        `INSERT INTO reviews (order_id, order_number, rating, title, body, author)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order.id, order.orderNumber ?? null, r, cleanTitle || null, cleanBody, author],
      )
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: "You've already reviewed this order — thank you!" })
      }
      throw err
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('Review submit error:', err)
    res.status(500).json({ error: 'Could not submit your review. Please try again.' })
  }
})

app.get('/api/reviews', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50)
    const summary = await pool.query(
      "SELECT COUNT(*)::int AS count, COALESCE(AVG(rating), 0)::float AS average FROM reviews WHERE status = 'published'",
    )
    const list = await pool.query(
      "SELECT rating, title, body, author, created_at FROM reviews WHERE status = 'published' ORDER BY created_at DESC LIMIT $1",
      [limit],
    )
    res.json({
      summary: {
        count: summary.rows[0].count,
        average: Math.round(summary.rows[0].average * 10) / 10,
      },
      reviews: list.rows.map((row) => ({
        rating: row.rating,
        title: row.title,
        body: row.body,
        author: row.author,
        createdAt: row.created_at,
      })),
    })
  } catch (err) {
    console.error('Reviews fetch error:', err)
    res.status(500).json({ error: 'Could not load reviews.' })
  }
})

// Customer-facing order lookup by order number + email. The email must match
// the order's Stripe customer email — that's the auth guard, and we return the
// same generic "not found" whether the number or the email is wrong so order
// numbers can't be enumerated.
const orderLookupRateLimit = new Map()

app.post('/api/orders/lookup', express.json(), async (req, res) => {
  try {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
    if (!checkRateLimitFor(orderLookupRateLimit, ip, 40)) {
      return res.status(429).json({ error: 'Too many lookups. Please try again later.' })
    }

    let orderNumber = String(req.body?.orderNumber ?? '').trim().toUpperCase()
    const email = String(req.body?.email ?? '').trim().toLowerCase()
    if (!orderNumber || !email) {
      return res.status(400).json({ error: 'Enter your order number and email.' })
    }
    if (!orderNumber.startsWith('INK-')) orderNumber = `INK-${orderNumber}`

    const notFound = () =>
      res.status(404).json({ error: "We couldn't find an order matching that number and email." })

    const { rows } = await pool.query('SELECT data FROM orders WHERE order_number = $1', [orderNumber])
    if (!rows.length) return notFound()

    const order = rows[0].data
    let customerEmail = order.customerEmail ?? null
    // Orders still at checkout_created haven't captured the email yet — hydrate
    // it live from Stripe so lookups work the moment payment completes.
    if (!customerEmail && order.id) {
      try {
        const session = await stripe.checkout.sessions.retrieve(order.id)
        customerEmail = session.customer_details?.email ?? null
      } catch {
        // ignore — treated as no match below
      }
    }
    if (!customerEmail || customerEmail.toLowerCase() !== email) return notFound()

    const live = await withLiveTracking(order)
    const amounts =
      order.amountTotal != null
        ? { amountSubtotal: order.amountSubtotal, amountShipping: order.amountShipping, amountTotal: order.amountTotal }
        : extractAmountsFromSession(null, order)

    res.json({
      id: order.id,
      orderNumber: order.orderNumber ?? null,
      status: order.status,
      fulfillmentStatus: live.fulfillmentStatus,
      tracking: live.tracking,
      customerEmail,
      items: order.items,
      shipping: order.shipping ?? null,
      amountSubtotal: amounts.amountSubtotal,
      amountShipping: amounts.amountShipping,
      amountTotal: amounts.amountTotal,
      createdAt: order.createdAt ?? null,
      printifyOrderId: order.printifyOrder?.id ?? null,
    })
  } catch {
    res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
})

app.get('/api/orders/:sessionId', async (req, res) => {
  try {
    const order = await readOrder(req.params.sessionId)

    let customerEmail = order.customerEmail ?? null
    let shipping = order.shipping ?? null
    let amounts =
      order.amountTotal != null
        ? { amountSubtotal: order.amountSubtotal, amountShipping: order.amountShipping, amountTotal: order.amountTotal }
        : null

    // Hydrate anything not yet stored (e.g. the success page loads before the
    // webhook fulfills) from the Stripe session in a single fetch.
    if (!customerEmail || !shipping || !amounts) {
      try {
        const session = await stripe.checkout.sessions.retrieve(req.params.sessionId)
        customerEmail = customerEmail ?? session.customer_details?.email ?? null
        shipping = shipping ?? extractShippingFromSession(session)
        amounts = amounts ?? extractAmountsFromSession(session, order)
      } catch {
        // not critical — fall back to item math below
      }
    }
    if (!amounts) amounts = extractAmountsFromSession(null, order)

    const live = await withLiveTracking(order)

    res.json({
      id: order.id,
      orderNumber: order.orderNumber ?? null,
      status: order.status,
      fulfillmentStatus: live.fulfillmentStatus,
      tracking: live.tracking,
      customerEmail,
      items: order.items,
      shipping,
      amountSubtotal: amounts.amountSubtotal,
      amountShipping: amounts.amountShipping,
      amountTotal: amounts.amountTotal,
      printifyOrderId: order.printifyOrder?.id ?? null,
    })
  } catch {
    res.status(404).json({ error: 'Order not found.' })
  }
})

// Renders a branded shirt mockup (silhouette in the chosen color + the art on
// the chest) as a raster image for link previews — social scrapers can't run
// the client-side mockup. Geometry mirrors ShirtMockup's SVG fallback.
const SHIRT_PATH =
  'M 52 260 L 52 112 L 16 90 L 6 50 L 52 32 L 80 24 Q 96 52 120 54 Q 144 52 160 24 L 188 32 L 234 50 L 224 90 L 188 112 L 188 260 Z'

function mockupSwatch(swatch) {
  const s = String(swatch ?? '').toLowerCase()
  return s === '#ffffff' || s === '#fff' || s === 'white' ? '#ececec' : swatch || '#ececec'
}

async function renderShirtMockupPng(artBuffer, swatch) {
  const W = 1200
  const H = 630
  const shirtH = 566
  const shirtW = Math.round((shirtH * 240) / 270)
  const shirtX = Math.round((W - shirtW) / 2)
  const shirtY = Math.round((H - shirtH) / 2)
  const fill = mockupSwatch(swatch)

  const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#faf9ff"/><stop offset="1" stop-color="#eceff9"/>
    </linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
  </svg>`

  const shirtSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${shirtW}" height="${shirtH}" viewBox="0 0 240 270">
    <defs><filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="9" flood-color="rgba(20,15,40,0.22)"/>
    </filter></defs>
    <path d="${SHIRT_PATH}" fill="${fill}" stroke="rgba(0,0,0,0.14)" stroke-width="1.5" stroke-linejoin="round" filter="url(#sh)"/>
  </svg>`

  // Art: left 29%, top 30%, width 42% of the shirt region (matches the CSS).
  const artW = Math.round(shirtW * 0.42)
  const artResized = await sharp(artBuffer).resize({ width: artW }).png().toBuffer()
  const artLeft = shirtX + Math.round(shirtW * 0.29)
  const artTop = shirtY + Math.round(shirtH * 0.3)

  return await sharp(Buffer.from(bg))
    .composite([
      { input: Buffer.from(shirtSvg), left: shirtX, top: shirtY },
      { input: artResized, left: artLeft, top: artTop },
    ])
    .png()
    .toBuffer()
}

// Builds (and caches) a shirt-mockup preview image for a design in a chosen
// color, used for share-link previews. Also records the chosen color so the
// share page can default to it.
const designPreviewRateLimit = new Map()

app.post('/api/designs/:id/preview', express.json(), async (req, res) => {
  try {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
    if (!checkRateLimitFor(designPreviewRateLimit, ip, 80)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' })
    }

    const design = await readDesign(req.params.id)
    if (!design) return res.status(404).json({ error: 'Design not found.' })

    const swatch = String(req.body?.swatch ?? '').trim() || '#ececec'
    const colorName = String(req.body?.colorName ?? '').trim() || 'White'

    // Reuse the cached preview when the color hasn't changed.
    if (design.meta?.previewImageUrl && design.meta?.color?.swatch === swatch) {
      return res.json({ previewUrl: design.meta.previewImageUrl, color: design.meta.color })
    }

    if (!process.env.FAL_KEY) return res.status(503).json({ error: 'Preview unavailable.' })

    const upstream = await fetch(design.imageUrl)
    if (!upstream.ok) throw new Error('Could not load the design art.')
    const artBuffer = Buffer.from(await upstream.arrayBuffer())

    const png = await renderShirtMockupPng(artBuffer, swatch)
    const previewImageUrl = await fal.storage.upload(new Blob([png], { type: 'image/png' }))

    const nextMeta = { ...(design.meta ?? {}), previewImageUrl, color: { name: colorName, swatch } }
    await pool.query('UPDATE designs SET data = $2 WHERE id = $1', [design.id, JSON.stringify(nextMeta)])

    res.json({ previewUrl: previewImageUrl, color: nextMeta.color })
  } catch (err) {
    console.error('Design preview error:', err)
    res.status(500).json({ error: 'Could not build preview.' })
  }
})

// Shareable designs — fetch one or a batch (batch powers the "My Designs" gallery).
app.get('/api/designs', async (req, res) => {
  try {
    const ids = String(req.query.ids ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 60)
    if (!ids.length) return res.json({ designs: [] })

    const { rows } = await pool.query(
      'SELECT id, kind, image_url, data, created_at FROM designs WHERE id = ANY($1)',
      [ids],
    )
    const byId = new Map(rows.map((r) => [r.id, r]))
    // Preserve the caller's order (newest-first from the client).
    const designs = ids
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((r) => ({ id: r.id, kind: r.kind, imageUrl: r.image_url, meta: r.data ?? {}, createdAt: r.created_at }))
    res.json({ designs })
  } catch {
    res.status(500).json({ error: 'Could not load designs.' })
  }
})

app.get('/api/designs/:id', async (req, res) => {
  try {
    const design = await readDesign(req.params.id)
    if (!design) return res.status(404).json({ error: 'Design not found.' })
    res.json(design)
  } catch {
    res.status(500).json({ error: 'Could not load design.' })
  }
})

// Title for a design's share preview / page.
function designTitle(design) {
  if (design.kind === 'team') {
    const name = design.meta?.teamName?.trim()
    return name ? `${name} — Custom Team Shirt` : 'Custom Team Shirt'
  }
  const style = design.meta?.style
  const styleLabel = style ? style.charAt(0).toUpperCase() + style.slice(1) : ''
  const petName = design.meta?.petName?.trim()
  if (petName) return `${petName} the ${styleLabel} — Custom Pet Portrait`
  return styleLabel ? `${styleLabel} Custom Pet Portrait` : 'Custom AI Design'
}

let indexHtmlCache = null
async function getIndexHtml() {
  if (!indexHtmlCache) indexHtmlCache = await readFile(path.join(distDir, 'index.html'), 'utf8')
  return indexHtmlCache
}

function replaceMeta(html, { title, description, image, url }) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  return html
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta\s+name="description"\s+content=").*?("\s*\/>)/, `$1${esc(description)}$2`)
    .replace(/(<meta\s+property="og:title"\s+content=").*?(")/, `$1${esc(title)}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=").*?(")/, `$1${esc(description)}$2`)
    .replace(/(<meta\s+property="og:image"\s+content=").*?(")/, `$1${esc(image)}$2`)
    .replace(/(<meta\s+property="og:url"\s+content=").*?(")/, `$1${esc(url)}$2`)
    .replace(/(<meta\s+name="twitter:title"\s+content=").*?(")/, `$1${esc(title)}$2`)
    .replace(/(<meta\s+name="twitter:description"\s+content=").*?(")/, `$1${esc(description)}$2`)
    .replace(/(<meta\s+name="twitter:image"\s+content=").*?(")/, `$1${esc(image)}$2`)
    .replace(/(<link\s+rel="canonical"\s+href=").*?(")/, `$1${esc(url)}$2`)
}

// Share page — serve the SPA shell but rewrite social meta so a pasted link
// previews the actual design image and its title.
app.get('/d/:id', async (req, res, next) => {
  try {
    const design = await readDesign(req.params.id)
    const html = await getIndexHtml()
    if (!design) return res.send(html)

    const title = designTitle(design)
    const description =
      design.kind === 'team'
        ? 'Design custom AI team shirts at InkSpirit — see this one and make your own.'
        : 'Custom AI pet portrait tee from InkSpirit — see this one and make your own.'
    res.send(
      replaceMeta(html, {
        title,
        description,
        image: design.meta?.previewImageUrl ?? design.imageUrl,
        url: `${siteUrl}/d/${design.id}`,
      }),
    )
  } catch (err) {
    next(err)
  }
})

app.use(express.static(distDir, { extensions: ['html'] }))

// Everything prerendered (home, collections, products, /info pages) is
// already matched by express.static above via its .html extension fallback.
// Reaching here means either a genuine client-only route (fine, 200 — the
// SPA mounts and renders it) or an unknown/mistyped URL (e.g. a bad product
// slug), which must 404 rather than silently serving homepage content —
// Search Console flags the latter as a soft 404 and it can suppress crawling
// of the real pages.
const clientOnlyRoutes = new Set([
  '/pet-portrait/create',
  '/team-shirt/create',
  '/how-it-works',
  '/contact',
  '/returns',
  '/terms',
  '/privacy',
  '/checkout/success',
  '/checkout/cancel',
])

app.get(/.*/, (req, res) => {
  res.status(clientOnlyRoutes.has(req.path) ? 200 : 404).sendFile(path.join(distDir, 'index.html'))
})

async function start() {
  await initDb()
  app.listen(port, () => {
    console.log(`Store server running at ${siteUrl}`)
  })
}

// Only auto-start when run directly (node server/index.js) — not when imported
// by tests. Tests import `app` + helpers and drive them without listening.
const isEntryPoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isEntryPoint) {
  start().catch((err) => {
    console.error('Failed to start server:', err)
    process.exit(1)
  })
}

export {
  app,
  pool,
  initDb,
  buildCheckoutItems,
  normalizeQuantity,
  generateOrderNumber,
  extractShippingFromSession,
  extractAmountsFromSession,
  deriveFulfillmentStatus,
  designTitle,
  replaceMeta,
  mockupSwatch,
  friendlyGenerationError,
}
