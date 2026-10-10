// Roasell dokümanındaki 6 ürün kriteri + 7 adımlı süreç puanlaması.
import { matchKeywords } from './text.js'

const PTS = { pass: 1, warn: 0.5, unknown: 0.5, pending: 0, fail: 0 }
export const WEIGHTS = { price: 20, reviews: 20, pain: 15, brand: 15, crowd: 10, compact: 10, activeSales: 5, supply: 5 }

const GENERIC_BRAND = /^(genel markalar|genel|no ?name|noname|oem|markasız|diğer|diger|generic|other|belirtilmemiş|muadil)$/i
const normBrand = (s) => String(s || '').toLocaleLowerCase('tr').replace(/[^\p{L}\p{N}]/gu, '')
const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('tr-TR', { maximumFractionDigits: 2 }))

export function reviewBand(count, s) {
  if (count == null) return { band: 'unknown', status: 'unknown', label: 'Bilinmiyor', detail: 'Değerlendirme sayısı alınamadı' }
  if (count < s.reviewLow) return { band: 'new', status: 'warn', label: 'Dikkatli değerlendir', detail: `${fmt(count)} değerlendirme — ürün yeni veya talep düşük, doğrulanmamış` }
  if (count <= s.reviewIdeal) return { band: 'ideal', status: 'pass', label: 'İdeal aralık', detail: `${fmt(count)} değerlendirme — talep var, pazar henüz doygun değil` }
  if (count <= s.reviewSaturated) return { band: 'competitive', status: 'warn', label: 'Rakip analizi yap', detail: `${fmt(count)} değerlendirme — talep güçlü ama rekabet var` }
  return { band: 'saturated', status: 'fail', label: 'Bu ürünü geç', detail: `${fmt(count)} değerlendirme — pazar doygun` }
}

export function breakEven(calc) {
  const sale = Number(calc?.sale) || 0
  const cost = Number(calc?.cost) || 0
  if (!sale || !cost) return null
  const shipping = Number(calc?.shipping) || 0
  const other = Number(calc?.other) || 0
  const margin = sale - cost - shipping - other
  return { margin, roas: margin > 0 ? sale / margin : null, ratio: sale / cost }
}

