import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_SETTINGS as S } from '../server/config.js'
import { reviewBand, breakEven, evaluateProduct, WEIGHTS } from '../server/scoring.js'

const product = (over = {}) => ({
  title: 'Ortopedik Dik Duruş Korsesi',
  price: 300,
  currency: 'TL',
  ratingCount: 120,
  favoriteCount: 40,
  inStock: true,
  brand: '',
  merchantName: 'Örnek Mağaza',
  crowdCount: 1,
  ...over,
})

test('reviewBand: eşik değerlerine göre bant seçer', () => {
  assert.equal(reviewBand(null, S).band, 'unknown')
  assert.equal(reviewBand(S.reviewLow - 1, S).band, 'new')
  assert.equal(reviewBand(S.reviewLow, S).band, 'ideal')
  assert.equal(reviewBand(S.reviewIdeal, S).band, 'ideal')
  assert.equal(reviewBand(S.reviewIdeal + 1, S).band, 'competitive')
  assert.equal(reviewBand(S.reviewSaturated, S).band, 'competitive')
  assert.equal(reviewBand(S.reviewSaturated + 1, S).band, 'saturated')
})

test('reviewBand: doygun pazar "fail" durumu döndürür', () => {
  assert.equal(reviewBand(5000, S).status, 'fail')
  assert.equal(reviewBand(100, S).status, 'pass')
})

test('breakEven: marj, ROAS ve oran hesaplar', () => {
  const r = breakEven({ sale: 300, cost: 100, shipping: 50, other: 50 })
  assert.equal(r.margin, 100)
  assert.equal(r.roas, 3)
  assert.equal(r.ratio, 3)
})

test('breakEven: eksik veride null, zarar eden üründe roas null döner', () => {
  assert.equal(breakEven({ sale: 300 }), null)
  assert.equal(breakEven(undefined), null)
  assert.equal(breakEven({ sale: 100, cost: 90, shipping: 30 }).roas, null)
})

test('WEIGHTS: toplam 100 puan eder', () => {
  assert.equal(Object.values(WEIGHTS).reduce((a, b) => a + b, 0), 100)
})

test('evaluateProduct: skor 0–100 arasındadır ve 7 adım üretir', () => {
  const r = evaluateProduct(product(), S)
  assert.ok(r.score >= 0 && r.score <= 100)
  assert.equal(r.steps.length, 7)
})

test('evaluateProduct: maksimum satış fiyatını aşan ürün elenir', () => {
  const r = evaluateProduct(product({ price: S.maxSalePrice + 1 }), S)
  assert.equal(r.criteria.price.status, 'fail')
  assert.equal(r.verdict, 'skip')
})

test('evaluateProduct: doygun pazardaki ürün "skip" olur', () => {
  const r = evaluateProduct(product({ ratingCount: S.reviewSaturated + 1 }), S)
  assert.equal(r.criteria.reviews.status, 'fail')
  assert.equal(r.verdict, 'skip')
})

test('evaluateProduct: stokta olmayan ürün aktif satış ve tedarikte başarısız olur', () => {
  const r = evaluateProduct(product({ inStock: false }), S)
  assert.equal(r.criteria.activeSales.status, 'fail')
  assert.equal(r.criteria.supply.status, 'fail')
})

test('evaluateProduct: ihtiyaç kelimesi geçen ürün "sorun çözen" sayılır', () => {
  const r = evaluateProduct(product({ title: 'Ortopedik Boyunluk' }), S)
  assert.equal(r.criteria.pain.status, 'pass')
})

test('evaluateProduct: keyfi ürün sinyali pain kriterinde başarısız olur', () => {
  const r = evaluateProduct(product({ title: 'Dekoratif Biblo Süs' }), S)
  assert.equal(r.criteria.pain.status, 'fail')
})

test('evaluateProduct: hacimli ürün kargo dostu değildir', () => {
  const r = evaluateProduct(product({ title: 'Ahşap Sehpa' }), S)
  assert.equal(r.criteria.compact.status, 'fail')
})

test('evaluateProduct: markasız ürün marka kriterini geçer', () => {
  const r = evaluateProduct(product({ brand: 'Genel Markalar' }), S)
  assert.equal(r.criteria.brand.status, 'pass')
})

test('evaluateProduct: çok değerlendirmeli marka sahibi satıcı markalaşmış sayılır', () => {
  const r = evaluateProduct(
    product({ brand: 'Acme', merchantName: 'Acme Store', ratingCount: S.reviewIdeal + 100 }),
    S,
  )
  assert.equal(r.criteria.brand.status, 'fail')
})

test('evaluateProduct: rakip yoğunluğu eşiklere göre değişir', () => {
  assert.equal(evaluateProduct(product({ crowdCount: 2 }), S).criteria.crowd.status, 'pass')
  assert.equal(evaluateProduct(product({ crowdCount: 4 }), S).criteria.crowd.status, 'warn')
  assert.equal(evaluateProduct(product({ crowdCount: 9 }), S).criteria.crowd.status, 'fail')
  assert.equal(evaluateProduct(product({ crowdCount: null }), S).criteria.crowd.status, 'unknown')
})

test('evaluateProduct: elle girilen başa baş hesabı fiyat adımını belirler', () => {
  const good = evaluateProduct(product({ manual: { calc: { sale: 300, cost: 80, shipping: 40, other: 0 } } }), S)
  assert.equal(good.steps[1].status, 'pass')
  const bad = evaluateProduct(product({ manual: { calc: { sale: 300, cost: 200, shipping: 60, other: 0 } } }), S)
  assert.equal(bad.steps[1].status, 'fail')
})

test('evaluateProduct: elle override kriter durumunu değiştirir', () => {
  const r = evaluateProduct(product({ manual: { criteriaOverrides: { pain: 'fail' } } }), S)
  assert.equal(r.criteria.pain.status, 'fail')
  assert.equal(r.criteria.pain.overridden, true)
})

test('evaluateProduct: 7 adımın hepsi geçilirse "ready" olur', () => {
  const r = evaluateProduct(
    product({
      manual: {
        painPoint: 'Bel ağrısı',
        calc: { sale: 300, cost: 80, shipping: 40, other: 0 },
        baseStoreUrl: 'https://example.com',
        ppspyOk: true,
        storeStructureOk: true,
        metaAdsManual: S.metaAdsTest,
        brandedDomains: {},
        competitorsReviewed: true,
        supplierStatus: 'agreed',
      },
      competitors: { lensTr: { items: [] } },
    }),
    S,
  )
  assert.equal(r.passedSteps, 7)
  assert.equal(r.verdict, 'ready')
})
