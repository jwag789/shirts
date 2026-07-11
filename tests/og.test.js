import { describe, it, expect } from 'vitest'
import { replaceMeta, designTitle, mockupSwatch } from '../server/index.js'

const template = `<!doctype html><html><head>
<title>Home</title>
<meta name="description" content="old desc" />
<meta property="og:title" content="old" />
<meta property="og:description" content="old" />
<meta property="og:image" content="https://x/old.png" />
<meta property="og:url" content="https://x/" />
<meta name="twitter:title" content="old" />
<meta name="twitter:description" content="old" />
<meta name="twitter:image" content="https://x/old.png" />
<link rel="canonical" href="https://x/" />
</head><body></body></html>`

describe('replaceMeta (share-page OG rewrite)', () => {
  const out = replaceMeta(template, {
    title: 'Wagner Wolves — Custom Team Shirt',
    description: 'desc',
    image: 'https://fal.media/design123.png',
    url: 'https://inkspirit.studio/d/abc',
  })

  it('rewrites title, og/twitter image, and canonical', () => {
    expect(out).toContain('<title>Wagner Wolves — Custom Team Shirt</title>')
    expect(out).toContain('content="https://fal.media/design123.png"')
    expect(out).toContain('href="https://inkspirit.studio/d/abc"')
    expect(out).not.toContain('https://x/old.png')
  })

  it('escapes special characters in the injected title', () => {
    const evil = replaceMeta(template, { title: '"><script>', description: 'd', image: 'https://i', url: 'https://u' })
    expect(evil).not.toContain('"><script>')
    expect(evil).toContain('&quot;&gt;&lt;script&gt;')
  })
})

describe('designTitle', () => {
  it('names a team design', () => {
    expect(designTitle({ kind: 'team', meta: { teamName: 'Wolves' } })).toBe('Wolves — Custom Team Shirt')
  })
  it('names a pet design with name + style', () => {
    expect(designTitle({ kind: 'pet', meta: { petName: 'Biscuit', style: 'astronaut' } })).toBe(
      'Biscuit the Astronaut — Custom Pet Portrait',
    )
  })
  it('handles missing metadata', () => {
    expect(designTitle({ kind: 'team', meta: {} })).toBe('Custom Team Shirt')
  })
})

describe('mockupSwatch', () => {
  it('nudges white to a visible grey', () => {
    expect(mockupSwatch('#ffffff')).toBe('#ececec')
    expect(mockupSwatch('white')).toBe('#ececec')
  })
  it('passes other colors through', () => {
    expect(mockupSwatch('#1a237e')).toBe('#1a237e')
  })
  it('defaults when empty', () => {
    expect(mockupSwatch('')).toBe('#ececec')
  })
})