function criteria(p, s) {
  const m = p.manual || {}
  const ov = m.criteriaOverrides || {}
  const text = [p.title, p.category].filter(Boolean).join(' ')
  const out = {}

  // 💰 Tedarik fiyatı düşük olmalı
  const estCost = p.price != null ? p.price * (1 - s.bulkDiscountPct / 100) : null
  const foreignCurrency = p.currency && !/^(TL|TRY|₺)$/i.test(p.currency.trim())
  if (p.price == null) out.price = { status: 'unknown', detail: 'Fiyat alınamadı' }
  else if (foreignCurrency) out.price = { status: 'warn', detail: `Para birimi ${p.currency} — aktör TR proxy ile çalışmamış olabilir` }
  else if (p.price > s.maxSalePrice) out.price = { status: 'fail', detail: `${fmt(p.price)} TL > maks. ${fmt(s.maxSalePrice)} TL` }
  else if (estCost < s.costMin || estCost > s.costMax)
    out.price = { status: 'warn', detail: `Satış ${fmt(p.price)} TL uygun; tahmini toplu alım ~${fmt(estCost)} TL (${s.costMin}–${s.costMax} TL dışında)` }
  else out.price = { status: 'pass', detail: `${fmt(p.price)} TL ≤ ${fmt(s.maxSalePrice)} TL · tahmini toplu alım ~${fmt(estCost)} TL` }

  // ⭐ Yorum sayısı analizi
  const rb = reviewBand(p.ratingCount, s)
  out.reviews = { status: rb.status, detail: rb.detail, band: rb.band, label: rb.label }

  // 🛒 Türkiye'de aktif satışı olmalı
  if (p.inStock === false) out.activeSales = { status: 'fail', detail: 'Stokta yok' }
  else if ((p.ratingCount || 0) > 0 || (p.favoriteCount || 0) > 0)
    out.activeSales = { status: 'pass', detail: `Trendyol’da satışta · ${fmt(p.ratingCount || 0)} değerlendirme · ${fmt(p.favoriteCount || 0)} favori` }
  else out.activeSales = { status: 'warn', detail: 'Satış sinyali (değerlendirme/favori) yok' }

  // 🎯 Sorun çözen ürün olmalı
  const pain = matchKeywords(text, s.painKeywords, 'prefix')
  const whim = matchKeywords(text, s.whimKeywords, 'prefix')
  if (m.painPoint) out.pain = { status: 'pass', detail: `Sorun: ${m.painPoint}`, keywords: pain }
  else if (pain.length) out.pain = { status: 'pass', detail: `İhtiyaç sinyali: ${pain.slice(0, 4).join(', ')}`, keywords: pain }
  else if (whim.length) out.pain = { status: 'fail', detail: `Keyfi ürün sinyali: ${whim.slice(0, 3).join(', ')}`, keywords: [] }
  else out.pain = { status: 'warn', detail: 'Otomatik tespit edilemedi — pain point’i elle yazın', keywords: [] }

  // 📦 Hacmi küçük, kargo dostu olmalı
  const bulky = matchKeywords(text, s.bulkyKeywords, 'exact')
  const fragile = matchKeywords(text, s.fragileKeywords, 'exact')
  if (bulky.length) out.compact = { status: 'fail', detail: `Hacimli ürün sinyali: ${bulky.join(', ')}` }
  else if (fragile.length) out.compact = { status: 'warn', detail: `Kırılgan olabilir: ${fragile.join(', ')}` }
  else out.compact = { status: 'pass', detail: 'Hacimli/kırılgan ürün sinyali yok' }

  // 🔄 Tedarik süreci kolay olmalı
  if (p.inStock === false) out.supply = { status: 'fail', detail: 'Stok sürekliliği yok' }
  else if (p.merchantName || p.merchantId)
    out.supply = { status: 'pass', detail: `Satıcı: ${p.merchantName || `#${p.merchantId}`}${p.merchantLocation ? ` · ${p.merchantLocation}` : ''}` }
  else out.supply = { status: 'warn', detail: 'Satıcı bilgisi alınamadı' }

  // 🏷️ Markalaşma riski — markasız (white-label) ürün kendi markanla satılabilir; marka sahibinin
  // kendisi satıyorsa ve çok değerlendirme almışsa "markalaşmış rakip" demektir (Madde 6).
  {
    const b = normBrand(p.brand)
    const m = normBrand(p.merchantName)
    const owner = !!p.officialSeller || (b && m && (b.includes(m) || m.includes(b)))
    if (!p.brand || GENERIC_BRAND.test(p.brand.trim())) out.brand = { status: 'pass', detail: 'Markasız (white-label) — kendi markanla satılabilir' }
    else if (owner && (p.ratingCount || 0) > s.reviewIdeal)
      out.brand = { status: 'fail', detail: `Markalaşmış: ${p.brand} — ${p.officialSeller ? 'resmi satıcı rozeti' : 'marka sahibi satıyor'}, ${fmt(p.ratingCount)} değerlendirme` }
    else if (owner) out.brand = { status: 'warn', detail: `${p.brand} — ${p.officialSeller ? 'resmi satıcı rozeti' : 'marka sahibi satıyor'}` }
    else out.brand = { status: 'warn', detail: `Marka: ${p.brand} — logo/PR var mı kontrol et` }
  }

  // 👥 Trendyol rakip yoğunluğu — taranan ürünlerde aynı ürünü satan farklı satıcı sayısı
  if (p.crowdCount == null) out.crowd = { status: 'unknown', detail: 'Henüz hesaplanmadı' }
  else if (p.crowdCount <= 2) out.crowd = { status: 'pass', detail: `${p.crowdCount} başka satıcı benzer ürünü satıyor (taranan ürünlerde)` }
  else if (p.crowdCount <= 5) out.crowd = { status: 'warn', detail: `${p.crowdCount} başka satıcı benzer ürünü satıyor` }
  else out.crowd = { status: 'fail', detail: `${p.crowdCount} başka satıcı — rekabet yoğun` }

  for (const [k, v] of Object.entries(ov)) if (out[k] && v) out[k] = { ...out[k], status: v, overridden: true }
  return { out, estCost }
}

function steps(p, s, c) {
  const m = p.manual || {}
  const ov = m.stepOverrides || {}
  const be = breakEven(m.calc)
  const res = []

  // 1 — Yorumlama
  {
    const st = c.reviews.status === 'fail' ? 'fail' : c.pain.status === 'pass' && c.reviews.status === 'pass' ? 'pass' : c.pain.status === 'fail' ? 'fail' : 'warn'
    res.push({ n: 1, key: 'interpret', title: 'Yorumlama', status: st, detail: `${c.pain.detail} · ${c.reviews.label}` })
  }
  // 2 — Fiyat değerlendirmesi
  {
    let st = c.price.status
    let detail = c.price.detail
    if (be) {
      const inCost = Number(m.calc.cost) >= s.costMin && Number(m.calc.cost) <= s.costMax
      const okRoas = be.roas != null && be.roas <= s.breakEvenMax
      st = p.price != null && p.price > s.maxSalePrice ? 'fail' : okRoas && inCost ? 'pass' : okRoas ? 'warn' : 'fail'
      detail = `Başa baş ROAS ${be.roas ? be.roas.toFixed(2) : '∞'} (hedef ≤ ${s.breakEvenMax}) · tedarik ${fmt(m.calc.cost)} TL`
    }
    res.push({ n: 2, key: 'price', title: 'Fiyat değerlendirmesi', status: st === 'unknown' ? 'pending' : st, detail })
  }
  // 3 — Baz alınacak mağaza (yurt dışı referans)
  {
    const cands = (p.competitors?.lensGlobal?.items || []).filter((i) => i.kind === 'store' && !i.isTurkish)
    const st = m.baseStoreUrl ? 'pass' : cands.length ? 'warn' : 'pending'
    const detail = m.baseStoreUrl ? m.baseStoreUrl : cands.length ? `${new Set(cands.map((c) => c.domain)).size} yurt dışı mağaza adayı bulundu — birini seçin` : 'Google Lens (global) taraması yapılmadı'
    res.push({ n: 3, key: 'baseStore', title: 'Baz alınacak mağaza', status: st, detail })
  }
  // 4 — İlk tıklama yorumu (PPSPY + mağaza yapısı)
  {
    const a = m.ppspyOk
    const b = m.storeStructureOk
    const st = a === true && b === true ? 'pass' : a === false || b === false ? 'fail' : a || b ? 'warn' : 'pending'
    res.push({ n: 4, key: 'firstClick', title: 'İlk tıklama yorumu', status: st, detail: `PPSPY ${a === true ? '✓' : a === false ? '✗' : '—'} · Mağaza yapısı ${b === true ? '✓' : b === false ? '✗' : '—'}` })
  }
  // 5 — Kreatif kontrolü (Meta Ads Library)
  {
    const chk = (p.metaChecks || [])[0]
    let st = 'pending'
    let detail = 'Meta Ads Library kontrolü yapılmadı'
    if (m.metaAdsManual != null && m.metaAdsManual !== '') {
      const n = Number(m.metaAdsManual)
      st = n >= s.metaAdsTest ? 'pass' : 'fail'
      detail = `${fmt(n)} aktif reklam (manuel) · ${n >= s.metaAdsScale ? 'ölçek sinyali' : n >= s.metaAdsTest ? 'test ediyor' : 'eşik altı'}`
    } else if (chk) {
      const n = chk.count
      st = n >= s.metaAdsTest ? 'pass' : 'fail'
      detail = `“${chk.query}”: ${chk.capped ? '≥' : '~'}${fmt(n)} aktif reklam · ${n >= s.metaAdsScale ? 'ölçek sinyali' : n >= s.metaAdsTest ? 'test ediyor' : 'eşik altı — geç'}`
    }
    res.push({ n: 5, key: 'creative', title: 'Kreatif kontrolü', status: st, detail })
  }
  // 6 — TR'de 2'den fazla (markalaşmış) rakip var mı?
  {
    const lens = p.competitors?.lensTr
    const branded = Object.entries(m.brandedDomains || {}).filter(([, v]) => v).length
    let st = 'pending'
    let detail = 'Google Lens (TR) taraması yapılmadı'
    if (lens) {
      const stores = new Set(lens.items.filter((i) => i.kind === 'store').map((i) => i.domain))
      if (branded > s.brandedCompetitorLimit) {
        st = 'fail'
        detail = `${branded} markalaşmış rakip (> ${s.brandedCompetitorLimit}) — riskli`
      } else if (m.competitorsReviewed || stores.size <= s.brandedCompetitorLimit) {
        st = 'pass'
        detail = `${branded} markalaşmış rakip · ${stores.size} bağımsız mağaza bulundu`
      } else {
        st = 'warn'
        detail = `${stores.size} bağımsız mağaza bulundu — markalaşmış olanları işaretleyin`
      }
    }
    res.push({ n: 6, key: 'trCompetitors', title: 'TR rakip analizi', status: st, detail })
  }
  // 7 — Tedarikçi ile iletişim
  {
    const map = { agreed: ['pass', 'Tedarikçi ile anlaşıldı'], contacted: ['warn', 'Mesaj gönderildi, dönüş bekleniyor'], rejected: ['fail', 'Tedarikçi olumsuz'] }
    const seller = p.merchantName || (p.merchantId ? `#${p.merchantId}` : null)
    const [st, detail] = map[m.supplierStatus] || ['pending', seller ? `Satıcı: ${seller} — iletişime geçilmedi` : 'İletişime geçilmedi']
    res.push({ n: 7, key: 'supplier', title: 'Tedarikçi anlaşması', status: st, detail })
  }

  for (const step of res) if (ov[step.n]) Object.assign(step, { status: ov[step.n], overridden: true })
  return { list: res, breakEven: be }
}

export function evaluateProduct(p, s) {
  const { out: c, estCost } = criteria(p, s)
  const score = Math.round(Object.entries(WEIGHTS).reduce((acc, [k, w]) => acc + w * (PTS[c[k].status] ?? 0.5), 0))
  const st = steps(p, s, c)
  const passed = st.list.filter((x) => x.status === 'pass').length
  const hardFail = c.price.status === 'fail' || c.reviews.status === 'fail' || st.list.some((x) => (x.n === 6 || x.n === 5) && x.status === 'fail')
  const anyFail = Object.values(c).some((x) => x.status === 'fail')
  const verdict =
    passed === 7 ? 'ready' :
    hardFail ? 'skip' :
    score >= 85 && !anyFail && c.reviews.status === 'pass' ? 'strong' :
    score >= 60 && !anyFail ? 'consider' : 'weak'
  return { score, verdict, criteria: c, steps: st.list, passedSteps: passed, estCost, breakEven: st.breakEven }
}
