import path from 'node:path'
import fs from 'node:fs'
import express from 'express'
import { env, ROOT, DEFAULT_SETTINGS } from './config.js'
import { db, save } from './db.js'
import { whoAmI, getUsage, getPricing } from './apify.js'
import { GENERAL_GROUPS } from './config.js'
import { recomputeCrowd } from './crowd.js'
import { evaluateProduct } from './scoring.js'
import { similarity } from './text.js'
import { adLibraryUrl } from './normalize.js'
import { listJobs, startSearch, startEnrich, startTrendyolCompetitors, startLens, startMeta, abortJob, startPoller, defaultCompetitorQuery } from './jobs.js'
import { loadDemo, clearDemo } from './demo.js'

const app = express()
app.use(express.json({ limit: '1mb' }))

const withEval = (p) => ({ ...p, eval: evaluateProduct(p, db.settings) })
const requireToken = () => {
  if (!env.token) throw Object.assign(new Error('APIFY_TOKEN tanımlı değil. .env dosyasına token ekleyip sunucuyu yeniden başlatın.'), { status: 400 })
}
const getProduct = (id) => {
  const p = db.products[id]
  if (!p) throw Object.assign(new Error('Ürün bulunamadı'), { status: 404 })
  return p
}

// ---------- Sistem ----------

app.get('/api/health', async (req, res) => {
  const out = { tokenConfigured: !!env.token, actors: { trendyol: env.trendyolActor, lens: env.lensActor, meta: env.metaActor } }
  if (req.query.check && env.token) {
    try {
      out.account = await whoAmI()
    } catch (err) {
      out.accountError = err.message
    }
  }
  res.json(out)
})

// Apify aylık kullanım / kalan bakiye (canlı)
app.get('/api/usage', async (req, res) => {
  requireToken()
  res.json({ usage: await getUsage() })
})

// Aktörlerin planınıza göre güncel fiyatları + genel tarama kategorileri
app.get('/api/pricing', async (req, res) => {
  requireToken()
  res.json({ pricing: await getPricing(), generalGroups: GENERAL_GROUPS })
})

// Hazır anahtar kelime grupları + daha önce taranan sorgular (tekrar taramayı önlemek için)
app.get('/api/queries', (req, res) => res.json({ groups: GENERAL_GROUPS, log: db.queryLog }))

app.get('/api/settings', (req, res) => res.json({ settings: db.settings, defaults: DEFAULT_SETTINGS }))

app.put('/api/settings', (req, res) => {
  const next = { ...db.settings }
  for (const [k, def] of Object.entries(DEFAULT_SETTINGS)) {
    if (!(k in req.body)) continue
    const v = req.body[k]
    if (Array.isArray(def)) next[k] = (Array.isArray(v) ? v : String(v).split(',')).map((x) => String(x).trim()).filter(Boolean)
    else if (typeof def === 'number') {
      if (v !== '' && Number.isFinite(Number(v))) next[k] = Number(v)
    } else next[k] = String(v)
  }
  db.settings = next
  save()
  res.json({ settings: db.settings })
})

app.post('/api/settings/reset', (req, res) => {
  db.settings = { ...DEFAULT_SETTINGS }
  save()
  res.json({ settings: db.settings })
})

// ---------- Ürünler ----------

app.get('/api/products', (req, res) => {
  const list = Object.values(db.products).map(({ history, competitors, ...p }) => ({
    ...withEval({ ...p, competitors }),
    competitorCounts: {
      trendyol: competitors?.trendyol?.items?.length ?? null,
      lensTr: competitors?.lensTr ? new Set(competitors.lensTr.items.filter((i) => i.kind === 'store').map((i) => i.domain)).size : null,
    },
    competitors: undefined,
  }))
  res.json({ products: list })
})

app.get('/api/products/:id', (req, res) => {
  const p = getProduct(req.params.id)
  // Aynı veritabanındaki benzer ürünler (farklı satıcı) — ek Apify maliyeti olmadan Trendyol içi rakipler
  const similar = Object.values(db.products)
    .filter((x) => x.id !== p.id)
    .map((x) => ({ x, sim: similarity(p.title, x.title, { brandA: p.brand, brandB: x.brand }) }))
    .filter(({ sim }) => sim >= 0.35)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 12)
    .map(({ x, sim }) => ({ id: x.id, title: x.title, url: x.url, image: x.image, price: x.price, ratingCount: x.ratingCount, rating: x.rating, merchantName: x.merchantName, storeUrl: x.storeUrl, similarity: Math.round(sim * 100) / 100 }))
  res.json({ product: withEval(p), similar, suggestedQuery: defaultCompetitorQuery(p), jobs: listJobs().filter((j) => j.productId === p.id).slice(0, 10) })
})

