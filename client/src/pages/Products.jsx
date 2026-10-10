import { useMemo, useState } from 'react'
import { Search, LayoutGrid, List, Download, Package, Radar } from 'lucide-react'
import { useStore } from '../store.jsx'
import { api } from '../api.js'
import { Empty } from '../components/ui.jsx'
import ProductTable from '../components/ProductTable.jsx'
import { VERDICT, BAND, PRODUCT_STATUS, fmtNum } from '../lib/format.js'

export const SORTS = {
  smart: ['Akıllı sıralama', (a, b) => b.eval.passedSteps - a.eval.passedSteps || b.eval.score - a.eval.score || (a.crowdCount ?? 99) - (b.crowdCount ?? 99)],
  score: ['Skor', (a, b) => b.eval.score - a.eval.score],
  crowd: ['En az rakip', (a, b) => (a.crowdCount ?? 99) - (b.crowdCount ?? 99) || b.eval.score - a.eval.score],
  ratingCount: ['Değerlendirme', (a, b) => (b.ratingCount || 0) - (a.ratingCount || 0)],
  priceAsc: ['Fiyat (artan)', (a, b) => (a.price ?? 1e9) - (b.price ?? 1e9)],
  recent: ['En yeni', (a, b) => String(b.firstSeenAt).localeCompare(String(a.firstSeenAt))],
}

export default function Products({ go, openProduct }) {
  const { products, productsLoaded, refreshProducts, toast } = useStore()
  const [q, setQ] = useState('')
  const [verdict, setVerdict] = useState('all')
  const [band, setBand] = useState('all')
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('all')
  const [sort, setSort] = useState('smart')
  const [view, setView] = useState(() => localStorage.getItem('view') || 'table')

  const queries = useMemo(() => [...new Set(products.flatMap((p) => p.queries || []))].sort(), [products])
  const counts = useMemo(() => {
    const c = { all: products.length }
    for (const p of products) c[p.eval.verdict] = (c[p.eval.verdict] || 0) + 1
    return c
  }, [products])

  const list = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('tr')
    return products
      .filter((p) => verdict === 'all' || p.eval.verdict === verdict)
      .filter((p) => band === 'all' || p.eval.criteria.reviews.band === band)
      .filter((p) => status === 'all' || p.status === status)
      .filter((p) => query === 'all' || (p.queries || []).includes(query))
      .filter((p) => !needle || [p.title, p.brand, p.merchantName, p.category].join(' ').toLocaleLowerCase('tr').includes(needle))
      .sort(SORTS[sort][1])
  }, [products, q, verdict, band, status, query, sort])

  const setViewPersist = (v) => {
    setView(v)
    localStorage.setItem('view', v)
  }

  const clearSkipped = async () => {
    const ids = products.filter((p) => p.eval.verdict === 'skip').map((p) => p.id)
    if (!ids.length) return
    await api.bulkDelete(ids)
    await refreshProducts()
    toast(`${ids.length} “Geç” ürünü silindi`, 'ok')
  }

  if (productsLoaded && !products.length)
    return (
      <div className="page">
        <div className="card">
          <Empty icon={Package} title="Ürün listesi boş" action={<button className="btn btn-primary" onClick={() => go('discover')}><Radar size={15} /> Trendyol’da tara</button>}>
            Ürün Keşfi ekranından tarama başlatın.
          </Empty>
        </div>
      </div>
    )

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">{fmtNum(list.length)} / {fmtNum(products.length)} ürün</div>
          <h1>Ürün Listesi</h1>
          <p>Tüm taramalardan kaydedilen ürünler. Detay, rakipler ve tedarikçi için ürüne tıklayın.</p>
        </div>
        <div className="row">
          {counts.skip > 0 && <button className="btn btn-ghost" onClick={clearSkipped}>“Geç” olanları temizle</button>}
          <a className="btn" href="/api/export.csv"><Download size={15} /> CSV</a>
          <div className="seg">
            <button className={view === 'table' ? 'on' : ''} onClick={() => setViewPersist('table')}><List size={14} /> Tablo</button>
            <button className={view === 'grid' ? 'on' : ''} onClick={() => setViewPersist('grid')}><LayoutGrid size={14} /> Kart</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="input-icon" style={{ flex: '1 1 240px', maxWidth: 340 }}>
            <Search size={16} />
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ürün, marka veya satıcı ara" />
          </div>
          <select className="select" style={{ width: 'auto' }} value={band} onChange={(e) => setBand(e.target.value)}>
            <option value="all">Tüm yorum bantları</option>
            {Object.entries(BAND).filter(([k]) => k !== 'unknown').map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="select" style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Tüm durumlar</option>
            {Object.entries(PRODUCT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {queries.length > 1 && (
            <select className="select" style={{ width: 'auto', maxWidth: 200 }} value={query} onChange={(e) => setQuery(e.target.value)}>
              <option value="all">Tüm aramalar</option>
              {queries.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          )}
          <select className="select" style={{ width: 'auto', marginLeft: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value)}>
            {Object.entries(SORTS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div className="toolbar" style={{ paddingTop: 10, paddingBottom: 10 }}>
          <div className="chips">
            <button className={`chip ${verdict === 'all' ? 'on' : ''}`} onClick={() => setVerdict('all')}>Tümü <span className="chip-count">{counts.all}</span></button>
            {Object.entries(VERDICT).map(([k, v]) => (
              <button key={k} className={`chip ${verdict === k ? 'on' : ''}`} onClick={() => setVerdict(k)}>
                {v.label} <span className="chip-count">{counts[k] || 0}</span>
              </button>
            ))}
          </div>
        </div>
        {!list.length ? <Empty icon={Search} title="Filtreyle eşleşen ürün yok">Filtreleri gevşetmeyi deneyin.</Empty> : <ProductTable list={list} view={view} openProduct={openProduct} />}
      </div>
    </div>
  )
}
