export const fmtNum = (n, d = 0) => (n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('tr-TR', { maximumFractionDigits: d }))

export const fmtTL = (n) =>
  n == null ? '—' : `${Number(n).toLocaleString('tr-TR', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 })} TL`

export const fmtPrice = (n, currency) => {
  if (n == null) return '—'
  if (!currency || /^(TL|TRY|₺)$/i.test(currency)) return fmtTL(n)
  return `${Number(n).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ${currency}`
}

export const fmtCompact = (n) => {
  if (n == null) return '—'
  if (n >= 1e6) return `${(n / 1e6).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} Mn`
  if (n >= 1e4) return `${(n / 1e3).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} B`
  return fmtNum(n)
}

export function timeAgo(iso) {
  if (!iso) return '—'
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 45) return 'az önce'
  if (s < 3600) return `${Math.round(s / 60)} dk önce`
  if (s < 86400) return `${Math.round(s / 3600)} sa önce`
  if (s < 86400 * 30) return `${Math.round(s / 86400)} gün önce`
  return new Date(iso).toLocaleDateString('tr-TR')
}

export const VERDICT = {
  ready: { label: '7/7 Hazır', tone: 'gold' },
  strong: { label: 'Güçlü aday', tone: 'ok' },
  consider: { label: 'Değerlendir', tone: 'warn' },
  weak: { label: 'Zayıf', tone: 'muted' },
  skip: { label: 'Geç', tone: 'bad' },
}

export const STEP_STATUS = {
  pass: { label: 'Uygun', tone: 'ok' },
  warn: { label: 'Dikkat', tone: 'warn' },
  fail: { label: 'Uygun değil', tone: 'bad' },
  pending: { label: 'Bekliyor', tone: 'muted' },
  unknown: { label: 'Bilinmiyor', tone: 'muted' },
}

export const PRODUCT_STATUS = {
  new: { label: 'Yeni', tone: 'brand' },
  watching: { label: 'Takipte', tone: 'info' },
  approved: { label: 'Onaylandı', tone: 'ok' },
  rejected: { label: 'Elendi', tone: 'bad' },
}

export const BAND = {
  new: { label: '0–20 · Doğrulanmamış', short: 'Yeni', tone: 'warn' },
  ideal: { label: '20–500 · İdeal', short: 'İdeal', tone: 'ok' },
  competitive: { label: '500–3.000 · Rekabet', short: 'Rekabet', tone: 'warn' },
  saturated: { label: '3.000+ · Doygun', short: 'Doygun', tone: 'bad' },
  unknown: { label: 'Bilinmiyor', short: '—', tone: 'muted' },
}

export const CRITERIA = [
  { key: 'price', icon: '💰', title: 'Tedarik fiyatı düşük' },
  { key: 'activeSales', icon: '🛒', title: 'Türkiye’de aktif satış' },
  { key: 'pain', icon: '🎯', title: 'Sorun çözen ürün' },
  { key: 'compact', icon: '📦', title: 'Küçük, kargo dostu' },
  { key: 'supply', icon: '🔄', title: 'Tedarik kolay' },
  { key: 'reviews', icon: '⭐', title: 'Yorum sayısı analizi' },
  { key: 'brand', icon: '🏷️', title: 'Markalaşma riski' },
  { key: 'crowd', icon: '👥', title: 'Trendyol rakip yoğunluğu' },
]

export const WEIGHTS = { price: 20, reviews: 20, pain: 15, brand: 15, crowd: 10, compact: 10, activeSales: 5, supply: 5 }

export const JOB_TYPE = {
  search: 'Trendyol ürün taraması',
  'trendyol-competitors': 'Trendyol rakip taraması',
  lens: 'Google Lens rakip taraması',
  meta: 'Meta Ads kontrolü',
  enrich: 'Satıcı bilgisi',
}

export const sellerName = (p) => p?.merchantName || (p?.merchantId ? `Satıcı #${p.merchantId}` : '—')

export const fmtUsd = (n, digits) => {
  if (n == null || Number.isNaN(Number(n))) return '—'
  const d = digits ?? (Math.abs(n) < 0.1 ? 3 : 2)
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`
}

export const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export const brandFromDomain = (domain) => {
  const base = String(domain || '').split('.')[0]
  return base.replace(/^shop/, '').replace(/(shop|store|official|baby|co)$/i, '') || base
}
