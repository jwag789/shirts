import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // Dummy creds so importing server/index.js (which constructs Stripe/OpenAI
    // clients at load) doesn't throw. NODE_ENV stays 'test' so the production
    // fail-closed webhook path isn't triggered.
    // The VITE_* analytics vars are explicitly blanked here: Vite auto-loads
    // .env.local, so a real VITE_GA_MEASUREMENT_ID configured for production
    // would otherwise leak into analytics.test.js's "no id configured" cases.
    env: {
      STRIPE_SECRET_KEY: 'sk_test_dummy',
      OPENAI_API_KEY: 'sk-openai-dummy',
      FAL_KEY: 'fal-dummy',
      SITE_URL: 'http://localhost:4242',
      VITE_GA_MEASUREMENT_ID: '',
      VITE_PLAUSIBLE_DOMAIN: '',
      VITE_GOOGLE_ADS_ID: '',
      VITE_GOOGLE_ADS_PURCHASE_LABEL: '',
    },
  },
})
