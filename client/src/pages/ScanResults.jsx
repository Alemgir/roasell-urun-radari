import { useMemo, useState } from 'react'
import { ArrowLeft, Radar, LayoutGrid, List, Search, Sparkles, Filter, Wallet } from 'lucide-react'
import { useStore } from '../store.jsx'
import { Badge, Empty, Spinner } from '../components/ui.jsx'
import ProductTable from '../components/ProductTable.jsx'
import { SORTS } from './Products.jsx'
import { VERDICT, fmtNum, fmtUsd, timeAgo } from '../lib/format.js'

/** Tek bir taramanın sonuç ekranı — tarama bitince otomatik açılır. */
export default function ScanResults({ go, openProduct, param }) {
  const { jobs, products } = useStore()
  const job = jobs.find((j) => j.id === param)
  const [verdict, setVerdict] = useState('all')
  const [sort, setSort] = useState('smart')
  const [view, setView] = useState(() => localStorage.getItem('view') || 'table')

  const scanProducts = useMemo(() => {
    const ids = new Set(job?.meta?.productIds || [])
    return products.filter((p) => ids.has(p.id) || (p.jobIds || []).includes(param))
  }, [products, job, param])

  const counts = useMemo(() => {
    const c = { all: scanProducts.length }
    for (const p of scanProducts) c[p.eval.verdict] = (c[p.eval.verdict] || 0) + 1
    return c
  }, [scanProducts])

  const list = useMemo(
    () => scanProducts.filter((p) => verdict === 'all' || p.eval.verdict === verdict).sort(SORTS[sort][1]),
    [scanProducts, verdict, sort],
  )

  if (!job)
    return (
      <div className="page">
        <div className="card">
          <Empty icon={Radar} title="Tarama bulunamadı" action={<button className="btn" onClick={() => go('discover')}>Ürün Keşfi’ne dön</button>} />
        </div>
      </div>
    )

  const m = job.meta || {}
  const potential = (counts.strong || 0) + (counts.ready || 0) + (counts.consider || 0)

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }} onClick={() => go('discover')}>
        <ArrowLeft size={14} /> Ürün Keşfi
      </button>
      <div className="page-head">
        <div>
          <div className="eyebrow">Tarama sonucu · {timeAgo(job.createdAt)}</div>
          <h1>{job.label}</h1>
          <p>Bu taramada kriterlere uyup kaydedilen ürünler. En az rakipli ve markasız ürünler üstte.</p>
        </div>
        <div className="seg">
          <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}><List size={14} /> Tablo</button>
          <button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')}><LayoutGrid size={14} /> Kart</button>
        </div>
      </div>

      {job.status === 'running' ? (
        <div className="card card-pad row" style={{ marginBottom: 18 }}>
          <Spinner /> <span className="strong">Tarama sürüyor…</span>
          <span className="muted small">Sonuçlar bitince bu ekranda görünecek.</span>
        </div>
      ) : (
        <div className="grid grid-4" style={{ marginBottom: 18 }}>
          <Stat icon={Search} label="Çekilen ürün" value={fmtNum(m.fetched)} foot={`${m.queries?.length || 0} sorgu × ${m.perQuery || '—'} ürün${m.targetUrls?.length ? ` + ${m.targetUrls.length} link` : ''}`} />
          <Stat
            icon={Filter}
            label="Elenen / atlanan"
            value={fmtNum((m.filtered || 0) + (m.skipped || 0) + (m.duplicates || 0))}
            foot={`${fmtNum(m.filtered || 0)} kriter dışı · ${fmtNum(m.skipped || 0)} önceden çekilmiş · ${fmtNum(m.duplicates || 0)} tekrar`}
          />
          <Stat icon={Sparkles} label="Potansiyel ürün" value={fmtNum(potential)} foot={`${fmtNum(scanProducts.length)} kayıtlı üründen`} />
          <Stat icon={Wallet} label="Gerçek maliyet" value={job.costUsd ? fmtUsd(job.costUsd) : '—'} foot={job.status === 'failed' ? job.error : 'Apify faturası'} />
        </div>
      )}

      {m.perQueryResults && (
        <div className="chips" style={{ marginBottom: 14 }}>
          {Object.entries(m.perQueryResults).map(([q, n]) => (
            <Badge key={q} tone={n ? 'brand' : 'muted'}>{q === '#urun-linki' ? 'Ürün linki' : q}: {n}</Badge>
          ))}
        </div>
      )}

      <div className="card">
        <div className="toolbar">
          <div className="chips">
            <button className={`chip ${verdict === 'all' ? 'on' : ''}`} onClick={() => setVerdict('all')}>Tümü <span className="chip-count">{counts.all}</span></button>
            {Object.entries(VERDICT).map(([k, v]) => (
              <button key={k} className={`chip ${verdict === k ? 'on' : ''}`} onClick={() => setVerdict(k)}>
                {v.label} <span className="chip-count">{counts[k] || 0}</span>
              </button>
            ))}
          </div>
          <select className="select" style={{ width: 'auto', marginLeft: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value)}>
            {Object.entries(SORTS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        {!list.length ? (
          <Empty icon={Search} title={job.status === 'running' ? 'Sonuçlar bekleniyor' : 'Bu taramada kriterlere uyan ürün yok'}>
            {job.status === 'running' ? '' : 'Daha spesifik (uzun) anahtar kelimeler deneyin veya yorum bandını “Geniş” seçin.'}
          </Empty>
        ) : (
          <ProductTable list={list} view={view} openProduct={openProduct} />
        )}
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, foot }) {
  return (
    <div className="card stat">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-icon tone-brand"><Icon size={16} /></span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot ellipsis">{foot}</div>
    </div>
  )
}
