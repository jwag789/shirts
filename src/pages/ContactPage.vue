<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'
import Icon from '../components/Icon.vue'
import { setDocumentHead } from '../composables/useDocumentHead'
import { trackEvent } from '../analytics'

setDocumentHead({
  title: 'Contact Us — InkSpirit Studio',
  description: "Questions about an order, a custom design, or anything else? Send us a message and we'll get back to you.",
  path: '/contact',
})

const name = ref('')
const email = ref('')
const subject = ref('')
const message = ref('')
const company = ref('') // honeypot — hidden from humans
const status = ref('idle') // idle | loading | done | error
const error = ref('')

async function submit() {
  if (status.value === 'loading') return
  if (!name.value.trim() || !email.value.trim() || !message.value.trim()) {
    status.value = 'error'
    error.value = 'Name, email, and a message are required.'
    return
  }
  status.value = 'loading'
  error.value = ''
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.value.trim(),
        email: email.value.trim(),
        subject: subject.value.trim(),
        message: message.value.trim(),
        company: company.value,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Could not send your message.')
    trackEvent('submit_contact')
    status.value = 'done'
  } catch (err) {
    status.value = 'error'
    error.value = err.message
  }
}
</script>

<template>
  <div id="top">
    <SiteHeader />

    <main>
      <section class="checkout-status">
        <template v-if="status === 'done'">
          <p class="eyebrow">Message sent</p>
          <h1><Icon name="check-circle" /> Thanks for reaching out</h1>
          <p>We got your message and will reply to your email as soon as we can — usually within a day or two.</p>
          <div class="order-lookup__actions">
            <RouterLink class="button" to="/collections">Keep shopping</RouterLink>
            <RouterLink class="button button--outline" to="/">Back home</RouterLink>
          </div>
        </template>

        <template v-else>
          <p class="eyebrow">Get in touch</p>
          <h1>Contact us</h1>
          <p>Questions about an order, a custom design, or anything else? Drop us a note and we'll get back to you by email.</p>

          <form class="review-form" @submit.prevent="submit">
            <div class="ts-field">
              <label for="ct-name">Your name</label>
              <input id="ct-name" v-model="name" class="ts-input" type="text" maxlength="80" placeholder="Jane Doe" autocomplete="name" />
            </div>
            <div class="ts-field">
              <label for="ct-email">Email <em>(so we can reply)</em></label>
              <input id="ct-email" v-model="email" class="ts-input" type="email" placeholder="you@example.com" autocomplete="email" />
            </div>
            <div class="ts-field">
              <label for="ct-subject">Subject <em>(optional)</em></label>
              <input id="ct-subject" v-model="subject" class="ts-input" type="text" maxlength="120" placeholder="What's this about?" />
            </div>
            <div class="ts-field">
              <label for="ct-message">Message</label>
              <textarea id="ct-message" v-model="message" class="ts-input review-textarea" maxlength="4000" rows="6" placeholder="How can we help?"></textarea>
            </div>

            <!-- Honeypot: hidden from real users; bots that fill it are silently dropped. -->
            <div class="ct-honeypot" aria-hidden="true">
              <label for="ct-company">Company</label>
              <input id="ct-company" v-model="company" type="text" tabindex="-1" autocomplete="off" />
            </div>

            <p v-if="status === 'error'" class="cart-error">{{ error }}</p>

            <button class="button" type="submit" :disabled="status === 'loading'">
              {{ status === 'loading' ? 'Sending…' : 'Send message' }}
            </button>
          </form>
        </template>
      </section>
    </main>
  </div>
</template>
