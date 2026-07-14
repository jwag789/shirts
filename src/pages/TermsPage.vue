<script setup>
import { RouterLink } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'
import { setDocumentHead } from '../composables/useDocumentHead'

setDocumentHead({
  title: 'Terms & Conditions · InkSpirit',
  description:
    "The terms and conditions for using InkSpirit — how orders, made-to-order products, custom AI designs, payments, and your responsibilities work.",
  path: '/terms',
})
</script>

<template>
  <div id="top">
    <SiteHeader />

    <main>
      <section class="collection-title">
        <p class="eyebrow">Terms &amp; conditions</p>
        <h1>The ground rules.</h1>
        <p>
          These terms cover how you use InkSpirit and buy from us. By placing an order or using the
          site, you agree to them. We've kept them plain-English — no traps.
        </p>
      </section>

      <section class="content-section policy">
        <div class="policy__note">
          <strong>Last updated:</strong> July 14, 2026. InkSpirit ("InkSpirit," "we," "us") sells
          original and custom-printed apparel made to order. If anything here is unclear,
          <RouterLink to="/contact">reach out</RouterLink> — a real person will answer.
        </div>

        <h2>1. Using the site</h2>
        <p>
          You may use InkSpirit to browse, design, and buy products for your own lawful use. Don't
          misuse the site — no attempting to break, overload, scrape, or gain unauthorized access to
          it, and nothing illegal. You must be able to form a binding contract to purchase (in most
          places, 18 or older, or using a parent or guardian's account with permission).
        </p>

        <h2>2. Products are made to order</h2>
        <p>
          Almost everything we sell is printed on demand specifically for your order — nothing sits
          in a warehouse. Colors on your screen can vary slightly from the finished print, and each
          item may have minor variations that are normal for print-on-demand. Please check the size
          guide before ordering.
        </p>

        <h2>3. Custom &amp; AI-generated designs</h2>
        <p>
          Our pet portrait and team shirt tools use AI to generate artwork from the details and
          photos you provide. When you upload a photo or enter text, <strong>you confirm you own it
          or have the right to use it</strong>, and that it doesn't infringe anyone's rights or
          include content that's unlawful, hateful, or offensive. You grant us the limited right to
          process that input and produce, host, and print your design to fulfill your order.
        </p>
        <p>
          AI results are unique and can vary — previews are representative, not a pixel-perfect
          guarantee. You're responsible for reviewing your design before adding it to your bag. We
          may decline to produce a design that violates these terms.
        </p>

        <h2>4. Orders, pricing &amp; payment</h2>
        <p>
          Prices are shown in US dollars and may change at any time before you order. Placing an order
          is an offer to buy; we accept it when we send confirmation and begin fulfillment. Payments
          are processed securely by <strong>Stripe</strong> — we never see or store your full card
          details. If a price or product is listed in error, we may cancel and refund the affected
          order.
        </p>

        <h2>5. Discount codes</h2>
        <p>
          Promotional codes are subject to their own conditions (eligibility, expiry, single-use, or
          first-order-only limits), can't be combined unless stated, have no cash value, and may be
          changed or withdrawn at any time.
        </p>

        <h2>6. Shipping, returns &amp; refunds</h2>
        <p>
          Shipping timelines are estimates, not guarantees. Because items are made to order, returns
          and refunds follow our <RouterLink to="/returns">Returns &amp; Refunds policy</RouterLink> —
          in short, we remake or refund anything misprinted, damaged, or wrong, but can't take back a
          correctly made item for change of mind.
        </p>

        <h2>7. Intellectual property</h2>
        <p>
          The InkSpirit name, logo, site, and our original catalog artwork belong to us and may not be
          copied or resold without permission. Artwork generated from your own inputs is yours to use
          for personal purposes on the products you buy; the underlying tools, templates, and site
          remain ours.
        </p>

        <h2>8. Availability &amp; changes</h2>
        <p>
          We may update products, prices, features, or these terms as the business evolves. Changes
          take effect when posted here, and the "last updated" date will reflect them. We may also
          suspend or discontinue parts of the service without notice.
        </p>

        <h2>9. Disclaimers &amp; liability</h2>
        <p>
          The site and products are provided "as is." To the fullest extent allowed by law, InkSpirit
          isn't liable for indirect or consequential losses, and our total liability for any order is
          limited to the amount you paid for that order. Nothing here limits rights you have under
          applicable consumer-protection law.
        </p>

        <h2>10. Contact</h2>
        <p>
          Questions about these terms? <RouterLink to="/contact">Get in touch</RouterLink> — we read
          every message.
        </p>
        <div class="policy__actions">
          <RouterLink class="button" to="/contact">Contact us</RouterLink>
          <RouterLink class="button button--outline" to="/privacy">Privacy Policy →</RouterLink>
        </div>

        <p class="policy__fineprint">
          These terms are a general summary of how InkSpirit operates and aren't legal advice.
        </p>
      </section>
    </main>
  </div>
</template>
