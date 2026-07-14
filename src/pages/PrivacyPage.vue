<script setup>
import { RouterLink } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'
import { setDocumentHead } from '../composables/useDocumentHead'

setDocumentHead({
  title: 'Privacy Policy · InkSpirit',
  description:
    "How InkSpirit collects, uses, and protects your data — what we store, who processes it (Stripe, Printify, and our AI providers), and your choices.",
  path: '/privacy',
})
</script>

<template>
  <div id="top">
    <SiteHeader />

    <main>
      <section class="collection-title">
        <p class="eyebrow">Privacy policy</p>
        <h1>Your data, handled with respect.</h1>
        <p>
          We collect only what we need to make and ship your order, keep you updated, and improve the
          store. We don't sell your data. Here's exactly what happens to it.
        </p>
      </section>

      <section class="content-section policy">
        <div class="policy__note">
          <strong>Last updated:</strong> July 14, 2026. This policy explains what InkSpirit
          ("we," "us") collects and why. Questions? <RouterLink to="/contact">Contact us</RouterLink>.
        </div>

        <h2>What we collect</h2>
        <p>
          Depending on how you use InkSpirit, we may collect: your <strong>name, email, shipping
          address, and phone number</strong> (to fulfill and update your order); <strong>photos and
          design details</strong> you provide to our pet portrait and team shirt tools; your
          <strong>order history and reviews</strong>; and <strong>basic usage data</strong> (pages
          visited, device/browser) via analytics. Payment card details are entered directly on
          Stripe's secure checkout — <strong>we never receive or store your full card number.</strong>
        </p>

        <h2>How we use it</h2>
        <p>
          To create your designs, process payment, produce and ship your order, send order and
          shipping notifications, respond to support requests, handle reviews, prevent fraud, and —
          if you opt in — send occasional marketing emails about new drops and discounts.
        </p>

        <h2>Uploaded photos &amp; generated designs</h2>
        <p>
          Photos you upload for a pet portrait are sent to our AI provider to generate your artwork
          and are <strong>not stored by us after your design is created</strong>. The finished design
          image is hosted so it can be printed and, if you choose to share it, viewed via your share
          link. Please don't upload photos you don't have the right to use.
        </p>

        <h2>Who we share it with</h2>
        <p>
          We use trusted third-party providers purely to run the store — not to sell your data:
        </p>
        <p>
          • <strong>Stripe</strong> — payment processing.<br />
          • <strong>Printify</strong> and its print partners — production and shipping of your order.<br />
          • <strong>OpenAI</strong> and <strong>fal.ai</strong> — generating and hosting your custom designs.<br />
          • <strong>Resend</strong> — sending order, shipping, and marketing emails.<br />
          • <strong>Google Analytics</strong> — anonymous usage statistics (only if enabled).
        </p>
        <p>
          Each processes your data under its own terms and only to provide its service to us. We may
          also disclose information if required by law.
        </p>

        <h2>Cookies &amp; analytics</h2>
        <p>
          We use minimal browser storage to run the cart, remember dismissed pop-ups, and — if
          analytics is enabled — measure traffic with privacy-respecting tools. You can clear or block
          cookies in your browser; core shopping features may not work without them.
        </p>

        <h2>Marketing emails</h2>
        <p>
          We only send marketing email if you sign up. Every marketing email includes an unsubscribe
          link, and you can opt out at any time. Order and shipping notifications are transactional and
          sent regardless, because they relate to a purchase you made.
        </p>

        <h2>Data retention</h2>
        <p>
          We keep order records as long as needed to support you and meet legal, tax, and accounting
          obligations. Marketing contacts are kept until you unsubscribe.
        </p>

        <h2>Your choices</h2>
        <p>
          You can unsubscribe from marketing anytime, and you can ask us to access or delete the
          personal data we hold about you. Just <RouterLink to="/contact">reach out</RouterLink> and
          we'll take care of it, subject to records we're required to keep.
        </p>

        <h2>Children</h2>
        <p>
          InkSpirit isn't directed to children under 13, and we don't knowingly collect their data.
        </p>

        <h2>Changes</h2>
        <p>
          We may update this policy as the business changes; the "last updated" date above will reflect
          any revisions.
        </p>
        <div class="policy__actions">
          <RouterLink class="button" to="/contact">Contact us</RouterLink>
          <RouterLink class="button button--outline" to="/terms">Terms &amp; Conditions →</RouterLink>
        </div>

        <p class="policy__fineprint">
          This policy is a general summary of our practices and isn't legal advice.
        </p>
      </section>
    </main>
  </div>
</template>
