import { useCallback, useEffect, useState } from 'react'
import { X, ExternalLink, Store, Trash2, Star, Heart, ListChecks, Gauge, Users, MessageCircle, ScanSearch, Megaphone, Crown, TriangleAlert, Globe } from 'lucide-react'
import { api } from '../api.js'
import { useStore } from '../store.jsx'
import { Badge, BlurInput, Override, ScoreRing, Seg, Spinner, StatusIcon, Thumb, ExtLink } from './ui.jsx'
import CompetitorsTab from './CompetitorsTab.jsx'
import SupplierTab from './SupplierTab.jsx'
import { VERDICT, BAND, STEP_STATUS, PRODUCT_STATUS, CRITERIA, fmtTL, fmtNum, fmtCompact, fmtPrice, fmtUsd, timeAgo, hostOf, brandFromDomain, sellerName, WEIGHTS } from '../lib/format.js'

const META_LIMITS = [30, 60, 100]

export const adLibraryUrl = (q) =>
  `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(q)}&search_type=keyword_unordered&media_type=all`

export default function ProductDrawer({ id, onClose }) {
  const { settings, jobs, lastFinished, refreshProducts, trackJob, toast } = useStore()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('steps')

  const load = useCallback(async () => {
    try {
      setData(await api.product(id))
    } catch (err) {
      setError(err.message)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (lastFinished?.productId === id) load()
  }, [lastFinished, id, load])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const patch = useCallback(
    async (body) => {
      try {
        const { product } = await api.updateProduct(id, body)
        setData((d) => ({ ...d, product }))
        refreshProducts()
      } catch (err) {
        toast(err.message, 'bad')
      }
    },
    [id, refreshProducts, toast],
  )
  const setManual = (manual) => patch({ manual })

  const run = async (fn) => {
    try {
      const { job } = await fn()
      trackJob(job)
    } catch (err) {
      toast(err.message, 'bad')
    }
  }

  const running = new Set(jobs.filter((j) => j.productId === id && j.status === 'running').map((j) => j.type))

  const remove = async () => {
    await api.deleteProduct(id)
    await refreshProducts()
    toast('Ürün silindi', 'ok')
    onClose()
  }

  const p = data?.product
  const e = p?.eval
  const compCount = p ? (p.competitors?.trendyol?.items?.length || 0) + new Set((p.competitors?.lensTr?.items || []).filter((i) => i.kind === 'store').map((i) => i.domain)).size : 0

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Ürün detayı">
        {!p ? (
          <div className="drawer-body" style={{ display: 'grid', placeItems: 'center' }}>{error ? <span className="muted">{error}</span> : <Spinner size={22} />}</div>
        ) : (
          <>
            <div className="drawer-head">
              <div className="row" style={{ alignItems: 'flex-start', gap: 16, flexWrap: 'nowrap' }}>
                <Thumb src={p.image} alt={p.title} size={78} />
                <div className="grow">
                  <div className="row" style={{ gap: 6, marginBottom: 6 }}>
                    <Badge tone={VERDICT[e.verdict].tone} dot>{VERDICT[e.verdict].label}</Badge>
                    <Badge tone={BAND[e.criteria.reviews.band]?.tone}>{BAND[e.criteria.reviews.band]?.label}</Badge>
                    {p.isDemo && <Badge tone="info">Demo</Badge>}
                  </div>
                  <h2 className="drawer-title">{p.title}</h2>
                  <div className="row small muted" style={{ gap: 12, marginTop: 6 }}>
                    {p.brand && <span>{p.brand}</span>}
                    {p.category && <span>· {p.category}</span>}
                    <ExtLink href={p.url}>Trendyol’da aç</ExtLink>
                    <ExtLink href={p.storeUrl}>Mağaza: {sellerName(p)}</ExtLink>
                  </div>
                </div>
                <ScoreRing score={e.score} size={58} stroke={5} />
                <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Kapat"><X size={18} /></button>
              </div>

              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 16 }}>
                <Kpi label="Fiyat" value={fmtPrice(p.price, p.currency)} sub={p.originalPrice > p.price ? `${fmtTL(p.originalPrice)} yerine` : e.estCost != null ? `~${fmtTL(Math.round(e.estCost))} toplu alım` : null} />
                <Kpi label="Değerlendirme" value={fmtNum(p.ratingCount)} sub={p.reviewCount != null && p.reviewCount !== p.ratingCount ? `${fmtNum(p.reviewCount)} yorum` : BAND[e.criteria.reviews.band]?.short} />
                <Kpi label="Puan" value={<span className="row" style={{ gap: 4 }}><Star size={15} color="#e7a52a" fill="#e7a52a" />{p.rating ? p.rating.toFixed(1) : '—'}</span>} />
                <Kpi label="Favori" value={<span className="row" style={{ gap: 4 }}><Heart size={14} color="var(--bad)" />{fmtCompact(p.favoriteCount)}</span>} />
                <Kpi label="Madde" value={`${e.passedSteps}/7`} sub="yeşil" />
              </div>

              <div className="row-between" style={{ marginTop: 14, flexWrap: 'wrap' }}>
                <Seg
                  value={p.status}
                  onChange={(status) => patch({ status })}
                  options={Object.entries(PRODUCT_STATUS).map(([value, v]) => ({ value, label: v.label, tone: v.tone === 'brand' || v.tone === 'info' ? undefined : v.tone }))}
                />
                <span className="row tiny muted" style={{ gap: 10 }}>
                  İlk görülme {timeAgo(p.firstSeenAt)}
                  <button className="btn btn-ghost btn-sm btn-danger" onClick={remove}><Trash2 size={13} /> Sil</button>
                </span>
              </div>

              <div className="tabs">
                {[
                  ['steps', <ListChecks key="i" size={15} />, '7 Madde', `${e.passedSteps}/7`],
                  ['criteria', <Gauge key="i" size={15} />, 'Kriterler', null],
                  ['competitors', <Users key="i" size={15} />, 'Rakipler', compCount || null],
                  ['supplier', <MessageCircle key="i" size={15} />, 'Tedarikçi', null],
                ].map(([k, icon, label, badge]) => (
                  <button key={k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>
                    {icon} {label} {badge != null && <Badge tone={tab === k ? 'brand' : 'muted'}>{badge}</Badge>}
                  </button>
                ))}
              </div>
            </div>

            <div className="drawer-body">
              {tab === 'steps' && <StepsTab p={p} settings={settings} setManual={setManual} run={run} running={running} goTab={setTab} />}
              {tab === 'criteria' && <CriteriaTab p={p} settings={settings} setManual={setManual} />}
              {tab === 'competitors' && <CompetitorsTab p={p} similar={data.similar} suggestedQuery={data.suggestedQuery} setManual={setManual} run={run} running={running} />}
              {tab === 'supplier' && <SupplierTab p={p} settings={settings} setManual={setManual} run={run} running={running} />}
            </div>
          </>
        )}
      </aside>
    </>
  )
}

