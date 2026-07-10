// Branded transactional emails. Pure string builders — no side effects — so
// they're easy to unit-test and preview in isolation.

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function absImg(src, siteUrl) {
  const s = String(src ?? '')
  if (!s) return ''
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  return `${siteUrl}${s.startsWith('/') ? '' : '/'}${s}`
}

const BRAND = {
  ink: '#151221',
  text: '#1b1630',
  muted: '#6b6580',
  line: '#ece8f4',
  accent: '#7646e2',
  accentDark: '#5c35c0',
  bg: '#f4f1fb',
}

// "Your order shipped" email. `order` is our stored order object; `tracking`
// is the array of { carrier, number, url, deliveredAt } from Printify.
export function renderShippingEmailHtml(order, tracking, siteUrl) {
  const site = String(siteUrl ?? '').replace(/\/$/, '')
  const orderNumber = esc(order.orderNumber ?? '')
  const t = (tracking && tracking[0]) || {}
  const carrier = esc((t.carrier || 'Carrier').toUpperCase())
  const number = esc(t.number ?? '')
  const trackUrl = t.url || `${site}/orders`

  const items = (order.items ?? [])
    .map(
      (it) => `
        <tr>
          <td width="72" style="padding:14px 0;border-bottom:1px solid ${BRAND.line};vertical-align:middle;">
            <img src="${absImg(it.image, site)}" width="60" height="60" alt="" style="display:block;width:60px;height:60px;border-radius:10px;object-fit:cover;background:#f0eef7;" />
          </td>
          <td style="padding:14px 0 14px 14px;border-bottom:1px solid ${BRAND.line};vertical-align:middle;font-family:Arial,Helvetica,sans-serif;">
            <div style="font-size:15px;font-weight:bold;color:${BRAND.text};">${esc(it.name)}</div>
            <div style="font-size:13px;color:${BRAND.muted};padding-top:3px;">Size ${esc(it.size)} &nbsp;&middot;&nbsp; Qty ${esc(it.quantity)}</div>
          </td>
        </tr>`,
    )
    .join('')

  const preheader = `Your InkSpirit order ${orderNumber} is on its way.`

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>Your order shipped</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 50px -24px rgba(30,20,60,0.35);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(120deg,${BRAND.accent},${BRAND.accentDark});padding:22px 32px;" align="left">
              <img src="${site}/images/is-logo-2.png" height="30" alt="InkSpirit" style="height:30px;display:block;" />
            </td>
          </tr>
          <!-- Hero -->
          <tr>
            <td style="padding:40px 32px 8px;font-family:Arial,Helvetica,sans-serif;" align="center">
              <div style="font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.accent};font-weight:bold;">On its way</div>
              <h1 style="margin:10px 0 6px;font-size:30px;line-height:1.15;color:${BRAND.text};">Your order shipped 🎉</h1>
              <p style="margin:0;font-size:15px;color:${BRAND.muted};">Order ${orderNumber} is on the way. Track it below.</p>
            </td>
          </tr>
          <!-- Tracking button -->
          <tr>
            <td style="padding:26px 32px 6px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:999px;background:${BRAND.accent};">
                    <a href="${esc(trackUrl)}" target="_blank" style="display:inline-block;padding:15px 34px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">Track your package &rarr;</a>
                  </td>
                </tr>
              </table>
              ${number ? `<p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.muted};">${carrier} &middot; ${number}</p>` : ''}
            </td>
          </tr>
          <!-- Items -->
          <tr>
            <td style="padding:26px 32px 8px;font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.muted};font-weight:bold;padding-bottom:4px;">In this shipment</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table>
            </td>
          </tr>
          <!-- Help -->
          <tr>
            <td style="padding:22px 32px 36px;font-family:Arial,Helvetica,sans-serif;" align="center">
              <p style="margin:0;font-size:13px;color:${BRAND.muted};line-height:1.6;">
                Questions about your order? Just reply to this email.<br />
                You can also <a href="${site}/orders" style="color:${BRAND.accent};text-decoration:none;font-weight:bold;">look it up anytime</a>.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#faf9fe;border-top:1px solid ${BRAND.line};padding:22px 32px;font-family:Arial,Helvetica,sans-serif;" align="center">
              <div style="font-size:14px;font-weight:bold;color:${BRAND.text};">InkSpirit Studio</div>
              <div style="font-size:12px;color:${BRAND.muted};padding-top:4px;">Original graphic tees, made to order.</div>
              <div style="font-size:12px;color:${BRAND.muted};padding-top:10px;"><a href="${site}" style="color:${BRAND.muted};text-decoration:underline;">${esc(site.replace(/^https?:\/\//, ''))}</a></div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// Plain-text fallback for clients that don't render HTML.
export function renderShippingEmailText(order, tracking, siteUrl) {
  const site = String(siteUrl ?? '').replace(/\/$/, '')
  const t = (tracking && tracking[0]) || {}
  const lines = [
    `Your InkSpirit order ${order.orderNumber ?? ''} shipped!`,
    '',
    t.url ? `Track it: ${t.url}` : `Track it: ${site}/orders`,
    t.number ? `${(t.carrier || 'Carrier').toUpperCase()} · ${t.number}` : '',
    '',
    'In this shipment:',
    ...(order.items ?? []).map((it) => `- ${it.name} (Size ${it.size}, Qty ${it.quantity})`),
    '',
    'Questions? Just reply to this email.',
    'InkSpirit Studio',
  ]
  return lines.filter((l) => l !== null && l !== undefined).join('\n')
}
