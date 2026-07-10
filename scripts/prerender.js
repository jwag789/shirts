// Post-build step: generates static HTML (title, meta description, canonical,
// Open Graph/Twitter tags, JSON-LD structured data, and crawlable fallback
// content) for every public route, plus sitemap.xml and robots.txt.
//
// The Vue app still mounts over #app and takes over for real visitors —
// this only improves what crawlers and link-preview bots see before JS runs.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { seoPages } from '../src/data/seoPages.js'
import { collections, products, getProductsByCollection } from '../src/data/products.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')

config({ path: path.join(rootDir, '.env.local') })
config({ path: path.join(rootDir, '.env') })

const siteUrl = (process.env.SITE_URL ?? 'http://localhost:4242').replace(/\/$/, '')
const siteName = 'InkSpirit Studio'

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function absUrl(p) {
  if (!p) return null
  if (p.startsWith('http://') || p.startsWith('https://')) return p
  return `${siteUrl}${p.startsWith('/') ? '' : '/'}${p}`
}

function jsonLdScript(data) {
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`
}

function organizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    url: `${siteUrl}/`,
    logo: absUrl('/images/is-logo-2.png'),
  }
}

function breadcrumbLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absUrl(item.url),
    })),
  }
}

function productLd(product) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.longDescription,
    image: [absUrl(product.cardImage)],
    brand: { '@type': 'Brand', name: siteName },
    offers: {
      '@type': 'Offer',
      url: absUrl(`/products/${product.slug}`),
      priceCurrency: 'USD',
      price: String(product.priceValue),
      availability: 'https://schema.org/InStock',
    },
  }
}

function itemListLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: absUrl(item.url),
      name: item.name,
    })),
  }
}

// ---------------------------------------------------------------------------
// page assembly
// ---------------------------------------------------------------------------

// Builds a full HTML document from the Vite-built template by:
// - replacing <title> and meta description
// - injecting canonical, Open Graph, Twitter Card tags, and JSON-LD before </head>
// - replacing the empty #app shell with crawlable fallback content
function renderPage(template, { title, description, canonicalPath, image, type = 'website', jsonLd = [], bodyHtml }) {
  const canonical = absUrl(canonicalPath)
  const ogImage = absUrl(image ?? '/images/is-fav.png')

  let html = template
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content=".*?"\s*\/>/,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    )

  const headExtras = [
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:site_name" content="${escapeHtml(siteName)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${ogImage}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${ogImage}" />`,
    ...jsonLd.map(jsonLdScript),
  ].join('\n    ')

  html = html.replace('</head>', `    ${headExtras}\n  </head>`)
  html = html.replace('<div id="app"></div>', `<div id="app">${bodyHtml}</div>`)

  return html
}

function bullets(items) {
  return `<ul>\n        ${items.map((b) => `<li>${escapeHtml(b)}</li>`).join('\n        ')}\n      </ul>`
}

function linkList(items) {
  return `<ul>\n        ${items.map((i) => `<li><a href="${i.url}">${escapeHtml(i.name)}</a></li>`).join('\n        ')}\n      </ul>`
}

// ---------------------------------------------------------------------------
// per-route fallback content
// ---------------------------------------------------------------------------

function homeBody() {
  return `
      <h1>Wear Art. Stand Out. — Original Graphic T-Shirts</h1>
      <p>InkSpirit Studio designs original, made-to-order graphic t-shirts organized by style: Japanese-inspired artwork, illustrated puns, raw ink art, and custom AI-generated pet portraits.</p>
      <h2>Shop by collection</h2>
      ${linkList(collections.map((c) => ({ url: `/collections/${c.slug}`, name: `${c.name} — ${c.description}` })))}
      <h2>Custom Pet Portraits</h2>
      <p><a href="/pet-portrait">Upload a photo of your dog or cat</a> and turn it into a custom illustrated portrait t-shirt — superhero, viking, pirate, astronaut, samurai, or wizard styles.</p>
      <h2>AI Team Shirt Generator</h2>
      <p><a href="/team-shirt">Design custom team shirts with AI</a> — enter your team name, pick a style, and get authentic sports merchandise for beer leagues, family reunions, company softball, and fantasy football, with per-player names and numbers.</p>
  `
}

