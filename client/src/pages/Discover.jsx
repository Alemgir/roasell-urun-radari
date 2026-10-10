import { useEffect, useMemo, useState } from 'react'
import { Radar, Plus, X, Play, Info, TriangleAlert, Search, Sparkles, Check, History, Link2, Shuffle } from 'lucide-react'
import { useStore } from '../store.jsx'
import { api } from '../api.js'
import { Card, Field, Switch, Spinner, Seg } from '../components/ui.jsx'
import JobList from '../components/JobList.jsx'
import UsageCard from '../components/UsageCard.jsx'
import { fmtUsd, fmtNum, timeAgo } from '../lib/format.js'

const MAX_QUERIES = 40
const PER_QUERY = [
  { n: 5, hint: 'Deneme' },
  { n: 10, hint: 'Hızlı' },
  { n: 20, hint: 'Önerilen' },
  { n: 40, hint: 'Geniş' },
]
const URL_RE = /(?:https?:\/\/)?(?:[\w-]+\.)*(?:trendyol\.com|ty\.gl)\/\S+/gi

// Sunucudaki normalizeText ile aynı: sorgu geçmişi anahtarı
const norm = (s) => String(s || '').toLocaleLowerCase('tr').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

function parseTarget(text) {
  const urls = [...new Set(String(text || '').match(URL_RE) || [])]
  const name = String(text || '').replace(URL_RE, ' ').replace(/[,\s]+/g, ' ').trim()
  return { urls, name }
}

/** Taranmamış sorguları gruplar arasında sırayla dağıtarak seçer. */
function pickUnscanned(groups, isScanned, limit) {
  const pools = groups.map((g) => g.queries.filter((q) => !isScanned(q)))
  const out = []
  for (let i = 0; out.length < limit && pools.some((p) => i < p.length); i++) {
    for (const p of pools) if (p[i] && out.length < limit) out.push(p[i])
  }
  return out
}

