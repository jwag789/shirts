<script setup>
import { ref } from 'vue'

const props = defineProps({
  source: { type: String, default: 'site' },
})

const email = ref('')
const status = ref('idle') // idle | loading | done | error
const message = ref('')

async function subscribe() {
  if (status.value === 'loading') return
  const value = email.value.trim()
  if (!value) {
    status.value = 'error'
    message.value = 'Please enter your email.'
    return
  }
  status.value = 'loading'
  message.value = ''
  try {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: value, source: props.source }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Something went wrong.')
    status.value = 'done'
    email.value = ''
  } catch (err) {
    status.value = 'error'
    message.value = err.message
  }
}
</script>

<template>
  <div class="email-signup">
    <template v-if="status === 'done'">
      <p class="email-signup__done">✓ You're on the list — thanks!</p>
    </template>
    <template v-else>
      <form class="email-signup__form" @submit.prevent="subscribe">
        <input
          v-model="email"
          class="email-signup__input"
          type="email"
          autocomplete="email"
          placeholder="you@example.com"
          aria-label="Email address"
        />
        <button class="button email-signup__btn" type="submit" :disabled="status === 'loading'">
          {{ status === 'loading' ? 'Joining…' : 'Sign up' }}
        </button>
      </form>
      <p v-if="status === 'error'" class="email-signup__error">{{ message }}</p>
    </template>
  </div>
</template>
