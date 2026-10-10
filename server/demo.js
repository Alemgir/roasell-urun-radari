// Token olmadan arayüzü denemek için örnek veri. Tüm kayıtlar isDemo: true ile işaretlenir.
import { db, save } from './db.js'
import { upsertProduct } from './jobs.js'

const P = (id, title, brand, category, price, ratingCount, favoriteCount, merchantName, extra = {}) => ({
  id: `demo-${id}`, groupId: null, title, brand, category, price, originalPrice: extra.originalPrice ?? null, currency: 'TL',
  url: `https://www.trendyol.com/sr?q=${encodeURIComponent(title.split(' ').slice(0, 4).join(' '))}`,
  image: null, rating: extra.rating ?? 4.4, ratingCount, reviewCount: Math.round(ratingCount * 0.4), favoriteCount,
  inStock: true, merchantId: `9${id}00`, merchantName, merchantScore: extra.score ?? 9.1, merchantLocation: extra.city ?? 'İstanbul',
  merchantProductCount: null, storeUrl: `https://www.trendyol.com/magaza/${merchantName.toLowerCase().replace(/[^a-z]+/g, '-')}-m-9${id}00`,
  otherMerchants: extra.otherMerchants || [], promotions: extra.promotions || [], searchQuery: extra.q ?? null,
})

const PRODUCTS = [
  P(1, 'Life Net Medikal Taşınabilir Mesh Nebülizatör Süper Sessiz Yetişkin & Çocuk USB JSL-W302', 'Life Net Medikal', 'Nebülizatör', 519.9, 840, 21980, 'Life Net Medikal', { originalPrice: 599.9, q: 'nebülizatör', promotions: ['Son 10 günün en düşük fiyatı'] }),
  P(2, 'Visco Planet Ortopedik Bacak Arası Yan Yatış Yastığı Ergonomik Uyku Minderi Lastikli', 'Visco Planet', 'Yastık', 545.39, 77, 3120, 'Visco Planet', { q: 'bacak arası yastık', rating: 4.5 }),
  P(3, 'Anıt Underwear Bamboo 3 lü Erkek Boxer Nefes Alabilir Nem Emici İç Çamaşırı', 'Anıt Lingerie', 'Boxer', 599, 2, 140, 'Anıt Lingerie', { q: 'idrar kaçırma boxer', rating: 5 }),
  P(4, 'Dik Duruş Korsesi Sırt ve Omuz Destekli Kambur Düzeltici Ayarlanabilir', 'OrtoFix', 'Korse', 289.9, 312, 8450, 'OrtoFix Sağlık', { q: 'duruş korsesi' }),
  P(5, 'Horlama Önleyici Burun Dilatörü Silikon 4 Boy Set', 'SleepWell', 'Burun Bandı', 179.9, 164, 2890, 'Uyku Market', { q: 'horlama önleyici' }),
  P(6, 'Elektrikli Boyun ve Omuz Masaj Aleti Isıtmalı Shiatsu', 'Relaxo', 'Masaj Aleti', 689, 1840, 14320, 'Relaxo Store', { q: 'boyun masaj' }),
  P(7, 'Topuk Dikeni Silikon Tabanlık Ortopedik Plantar Fasiit Destek', 'PediStep', 'Tabanlık', 149.9, 4720, 26800, 'PediStep', { q: 'topuk dikeni tabanlık' }),
  P(8, 'Ultrasonik Sivrisinek ve Haşere Kovucu Priz Tipi 2 Adet', 'EcoGuard', 'Haşere Kovucu', 239.9, 12, 430, 'EcoGuard', { q: 'haşere kovucu' }),
  P(9, 'Dekoratif Ahşap Duvar Rafı 3 Katlı Süs Rafı', 'WoodArt', 'Duvar Rafı', 329, 210, 1900, 'WoodArt Home', { q: 'duvar rafı' }),
  P(10, '3 Kişilik Katlanır Çekyat Kanepe Yataklı Koltuk', 'HomeLine', 'Koltuk', 8999, 95, 4100, 'HomeLine Mobilya', { q: 'çekyat' }),
  P(11, 'Göz Masaj Cihazı Isıtmalı Bluetooth Müzikli Göz Yorgunluğu Giderici', 'Relaxo', 'Masaj Aleti', 749, 388, 9800, 'Relaxo Store', { q: 'göz masaj' }),
  P(12, 'Lavabo Açıcı Tıkanıklık Giderici Yay 3 Metre Paslanmaz', 'FixPro', 'Tesisat', 89.9, 1260, 5400, 'FixPro Yapı', { q: 'lavabo açıcı' }),
]

