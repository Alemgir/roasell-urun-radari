import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeText, matchKeywords, similarity, slugify } from '../server/text.js'

test('normalizeText: Türkçe karakterlerle küçük harfe çevirir ve noktalamayı temizler', () => {
  assert.equal(normalizeText('  IŞIK, İyi!  '), 'ışık iyi')
})

test('matchKeywords: prefix modu ekli kelimeleri yakalar', () => {
  assert.deepEqual(matchKeywords('Bel ağrısı için destek', ['ağrı']), ['ağrı'])
})

test('matchKeywords: exact modu "masaj" ile "masa" karışmasın diye tam eşleşme arar', () => {
  assert.deepEqual(matchKeywords('Boyun masaj aleti', ['masa'], 'exact'), [])
  assert.deepEqual(matchKeywords('Katlanır masa', ['masa'], 'exact'), ['masa'])
})

test('matchKeywords: çok kelimeli ifadeleri eşler', () => {
  assert.deepEqual(matchKeywords('Dik duruş düzeltici', ['dik duruş']), ['dik duruş'])
})

test('similarity: aynı başlıklar 1, ilgisiz başlıklar 0 verir', () => {
  assert.equal(similarity('Ortopedik Yastık', 'Ortopedik Yastık'), 1)
  assert.equal(similarity('Ortopedik Yastık', 'Mutfak Bıçağı'), 0)
})

test('similarity: marka adı benzerliği etkilemez', () => {
  const s = similarity('Acme Ortopedik Yastık', 'Beta Ortopedik Yastık', { brandA: 'Acme', brandB: 'Beta' })
  assert.equal(s, 1)
})

test('slugify: Türkçe karakterleri ASCII yapar', () => {
  assert.equal(slugify('Çiğ Köfte & Şalgam!'), 'cig-kofte-salgam')
})
