<script setup>
import { ref } from 'vue'
import { trackEvent } from '../analytics'

// Optional "email me my design" capture shown on a result step. Posts the email
// against the design so the backend can send it right away and (if they don't
// buy) follow up later. Renders nothing until a design has been saved.
const props = defineProps({
  designId: { type: String, default: null },
  kind: { type: String, default: '' },
})

const email = ref('')
const status = ref('idle') // idle | sending | sent | error
const error = ref('')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function submit() {
  const value = email.value.trim()
  if (!EMAIL_RE.test(value)) {
    error.value = 'Please enter a valid email.'
    status.value = 'error'
    return
  }
  if (!props.designId) return

  status.value = 'sending'
  error.value = ''
  try {
    const res = await fetch(`/api/designs/${props.designId}/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: value }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Could not send. Please try again.')
    status.value = 'sent'
    trackEvent('capture_design_email', { kind: props.kind || 'design' })
  } catch (e) {
    error.value = e.message
    status.value = 'error'
  }
}
</script>

<template>
  <div v-if="designId" class="design-capture">
    <p v-if="status === 'sent'" class="design-capture__done">
      <span aria-hidden="true">✓</span> Sent — check your inbox for your design.
    </p>
    <template v-else>
      <label class="design-capture__label" :for="`dc-${designId}`">
        Want to save it? We'll email your design so you don't lose it.
      </label>
      <form class="design-capture__row" @submit.prevent="submit">
        <input
          :id="`dc-${designId}`"
          v-model="email"
          type="email"
          class="design-capture__input"
          placeholder="you@email.com"
          autocomplete="email"
          :disabled="status === 'sending'"
        />
        <button
          class="button button--outline design-capture__btn"
          type="submit"
          :disabled="status === 'sending'"
        >
          {{ status === 'sending' ? 'Sending…' : 'Email it to me' }}
        </button>
      </form>
      <p v-if="status === 'error'" class="design-capture__err">{{ error }}</p>
    </template>
  </div>
</template>
