import { useState } from 'react'
import { Store, ScanSearch, Globe, ShoppingBag, Megaphone, Search, BadgeCheck, Info } from 'lucide-react'
import { api } from '../api.js'
import { Badge, Card, Empty, ExtLink, Spinner, Switch, Thumb } from './ui.jsx'
import { fmtNum, fmtPrice, fmtTL, fmtUsd, timeAgo, brandFromDomain, sellerName } from '../lib/format.js'
import { useStore } from '../store.jsx'
import { adLibraryUrl } from './ProductDrawer.jsx'

const simTone = (s) => (s >= 0.6 ? 'ok' : s >= 0.4 ? 'warn' : 'muted')

export default function CompetitorsTab({ p, similar, suggestedQuery, setManual, run, running }) {
  const m = p.manual || {}
  const { pricing } = useStore()
  const lensCost = pricing ? ` · ≈${fmtUsd(2 * (pricing.lens.startUsd + pricing.lens.unitUsd))}` : ''
  const tyCost = pricing ? ` · ≈${fmtUsd(pricing.trendyol.startUsd + 30 * pricing.trendyol.unitUsd)}` : ''
  const [q, setQ] = useState(suggestedQuery || '')
  const [showAllLens, setShowAllLens] = useState(false)
  const ty = p.competitors?.trendyol
  const lensTr = p.competitors?.lensTr
  const lensGlobal = p.competitors?.lensGlobal

  const groupByDomain = (items) => {
    const map = new Map()
    for (const it of items) {
      const cur = map.get(it.domain) || { ...it, hits: 0 }
      cur.hits++
      map.set(it.domain, cur)
    }
    return [...map.values()]
  }
  const trStores = groupByDomain((lensTr?.items || []).filter((i) => i.kind === 'store'))
  const trMarkets = groupByDomain((lensTr?.items || []).filter((i) => i.kind === 'marketplace'))
  const trOther = groupByDomain((lensTr?.items || []).filter((i) => i.kind !== 'store' && i.kind !== 'marketplace'))
  const globalStores = groupByDomain((lensGlobal?.items || []).filter((i) => i.kind === 'store' && !i.isTurkish))
  const brandedCount = Object.values(m.brandedDomains || {}).filter(Boolean).length

  const lensButton = (
    <button className="btn btn-sm btn-primary" disabled={running.has('lens') || !p.image} onClick={() => run(() => api.lens(p.id))}>
      {running.has('lens') ? <Spinner size={13} /> : <ScanSearch size={14} />} {lensTr ? 'Yeniden tara' : 'Google Lens ile tara'}{lensCost}
    </button>
  )

  return (
    <div className="stack" style={{ gap: 16 }}>
      {/* Aynı listing'deki diğer satıcılar */}
      {p.otherMerchants?.length > 0 && (
        <Card title={<><Store size={16} color="var(--brand)" /> Aynı ürünü satan diğer Trendyol satıcıları</>} sub="Ürün sayfasındaki “Diğer satıcılar” — doğrudan rakip ve alternatif tedarikçi">
          {p.otherMerchants.map((o) => (
            <div className="comp" key={o.id || o.name}>
              <Store size={16} color="var(--muted)" />
              <div className="strong">{o.name}{o.score ? <span className="tiny muted"> · {o.score} puan</span> : null}</div>
              <div className="row" style={{ gap: 10 }}>
                <span className="mono small">{fmtTL(o.price)}</span>
                <ExtLink href={o.storeUrl}>Mağaza</ExtLink>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Trendyol rakip ürünleri */}
      <Card
        title={<><ShoppingBag size={16} color="var(--brand)" /> Trendyol’daki rakip ürünler</>}
        sub={ty ? `“${ty.query}” araması · ${timeAgo(ty.updatedAt)}` : 'Benzer ürünü satan diğer mağazalar, fiyatları ve değerlendirme sayıları'}
      >
        <div className="row" style={{ flexWrap: 'nowrap', marginBottom: 12 }}>
          <div className="input-icon grow">
            <Search size={15} />
            <input className="input input-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rakip arama sorgusu" />
          </div>
          <button className="btn btn-sm btn-soft" disabled={!q.trim() || running.has('trendyol-competitors')} onClick={() => run(() => api.trendyolCompetitors(p.id, { query: q }))}>
            {running.has('trendyol-competitors') ? <Spinner size={13} /> : <Store size={14} />} Trendyol’da tara{tyCost}
          </button>
        </div>
        {ty?.items?.length ? (
          <div>
            {ty.items.slice(0, 15).map((c) => (
              <div className="comp" key={c.id}>
                <Thumb src={c.image} alt={c.title} size={42} />
                <div style={{ minWidth: 0 }}>
                  <div className="small strong clamp-2">{c.title}</div>
                  <div className="prod-meta">
                    <span className="strong text-2">{sellerName(c)}</span>
                    {c.sameMerchant && <Badge tone="info">aynı satıcı</Badge>}
                    <span>· {fmtNum(c.ratingCount)} değ.</span>
                    <ExtLink href={c.url}>Ürün</ExtLink>
                    <ExtLink href={c.storeUrl}>Mağaza</ExtLink>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="strong mono small">{fmtTL(c.price)}</div>
                  <span className={`sim tone-${simTone(c.similarity)}`}>%{Math.round(c.similarity * 100)} benzer</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="small muted">Henüz Trendyol rakip taraması yapılmadı. Sorgu otomatik olarak başlıktan üretildi, düzenleyebilirsiniz.</div>
        )}
        {similar?.length > 0 && (
          <>
            <hr className="divider" />
            <div className="label" style={{ marginBottom: 6 }}>Veritabanındaki benzer ürünler (ek maliyet yok)</div>
            {similar.slice(0, 6).map((c) => (
              <div className="comp" key={c.id}>
                <Thumb src={c.image} alt={c.title} size={36} />
                <div style={{ minWidth: 0 }}>
                  <div className="small ellipsis">{c.title}</div>
                  <div className="prod-meta"><span>{sellerName(c)}</span>· <span>{fmtNum(c.ratingCount)} değ.</span><ExtLink href={c.storeUrl}>Mağaza</ExtLink></div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <span className="mono small">{fmtTL(c.price)}</span>
                  <span className={`sim tone-${simTone(c.similarity)}`}>%{Math.round(c.similarity * 100)}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </Card>

      {/* Google Lens — TR */}
      <Card
        title={<><ScanSearch size={16} color="var(--brand)" /> Google Lens — Türkiye’deki rakipler</>}
        sub={lensTr ? `Madde 6 · ${timeAgo(lensTr.updatedAt)} · markalaşmış: ${brandedCount}` : 'Madde 6 · Ürün görseliyle aynı ürünü satan TR mağazaları'}
        actions={lensButton}
      >
        {!lensTr ? (
          <Empty icon={ScanSearch} title="Görselden rakip taraması yapılmadı">
            Google Lens hem Türkiye’deki rakip mağazaları hem de yurt dışındaki baz mağaza adaylarını bulur (2 tarama, yaklaşık $0,012).
          </Empty>
        ) : (
          <>
            <div className="banner tone-info" style={{ marginBottom: 12, padding: '10px 12px' }}>
              <Info size={15} style={{ flex: 'none', marginTop: 2 }} />
              <span className="small">Markalaşmış rakipleri işaretleyin: <b>özel logo/marka tasarımı</b>, <b>influencer/PR</b> çalışması, <b>6+ aydır satış</b>. 2’den fazlaysa ürün risklidir.</span>
            </div>
            <div className="label" style={{ marginBottom: 4 }}>Bağımsız mağazalar ({trStores.length})</div>
            {trStores.length ? trStores.map((c) => (
              <div className="comp" key={c.domain}>
                <Globe size={16} color={c.isTurkish ? 'var(--brand)' : 'var(--muted)'} />
                <div style={{ minWidth: 0 }}>
                  <div className="small strong ellipsis">{c.domain} {c.isTurkish && <Badge tone="brand">TR</Badge>}</div>
                  <div className="tiny muted ellipsis">{c.title}</div>
                </div>
                <div className="row" style={{ gap: 10 }}>
                  {c.price != null && <span className="mono small">{fmtPrice(c.price, c.currency)}</span>}
                  <ExtLink href={c.link}>Aç</ExtLink>
                  <label className="row small" style={{ gap: 5, cursor: 'pointer' }} title="Markalaşmış rakip">
                    <input type="checkbox" checked={!!m.brandedDomains?.[c.domain]} onChange={(e) => setManual({ brandedDomains: { [c.domain]: e.target.checked || null } })} />
                    <BadgeCheck size={14} color={m.brandedDomains?.[c.domain] ? 'var(--bad)' : 'var(--muted)'} /> Marka
                  </label>
                </div>
              </div>
            )) : <div className="small muted">Bağımsız mağaza bulunamadı — rekabet düşük olabilir.</div>}

            {trMarkets.length > 0 && (
              <>
                <div className="label" style={{ margin: '14px 0 4px' }}>Pazaryerleri ({trMarkets.length})</div>
                <div className="chips">
                  {trMarkets.map((c) => (
                    <a key={c.domain} className="chip" href={c.link} target="_blank" rel="noreferrer">{c.domain} <span className="chip-count">{c.hits}</span></a>
                  ))}
                </div>
              </>
            )}
            {trOther.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAllLens((x) => !x)}>{showAllLens ? 'Gizle' : `Diğer sonuçlar (${trOther.length})`}</button>
                {showAllLens && <div className="chips" style={{ marginTop: 8 }}>{trOther.map((c) => <a key={c.domain} className="chip" href={c.link} target="_blank" rel="noreferrer">{c.domain}</a>)}</div>}
              </div>
            )}
            <hr className="divider" />
            <Switch checked={m.competitorsReviewed} onChange={(v) => setManual({ competitorsReviewed: v })}>
              <span className="small">Rakipleri inceledim — markalaşmış olanları işaretledim</span>
            </Switch>
          </>
        )}
      </Card>

      {/* Google Lens — yurt dışı baz mağaza */}
      <Card
        title={<><Globe size={16} color="var(--brand)" /> Yurt dışı baz mağaza adayları</>}
        sub="Madde 3 · Aynı ürünü başarıyla satan, pazaryeri dışı mağazalar (Shopify vb.)"
      >
        {!lensGlobal ? (
          <div className="small muted">Google Lens taraması sonrası listelenir.</div>
        ) : globalStores.length ? (
          globalStores.slice(0, 12).map((c) => (
            <div className="comp" key={c.domain}>
              <Globe size={16} color="var(--muted)" />
              <div style={{ minWidth: 0 }}>
                <div className="small strong ellipsis">{c.domain}</div>
                <div className="tiny muted ellipsis">{c.title}</div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                {c.price != null && <span className="mono small">{fmtPrice(c.price, c.currency)}</span>}
                <ExtLink href={c.link}>Aç</ExtLink>
                <a className="btn btn-ghost btn-sm" href={adLibraryUrl(brandFromDomain(c.domain))} target="_blank" rel="noreferrer" title="Meta Ads Library"><Megaphone size={13} /></a>
                <button className={`btn btn-sm ${m.baseStoreUrl === c.link ? 'btn-primary' : 'btn-soft'}`} onClick={() => setManual({ baseStoreUrl: c.link, metaQuery: brandFromDomain(c.domain) })}>
                  {m.baseStoreUrl === c.link ? 'Baz mağaza' : 'Baz seç'}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="small muted">Yurt dışında bağımsız mağaza bulunamadı. Facebook Reklam Kütüphanesi’nde ürün adıyla manuel arama yapmayı deneyin.</div>
        )}
      </Card>
    </div>
  )
}