function teamShirtBody() {
  return `
      <h1>AI Team Shirt Generator — Custom Team Shirts</h1>
      <p>Design professional-quality custom team shirts in seconds. Enter your team name and an optional subtitle, choose a style, describe a logo concept, pick your colors, and our AI generates authentic team merchandise ready for direct-to-garment printing.</p>
      <h2>Team shirt styles</h2>
      <ul>
        <li>Modern Pro — clean, bold, premium sports branding</li>
        <li>Vintage Sports — distressed, retro athletic apparel</li>
        <li>Varsity — collegiate block lettering</li>
        <li>Streetwear — bold oversized graphics</li>
        <li>Heritage Crest — shield, banner, elegant emblem</li>
        <li>Championship — trophy-inspired premium merch</li>
        <li>Esports — aggressive angular gaming mascot</li>
        <li>Minimal — clean, understated logo</li>
      </ul>
      <p>Perfect for high school sports, college athletics, company softball leagues, beer league teams, fantasy football, family reunions, charity runs, and esports teams. Add each player's name and number, then <a href="/team-shirt">create your team shirt</a>.</p>
  `
}

function collectionsListBody() {
  return `
      <h1>Shop Every Collection</h1>
      <p>Browse all InkSpirit graphic t-shirt collections by artwork style, from Japanese-inspired graphics and ink art to puns and custom pet portraits.</p>
      ${linkList(collections.map((c) => ({ url: `/collections/${c.slug}`, name: `${c.name} — ${c.description}` })))}
  `
}

function collectionBody(collection) {
  const items = getProductsByCollection(collection.slug)
  return `
      <h1>${escapeHtml(collection.name)}</h1>
      <p>${escapeHtml(collection.longDescription)}</p>
      <h2>${escapeHtml(collection.name)} T-Shirts</h2>
      ${linkList(items.map((p) => ({ url: `/products/${p.slug}`, name: `${p.name} — ${p.headline}` })))}
  `
}

function productBody(product) {
  return `
      <h1>${escapeHtml(product.name)}</h1>
      <p>${escapeHtml(product.headline)}</p>
      <p>${escapeHtml(product.longDescription)}</p>
      <p>Price: ${escapeHtml(product.price)} — ${escapeHtml(product.shipping)}</p>
      ${bullets(product.details)}
      <p>Part of the <a href="/collections/${product.collectionSlug}">${escapeHtml(product.collection)}</a> collection.</p>
  `
}

function infoBody(page) {
  const related = []
  if (page.type === 'collection') {
    related.push({ url: `/collections/${page.refSlug}`, label: `Shop the ${escapeHtml(page.refSlug)} collection` })
  } else if (page.type === 'product') {
    const product = products.find((p) => p.slug === page.refSlug)
    related.push({ url: `/products/${page.refSlug}`, label: `View ${escapeHtml(product?.name ?? 'this shirt')}` })
  } else {
    related.push({ url: '/pet-portrait', label: 'Create your custom pet portrait' })
  }

  let extraSection = ''
  if (page.type === 'collection') {
    const items = getProductsByCollection(page.refSlug)
    extraSection = `<h2>Shirts in this collection</h2>${linkList(items.map((p) => ({ url: `/products/${p.slug}`, name: p.name })))}`
  } else if (page.type === 'product') {
    const product = products.find((p) => p.slug === page.refSlug)
    if (product) extraSection = bullets(product.details)
  }

  return `
      <h1>${escapeHtml(page.h1)}</h1>
      <p>${escapeHtml(page.intro)}</p>
      ${bullets(page.bullets)}
      ${page.extra ? `<p>${escapeHtml(page.extra)}</p>` : ''}
      ${extraSection}
      <p><a href="${related[0].url}">${related[0].label}</a></p>
  `
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function writePage(filePath, html) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, html)
}