app.patch('/api/products/:id', (req, res) => {
  const p = getProduct(req.params.id)
  const { status, manual } = req.body || {}
  if (status) p.status = status
  if (manual && typeof manual === 'object') {
    const merged = { ...p.manual }
    for (const [k, v] of Object.entries(manual)) {
      if (['criteriaOverrides', 'stepOverrides', 'brandedDomains', 'calc'].includes(k) && v && typeof v === 'object') {
        merged[k] = Object.fromEntries(Object.entries({ ...(merged[k] || {}), ...v }).filter(([, x]) => x !== null && x !== ''))
      } else merged[k] = v
    }
    p.manual = merged
  }
  p.updatedAt = new Date().toISOString()
  save()
  res.json({ product: withEval(p) })
})

app.delete('/api/products/:id', (req, res) => {
  delete db.products[req.params.id]
  save()
  res.json({ ok: true })
})

app.post('/api/products/bulk-delete', (req, res) => {
  for (const id of req.body?.ids || []) delete db.products[id]
  save()
  res.json({ ok: true })
})

app.get('/api/export.csv', (req, res) => {
  const cols = ['id', 'title', 'brand', 'category', 'price', 'ratingCount', 'rating', 'favoriteCount', 'merchantName', 'score', 'verdict', 'passedSteps', 'status', 'url', 'storeUrl']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = Object.values(db.products).map((p) => {
    const e = evaluateProduct(p, db.settings)
    return cols.map((c) => esc(c === 'score' ? e.score : c === 'verdict' ? e.verdict : c === 'passedSteps' ? `${e.passedSteps}/7` : p[c])).join(';')
  })
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="roasell-urunler.csv"')
  res.send('﻿' + [cols.join(';'), ...rows].join('\n'))
})

// ---------- Apify işleri ----------

app.post('/api/searches', async (req, res) => {
  requireToken()
  res.status(201).json({ job: await startSearch(req.body || {}) })
})

app.post('/api/products/:id/trendyol-competitors', async (req, res) => {
  requireToken()
  res.status(201).json({ job: await startTrendyolCompetitors(req.params.id, req.body || {}) })
})

app.post('/api/products/:id/enrich', async (req, res) => {
  requireToken()
  getProduct(req.params.id)
  res.status(201).json({ job: await startEnrich([req.params.id], { emails: !!req.body?.emails }) })
})

app.post('/api/products/:id/lens', async (req, res) => {
  requireToken()
  res.status(201).json({ job: await startLens(req.params.id) })
})

app.post('/api/meta-ads', async (req, res) => {
  requireToken()
  res.status(201).json({ job: await startMeta(req.body || {}) })
})

app.get('/api/meta-ads/url', (req, res) => res.json({ url: adLibraryUrl(String(req.query.q || '')) }))

app.get('/api/jobs', (req, res) => res.json({ jobs: listJobs().slice(0, 60) }))
app.post('/api/jobs/:id/abort', async (req, res) => res.json({ job: await abortJob(req.params.id) }))
app.delete('/api/jobs', (req, res) => {
  for (const j of Object.values(db.jobs)) if (j.status !== 'running') delete db.jobs[j.id]
  save()
  res.json({ ok: true })
})

// ---------- Demo ----------

app.post('/api/demo', (req, res) => res.json({ loaded: loadDemo() }))
app.delete('/api/demo', (req, res) => res.json({ removed: clearDemo() }))

// ---------- Üretim: derlenmiş React arayüzü ----------

const dist = path.join(ROOT, 'dist')
if (process.env.NODE_ENV === 'production' && fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get('/{*splat}', (req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.use((err, req, res, next) => {
  const status = err.status && err.status < 600 ? err.status : 500
  if (status >= 500) console.error(err)
  res.status(status).json({ error: err.message || 'Beklenmeyen hata' })
})

app.listen(env.port, () => {
  console.log(`\n  Roasell Ürün Radarı API → http://localhost:${env.port}`)
  console.log(`  Apify token: ${env.token ? 'tanımlı ✓' : 'YOK — .env dosyasına APIFY_TOKEN ekleyin'}`)
  console.log(`  Trendyol aktörü: ${env.trendyolActor}\n`)
  recomputeCrowd()
  save()
  startPoller()
})
