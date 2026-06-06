import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Stripe from 'stripe'
import { config } from 'dotenv'
import pg from 'pg'
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

function buildPrintifyOrderPayload(session, order) {
  const customer = session.customer_details ?? {}
  const address = session.shipping_details?.address ?? customer.address
  const name = splitCustomerName(session.shipping_details?.name ?? customer.name)

  if (!address) {
    throw new Error('Stripe checkout did not return a shipping address.')
  }

  return {
    external_id: session.id,
    label: session.id,
    line_items: order.items.map((item, index) => ({
      product_id: item.printifyProductId,
      variant_id: item.printifyVariantId,
      quantity: item.quantity,
      external_id: `${session.id}-${index + 1}`,
    })),
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
  const response = await fetch(`https://api.printify.com/v1/shops/${shopId}/orders.json`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildPrintifyOrderPayload(session, order)),
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
            images: [`${siteUrl}${item.image}`],
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

app.use(express.static(distDir))

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
