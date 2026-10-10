import fs from 'node:fs'
import path from 'node:path'
import { ROOT, DEFAULT_SETTINGS } from './config.js'
import { normalizeText } from './text.js'

const DIR = path.join(ROOT, 'data')
const FILE = path.join(DIR, 'db.json')

function load() {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'))
    // Sözlükler artık arayüzden düzenlenmiyor; kayıtlı eski kopyalar yeni varsayılanları ezmesin
    for (const k of ['painKeywords', 'whimKeywords', 'bulkyKeywords', 'fragileKeywords']) delete parsed.settings?.[k]
    const jobs = parsed.jobs || {}
    const products = parsed.products || {}
    return {
      products,
      jobs,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      queryLog: Object.keys(parsed.queryLog || {}).length ? parsed.queryLog : backfillQueryLog(jobs, products),
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      // Dosyayı boş veritabanıyla ezmeden önce kenara al — veriler kaybolmasın
      const broken = path.join(DIR, `db.broken-${Date.now()}.json`)
      try {
        fs.copyFileSync(FILE, broken)
      } catch {}
      console.error(`[db] db.json okunamadı (${err.message}). Yedeği: ${broken}. Boş veritabanı ile başlanıyor.`)
    }
    return { products: {}, jobs: {}, settings: { ...DEFAULT_SETTINGS }, queryLog: {} }
  }
}

/** Eski veritabanlarında sorgu geçmişi yok: kayıtlı ürünlerin sorgularından ve tamamlanmış taramalardan çıkarılır. */
function backfillQueryLog(jobs, products) {
  const log = {}
  for (const p of Object.values(products)) {
    if (p.isDemo) continue
    for (const q of p.queries || []) {
      const key = normalizeText(q)
      const cur = log[key] || { query: q, runs: 1, saved: 0, lastAt: null }
      const at = p.lastSeenAt || p.firstSeenAt || null
      log[key] = { ...cur, saved: cur.saved + 1, lastAt: at && (!cur.lastAt || at > cur.lastAt) ? at : cur.lastAt }
    }
  }
  const done = Object.values(jobs).filter((j) => j.type === 'search' && j.status === 'succeeded')
  for (const j of done.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    for (const q of j.meta?.queries || []) {
      const key = normalizeText(q)
      const cur = log[key] || { query: q, runs: 0 }
      log[key] = { ...cur, runs: cur.runs + 1, lastAt: j.finishedAt || j.createdAt, saved: j.meta.perQueryResults?.[q] ?? cur.saved ?? null }
    }
  }
  return log
}

export const db = load()

let timer = null
export function save() {
  clearTimeout(timer)
  timer = setTimeout(flush, 150)
}

export function flush() {
  clearTimeout(timer)
  fs.mkdirSync(DIR, { recursive: true })
  const tmp = `${FILE}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1))
  fs.renameSync(tmp, FILE)
}

process.on('SIGINT', () => {
  flush()
  process.exit(0)
})
process.on('SIGTERM', () => {
  flush()
  process.exit(0)
})
