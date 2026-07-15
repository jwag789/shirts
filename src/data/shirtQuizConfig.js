// Fragment lookup tables for the "Design My Shirt" quiz. Each tile/swatch
// option maps to a short, pre-written prompt fragment — never raw user text —
// so the assembled prompt stays predictable and easy to tune without touching
// any UI or generation logic.

export const SUBJECT_TYPES = [
  { key: 'animal', label: 'Animal / Pet', fragment: 'pet/animal subject', placeholder: 'e.g. golden retriever, fox, my cat Milo' },
  { key: 'object', label: 'Object', fragment: 'inanimate object subject', placeholder: 'e.g. vintage camera, skateboard, coffee cup' },
  { key: 'person', label: 'Person / Character', fragment: 'person or character subject', placeholder: 'e.g. a ninja, my grandma, a superhero' },
  { key: 'text', label: 'Text-only', fragment: 'typographic, text-only subject', placeholder: 'e.g. "Rise & Grind", your name or motto' },
  { key: 'abstract', label: 'Abstract / Pattern', fragment: 'abstract pattern subject', placeholder: 'e.g. geometric shapes, ocean waves, mandala' },
]

export const STYLES = [
  { key: 'streetwear', label: 'Streetwear / Bold', fragment: 'bold streetwear-inspired' },
  { key: 'minimalist', label: 'Minimalist Line Art', fragment: 'minimalist line-art' },
  { key: 'retro', label: 'Retro / Vintage', fragment: 'retro vintage-inspired' },
  { key: 'cartoon', label: 'Cartoon / Playful', fragment: 'playful cartoon-style' },
  { key: 'grunge', label: 'Grunge / Distressed', fragment: 'gritty grunge distressed' },
]

export const MOODS = [
  { key: 'funny', label: 'Funny', fragment: 'funny, lighthearted' },
  { key: 'cool', label: 'Cool / Edgy', fragment: 'cool, edgy' },
  { key: 'cute', label: 'Cute', fragment: 'cute, endearing' },
  { key: 'badass', label: 'Badass', fragment: 'badass, fierce' },
  { key: 'chill', label: 'Chill', fragment: 'chill, laid-back' },
]

export const PALETTES = [
  { key: 'two-color', label: '2-Color', fragment: 'bold two-color', swatches: ['#111111', '#c62828'] },
  { key: 'vintage-wash', label: 'Vintage Wash', fragment: 'faded vintage-wash', swatches: ['#c9b48a', '#8a6f4d'] },
  { key: 'neon-pop', label: 'Neon Pop', fragment: 'vibrant neon-pop', swatches: ['#ff2ec4', '#39ff88'] },
  { key: 'black-white', label: 'Black & White', fragment: 'high-contrast black-and-white', swatches: ['#111111', '#ffffff'] },
  { key: 'earth-tones', label: 'Earth Tones', fragment: 'warm earth-tone', swatches: ['#7c5c3e', '#9c8a54'] },
]

const SUBJECT_DETAIL_MAX_LENGTH = 40

// Combines the four fixed fragment choices with the one free-typed field
// (subject detail) into the final image-gen prompt. Throws on missing/invalid
// keys so both the API route and the UI fail loudly on bad input rather than
// silently generating a malformed prompt.
export function assemblePrompt({ subjectType, subjectDetail, style, mood, palette }) {
  const subjectTypeDef = SUBJECT_TYPES.find((s) => s.key === subjectType)
  const styleDef = STYLES.find((s) => s.key === style)
  const moodDef = MOODS.find((m) => m.key === mood)
  const paletteDef = PALETTES.find((p) => p.key === palette)

  if (!subjectTypeDef) throw new Error('Please choose a subject type.')
  if (!styleDef) throw new Error('Please choose a style.')
  if (!moodDef) throw new Error('Please choose a mood.')
  if (!paletteDef) throw new Error('Please choose a color palette.')

  const detail = String(subjectDetail ?? '').trim().slice(0, SUBJECT_DETAIL_MAX_LENGTH)
  if (!detail) throw new Error('Please describe your subject.')

  return `A ${styleDef.fragment} t-shirt graphic design of a ${detail} (${subjectTypeDef.fragment}), ${moodDef.fragment} tone, ${paletteDef.fragment} palette, centered front-chest composition, transparent background, bold clean linework, screen-print ready`
}
