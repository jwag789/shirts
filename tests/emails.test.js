import { describe, it, expect } from 'vitest'
import {
  renderShippingEmailHtml,
  renderShippingEmailText,
  renderOrderConfirmationHtml,
  renderReviewRequestHtml,
  renderWelcomeEmailHtml,
  renderWelcomeEmailText,
} from '../server/emails.js'

const site = 'https://inkspirit.studio'
const items = [
  { name: 'Wagner Wolves Team Shirt', image: '/images/x.png', size: 'M', quantity: 2, unitAmount: 4200 },
  { name: 'Biscuit Portrait', image: 'https://fal.media/y.png', size: 'L', quantity: 1, unitAmount: 3800 },
]
const tracking = [{ carrier: 'usps', number: '9400111899223344', url: 'https://tools.usps.com/x', deliveredAt: null }]

describe('shipping email', () => {
  const html = renderShippingEmailHtml({ orderNumber: 'INK-AB12CD', items }, tracking, site)

  it('includes the order number, tracking link and carrier', () => {
    expect(html).toContain('INK-AB12CD')
    expect(html).toContain('https://tools.usps.com/x')
    expect(html).toContain('USPS')
    expect(html).toContain('9400111899223344')
  })

  it('resolves relative images to absolute and keeps absolute ones', () => {
    expect(html).toContain(`${site}/images/x.png`)
    expect(html).toContain('https://fal.media/y.png')
  })

  it('uses the white-text logo on the dark header', () => {
    expect(html).toContain('/images/is-logo-white-text.png')
  })

  it('plain-text version carries the tracking url', () => {
    const text = renderShippingEmailText({ orderNumber: 'INK-AB12CD', items }, tracking, site)
    expect(text).toContain('INK-AB12CD')
    expect(text).toContain('https://tools.usps.com/x')
  })
})

describe('order confirmation email', () => {
  const data = {
    orderNumber: 'INK-AB12CD',
    items,
    subtotalCents: 12200,
    shippingCents: 499,
    totalCents: 12699,
    customerName: 'Jane Buyer',
    address: { line1: '123 Main St', city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' },
  }
  const html = renderOrderConfirmationHtml(data, site)

  it('shows money totals formatted', () => {
    expect(html).toContain('$122.00') // subtotal
    expect(html).toContain('$4.99') // shipping
    expect(html).toContain('$126.99') // total
    expect(html).toContain('$84.00') // line total 4200*2
  })

  it('renders the shipping address', () => {
    expect(html).toContain('Jane Buyer')
    expect(html).toContain('123 Main St')
    expect(html).toContain('Austin, TX, 78701')
  })
})

describe('review request email', () => {
  it('links to a prefilled review form', () => {
    const html = renderReviewRequestHtml({ orderNumber: 'INK-AB12CD' }, site)
    expect(html).toContain(`${site}/review?order=INK-AB12CD`)
  })
})

describe('welcome discount email', () => {
  it('shows the discount code in the html and text versions', () => {
    const html = renderWelcomeEmailHtml('WELCOME20', site)
    expect(html).toContain('WELCOME20')
    expect(html).toContain('20% off')
    expect(html).toContain('/images/is-logo-white-text.png')

    const text = renderWelcomeEmailText('WELCOME20', site)
    expect(text).toContain('WELCOME20')
    expect(text).toContain(site)
  })
})

describe('html escaping (no injection via user data)', () => {
  it('escapes angle brackets and quotes in item names', () => {
    const evil = [{ name: '<script>alert(1)</script>', image: '/i.png', size: 'M', quantity: 1, unitAmount: 100 }]
    const html = renderShippingEmailHtml({ orderNumber: 'INK-X', items: evil }, tracking, site)
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes a malicious customer name in the confirmation', () => {
    const html = renderOrderConfirmationHtml(
      { orderNumber: 'INK-X', items, subtotalCents: 0, shippingCents: 0, totalCents: 0, customerName: '"><b>x</b>', address: { line1: 'a' } },
      site,
    )
    expect(html).not.toContain('"><b>x</b>')
    expect(html).toContain('&quot;&gt;&lt;b&gt;')
  })
})
