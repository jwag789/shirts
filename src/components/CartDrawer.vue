<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useCart } from '../composables/useCart'
import { trackEvent } from '../analytics'
import TrustBadge from './TrustBadge.vue'

const { state, itemCount, subtotal, subtotalLabel, closeCart, updateQuantity, removeItem } = useCart()

const isCheckingOut = ref(false)
const checkoutError = ref('')

const unconnectedItems = computed(() => state.items.filter((item) => !item.isPrintifyConnected))
const canCheckout = computed(() => state.items.length > 0 && unconnectedItems.value.length === 0)

const startCheckout = async () => {
  if (!canCheckout.value || isCheckingOut.value) {
    return
  }

  checkoutError.value = ''
  isCheckingOut.value = true
  trackEvent('begin_checkout', { value: subtotal.value, items: state.items.length })

  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: state.items.map((item) => {
          if (item.isPetPortrait) {
            return {
              isPetPortrait: true,
              style: item.style,
              generatedImageUrl: item.generatedImageUrl,
              size: item.size,
              color: item.color ?? '',
              printifyVariantId: item.printifyVariantId ?? null,
              quantity: item.quantity,
            }
          }
          if (item.isTeamShirt) {
            return {
              isTeamShirt: true,
              generatedImageUrl: item.generatedImageUrl,
              teamName: item.teamName ?? '',
              playerName: item.playerName ?? '',
              playerNumber: item.playerNumber ?? '',
              style: item.style ?? '',
              size: item.size,
              color: item.color ?? '',
              printifyVariantId: item.printifyVariantId ?? null,
              quantity: item.quantity,
            }
          }
          return {
            productSlug: item.productSlug,
            size: item.size,
            quantity: item.quantity,
          }
        }),
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error ?? 'Checkout could not be started.')
    }

    window.location.href = data.url
  } catch (error) {
    checkoutError.value = error.message
    isCheckingOut.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <transition name="cart-fade">
      <div v-if="state.isOpen" class="cart-overlay" @click="closeCart"></div>
    </transition>

    <transition name="cart-slide">
      <aside v-if="state.isOpen" class="cart-drawer" aria-label="Shopping cart">
        <div class="cart-drawer__header">
          <div>
            <p class="eyebrow">Your bag</p>
            <h2>{{ itemCount }} item<span v-if="itemCount !== 1">s</span></h2>
          </div>
          <button class="cart-close" type="button" aria-label="Close cart" @click="closeCart">
            ×
          </button>
        </div>

        <div v-if="state.items.length" class="cart-drawer__body">
          <article v-for="item in state.items" :key="item.id" class="cart-item">
            <div class="cart-item__art">
              <img :src="item.image" :alt="item.name" />
            </div>

            <div class="cart-item__copy">
              <div class="cart-item__title">
                <div>
                  <h3>{{ item.name }}</h3>
                  <p>{{ item.collection }}</p>
                </div>
                <strong>{{ item.price }}</strong>
              </div>

              <div class="cart-item__meta">
                <span>Size {{ item.size }}</span>
                <span v-if="item.color"> · {{ item.color }}</span>
              </div>

              <div class="cart-item__actions">
                <div class="cart-stepper">
                  <button type="button" @click="updateQuantity(item.id, item.quantity - 1)">−</button>
                  <span>{{ item.quantity }}</span>
                  <button type="button" @click="updateQuantity(item.id, item.quantity + 1)">+</button>
                </div>

                <button class="cart-remove" type="button" @click="removeItem(item.id)">
                  Remove
                </button>
              </div>
            </div>
          </article>
        </div>

        <div v-else class="cart-empty">
          <p class="eyebrow">Nothing here yet</p>
          <h2>Your bag is empty.</h2>
          <p>Browse the collections and add a shirt to get started.</p>
        </div>

        <div class="cart-drawer__footer">
          <div v-if="unconnectedItems.length" class="cart-warning">
            <strong>Not ready for checkout:</strong>
            <span>{{ unconnectedItems.map((item) => item.name).join(', ') }}</span>
          </div>
          <p v-if="checkoutError" class="cart-error">{{ checkoutError }}</p>
          <div class="cart-total">
            <span>Subtotal</span>
            <strong>{{ subtotalLabel }}</strong>
          </div>
          <button class="button" type="button" :disabled="!canCheckout || isCheckingOut" @click="startCheckout">
            {{ isCheckingOut ? 'Opening checkout...' : 'Checkout' }}
          </button>
          <TrustBadge />
          <p class="cart-consent">
            By checking out you agree to our
            <RouterLink to="/terms" @click="closeCart">Terms</RouterLink> and
            <RouterLink to="/privacy" @click="closeCart">Privacy Policy</RouterLink>.
          </p>
        </div>
      </aside>
    </transition>
  </Teleport>
</template>