export function loadDemo() {
  for (const p of PRODUCTS) upsertProduct(p, { isDemo: true })
  const neb = db.products['demo-1']
  const t = new Date().toISOString()
  neb.manual = { ...neb.manual, painPoint: 'Burun tıkanıklığı, balgam ve solunum problemleri' }
  neb.competitors = {
    trendyol: {
      updatedAt: t, query: 'taşınabilir mesh nebülizatör',
      items: [
        { id: 'demo-c1', title: 'Taşınabilir Sessiz Mesh Nebülizatör Şarjlı Çocuk Yetişkin', url: 'https://www.trendyol.com', price: 469, ratingCount: 1290, rating: 4.3, merchantName: 'Medikal Dünyası', storeUrl: 'https://www.trendyol.com', similarity: 0.71 },
        { id: 'demo-c2', title: 'Mesh Nebülizatör Cihazı Portatif USB', url: 'https://www.trendyol.com', price: 399, ratingCount: 356, rating: 4.1, merchantName: 'SağlıkPlus', storeUrl: 'https://www.trendyol.com', similarity: 0.62 },
        { id: 'demo-c3', title: 'Nebülizatör Kompresörlü Buhar Makinesi', url: 'https://www.trendyol.com', price: 899, ratingCount: 2210, rating: 4.5, merchantName: 'Medisan', storeUrl: 'https://www.trendyol.com', similarity: 0.33 },
      ],
    },
    lensTr: {
      updatedAt: t,
      items: [
        { link: 'https://www.hepsiburada.com', domain: 'hepsiburada.com', title: 'Mesh Nebülizatör Taşınabilir', source: 'Hepsiburada', price: 489, kind: 'marketplace', isTurkish: true },
        { link: 'https://nefesmed.com.tr', domain: 'nefesmed.com.tr', title: 'NefesMed Mini Nebülizatör', source: 'nefesmed.com.tr', price: 649, kind: 'store', isTurkish: true },
        { link: 'https://bebekvesaglik.com', domain: 'bebekvesaglik.com', title: 'Sessiz Nebülizatör Bebek', source: 'bebekvesaglik.com', price: 559, kind: 'store', isTurkish: true },
      ],
    },
    lensGlobal: {
      updatedAt: t,
      items: [
        { link: 'https://nainleybaby.com/products/nainley-portable-nebulizer', domain: 'nainleybaby.com', title: 'Portable Nebulizer - Congestion Reliever', source: 'Nainley', price: 59.99, currency: 'USD', kind: 'store', isTurkish: false },
        { link: 'https://www.amazon.com', domain: 'amazon.com', title: 'Portable Mesh Nebulizer', source: 'Amazon', price: 39.99, currency: 'USD', kind: 'marketplace', isTurkish: false },
      ],
    },
  }
  neb.metaChecks = [{ query: 'Nainley', at: t, count: 840, capped: false, fetched: 60, pages: [{ name: 'Nainley', count: 60 }], sample: [] }]
  save()
  return PRODUCTS.length
}

export function clearDemo() {
  let n = 0
  for (const [id, p] of Object.entries(db.products)) if (p.isDemo) (delete db.products[id], n++)
  save()
  return n
}
