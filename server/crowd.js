// Trendyol içi rakip yoğunluğu: veritabanındaki (taranmış) ürünler arasında neredeyse aynı ürünü
// satan farklı satıcı sayısı. Ek Apify maliyeti yoktur; her taramadan sonra yeniden hesaplanır.
import { db } from './db.js'
import { titleStems } from './text.js'

const THRESHOLD = 0.5

export function recomputeCrowd() {
  const list = Object.values(db.products).filter((p) => !p.isDemo)
  const stems = list.map((p) => titleStems(p.title, [p.brand]))
  const matches = list.map(() => new Map()) // merchantId → productId

  for (let i = 0; i < list.length; i++) {
    const A = stems[i]
    if (!A.size) continue
    for (let j = i + 1; j < list.length; j++) {
      const B = stems[j]
      if (!B.size) continue
      let inter = 0
      for (const t of A) if (B.has(t)) inter++
      if ((2 * inter) / (A.size + B.size) < THRESHOLD) continue
      const a = list[i]
      const b = list[j]
      if (a.merchantId && b.merchantId && a.merchantId === b.merchantId) continue
      matches[i].set(b.merchantId || b.id, b.id)
      matches[j].set(a.merchantId || a.id, a.id)
    }
  }
  list.forEach((p, i) => {
    p.crowdCount = matches[i].size
    p.crowdIds = [...matches[i].values()].slice(0, 8)
  })
}