export default function Discover({ openProduct }) {
  const { settings, health, pricing, usage, generalQueries: groups, queryLog, trackJob, toast } = useStore()
  const [mode, setMode] = useState('keywords')
  const [keywords, setKeywords] = useState([])
  const [draft, setDraft] = useState('')
  const [target, setTarget] = useState('')
  const [suggestGroup, setSuggestGroup] = useState(0)
  const [categories, setCategories] = useState(null)
  const [perQuery, setPerQuery] = useState(20)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [band, setBand] = useState('ideal')
  const [excludeBranded, setExcludeBranded] = useState(true)
  const [autoEnrich, setAutoEnrich] = useState(true)
  const [skipSeen, setSkipSeen] = useState(true)
  const [linkOnly, setLinkOnly] = useState(true)
  const [busy, setBusy] = useState(false)

  const scannedAt = (q) => queryLog?.[norm(q)]
  const isScanned = (q) => !!scannedAt(q)
  const allCategories = useMemo(() => groups.flatMap((g) => g.queries), [groups])
  const totalScanned = useMemo(() => allCategories.filter((q) => queryLog?.[norm(q)]).length, [allCategories, queryLog])

  // Varsayılan seçim: her gruptan henüz taranmamış ilk kelime
  useEffect(() => {
    if (categories === null && groups.length) setCategories(pickUnscanned(groups, (q) => !!queryLog?.[norm(q)], groups.length))
  }, [groups, categories, queryLog])

  const s = settings || {}
  const addKeyword = (k) => {
    const parts = k.split(/[,\n]/).map((x) => x.trim()).filter(Boolean)
    if (parts.length) setKeywords((cur) => [...new Set([...cur, ...parts])])
    setDraft('')
  }
  const toggleCategory = (c) => setCategories((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]))
  const toggleGroup = (g) =>
    setCategories((cur) => {
      const all = g.queries.every((q) => cur.includes(q))
      return all ? cur.filter((q) => !g.queries.includes(q)) : [...new Set([...cur, ...g.queries])]
    })

  const { urls: targetUrls, name: parsedName } = useMemo(() => parseTarget(target), [target])
  // Link girilince "sadece linki tara" kendiliğinden açık gelir: fazladan sorgu için para harcanmaz
  const linkMode = linkOnly && targetUrls.length > 0
  const targetName = linkMode ? '' : parsedName
  useEffect(() => {
    if (!targetUrls.length) setLinkOnly(true)
  }, [targetUrls.length])
  const baseQueries = useMemo(() => {
    if (mode === 'general') return categories || []
    const pending = draft.split(',').map((x) => x.trim()).filter(Boolean)
    return [...new Set([...keywords, ...pending])]
  }, [mode, categories, keywords, draft])
  const queries = useMemo(() => {
    if (linkMode) return []
    return targetName && !baseQueries.some((q) => norm(q) === norm(targetName)) ? [...baseQueries, targetName] : baseQueries
  }, [baseQueries, targetName, linkMode])
  const tooMany = queries.length > MAX_QUERIES
  const hasWork = queries.length > 0 || targetUrls.length > 0

  const t = pricing?.trendyol
  const detailUsd = t?.events?.productDetail ?? null
  const canEnrich = /memo23/i.test(health?.actors?.trendyol || '') && detailUsd != null
  const urlCost = t && targetUrls.length ? t.startUsd + targetUrls.length * (detailUsd ?? t.unitUsd) : 0
  const costFor = (n) => (t && hasWork ? queries.length * (t.startUsd + n * t.unitUsd) + urlCost : null)
  const est = costFor(perQuery)
  const enrichMax = canEnrich && autoEnrich && queries.length ? t.startUsd + queries.length * perQuery * detailUsd : 0
  const overBudget = est != null && usage?.remainingUsd != null && est + enrichMax > usage.remainingUsd

  const submit = async (e) => {
    e.preventDefault()
    if (draft.trim()) addKeyword(draft)
    setBusy(true)
    try {
      const { job } = await api.search({
        mode,
        keywords: linkMode ? [] : baseQueries,
        categories: linkMode ? [] : baseQueries,
        target: linkMode ? targetUrls.join(' ') : target,
        linkOnly: linkMode,
        perQuery, minPrice, maxPrice: maxPrice || s.maxSalePrice, band, excludeBranded, autoEnrich: canEnrich && autoEnrich, skipSeen,
      })
      trackJob(job)
      if (job.status !== 'failed') {
        setTarget('')
        if (mode === 'keywords') setKeywords([])
      }
    } catch (err) {
      toast(err.message, 'bad')
    } finally {
      setBusy(false)
    }
  }

  const chip = (q, on, onClick) => {
    const log = scannedAt(q)
    return (
      <button
        type="button"
        key={q}
        className={`chip ${on ? 'on' : ''}`}
        onClick={onClick}
        style={log && !on ? { opacity: 0.55 } : undefined}
        title={log ? `Daha önce tarandı · ${timeAgo(log.lastAt)} · ${log.runs} kez · son taramada ${log.saved ?? 0} ürün kaydedildi` : 'Henüz taranmadı'}
      >
        {on ? <Check size={12} /> : log ? <History size={12} /> : <Plus size={12} />} {q}
      </button>
    )
  }

  const group = groups[suggestGroup] || groups[0]

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Az yorumlu · az rakipli · markasız</div>
          <h1>Ürün Keşfi</h1>
          <p>Amaç: Trendyol’da talebi kanıtlanmış ama henüz doymamış, markalaşmamış ürünleri bulmak. Tarama bitince sonuç ekranı otomatik açılır.</p>
        </div>
      </div>

      <div className="split" style={{ marginBottom: 18 }}>
        <Card title={<><Radar size={17} color="var(--brand)" /> Trendyol taraması</>} sub={`Aktör: ${health?.actors?.trendyol || '—'}`}>
          <form onSubmit={submit} className="stack" style={{ gap: 18 }}>
            <Seg
              value={mode}
              onChange={setMode}
              options={[
                { value: 'keywords', label: 'Anahtar kelime', icon: <Search size={14} /> },
                { value: 'general', label: 'Genel tarama', icon: <Sparkles size={14} /> },
              ]}
            />

            {mode === 'keywords' ? (
              <>
                <Field label="Anahtar kelimeler" hint="Enter veya virgül ile ekleyin. Uzun ve spesifik kelimeler (“bel inceltici kemer”) genel kelimelerden (“korse”) daha az rakipli ürün getirir.">
                  <div className="input" style={{ height: 'auto', minHeight: 44, display: 'flex', flexWrap: 'wrap', gap: 6, padding: 6, alignItems: 'center' }}>
                    {keywords.map((k) => (
                      <span key={k} className="chip on" style={{ height: 28 }}>
                        {k}
                        <span className="x" onClick={() => setKeywords((c) => c.filter((x) => x !== k))}><X size={13} /></span>
                      </span>
                    ))}
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault()
                          addKeyword(draft)
                        } else if (e.key === 'Backspace' && !draft && keywords.length) setKeywords((c) => c.slice(0, -1))
                      }}
                      placeholder={keywords.length ? '' : 'örn. bel inceltici kemer, bacak arası yastık'}
                      style={{ border: 0, outline: 'none', flex: 1, minWidth: 160, height: 30, font: 'inherit', background: 'transparent' }}
                    />
                  </div>
                </Field>
                {group && (
                  <div>
                    <div className="row-between" style={{ marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
                      <span className="label">Hazır anahtar kelimeler</span>
                      <span className="row" style={{ gap: 6 }}>
                        <select className="select" style={{ width: 'auto', height: 32 }} value={suggestGroup} onChange={(e) => setSuggestGroup(Number(e.target.value))}>
                          {groups.map((g, i) => (
                            <option key={g.name} value={i}>{g.name} ({g.queries.length})</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="Bu gruptan henüz taranmamış 5 kelime ekle"
                          onClick={() => setKeywords((cur) => [...new Set([...cur, ...group.queries.filter((q) => !isScanned(q) && !cur.includes(q)).slice(0, 5)])])}
                        >
                          <Shuffle size={13} /> Taranmamış 5
                        </button>
                      </span>
                    </div>
                    <div className="chips">
                      {group.queries.filter((x) => !keywords.includes(x)).map((q) => chip(q, false, () => addKeyword(q)))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="stack" style={{ gap: 12 }}>
                <div className="row-between" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <span className="label">
                    Taranacak kategoriler ({(categories || []).length}/{MAX_QUERIES}) · <span className="muted">{totalScanned}/{allCategories.length} kelime daha önce tarandı</span>
                  </span>
                  <span className="row" style={{ gap: 4 }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCategories(pickUnscanned(groups, isScanned, 20))}>
                      <Shuffle size={13} /> Taranmamış 20
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCategories([])}>Temizle</button>
                  </span>
                </div>
                {groups.map((g) => {
                  const all = g.queries.every((q) => (categories || []).includes(q))
                  return (
                    <div key={g.name}>
                      <div className="row" style={{ marginBottom: 6, gap: 8 }}>
                        <span className="tiny muted strong" style={{ textTransform: 'uppercase', letterSpacing: '.05em' }}>{g.name}</span>
                        <button type="button" className="btn btn-ghost btn-sm" style={{ height: 22, padding: '0 6px' }} onClick={() => toggleGroup(g)}>
                          {all ? 'Hiçbiri' : 'Tümü'}
                        </button>
                      </div>
                      <div className="chips">{g.queries.map((c) => chip(c, (categories || []).includes(c), () => toggleCategory(c)))}</div>
                    </div>
                  )
                })}
                <div className="hint"><History size={11} /> soluk olanlar daha önce tarandı; üzerine gelince ne zaman tarandığını görürsünüz.</div>
              </div>
            )}

            <Field
              label={<><Link2 size={13} style={{ verticalAlign: -2 }} /> Ürün linki veya ürün adı <span className="muted">(opsiyonel)</span></>}
              hint="Trendyol ürün linki yapıştırırsanız ürün doğrudan (satıcı bilgisiyle) çekilir ve kriterlerden bağımsız kaydedilir; birden fazla link boşlukla ayrılabilir. Ürün adı yazarsanız aranır ve adla en çok eşleşen ürün kaydedilir."
            >
              <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                <input
                  className="input"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="https://www.trendyol.com/...-p-123456  veya  ürün adı"
                  style={{ flex: 1 }}
                />
                {target && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTarget('')} title="Temizle"><X size={14} /></button>
                )}
              </div>
              {target.trim() && (
                <div className="tiny muted" style={{ marginTop: 6 }}>
                  {targetUrls.length > 0 && <>{targetUrls.length} Trendyol linki doğrudan çekilecek{targetName ? ' · ' : ''}</>}
                  {targetName && <>“{targetName}” ürün adı olarak aranacak</>}
                </div>
              )}
              {targetUrls.length > 0 && (
                <div className={`banner ${linkMode ? 'tone-brand' : ''}`} style={{ marginTop: 10 }}>
                  <Switch checked={linkOnly} onChange={setLinkOnly}>
                    <span className="small">
                      <b>Sadece bu linki tara (tek sorgu)</b>
                      <span className="muted">
                        {' '}— anahtar kelime / kategori sorguları çalıştırılmaz
                        {t ? `, tahmini maliyet ${fmtUsd(urlCost, 3)}` : ''}
                      </span>
                    </span>
                  </Switch>
                </div>
              )}
            </Field>

            {!linkMode && (
              <>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Sorgu başına kaç ürün çekilsin?</div>
              <div className="opt-grid">
                {PER_QUERY.map((o) => {
                  const c = costFor(o.n)
                  return (
                    <button type="button" key={o.n} className={`opt ${perQuery === o.n ? 'on' : ''}`} onClick={() => setPerQuery(o.n)}>
                      <b>{o.n} ürün</b>
                      <span className="opt-hint">{o.hint}</span>
                      <span className="opt-cost">{c != null ? `≈ ${fmtUsd(c)}` : t ? `${fmtUsd(t.startUsd + o.n * t.unitUsd)} / sorgu` : '—'}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="label" style={{ marginBottom: 8 }}>Hangi ürünler kaydedilsin?</div>
              <Seg
                value={band}
                onChange={setBand}
                options={[
                  { value: 'ideal', label: `İdeal: ${s.reviewLow}–${s.reviewIdeal} değerlendirme (önerilen)` },
                  { value: 'wide', label: `Geniş: ${fmtNum(s.reviewSaturated)}’e kadar` },
                ]}
              />
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              <Field label="Min. fiyat">
                <div className="input-suffix"><input className="input" type="number" min={0} value={minPrice} placeholder="0" onChange={(e) => setMinPrice(e.target.value)} /><span>TL</span></div>
              </Field>
              <Field label="Maks. fiyat">
                <div className="input-suffix"><input className="input" type="number" min={0} value={maxPrice} placeholder={String(s.maxSalePrice || 750)} onChange={(e) => setMaxPrice(e.target.value)} /><span>TL</span></div>
              </Field>
            </div>

            <div className="stack" style={{ gap: 10 }}>
              <Switch checked={skipSeen} onChange={setSkipSeen}>
                <span className="small">
                  Daha önce çekilen ürünleri tekrar çekme <span className="muted">(aynı ürün, renk/beden varyantı veya aynı başlık atlanır; Apify bunları ücretsiz geçip yeni ürün getirir)</span>
                </span>
              </Switch>
              <Switch checked={excludeBranded} onChange={setExcludeBranded}>
                <span className="small">Resmi satıcı rozetli (markalı) ürünleri kaydetme</span>
              </Switch>
              {canEnrich && (
                <Switch checked={autoEnrich} onChange={setAutoEnrich}>
                  <span className="small">Kaydedilen adaylara satıcı adı, ticari ünvan ve favori sayısını çek <span className="muted">(+{fmtUsd(detailUsd, 3)} / ürün, daha önce çekilmişse tekrar ücret yok)</span></span>
                </Switch>
              )}
            </div>
              </>
            )}

            <div className="summary">
              <div><span>Sorgu</span><b>{queries.length}{targetUrls.length ? ` + ${targetUrls.length} link` : ''}</b></div>
              <div><span>Çekilecek ürün</span><b>{fmtNum(queries.length * perQuery + targetUrls.length)}</b></div>
              <div><span>Tahmini maliyet</span><b style={{ color: overBudget ? 'var(--bad)' : undefined }}>{est != null ? fmtUsd(est) : '—'}</b></div>
              <div><span>Kalan bakiye</span><b>{usage?.remainingUsd != null ? fmtUsd(usage.remainingUsd, 2) : '—'}</b></div>
            </div>
            {t && hasWork && (
              <div className="hint" style={{ marginTop: -8 }}>
                {queries.length} çalıştırma × {fmtUsd(t.startUsd)} + {fmtNum(queries.length * perQuery)} ürün × {fmtUsd(t.unitUsd, 4)}
                {targetUrls.length > 0 && <> + {targetUrls.length} link × {fmtUsd(detailUsd ?? t.unitUsd, 3)}</>} ({pricing.tier} plan, canlı fiyat).
                {enrichMax > 0 && <> Satıcı bilgisi yalnızca kriterlere uyan yeni ürünler için çekilir: en fazla +{fmtUsd(enrichMax)}.</>}
              </div>
            )}
            {tooMany && (
              <div className="banner tone-bad">
                <TriangleAlert size={16} style={{ flex: 'none' }} />
                <span className="small">Tek taramada en fazla {MAX_QUERIES} sorgu çalıştırılabilir ({queries.length} seçili).</span>
              </div>
            )}
            {overBudget && (
              <div className="banner tone-bad">
                <TriangleAlert size={16} style={{ flex: 'none' }} />
                <span className="small">Tahmini maliyet kalan bakiyeyi aşabilir. Sorgu veya ürün sayısını azaltın.</span>
              </div>
            )}

            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" disabled={busy || !hasWork || tooMany || !health?.tokenConfigured}>
                {busy ? <Spinner /> : <Play size={15} fill="currentColor" />} {linkMode ? 'Linki tara' : mode === 'general' ? 'Genel taramayı başlat' : 'Taramayı başlat'}
              </button>
            </div>
            {health && !health.tokenConfigured && (
              <div className="banner tone-warn">
                <TriangleAlert size={17} style={{ flex: 'none' }} />
                <span><b>Token gerekli:</b> <code>.env</code> dosyasına <code>APIFY_TOKEN</code> ekleyip sunucuyu yeniden başlatın.</span>
              </div>
            )}
          </form>
        </Card>

        <div className="stack">
          <UsageCard />
          <Card title={<><Info size={16} color="var(--brand)" /> Nasıl daha iyi ürün bulunur?</>}>
            <ul className="facts">
              <li><b>Trendyol sıralaması kullanılmıyor.</b> “En çok satan / en çok değerlendirilen” binlerce yorumlu, doygun ürünleri getirir. Arama Trendyol’un varsayılan sırasıyla yapılır; sistem {s.reviewLow}–{s.reviewIdeal} değerlendirme bandını süzer.</li>
              <li><b>Uzun ve spesifik kelime kullanın.</b> “korse” yerine “doğum sonrası korse”: rakip ve marka azalır. Sorun + çözüm kalıbı iyi çalışır: “… önleyici”, “… giderici”, “… düzeltici”, “… destek”.</li>
              <li><b>Aynı ürün tekrar gelmez.</b> Önceden çekilen ürünler (ve renk/beden varyantları) atlanır; aynı kelimeyi tekrar taradığınızda yeni ürünler gelir.</li>
              <li><b>Markasız (white-label) ürünler öne çıkar.</b> “Genel Markalar” gibi ürünler kendi markanızla satılabilir. Resmi satıcı rozetli, marka sahibinin sattığı ürünler elenir.</li>
              <li><b>Rakip sütunu:</b> taranan ürünlerde aynı ürünü satan farklı satıcı sayısı. Ne kadar çok tararsanız o kadar doğru.</li>
              <li><b>Ücret:</b> ürün başına {t ? fmtUsd(t.unitUsd, 4) : '—'} + sorgu başına {t ? fmtUsd(t.startUsd) : '—'}. Her sorgu ayrı çalıştırılır; limit toplam olduğu için tek çalıştırmada ilk sorgu hepsini doldururdu.</li>
            </ul>
          </Card>
        </div>
      </div>

      <Card title="Tarama geçmişi" sub="Apify çalıştırmaları arka planda izlenir; sayfadan ayrılabilirsiniz">
        <JobList onOpenProduct={openProduct} />
      </Card>
    </div>
  )
}