const Kpi = ({ label, value, sub }) => (
  <div className="card" style={{ padding: '10px 12px', boxShadow: 'none', background: 'var(--surface-2)' }}>
    <div className="tiny muted">{label}</div>
    <div className="strong" style={{ fontFamily: 'var(--display)', fontSize: 16 }}>{value}</div>
    {sub && <div className="tiny muted">{sub}</div>}
  </div>
)

// ---------------- 7 Madde ----------------

function StepsTab({ p, settings: s, setManual, run, running, goTab }) {
  const e = p.eval
  const m = p.manual || {}
  const setOverride = (n) => (v) => setManual({ stepOverrides: { [n]: v } })

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="card card-pad" style={{ padding: '14px 18px' }}>
        <div className="row-between">
          <span className="strong">{e.passedSteps === 7 ? '7 madde yeşil — ürün hazır, mağazaya geç' : `${e.passedSteps}/7 madde tamamlandı`}</span>
          <span className="small muted">Maddeler sırayla uygulanır</span>
        </div>
        <div className="progress" style={{ marginTop: 10 }}><div style={{ width: `${(e.passedSteps / 7) * 100}%` }} /></div>
      </div>

      {e.passedSteps === 7 && (
        <div className="banner tone-gold">
          <Crown size={18} style={{ flex: 'none' }} />
          <span>Tüm maddeler olumlu ve tedarikçiyle anlaşma sağlandı. Artık mağaza kurulumu ve kreatif hazırlığına geçilebilir.</span>
        </div>
      )}

      <div className="steps">
        {e.steps.map((st, i) => (
          <div className="step" key={st.n}>
            <div className="step-rail">
              <span className={`step-num ${st.status}`}>{st.n}</span>
              {i < 6 && <span className="step-line" />}
            </div>
            <div className="card step-card">
              <div className="step-head">
                <div className="row" style={{ gap: 8 }}>
                  <span className="step-title">{st.title}</span>
                  <Badge tone={STEP_STATUS[st.status].tone}>{STEP_STATUS[st.status].label}</Badge>
                  {st.overridden && <Badge tone="muted">elle</Badge>}
                </div>
                <Override value={m.stepOverrides?.[st.n]} onChange={setOverride(st.n)} />
              </div>
              <div className="step-detail">{st.detail}</div>
              <div className="step-tools">
                <StepTools n={st.n} p={p} s={s} m={m} setManual={setManual} run={run} running={running} goTab={goTab} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StepTools({ n, p, s, m, setManual, run, running, goTab }) {
  const { pricing } = useStore()
  const lensCost = pricing ? ` · ≈${fmtUsd(2 * (pricing.lens.startUsd + pricing.lens.unitUsd))}` : ''
  const e = p.eval
  const globalStores = (p.competitors?.lensGlobal?.items || []).filter((i) => i.kind === 'store' && !i.isTurkish)
  const baseDomain = m.baseStoreUrl ? hostOf(m.baseStoreUrl) : null

  if (n === 1)
    return (
      <>
        <BlurInput className="input input-sm" value={m.painPoint} onSave={(v) => setManual({ painPoint: v })} placeholder="Ürün hangi sorunu çözüyor? (örn. bel ağrısı, burun tıkanıklığı)" />
        {e.criteria.pain.keywords?.length > 0 && (
          <div className="chips">{e.criteria.pain.keywords.slice(0, 8).map((k) => <Badge key={k} tone="brand">{k}</Badge>)}</div>
        )}
        <ReviewBand p={p} s={s} />
      </>
    )

  if (n === 2) return <Calculator p={p} s={s} m={m} setManual={setManual} />

  if (n === 3)
    return (
      <>
        {globalStores.length > 0 && (
          <div className="list">
            {dedupeDomains(globalStores).slice(0, 5).map((c) => (
              <div className="list-item" key={c.link} style={{ padding: '8px 0' }}>
                <Globe size={15} color="var(--muted)" />
                <div className="grow">
                  <div className="small strong ellipsis">{c.domain}</div>
                  <div className="tiny muted ellipsis">{c.title}</div>
                </div>
                {c.price != null && <span className="small mono">{c.price} {c.currency || ''}</span>}
                <ExtLink href={c.link}>Aç</ExtLink>
                <button className={`btn btn-sm ${m.baseStoreUrl === c.link ? 'btn-primary' : 'btn-soft'}`} onClick={() => setManual({ baseStoreUrl: c.link })}>
                  {m.baseStoreUrl === c.link ? 'Seçildi' : 'Seç'}
                </button>
              </div>
            ))}
          </div>
        )}
        <BlurInput className="input input-sm" value={m.baseStoreUrl} onSave={(v) => setManual({ baseStoreUrl: v })} placeholder="Yurt dışı referans mağaza URL’si (örn. https://revoget.com/products/leg-pillow-case)" />
        <div className="row">
          <button className="btn btn-sm" disabled={running.has('lens') || !p.image} onClick={() => run(() => api.lens(p.id))}>
            {running.has('lens') ? <Spinner size={13} /> : <ScanSearch size={14} />} Google Lens ile tara (TR + yurt dışı{lensCost})
          </button>
          {p.image && <ExtLink href={`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(p.image)}`}>Lens’i tarayıcıda aç</ExtLink>}
        </div>
      </>
    )

  if (n === 4)
    return (
      <>
        <div className="row">
          <span className="small text-2" style={{ width: 110 }}>PPSPY</span>
          <Seg value={m.ppspyOk ?? null} onChange={(v) => setManual({ ppspyOk: v })} options={[{ value: null, label: '—' }, { value: true, label: '✓ Uygun', tone: 'ok' }, { value: false, label: '✗ Değil', tone: 'bad' }]} />
        </div>
        <div className="row">
          <span className="small text-2" style={{ width: 110 }}>Mağaza yapısı</span>
          <Seg value={m.storeStructureOk ?? null} onChange={(v) => setManual({ storeStructureOk: v })} options={[{ value: null, label: '—' }, { value: true, label: '✓ Tek ürün odaklı', tone: 'ok' }, { value: false, label: '✗ Değil', tone: 'bad' }]} />
        </div>
        <div className="hint">PPSPY’da ürün sayısı 1–20, reklam sayısı 50+ ve mağaza tek ürün odaklı, profesyonel olmalı.</div>
        <div className="row">
          {m.baseStoreUrl && <ExtLink href={m.baseStoreUrl}>Baz mağazaya git ({baseDomain})</ExtLink>}
          <ExtLink href="https://www.ppspy.com/">PPSPY</ExtLink>
        </div>
      </>
    )

  if (n === 5) return <MetaTools p={p} s={s} m={m} setManual={setManual} run={run} running={running} baseDomain={baseDomain} />

  if (n === 6) {
    const lens = p.competitors?.lensTr
    const stores = new Set((lens?.items || []).filter((i) => i.kind === 'store').map((i) => i.domain)).size
    const branded = Object.values(m.brandedDomains || {}).filter(Boolean).length
    return (
      <>
        <div className="row small text-2" style={{ gap: 16 }}>
          <span>Bağımsız TR mağaza: <b>{lens ? stores : '—'}</b></span>
          <span>Markalaşmış: <b>{branded}</b> / {s.brandedCompetitorLimit}</span>
          <span>Trendyol rakip ürün: <b>{p.competitors?.trendyol?.items?.length ?? '—'}</b></span>
        </div>
        <div className="hint">Markalaşmış rakip: ürün üzerinde özel logo/marka, influencer/PR çalışması, 6 aydan uzun süredir satışta.</div>
        <div className="row">
          <button className="btn btn-sm btn-soft" onClick={() => goTab('competitors')}><Users size={14} /> Rakipleri incele</button>
          {!lens && (
            <button className="btn btn-sm" disabled={running.has('lens') || !p.image} onClick={() => run(() => api.lens(p.id))}>
              {running.has('lens') ? <Spinner size={13} /> : <ScanSearch size={14} />} Google Lens ile tara{lensCost}
            </button>
          )}
        </div>
      </>
    )
  }

  if (n === 7)
    return (
      <>
        <Seg
          value={m.supplierStatus || null}
          onChange={(v) => setManual({ supplierStatus: v })}
          options={[{ value: null, label: 'İletişim yok' }, { value: 'contacted', label: 'Mesaj gönderildi', tone: 'warn' }, { value: 'agreed', label: 'Anlaşıldı', tone: 'ok' }, { value: 'rejected', label: 'Olumsuz', tone: 'bad' }]}
        />
        <div className="banner tone-bad" style={{ padding: '10px 12px' }}>
          <TriangleAlert size={16} style={{ flex: 'none' }} />
          <span className="small"><b>Kritik kural:</b> Satıcı anlaşması olmadan ürüne start verilmez. Satıcısız mağaza kurulmaz, satıcısız reklam verilmez.</span>
        </div>
        <div><button className="btn btn-sm btn-soft" onClick={() => goTab('supplier')}><MessageCircle size={14} /> WhatsApp taslağı ve satıcı bilgisi</button></div>
      </>
    )
  return null
}

const dedupeDomains = (items) => {
  const seen = new Set()
  return items.filter((i) => !seen.has(i.domain) && seen.add(i.domain))
}

function ReviewBand({ p, s }) {
  const band = p.eval.criteria.reviews.band
  const order = ['new', 'ideal', 'competitive', 'saturated']
  return (
    <div>
      <div className="band-bar">
        {order.map((b) => <div key={b} className={`${band === b ? 'on' : ''} tone-${BAND[b].tone}`} style={{ background: band === b ? undefined : 'var(--surface-3)' }} />)}
      </div>
      <div className="band-labels">
        <span>0–{s.reviewLow}</span><span>{s.reviewLow}–{s.reviewIdeal} ideal</span><span>{s.reviewIdeal}–{fmtNum(s.reviewSaturated)}</span><span>{fmtNum(s.reviewSaturated)}+ geç</span>
      </div>
    </div>
  )
}

function Calculator({ p, s, m, setManual }) {
  const [c, setC] = useState(() => ({ cost: '', sale: '', shipping: '', other: '', ...(m.calc || {}) }))
  const shipping = c.shipping === '' ? s.defaultShipping : Number(c.shipping)
  const sale = Number(c.sale) || 0
  const cost = Number(c.cost) || 0
  const margin = sale - cost - shipping - (Number(c.other) || 0)
  const roas = sale && cost ? (margin > 0 ? sale / margin : Infinity) : null
  const save = () => setManual({ calc: { ...c, shipping: c.shipping === '' ? s.defaultShipping : c.shipping } })
  const input = (k, label, ph) => (
    <label className="field">
      <span className="tiny muted">{label}</span>
      <div className="input-suffix">
        <input className="input input-sm" type="number" min={0} value={c[k]} placeholder={ph} onChange={(e) => setC((x) => ({ ...x, [k]: e.target.value }))} onBlur={save} />
        <span>TL</span>
      </div>
    </label>
  )
  return (
    <>
      <div className="calc">
        {input('cost', 'Tedarik (anlaşılan)', p.eval.estCost ? String(Math.round(p.eval.estCost)) : '')}
        {input('sale', 'Kendi satış fiyatın', String(s.maxSalePrice))}
        {input('shipping', 'Kargo', String(s.defaultShipping))}
        {input('other', 'Diğer (paket, KDV…)', '0')}
      </div>
      <div className="calc-result">
        <span>
          <span className="tiny muted" style={{ display: 'block' }}>Başa baş ROAS</span>
          <b style={{ color: roas == null ? 'var(--muted)' : roas <= s.breakEvenMax ? 'var(--ok)' : 'var(--bad)' }}>{roas == null ? '—' : Number.isFinite(roas) ? roas.toFixed(2) : '∞'}</b>
        </span>
        <span>
          <span className="tiny muted" style={{ display: 'block' }}>Reklam öncesi kâr</span>
          <b>{sale && cost ? fmtTL(Math.round(margin)) : '—'}</b>
        </span>
        <span>
          <span className="tiny muted" style={{ display: 'block' }}>Satış / tedarik</span>
          <b>{sale && cost ? `${(sale / cost).toFixed(2)}×` : '—'}</b>
        </span>
        <span className="small muted grow" style={{ minWidth: 180 }}>
          Hedef: {s.breakEvenIdeal}–{s.breakEvenMax} ve altı. Tedarik {s.costMin}–{s.costMax} TL, satış ≤ {fmtTL(s.maxSalePrice)}.
        </span>
      </div>
    </>
  )
}

function MetaTools({ p, s, m, setManual, run, running, baseDomain }) {
  const [q, setQ] = useState(() => m.metaQuery || (baseDomain ? brandFromDomain(baseDomain) : p.brand || ''))
  const { pricing } = useStore()
  const [limit, setLimit] = useState(60)
  const checks = p.metaChecks || []
  const perAd = pricing?.meta ? pricing.meta.unitUsd : null
  return (
    <>
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <input className="input input-sm grow" value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => q !== m.metaQuery && setManual({ metaQuery: q })} placeholder="Baz mağazanın marka adı (örn. Nainley)" />
        {q.trim() && <ExtLink href={adLibraryUrl(q)}>Ads Library (ücretsiz)</ExtLink>}
      </div>
      <div className="row">
        <span className="small text-2">Kaç reklam çekilsin?</span>
        <Seg
          value={limit}
          onChange={setLimit}
          options={META_LIMITS.map((n) => ({ value: n, label: `${n}${perAd != null ? ` · ≈${fmtUsd(n * perAd + pricing.meta.startUsd, 2)}` : ''}` }))}
        />
        <button className="btn btn-sm btn-soft" disabled={!q.trim() || running.has('meta')} onClick={() => run(() => api.metaAds({ query: q, productId: p.id, limit }))}>
          {running.has('meta') ? <Spinner size={13} /> : <Megaphone size={14} />} Apify ile say
        </button>
      </div>
      <div className="hint">En fazla seçilen sayı kadar reklam çekilir ve ücretlendirilir. {s.metaAdsScale}+ ölçek eşiğini doğrulamak için 60 yeterli; 25 eşiği için 30 yeter.</div>
      <div className="row">
        <span className="small text-2">Manuel sayı:</span>
        <BlurInput className="input input-sm" style={{ width: 110 }} type="number" min={0} value={m.metaAdsManual} onSave={(v) => setManual({ metaAdsManual: v })} placeholder="örn. 190" />
        <span className="hint">25 altı → yeni/çalışmıyor · 25–50 → test · 50+ → ölçek</span>
      </div>
      {checks.length > 0 && (
        <div className="list">
          {checks.slice(0, 3).map((c) => (
            <div className="list-item" key={c.at} style={{ padding: '8px 0' }}>
              <Megaphone size={14} color="var(--muted)" />
              <span className="small grow">“{c.query}” · {timeAgo(c.at)}{c.pages?.length ? ` · ${c.pages.slice(0, 3).map((x) => x.name).join(', ')}` : ''}</span>
              <Badge tone={c.count >= s.metaAdsScale ? 'ok' : c.count >= s.metaAdsTest ? 'warn' : 'bad'}>{c.capped ? '≥' : '~'}{fmtNum(c.count)} reklam</Badge>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ---------------- Kriterler ----------------

function CriteriaTab({ p, settings: s, setManual }) {
  const e = p.eval
  const m = p.manual || {}
  const WEIGHT = WEIGHTS
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="banner tone-brand">
        <Gauge size={17} color="var(--brand)" style={{ flex: 'none', marginTop: 1 }} />
        <span className="text-2">
          Kriter skoru <b>{e.score}/100</b>. Uygun = tam puan, dikkat = yarım puan. Fiyat &gt; {fmtTL(s.maxSalePrice)}, {fmtNum(s.reviewSaturated)}+ değerlendirme ya da TR rakip/Meta reddi ürünü “Geç” yapar. Otomatik sonucu sağdaki düğmelerle değiştirebilirsiniz.
        </span>
      </div>
      {CRITERIA.map((c) => {
        const cr = e.criteria[c.key]
        return (
          <div className="card crit" key={c.key}>
            <span className="crit-emoji">{c.icon}</span>
            <div>
              <div className="row" style={{ gap: 8 }}>
                <span className="strong">{c.title}</span>
                <Badge tone={STEP_STATUS[cr.status]?.tone}>{STEP_STATUS[cr.status]?.label}</Badge>
                <span className="tiny muted">%{WEIGHT[c.key]} ağırlık</span>
                {cr.overridden && <Badge tone="muted">elle</Badge>}
              </div>
              <div className="small text-2" style={{ marginTop: 3 }}>{cr.detail}</div>
              {c.key === 'reviews' && <div style={{ marginTop: 10, maxWidth: 420 }}><ReviewBand p={p} s={s} /></div>}
            </div>
            <div className="row" style={{ gap: 8 }}>
              <StatusIcon status={cr.status} size={24} />
              <Override value={m.criteriaOverrides?.[c.key]} onChange={(v) => setManual({ criteriaOverrides: { [c.key]: v } })} />
            </div>
          </div>
        )
      })}
      {p.promotions?.length > 0 && (
        <div className="card card-pad">
          <div className="label" style={{ marginBottom: 8 }}>Trendyol kampanya / sosyal kanıt</div>
          <div className="chips">{p.promotions.map((x) => <Badge key={x} tone="warn">{x}</Badge>)}</div>
        </div>
      )}
      <div className="row small muted"><Store size={14} /> Kaynak aramalar: {(p.queries || []).join(', ') || '—'}</div>
    </div>
  )
}
