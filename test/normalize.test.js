import { test } from 'node:test'
import assert from 'node:assert/strict'
import { num, pick, absTrendyolUrl } from '../server/normalize.js'

test('num: TR ve EN sayı biçimlerini çözer', () => {
  assert.equal(num('1.299,90'), 1299.9)
  assert.equal(num('1,299.90'), 1299.9)
  assert.equal(num('299,90 TL'), 299.9)
  assert.equal(num('1.299'), 1299)
  assert.equal(num(42), 42)
})

test('num: geçersiz değerlerde null döner', () => {
  assert.equal(num(null), null)
  assert.equal(num(''), null)
  assert.equal(num('abc'), null)
  assert.equal(num(NaN), null)
})

test('num: iç içe nesneden değer okur', () => {
  assert.equal(num({ value: '12,5' }), 12.5)
})

test('pick: ilk dolu yolu döndürür', () => {
  const obj = { a: { b: '' }, c: { d: 7 } }
  assert.equal(pick(obj, ['a.b', 'x.y', 'c.d']), 7)
  assert.equal(pick(obj, ['x']), undefined)
})

test('absTrendyolUrl: göreli ve protokolsüz adresleri tamamlar', () => {
  assert.equal(absTrendyolUrl(null), null)
  assert.equal(absTrendyolUrl('//www.trendyol.com/x'), 'https://www.trendyol.com/x')
})
