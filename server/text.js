// Türkçe metin yardımcıları: normalize, anahtar kelime eşleme, başlık benzerliği.

export const normalizeText = (s) =>
  String(s || '')
    .toLocaleLowerCase('tr')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

export const tokens = (s) => normalizeText(s).split(' ').filter(Boolean)

/**
 * prefix: "ağrı" → "ağrısı", "ağrılı" ile eşleşir (sorun/ihtiyaç kelimeleri için)
 * exact : "masa" → yalnızca "masa" (masaj ile karışmasın diye hacimli ürün kelimeleri için)
 */
export function matchKeywords(text, keywords = [], mode = 'prefix') {
  const norm = ` ${normalizeText(text)} `
  const toks = norm.trim().split(' ')
  const hits = []
  for (const raw of keywords) {
    const kw = normalizeText(raw)
    if (!kw) continue
    const hit = kw.includes(' ')
      ? norm.includes(mode === 'prefix' ? ` ${kw}` : ` ${kw} `)
      : toks.some((t) => (mode === 'prefix' ? t.startsWith(kw) : t === kw))
    if (hit && !hits.includes(raw.trim())) hits.push(raw.trim())
  }
  return hits
}

const STOP = new Set(
  (
    've ile için icin adet li lı lu lü set seti takım yeni model orijinal original özel ozel ürün urun the for and with ' +
    'x cm mm ml gr kg lt pcs paket siyah beyaz kırmızı mavi yeşil gri pembe lacivert mor sarı turuncu kahverengi bej krem ' +
    'kadın erkek unisex çocuk yetişkin büyük küçük orta boy renk renkli'
  ).split(' '),
)

// Türkçe ekler için kaba kök: ilk 5 harf ("yastık" / "yastığı" → "yastı")
const stem = (t) => (t.length > 5 ? t.slice(0, 5) : t)

export function titleStems(title, extraStop = []) {
  const extra = new Set(extraStop.flatMap((s) => tokens(s)))
  return new Set(tokens(title).filter((t) => t.length > 1 && !/^\d+$/.test(t) && !STOP.has(t) && !extra.has(t)).map(stem))
}

/** Dice katsayısı (0–1) — marka adları hariç başlık benzerliği */
export function similarity(a, b, { brandA, brandB } = {}) {
  const A = titleStems(a, [brandA, brandB].filter(Boolean))
  const B = titleStems(b, [brandA, brandB].filter(Boolean))
  if (!A.size || !B.size) return 0
  let inter = 0
  for (const t of A) if (B.has(t)) inter++
  return (2 * inter) / (A.size + B.size)
}

export const slugify = (s) =>
  String(s || '')
    .toLocaleLowerCase('tr')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
