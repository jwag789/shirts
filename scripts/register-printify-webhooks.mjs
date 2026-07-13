// One-time (idempotent) registration of the Printify webhooks this app needs.
//
// Printify has no dashboard UI for webhooks — they're managed via the API — so
// run this once after deploying. It reads your keys from .env.local and creates
// (or reports as already-present) the order:shipment:created and
// order:shipment:delivered webhooks that drive the shipping + review emails.
//
//   node scripts/register-printify-webhooks.mjs
//
// Optional: pass the public base URL as the first arg if it differs from
// SITE_URL (e.g. your Railway domain):
//   node scripts/register-printify-webhooks.mjs https://shirts-production.up.railway.app
//
// IMPORTANT: the same PRINTIFY_WEBHOOK_SECRET used here must also be set in
// Railway, or production will reject the webhooks (it fails closed). If it's not
// set, this script generates one and prints it for you to copy into Railway.

import { config } from 'dotenv'
import { randomBytes } from 'node:crypto'

config({ path: '.env.local' })

const TOPICS = ['order:shipment:created', 'order:shipment:delivered']

const token = process.env.PRINTIFY_API_TOKEN
const shopId = process.env.PRINTIFY_SHOP_ID
const base = (process.argv[2] || process.env.SITE_URL || '').replace(/\/$/, '')
let secret = process.env.PRINTIFY_WEBHOOK_SECRET

if (!token || !shopId) {
  console.error('Missing PRINTIFY_API_TOKEN or PRINTIFY_SHOP_ID in .env.local')
  process.exit(1)
}
if (!base) {
  console.error('No base URL — set SITE_URL in .env.local or pass it as the first argument.')
  process.exit(1)
}
if (!secret) {
  secret = randomBytes(24).toString('hex')
  console.log('\n⚠  PRINTIFY_WEBHOOK_SECRET was not set — generated one for you:\n')
  console.log('   ' + secret + '\n')
  console.log('   Add this exact value to Railway (and .env.local) as PRINTIFY_WEBHOOK_SECRET,')
  console.log('   otherwise production will reject these webhooks.\n')
}

const url = `${base}/api/webhooks/printify`
const api = `https://api.printify.com/v1/shops/${shopId}/webhooks.json`
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

async function main() {
  const existingRes = await fetch(api, { headers })
  if (!existingRes.ok) {
    throw new Error(`List webhooks failed (${existingRes.status}): ${await existingRes.text()}`)
  }
  const existing = await existingRes.json()

  for (const topic of TOPICS) {
    const match = existing.find((w) => w.topic === topic && w.url === url)
    if (match) {
      console.log(`✓ Already registered: ${topic} → ${url}`)
      continue
    }
    const res = await fetch(api, {
      method: 'POST',
      headers,
      body: JSON.stringify({ topic, url, secret }),
    })
    if (!res.ok) {
      throw new Error(`Create ${topic} failed (${res.status}): ${await res.text()}`)
    }
    console.log(`✓ Registered: ${topic} → ${url}`)
  }
  console.log('\nDone. Make sure PRINTIFY_WEBHOOK_SECRET in Railway matches the secret used above.')
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
