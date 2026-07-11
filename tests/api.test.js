import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app, pool, initDb } from '../server/index.js'

// Endpoints that reject before touching the DB — always runnable.
describe('input validation (no DB)', () => {
  it('POST /api/subscribe rejects a bad email', async () => {
    const res = await request(app).post('/api/subscribe').send({ email: 'not-an-email' })
    expect(res.status).toBe(400)
  })

  it('POST /api/reviews rejects an out-of-range rating', async () => {
    const res = await request(app).post('/api/reviews').send({ orderNumber: 'INK-X', email: 'a@b.com', rating: 9, body: 'hi' })
    expect(res.status).toBe(400)
  })

  it('POST /api/reviews rejects an empty body', async () => {
    const res = await request(app).post('/api/reviews').send({ orderNumber: 'INK-X', email: 'a@b.com', rating: 5, body: '' })
    expect(res.status).toBe(400)
  })

  it('POST /api/orders/lookup rejects missing fields', async () => {
    const res = await request(app).post('/api/orders/lookup').send({ orderNumber: 'INK-X' })
    expect(res.status).toBe(400)
  })

  it('POST /api/team-shirt/generate rejects a missing team name', async () => {
    const res = await request(app).post('/api/team-shirt/generate').send({ style: 'varsity' })
    expect(res.status).toBe(400)
  })

  it('POST /api/team-shirt/generate rejects an invalid style', async () => {
    const res = await request(app).post('/api/team-shirt/generate').send({ teamName: 'Wolves', style: 'nope' })
    expect(res.status).toBe(400)
  })

  it('GET /api/designs with no ids returns an empty list', async () => {
    const res = await request(app).get('/api/designs')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ designs: [] })
  })
})

// Full round-trips against a real Postgres. Enable with:
//   TEST_DB=1 DATABASE_URL=postgres://... npx vitest run
const runDb = process.env.TEST_DB === '1'

describe.skipIf(!runDb)('integration (Postgres)', () => {
  beforeAll(async () => {
    await initDb()
    await pool.query('TRUNCATE reviews, subscribers, designs, orders RESTART IDENTITY')
  })

  it('subscribe stores once (idempotent)', async () => {
    const first = await request(app).post('/api/subscribe').send({ email: 'Fan@Example.com', source: 'test' })
    expect(first.status).toBe(200)
    const dup = await request(app).post('/api/subscribe').send({ email: 'fan@example.com' })
    expect(dup.status).toBe(200)
    const { rows } = await pool.query('SELECT email FROM subscribers')
    expect(rows).toHaveLength(1)
    expect(rows[0].email).toBe('fan@example.com')
  })

  it('order lookup is enumeration-safe and reviews require a verified buyer', async () => {
    // seed a fulfilled order
    const order = { id: 'cs_test', orderNumber: 'INK-TEST01', status: 'printify_created', customerEmail: 'buyer@example.com', items: [] }
    await pool.query('INSERT INTO orders (session_id, order_number, status, data) VALUES ($1,$2,$3,$4)', [
      order.id, order.orderNumber, order.status, JSON.stringify(order),
    ])

    // wrong email -> generic 404
    const wrong = await request(app).post('/api/orders/lookup').send({ orderNumber: 'INK-TEST01', email: 'nope@example.com' })
    expect(wrong.status).toBe(404)

    // right email -> found
    const right = await request(app).post('/api/orders/lookup').send({ orderNumber: 'INK-TEST01', email: 'buyer@example.com' })
    expect(right.status).toBe(200)
    expect(right.body.orderNumber).toBe('INK-TEST01')

    // review by a non-buyer is rejected
    const badReview = await request(app).post('/api/reviews').send({ orderNumber: 'INK-TEST01', email: 'nope@example.com', rating: 5, body: 'fake' })
    expect(badReview.status).toBe(404)

    // review by the buyer works, and a second is deduped
    const good = await request(app).post('/api/reviews').send({ orderNumber: 'INK-TEST01', email: 'buyer@example.com', rating: 5, title: 'Great', body: 'Love it' })
    expect(good.status).toBe(200)
    const again = await request(app).post('/api/reviews').send({ orderNumber: 'INK-TEST01', email: 'buyer@example.com', rating: 4, body: 'twice' })
    expect(again.status).toBe(409)

    // it shows up in the published aggregate
    const list = await request(app).get('/api/reviews')
    expect(list.body.summary.count).toBe(1)
    expect(list.body.summary.average).toBe(5)
    expect(list.body.reviews[0].title).toBe('Great')
  })

  it('designs can be fetched by id and in a batch', async () => {
    await pool.query('INSERT INTO designs (id, kind, image_url, data) VALUES ($1,$2,$3,$4)', [
      'dz1', 'team', 'https://fal.media/z.png', JSON.stringify({ teamName: 'Wolves' }),
    ])
    const one = await request(app).get('/api/designs/dz1')
    expect(one.status).toBe(200)
    expect(one.body.kind).toBe('team')
    const batch = await request(app).get('/api/designs?ids=dz1,missing')
    expect(batch.body.designs).toHaveLength(1)
    const miss = await request(app).get('/api/designs/nope')
    expect(miss.status).toBe(404)
  })
})
