// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ReviewStars from '../src/components/ReviewStars.vue'
import EmailSignup from '../src/components/EmailSignup.vue'

describe('ReviewStars', () => {
  it('fills the rounded number of stars', () => {
    const w = mount(ReviewStars, { props: { rating: 4 } })
    expect(w.findAll('.review-stars-display__star')).toHaveLength(5)
    expect(w.findAll('.review-stars-display__star.is-on')).toHaveLength(4)
  })

  it('rounds 4.7 up to 5 filled', () => {
    const w = mount(ReviewStars, { props: { rating: 4.7 } })
    expect(w.findAll('.review-stars-display__star.is-on')).toHaveLength(5)
  })
})

describe('EmailSignup', () => {
  it('validates a blank email client-side without calling the API', async () => {
    const w = mount(EmailSignup, { props: { source: 'test' } })
    await w.find('form').trigger('submit.prevent')
    expect(w.find('.email-signup__error').exists()).toBe(true)
  })
})
