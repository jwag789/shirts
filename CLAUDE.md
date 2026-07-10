# InkSpirit Storefront

Graphic t-shirt e-commerce site. Vue 3 frontend, Express backend, Stripe for payments, Printify for print-on-demand fulfillment.

## Stack

- **Frontend:** Vue 3 + Vue Router, Vite dev server
- **Backend:** Express 5 (Node.js, ESM), serves built frontend in production
- **Payments:** Stripe Checkout (hosted page)
- **Fulfillment:** Printify API (orders created via Stripe webhook)
- **Styling:** Single `src/styles.css` — no component-scoped styles
- **Env vars:** `.env.local` (live keys) — loaded via dotenv in `server/index.js`

## Commands

```bash
npm run dev      # Vite (port 5173) + nodemon Express (port 4242) — kills stale :4242 first
npm run build    # Vite production build → dist/
npm start        # build + serve via Express (production mode)
```

`npm run dev` is the only command needed for local development. Vite proxies `/api/*` to Express at port 4242. Access the site at **http://localhost:5173**.

## Project Structure

```
server/
  index.js          # Express server — all API routes + static serving
src/
  data/products.js  # Single source of truth for all products and collections
  composables/useCart.js
  pages/            # Vue page components (routed by src/router.js)
  components/       # SiteHeader, CartDrawer, ShirtCard, CollectionCard
  styles.css        # All styles — no scoped CSS
  main.js / router.js
.env.local          # Secret keys — never commit
dist/               # Built frontend — served by Express in production
```

## Key Architecture

**Checkout flow:**
1. CartDrawer → `POST /api/create-checkout-session` → saves order to Postgres (`checkout_created`), returns Stripe URL
2. Customer pays on Stripe hosted page
3. Stripe webhook → `POST /api/webhooks/stripe` → `checkout.session.completed` → creates Printify order, updates order row to `printify_created`
4. Success page → `GET /api/orders/:sessionId` → shows order status (hydrates customer email live from Stripe if not yet stored)

**Products and Printify:**
- Products without a `printify` block cannot be checked out (cart blocks them with a warning)
- `printify.variantsBySize` maps size strings (`"S"`, `"M"`, etc.) to Printify variant IDs
- When adding a new product to Printify: fetch variant IDs from the API and add to the product in `src/data/products.js`

To fetch Printify product variants:
```bash
node -e "
import('dotenv').then(({ config }) => {
  config({ path: '.env.local' })
  fetch('https://api.printify.com/v1/shops/' + process.env.PRINTIFY_SHOP_ID + '/products/PRODUCT_ID.json', {
    headers: { Authorization: 'Bearer ' + process.env.PRINTIFY_API_TOKEN }
  }).then(r => r.json()).then(p => p.variants.filter(v => v.is_enabled).forEach(v => console.log(v.id, v.title)))
})
"
```

## Environment Variables

All in `.env.local`:

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` for production, `sk_test_...` for test mode |
| `STRIPE_WEBHOOK_SECRET` | From `stripe listen` (dev) or Stripe Dashboard (prod) |
| `PRINTIFY_API_TOKEN` | Printify personal access token |
| `PRINTIFY_SHOP_ID` | Printify shop ID |
| `PRINTIFY_WEBHOOK_SECRET` | Optional. HMAC secret for verifying `/api/webhooks/printify` (order:shipment events → shipping email). Skips verification if unset. |
| `DATABASE_URL` | Postgres connection string (order storage). SSL enabled when `NODE_ENV=production`. |
| `OPENAI_API_KEY` | For AI pet portrait + team shirt generation (gpt-image-1) |
| `FAL_KEY` | fal.ai storage — hosts generated images for Printify |
| `RESEND_API_KEY` | Transactional email (shipping notifications). Emails no-op until this is set. |
| `EMAIL_FROM` | From address for transactional email, e.g. `InkSpirit <orders@yourdomain.com>`. Defaults to `onboarding@resend.dev`. |
| `SITE_URL` | Full URL of the site (used for Stripe redirect URLs and image URLs) |
| `PORT` | Defaults to 4242 |

## Stripe Webhook (Local Dev)

```bash
stripe listen --live --forward-to localhost:4242/api/webhooks/stripe
```

Copy the printed `whsec_...` secret into `.env.local` as `STRIPE_WEBHOOK_SECRET`, then restart the server. Without this, payments succeed but orders are never sent to Printify.

For test mode, omit `--live`. Use test card `4242 4242 4242 4242`.

## Order Storage

Orders live in a Postgres `orders` table (via `pg`, connection from `DATABASE_URL`). Each row is keyed by the Stripe `session_id` with the full order object stored in a `data` JSONB column; `order_number` is indexed for customer lookups. `initDb()` creates the table/index on startup. Statuses:
- `checkout_created` — session created, payment not yet confirmed
- `printify_created` — payment confirmed, Printify order created

Customers can retrieve an order at `/orders` (`POST /api/orders/lookup` with order number + email; the email must match the order's Stripe customer email). The post-checkout success page reads a single order via `GET /api/orders/:sessionId`.

## Transactional Email (shipping notifications)

The branded "your order shipped" email lives in `server/emails.js` (pure HTML/text builders). Sending is provider-agnostic via `sendEmail()` in `server/index.js`, currently wired to **Resend** — it no-ops (logs only) until `RESEND_API_KEY` is set, so nothing sends by accident.

Trigger: Printify's `order:shipment:created` webhook → `POST /api/webhooks/printify`. It matches the order by its stored Printify id, refreshes tracking, and sends once (idempotent via `shippingEmailSentAt`). As a fallback, viewing an order after it ships also fires the email. To go live:
1. Create a Resend account, verify your sending domain, set `RESEND_API_KEY` + `EMAIL_FROM`.
2. In Printify → Settings → Webhooks, add `https://yourdomain.com/api/webhooks/printify` for the `order:shipment:created` event; put its secret in `PRINTIFY_WEBHOOK_SECRET`.

## Wiring Up New Products

1. Create the product in Printify and publish it
2. Add the product object to `src/data/products.js`
3. Fetch variant IDs (see snippet above) and add a `printify` block:
   ```js
   printify: {
     productId: 'PRINTIFY_PRODUCT_ID',
     variantsBySize: { S: 12345, M: 12346, L: 12347, XL: 12348, '2XL': 12349 },
   }
   ```
4. Restart dev server — the product is now checkout-enabled

## Production Deployment (Railway)

1. Push code to GitHub
2. Create Railway project, connect repo
3. Set all env vars (see table above) — set `SITE_URL` to the production domain
4. Railway auto-runs `npm start` (build + serve)
5. In Stripe Dashboard → Developers → Webhooks → Add endpoint: `https://yourdomain.com/api/webhooks/stripe`, event `checkout.session.completed`
6. Copy signing secret to Railway env as `STRIPE_WEBHOOK_SECRET`

## Claude Code Notes

- **Do not start background server processes** (`node server/index.js &`) — they outlive the session and cause stale-process issues where the new server can't bind port 4242. Use `npm run dev` instead, which includes a `predev` hook that kills any existing :4242 process.
- Server changes (including `src/data/products.js`) are picked up automatically by nodemon — no manual restart needed.
- Frontend changes are picked up by Vite HMR instantly.
- `.env.local` changes require a server restart (kill and re-run `npm run dev`).
