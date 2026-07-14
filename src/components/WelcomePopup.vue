<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { isWelcomeSuppressed, writeWelcomeState } from '../composables/welcomePopup.js'
import Icon from './Icon.vue'

const SHOW_DELAY_MS = 3500

const open = ref(false)
const email = ref('')
const status = ref('idle') // idle | loading | done | error
const message = ref('')

let timer = null

function lockScroll() {
  document.body.style.overflow = 'hidden'
}
function unlockScroll() {
  document.body.style.overflow = ''
}

function close() {
  open.value = false
  unlockScroll()
  // A plain dismissal hides it for an hour; a successful signup already stored 'done'.
  if (status.value !== 'done') writeWelcomeState({ type: 'dismissed', at: Date.now() })
}

function onKeydown(e) {
  if (e.key === 'Escape' && open.value) close()
}

async function submit() {
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
      body: JSON.stringify({ email: value, source: 'welcome-popup' }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Something went wrong.')
    status.value = 'done'
    writeWelcomeState({ type: 'done', at: Date.now() })
  } catch (err) {
    status.value = 'error'
    message.value = err.message
  }
}

onMounted(() => {
  if (isWelcomeSuppressed()) return
  timer = setTimeout(() => {
    open.value = true
    lockScroll()
  }, SHOW_DELAY_MS)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
  window.removeEventListener('keydown', onKeydown)
  unlockScroll()
})
</script>

<template>
  <transition name="welcome-fade">
    <div v-if="open" class="welcome-pop" role="dialog" aria-modal="true" aria-label="20% off your first order">
      <div class="welcome-pop__backdrop" @click="close"></div>

      <div class="welcome-pop__card">
        <button class="welcome-pop__close" type="button" aria-label="Close" @click="close">&times;</button>

        <div class="welcome-pop__art">
          <img src="/images/coupon.jpg" alt="Welcome to InkSpirit — 20% off your first order" />

          <!-- Custom form, overlaid to cover the image's placeholder input area -->
          <div class="welcome-pop__panel">
            <template v-if="status === 'done'">
              <p class="welcome-pop__done"><Icon name="check-circle" /> You're in!</p>
              <p class="welcome-pop__donesub">Check your inbox — your 20% off code is on its way.</p>
            </template>
            <form v-else class="welcome-pop__form" @submit.prevent="submit">
              <input
                v-model="email"
                class="welcome-pop__input"
                type="email"
                autocomplete="email"
                placeholder="you@example.com"
                aria-label="Email address"
              />
              <button class="welcome-pop__btn" type="submit" :disabled="status === 'loading'">
                {{ status === 'loading' ? 'Joining…' : 'Join Newsletter' }}
              </button>
              <p v-if="status === 'error'" class="welcome-pop__error">{{ message }}</p>
              <p class="welcome-pop__fine">No spam. Unsubscribe anytime.</p>
            </form>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>