async function main() {
  const template = await readFile(path.join(distDir, 'index.html'), 'utf8')
  let count = 0

  // Home
  await writePage(
    path.join(distDir, 'index.html'),
    renderPage(template, {
      title: `${siteName} — Original Graphic T-Shirts & Custom Pet Portraits`,
      description:
        'Original, made-to-order graphic t-shirts: Japanese-inspired art, illustrated puns, raw ink designs, and custom AI-generated pet portrait tees.',
      canonicalPath: '/',
      image: '/images/mockups/cherry-horizon-1-lifestyle.jpg',
      jsonLd: [organizationLd(), breadcrumbLd([{ name: 'Home', url: '/' }])],
      bodyHtml: homeBody(),
    }),
  )
  count++

  // Team shirt generator
  await writePage(
    path.join(distDir, 'team-shirt.html'),
    renderPage(template, {
      title: `AI Team Shirt Generator — Custom Team Shirts | ${siteName}`,
      description:
        'Design custom team shirts with AI: enter your team name, pick a style, and get authentic sports merchandise for beer leagues, reunions, softball, and fantasy football.',
      canonicalPath: '/team-shirt',
      jsonLd: [breadcrumbLd([{ name: 'Home', url: '/' }, { name: 'AI Team Shirt Generator', url: '/team-shirt' }])],
      bodyHtml: teamShirtBody(),
    }),
  )
  count++

  // Reviews (public — in sitemap)
  await writePage(
    path.join(distDir, 'reviews.html'),
    renderPage(template, {
      title: `Customer Reviews | ${siteName}`,
      description: 'Real reviews from verified InkSpirit customers on our graphic tees, pet portraits, and custom team shirts.',
      canonicalPath: '/reviews',
      jsonLd: [breadcrumbLd([{ name: 'Home', url: '/' }, { name: 'Reviews', url: '/reviews' }])],
      bodyHtml: `
      <h1>Customer Reviews</h1>
      <p>Real reviews from verified InkSpirit customers. Ordered from us? <a href="/review">Leave a review</a>.</p>
  `,
    }),
  )
  count++

  // Leave a review (utility page — not in sitemap)
  await writePage(
    path.join(distDir, 'review.html'),
    renderPage(template, {
      title: `Leave a Review | ${siteName}`,
      description: 'Share your honest review of your InkSpirit order.',
      canonicalPath: '/review',
      jsonLd: [breadcrumbLd([{ name: 'Home', url: '/' }, { name: 'Leave a Review', url: '/review' }])],
      bodyHtml: `
      <h1>Leave a Review</h1>
      <p>Share your honest review of your InkSpirit order using your order number and email.</p>
  `,
    }),
  )
  count++

  // Order lookup (utility page — not in sitemap)
  await writePage(
    path.join(distDir, 'orders.html'),
    renderPage(template, {
      title: `Track Your Order | ${siteName}`,
      description: 'Look up your InkSpirit order status with your order number and the email you checked out with.',
      canonicalPath: '/orders',
      jsonLd: [breadcrumbLd([{ name: 'Home', url: '/' }, { name: 'Track Your Order', url: '/orders' }])],
      bodyHtml: `
      <h1>Track Your Order</h1>
      <p>Enter your order number and the email you checked out with to see your InkSpirit order status.</p>
      <p><a href="/orders">Look up your order</a></p>
  `,
    }),
  )
  count++

  // My Designs (utility page — not in sitemap)
  await writePage(
    path.join(distDir, 'my-designs.html'),
    renderPage(template, {
      title: `My Designs | ${siteName}`,
      description: 'Every custom AI design you have created on InkSpirit, ready to share or order.',
      canonicalPath: '/my-designs',
      jsonLd: [breadcrumbLd([{ name: 'Home', url: '/' }, { name: 'My Designs', url: '/my-designs' }])],
      bodyHtml: `
      <h1>My Designs</h1>
      <p>Every custom AI team shirt and pet portrait you've created on InkSpirit, ready to share or order.</p>
      <p><a href="/team-shirt">Design a team shirt</a> · <a href="/pet-portrait">Create a pet portrait</a></p>
  `,
    }),
  )
  count++

  // Collections list
  await writePage(
    path.join(distDir, 'collections.html'),
    renderPage(template, {
      title: `Shop All Collections | ${siteName}`,
      description: 'Browse every InkSpirit graphic t-shirt collection: Japanese-style art, funny pun tees, ink art designs, and custom pet portraits.',
      canonicalPath: '/collections',
      jsonLd: [breadcrumbLd([{ name: 'Home', url: '/' }, { name: 'Collections', url: '/collections' }])],
      bodyHtml: collectionsListBody(),
    }),
  )
  count++

  // Each collection
  for (const collection of collections) {
    const items = getProductsByCollection(collection.slug)
    await writePage(
      path.join(distDir, 'collections', `${collection.slug}.html`),
      renderPage(template, {
        title: `${collection.name} T-Shirts | ${siteName}`,
        description: collection.description,
        canonicalPath: `/collections/${collection.slug}`,
        image: collection.heroImage,
        type: 'website',
        jsonLd: [
          breadcrumbLd([
            { name: 'Home', url: '/' },
            { name: 'Collections', url: '/collections' },
            { name: collection.name, url: `/collections/${collection.slug}` },
          ]),
          itemListLd(items.map((p) => ({ url: `/products/${p.slug}`, name: p.name }))),
        ],
        bodyHtml: collectionBody(collection),
      }),
    )
    count++
  }

  // Each product
  for (const product of products) {
    await writePage(
      path.join(distDir, 'products', `${product.slug}.html`),
      renderPage(template, {
        title: `${product.name} — ${product.collection} T-Shirt | ${siteName}`,
        description: `${product.headline} ${product.price}, ${product.shipping}.`.slice(0, 300),
        canonicalPath: `/products/${product.slug}`,
        image: product.cardImage,
        type: 'product',
        jsonLd: [
          breadcrumbLd([
            { name: 'Home', url: '/' },
            { name: product.collection, url: `/collections/${product.collectionSlug}` },
            { name: product.name, url: `/products/${product.slug}` },
          ]),
          productLd(product),
        ],
        bodyHtml: productBody(product),
      }),
    )
    count++
  }

  // SEO landing pages
  for (const page of seoPages) {
    const jsonLd = [breadcrumbLd([{ name: 'Home', url: '/' }, { name: page.h1, url: `/info/${page.slug}` }])]
    if (page.type === 'product') {
      const product = products.find((p) => p.slug === page.refSlug)
      if (product) jsonLd.push(productLd(product))
    }
    await writePage(
      path.join(distDir, 'info', `${page.slug}.html`),
      renderPage(template, {
        title: page.metaTitle,
        description: page.metaDescription,
        canonicalPath: `/info/${page.slug}`,
        image: page.type === 'product' ? products.find((p) => p.slug === page.refSlug)?.cardImage : undefined,
        jsonLd,
        bodyHtml: infoBody(page),
      }),
    )
    count++
  }

  console.log(`Prerendered ${count} pages (home, collections, products, info)`)

  // Sitemap
  const urls = [
    { loc: `${siteUrl}/`, priority: '1.0' },
    { loc: `${siteUrl}/collections`, priority: '0.8' },
    { loc: `${siteUrl}/pet-portrait`, priority: '0.8' },
    { loc: `${siteUrl}/team-shirt`, priority: '0.8' },
    { loc: `${siteUrl}/reviews`, priority: '0.6' },
    ...collections.map((c) => ({ loc: `${siteUrl}/collections/${c.slug}`, priority: '0.7' })),
    ...products.map((p) => ({ loc: `${siteUrl}/products/${p.slug}`, priority: '0.6' })),
    ...seoPages.map((p) => ({ loc: `${siteUrl}/info/${p.slug}`, priority: '0.5' })),
  ]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`
  await writeFile(path.join(distDir, 'sitemap.xml'), sitemap)

  const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`
  await writeFile(path.join(distDir, 'robots.txt'), robots)

  console.log(`Wrote sitemap.xml (${urls.length} URLs) and robots.txt`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
