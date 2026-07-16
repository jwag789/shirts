import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../server/index.js'

describe('SEO routing edge cases', () => {
  it('returns a real 404 for a nonexistent product slug', async () => {
    const res = await request(app).get('/products/does-not-exist-xyz')
    expect(res.status).toBe(404)
  })

  it('returns a real 404 for a totally bogus path', async () => {
    const res = await request(app).get('/this-page-does-not-exist-xyz')
    expect(res.status).toBe(404)
  })

  it('redirects trailing-slash URLs to the canonical non-slash URL', async () => {
    const res = await request(app).get('/collections/japanese-style/')
    expect(res.status).toBe(301)
    expect(res.headers.location).toBe('/collections/japanese-style')
  })

  it('still serves 200 for genuine client-only routes', async () => {
    const res = await request(app).get('/how-it-works')
    expect(res.status).toBe(200)
  })

  it('still serves 200 for prerendered product pages', async () => {
    const res = await request(app).get('/products/midnight-circuit')
    expect(res.status).toBe(200)
    expect(res.text).toContain('Shrine Walk')
  })
})
