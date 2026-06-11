function setMetaTag(attr, key, content) {
  let tag = document.querySelector(`meta[${attr}="${key}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

export function setDocumentHead({ title, description, path, image }) {
  document.title = title
  setMetaTag('name', 'description', description)
  setMetaTag('property', 'og:title', title)
  setMetaTag('property', 'og:description', description)
  if (path) {
    const url = `${window.location.origin}${path}`
    setMetaTag('property', 'og:url', url)

    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', url)
  }
  if (image) {
    const absImage = image.startsWith('http') ? image : `${window.location.origin}${image}`
    setMetaTag('property', 'og:image', absImage)
    setMetaTag('name', 'twitter:image', absImage)
  }
}
