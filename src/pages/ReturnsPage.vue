<script setup>
import { RouterLink } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { setDocumentHead } from '../composables/useDocumentHead'

setDocumentHead({
  title: 'Returns & Refunds · InkSpirit',
  description:
    "InkSpirit's return and refund policy. Every shirt is made to order, so we cover misprints, damage, and wrong items with a free remake or refund — here's exactly how it works.",
  path: '/returns',
})
</script>

<template>
  <div id="top">
    <SiteHeader />

    <main>
      <section class="collection-title">
        <p class="eyebrow">Returns &amp; refunds</p>
        <h1>If it's not right, we make it right.</h1>
        <p>
          Every InkSpirit shirt is printed just for you the moment you order — nothing sits in a
          warehouse. That keeps waste down, but it also means our policy works a little differently
          from a big-box store. Here's the honest version.
        </p>
      </section>

      <section class="content-section policy">
        <div class="policy__note">
          <strong>The short version:</strong> Misprinted, damaged, or wrong item? We'll remake it or
          refund you — no runaround. Because each item is made to order, we can't accept returns for
          change-of-mind or the wrong size ordered, but we're always happy to help you get it sorted.
        </div>

        <h2>Damaged, defective, or wrong items</h2>
        <p>
          If your order shows up misprinted, damaged in transit, defective, or just isn't what you
          ordered, we've got you. Reach out within <strong>30 days of delivery</strong> with a photo
          of the issue and your order number, and we'll send a free replacement or issue a full
          refund — your choice. You won't be asked to ship the faulty item back.
        </p>

        <h2>Made-to-order items</h2>
        <p>
          Because each shirt is produced on demand specifically for you, we're unable to accept
          returns or exchanges for buyer's remorse or for ordering the wrong size or color. Please
          double-check your size against the product size guide before ordering. If you're unsure,
          message us first — we're happy to help you pick.
        </p>

        <h2>Wrong size?</h2>
        <p>
          Ordered a size that doesn't fit? We can't take made-to-order items back, but reach out and
          we'll do our best to help — often at a discounted rate on a replacement. We'd rather keep
          you happy than lose you over a size.
        </p>

        <h2>Order changes &amp; cancellations</h2>
        <p>
          Need to change or cancel an order? Contact us as soon as possible. We can usually make
          changes before an order goes into production, but once printing starts we're no longer able
          to modify or cancel it.
        </p>

        <h2>Lost or stuck in transit</h2>
        <p>
          Every order ships with tracking. If your package is lost, stuck, or hasn't arrived in a
          reasonable window, get in touch and we'll track it down and make it right.
        </p>

        <h2>Custom &amp; personalized designs</h2>
        <p>
          Custom pet portraits and team shirts are as made-to-order as it gets, so the same policy
          applies: we happily fix any print defect, damage, or production error, but we can't refund
          a correctly produced custom item for change of mind. If your preview looked great but the
          print didn't match it, that's on us — we'll remake it.
        </p>

        <h2>How to start a claim</h2>
        <p>
          It's quick. Send us a message with your order number and, if it's a quality issue, a photo
          of the problem. A real person reads every message and will get you sorted.
        </p>
        <div class="policy__actions">
          <RouterLink class="button" to="/contact">Contact us</RouterLink>
          <RouterLink class="button button--outline" to="/orders">Look up your order →</RouterLink>
        </div>

        <h2>Refund timing</h2>
        <p>
          Approved refunds are issued to your original payment method through Stripe. Once processed,
          it typically takes <strong>5–10 business days</strong> for the funds to appear, depending on
          your bank or card provider.
        </p>

        <p class="policy__fineprint">
          Questions about anything here? Just <RouterLink to="/contact">reach out</RouterLink> — we're
          a small studio and we actually read every message.
        </p>
      </section>

      <SiteFooter />
    </main>
  </div>
</template>
