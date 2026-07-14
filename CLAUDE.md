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
npm test         # Vitest suite (unit + API + component)
```

## Testing

Vitest (`tests/*.test.js`). `server/index.js` exports `app` + pure helpers and only auto-starts when run directly, so tests import it without listening (dummy Stripe/OpenAI/FAL keys are set in `vitest.config.js`). Coverage: checkout validation, order/session extraction, fulfillment status, OG/meta rewrite, email builders (incl. XSS escaping), cart + designs composables, analytics no-op, and component render. API endpoint tests use supertest; the DB-backed integration block runs only when `TEST_DB=1` + `DATABASE_URL` are set (CI provides a Postgres service — see `.github/workflows/test.yml`). Locally: `TEST_DB=1 DATABASE_URL=postgres://... npm test`.

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
| `VITE_GA_MEASUREMENT_ID` | Optional. GA4 id (`G-XXXX`). **Build-time** (Vite) — set before `npm run build`. Analytics no-op if unset. Fires a GA4 `purchase` event on the success page (link GA4 → Google Ads to import it as a conversion). |
| `VITE_PLAUSIBLE_DOMAIN` | Optional. Plausible domain, alternative to GA4. **Build-time**. Use one or the other. |
| `VITE_GOOGLE_ADS_ID` | Optional. Google Ads id (`AW-XXXXXXXXX`). **Build-time**. Loads gtag and fires an Ads `conversion` on purchase (alongside/without GA4). |
| `VITE_GOOGLE_ADS_PURCHASE_LABEL` | Optional. The Ads conversion **label** for a purchase (paired with `VITE_GOOGLE_ADS_ID`). Get both from the Ads conversion action's tag setup. |

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

The branded emails live in `server/emails.js` (pure HTML/text builders sharing one `emailShell`): **order confirmation** and **shipping notification**. Sending is provider-agnostic via `sendEmail()` in `server/index.js`, currently wired to **Resend** — it no-ops (logs only) until `RESEND_API_KEY` is set, so nothing sends by accident.

Triggers:
- **Order confirmation** — Stripe `checkout.session.completed` webhook, sent before Printify fulfillment so the customer is confirmed even if fulfillment errors (idempotent via `confirmationEmailSentAt`).
- **Shipping** — Printify's `order:shipment:created` webhook → `POST /api/webhooks/printify`. Matches the order by its stored Printify id, refreshes tracking, sends once (idempotent via `shippingEmailSentAt`). Fallback: viewing an order after it ships also fires it.
- **Review request** — Printify's `order:shipment:delivered` event → invites a review (idempotent via `reviewRequestEmailSentAt`).

## Reviews

Self-hosted in a Postgres `reviews` table — one per order, only from verified buyers. `POST /api/reviews` requires a matching order number + email (same guard as order lookup) and dedupes on `order_id`. `GET /api/reviews` returns published reviews + an aggregate (count/average). Submit at `/review` (linked from the checkout success page and the delivery email); browse at `/reviews`. The home strip (`ReviewStrip.vue`) stays hidden until real reviews exist.

To go live:
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

## Go-Live Checklist

Everything that must be true for the store to actually work end to end. Env vars go in **Railway** (production); `.env.local` is only for local `npm run dev`.

**Payments (Stripe)**
- [ ] `STRIPE_SECRET_KEY` = `sk_live_…` in Railway
- [ ] Webhook endpoint at `…/api/webhooks/stripe` listening for `checkout.session.completed`, in **live** mode (test-mode webhooks don't fire for live payments). Reachable via the Railway domain is fine.
- [ ] Its signing secret → `STRIPE_WEBHOOK_SECRET` in Railway (must match, or payments never reach Printify)
- [ ] Promo codes: enabled via `allow_promotion_codes` (code) — create the actual coupons/codes in the Stripe Dashboard. **Codes are per-mode: a code made in test mode won't work in live.**

**AI generation (OpenAI) — the core product won't run without this**
- [ ] `OPENAI_API_KEY` set, **and the OpenAI account has billing/credits** (a 429 "exceeded your current quota" means no credits — generation fails). Enable auto-recharge. `gpt-image-1` may also require Organization verification.
- [ ] `FAL_KEY` set (hosts generated images for Printify)

**Fulfillment (Printify)**
- [ ] `PRINTIFY_API_TOKEN`, `PRINTIFY_SHOP_ID`, `PRINTIFY_PET_PORTRAIT_PRODUCT_ID` in Railway (team shirts reuse the pet-portrait product — no separate var)
- [ ] Webhooks registered via `node scripts/register-printify-webhooks.mjs <base-url>` (Printify has no webhook UI — API only). Registers `order:shipment:created` + `order:shipment:delivered`.
- [ ] `PRINTIFY_WEBHOOK_SECRET` in Railway **matches** the secret the script used (production fails closed without it)
- [ ] **Turn OFF "send orders to production automatically"** (Printify → Settings → Orders) so orders wait for manual approval — the safety net for testing.

**Email (Resend)**
- [ ] Sending domain **Verified (green)** in Resend (DNS records added at the domain host)
- [ ] `RESEND_API_KEY` + `EMAIL_FROM` (`InkSpirit <orders@yourdomain.com>`) in Railway. `REPLY_TO` optional (defaults to a real inbox so replies don't bounce).

**Optional**
- [ ] Analytics: `VITE_GA_MEASUREMENT_ID` **or** `VITE_PLAUSIBLE_DOMAIN` (build-time — set before deploy)
- [ ] `WELCOME_DISCOUNT_CODE` (defaults to `WELCOME20`)

### Running a full test order

Because **Printify has no test mode**, a completed payment creates a *real* Printify order. The app only *creates* the order (never auto-submits to production), so with manual approval ON it sits safely on hold.

1. **Safety net:** confirm Printify auto-production is OFF (orders need approval).
2. **Minimize cost:** the live site charges a real card. Either make a 100%-off Stripe promo code (e.g. `TEST100`) to zero the product (shipping ~$4.99 still applies), or accept a small charge you'll refund.
3. **Order:** on the live site, generate a design → add to bag → checkout → pay with a **real** card (live mode rejects `4242…`). Apply the test code if using one.
4. **Verify the chain:** success page shows the order → confirmation email arrives → order appears in Printify → My Orders (on hold). A missing step points to a specific piece (webhook secret / Resend / etc.).
5. **Clean up:** cancel the Printify order, and refund the Stripe payment.

(No-real-money alternative: switch Railway to Stripe **test** keys + a test-mode webhook secret, use card `4242 4242 4242 4242`, then switch back. Still creates a real Printify order, so keep the approval safety net.)

## Claude Code Notes

- **Do not start background server processes** (`node server/index.js &`) — they outlive the session and cause stale-process issues where the new server can't bind port 4242. Use `npm run dev` instead, which includes a `predev` hook that kills any existing :4242 process.
- Server changes (including `src/data/products.js`) are picked up automatically by nodemon — no manual restart needed.
- Frontend changes are picked up by Vite HMR instantly.
- `.env.local` changes require a server restart (kill and re-run `npm run dev`).
