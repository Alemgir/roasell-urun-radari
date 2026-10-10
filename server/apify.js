import { env } from './config.js'

const BASE = 'https://api.apify.com/v2'
export const TERMINAL = new Set(['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'])

export class ApifyError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

const actorPath = (actor) => encodeURIComponent(actor.replace('/', '~'))

async function request(method, url, body, { raw = false } = {}) {
  if (!env.token) throw new ApifyError('APIFY_TOKEN tanımlı değil. .env dosyasına token ekleyip sunucuyu yeniden başlatın.', 401)
  const res = await fetch(`${BASE}${url}`, {
    method,
    headers: { Authorization: `Bearer ${env.token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (raw && res.ok) return text
  let json
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { raw: text }
  }
  if (!res.ok) {
    const msg = json?.error?.message || json?.raw || res.statusText
    const hint =
      res.status === 401 ? ' (token geçersiz)' :
      res.status === 402 ? ' (Apify krediniz yetersiz)' :
      res.status === 403 ? ' (aktörü kullanma izni yok — Apify Store’dan aktörü etkinleştirin)' :
      res.status === 404 ? ' (aktör/kayıt bulunamadı)' : ''
    throw new ApifyError(`Apify ${res.status}: ${msg}${hint}`, res.status)
  }
  return json
}

export async function startRun(actor, input) {
  const { data } = await request('POST', `/acts/${actorPath(actor)}/runs`, input)
  return { runId: data.id, datasetId: data.defaultDatasetId, status: data.status }
}

export async function getRun(runId) {
  const { data } = await request('GET', `/actor-runs/${runId}`)
  return data
}

export async function abortRun(runId) {
  return request('POST', `/actor-runs/${runId}/abort`)
}

export async function getItems(datasetId, limit = 5000) {
  const items = await request('GET', `/datasets/${datasetId}/items?clean=true&format=json&limit=${limit}`)
  return Array.isArray(items) ? items : []
}

/** Başarısız çalıştırmanın logundan okunabilir hata satırını çıkarır (statusMessage boş gelebiliyor). */
export async function getLogError(runId) {
  try {
    const log = await request('GET', `/actor-runs/${runId}/log`, null, { raw: true })
    const lines = String(log).split('\n')
    const line = [...lines].reverse().find((l) => /ERROR/.test(l) && !/^\s*at /.test(l.replace(/^\S+\s+/, '')))
    const msg = (line || '').replace(/^\S+\s+ERROR\s+(\[Status message\]:\s*)?/, '').trim()
    if (/API 418/.test(msg)) return 'Trendyol isteği engelledi (418). Birkaç dakika sonra tekrar deneyin.'
    return msg.slice(0, 240) || null
  } catch {
    return null
  }
}

let meCache = null
export async function whoAmI() {
  if (meCache && Date.now() - meCache.at < 10 * 60e3) return meCache.value
  const { data } = await request('GET', '/users/me')
  const value = { username: data.username, planId: data.plan?.id || null, tier: data.plan?.tier || data.plan?.id || 'FREE' }
  meCache = { at: Date.now(), value }
  return value
}

/** Aylık kullanım ve limit — Apify Console'daki "Usage" ile aynı veri */
export async function getUsage() {
  const [{ data }, me] = await Promise.all([request('GET', '/users/me/limits'), whoAmI()])
  const used = data.current?.monthlyUsageUsd ?? 0
  const limit = data.limits?.maxMonthlyUsageUsd ?? null
  return {
    username: me.username,
    plan: me.planId,
    tier: me.tier,
    usedUsd: used,
    limitUsd: limit,
    remainingUsd: limit != null ? Math.max(limit - used, 0) : null,
    cycleStart: data.monthlyUsageCycle?.startAt || null,
    cycleEnd: data.monthlyUsageCycle?.endAt || null,
    activeRuns: data.current?.activeActorJobCount ?? 0,
    maxConcurrentRuns: data.limits?.maxConcurrentActorJobs ?? null,
    fetchedAt: new Date().toISOString(),
  }
}

function currentPricing(infos) {
  const list = (infos || []).filter((p) => !p.startedAt || new Date(p.startedAt) <= new Date())
  return list[list.length - 1] || null
}

const eventPrice = (ev, tier) => ev?.eventTieredPricingUsd?.[tier]?.tieredEventPriceUsd ?? ev?.eventPriceUsd ?? 0

/** Aktörün planınıza göre güncel fiyatı: çalıştırma başına sabit + birincil olay (ürün / görsel / reklam) başına */
async function actorPrice(actor, tier) {
  const { data } = await request('GET', `/acts/${actorPath(actor)}`)
  const info = currentPricing(data.pricingInfos)
  const events = info?.pricingPerEvent?.actorChargeEvents || {}
  let start = 0
  let unit = 0
  let unitTitle = null
  const entries = Object.values(events)
  const primary = entries.find((e) => e.isPrimaryEvent) || entries.filter((e) => !e.isOneTimeEvent).sort((a, b) => eventPrice(b, tier) - eventPrice(a, tier))[0]
  for (const ev of entries) if (ev.isOneTimeEvent) start += eventPrice(ev, tier)
  if (primary) {
    unit = eventPrice(primary, tier)
    unitTitle = primary.eventTitle
  }
  const byEvent = Object.fromEntries(Object.entries(events).map(([k, ev]) => [k, eventPrice(ev, tier)]))
  return { actor, model: info?.pricingModel || null, startUsd: start, unitUsd: unit, unitTitle, events: byEvent }
}

let priceCache = null
export async function getPricing() {
  if (priceCache && Date.now() - priceCache.at < 30 * 60e3) return priceCache.value
  const { tier } = await whoAmI()
  const [trendyol, lens, meta] = await Promise.all([actorPrice(env.trendyolActor, tier), actorPrice(env.lensActor, tier), actorPrice(env.metaActor, tier)])
  const value = { tier, trendyol, lens, meta }
  priceCache = { at: Date.now(), value }
  return value
}
