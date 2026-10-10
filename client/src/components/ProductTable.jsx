import { Heart, Star, Users } from 'lucide-react'
import { Badge, ExtLink, ScoreRing, StepsMini, Thumb } from './ui.jsx'
import { VERDICT, BAND, PRODUCT_STATUS, fmtTL, fmtNum, fmtCompact, fmtPrice, sellerName } from '../lib/format.js'

/** Ürün listesi ve tarama sonucu ekranında ortak kullanılan tablo / kart görünümü */
export default function ProductTable({ list, view = 'table', openProduct }) {
  if (view === 'grid')
    return (
      <div className="pgrid">
        {list.map((p) => {
          const e = p.eval
          const b = BAND[e.criteria.reviews.band]
          return (
            <article className="pcard" key={p.id} onClick={() => openProduct(p.id)}>
              <div className="pcard-img">
                <Thumb src={p.image} alt={p.title} size={null} />
                <Badge tone={VERDICT[e.verdict].tone} dot>{VERDICT[e.verdict].label}</Badge>
                <ScoreRing score={e.score} size={42} />
              </div>
              <div className="pcard-body">
                <div className="prod-title clamp-2" style={{ fontSize: 13.5 }}>{p.title}</div>
                <div className="row small text-2" style={{ gap: 12 }}>
                  <span className="row" style={{ gap: 4 }}><Star size={13} color="#e7a52a" fill="#e7a52a" /> {p.rating ? p.rating.toFixed(1) : '—'} · {fmtNum(p.ratingCount)}</span>
                  {p.favoriteCount != null && <span className="row" style={{ gap: 4 }}><Heart size={13} color="var(--bad)" /> {fmtCompact(p.favoriteCount)}</span>}
                  <Badge tone={b?.tone}>{b?.short}</Badge>
                </div>
                <div className="small muted ellipsis">{sellerName(p)}</div>
                <div className="pcard-foot">
                  <span className="price">{fmtPrice(p.price, p.currency)}{p.originalPrice > p.price && <span className="price-old">{fmtTL(p.originalPrice)}</span>}</span>
                  <StepsMini steps={e.steps} />
                </div>
              </div>
            </article>
          )
        })}
      </div>
    )

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Ürün</th>
            <th className="num">Fiyat</th>
            <th className="num">Değerlendirme</th>
            <th className="num" title="Taranan ürünlerde benzer ürünü satan farklı satıcı">Rakip</th>
            <th>Satıcı / Mağaza</th>
            <th>7 Madde</th>
            <th className="num">Karar · Skor</th>
          </tr>
        </thead>
        <tbody>
          {list.map((p) => {
            const e = p.eval
            const b = BAND[e.criteria.reviews.band]
            const crowdTone = { pass: 'ok', warn: 'warn', fail: 'bad' }[e.criteria.crowd?.status] || 'muted'
            return (
              <tr key={p.id} onClick={() => openProduct(p.id)}>
                <td>
                  <div className="prod-cell">
                    <Thumb src={p.image} alt={p.title} size={52} />
                    <div style={{ minWidth: 0 }}>
                      <div className="prod-title clamp-2">{p.title}</div>
                      <div className="prod-meta">
                        {p.brand && <span>{p.brand}</span>}
                        {e.criteria.brand?.status === 'pass' && <Badge tone="ok">Markasız</Badge>}
                        {p.officialSeller && <Badge tone="warn">Resmi satıcı</Badge>}
                        {p.isDemo && <Badge tone="info">Demo</Badge>}
                        {p.status !== 'new' && <Badge tone={PRODUCT_STATUS[p.status]?.tone}>{PRODUCT_STATUS[p.status]?.label}</Badge>}
                        <ExtLink href={p.url}>Trendyol</ExtLink>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="num">
                  <div className="strong">{fmtPrice(p.price, p.currency)}</div>
                  {e.estCost != null && <div className="tiny muted">~{fmtTL(Math.round(e.estCost))} tedarik</div>}
                </td>
                <td className="num">
                  <div className="strong">{fmtNum(p.ratingCount)}</div>
                  <Badge tone={b?.tone}>{b?.short}</Badge>
                </td>
                <td className="num">
                  <Badge tone={crowdTone}><Users size={11} /> {p.crowdCount ?? '—'}</Badge>
                </td>
                <td style={{ maxWidth: 170 }}>
                  <div className="ellipsis strong" style={{ fontSize: 13 }}>{sellerName(p)}</div>
                  <ExtLink href={p.storeUrl}>Mağaza</ExtLink>
                </td>
                <td>
                  <StepsMini steps={e.steps} />
                  <div className="tiny muted" style={{ marginTop: 3 }}>{e.passedSteps}/7</div>
                </td>
                <td>
                  <div className="verdict-cell">
                    <Badge tone={VERDICT[e.verdict].tone} dot>{VERDICT[e.verdict].label}</Badge>
                    <ScoreRing score={e.score} size={40} />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
