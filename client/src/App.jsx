import { useEffect, useState } from 'react'
import { LayoutDashboard, Radar, Package, SlidersHorizontal, Target, KeyRound, LoaderCircle } from 'lucide-react'
import { useStore } from './store.jsx'
import { Toasts } from './components/ui.jsx'
import ProductDrawer from './components/ProductDrawer.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Discover from './pages/Discover.jsx'
import Products from './pages/Products.jsx'
import Settings from './pages/Settings.jsx'
import ScanResults from './pages/ScanResults.jsx'
import { fmtUsd } from './lib/format.js'

const PAGES = { dashboard: Dashboard, discover: Discover, products: Products, settings: Settings, scan: ScanResults }
const readHash = () => {
  const [page, param] = window.location.hash.slice(1).split('/')
  return PAGES[page] ? { page, param: param || null } : { page: 'dashboard', param: null }
}

export default function App() {
  const { products, health, usage, hasRunning, jobs, lastFinished } = useStore()
  const [route, setRoute] = useState(readHash)
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    const onHash = () => setRoute(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (p) => {
    window.location.hash = p
    window.scrollTo({ top: 0 })
  }

  // Ürün taraması bitince o taramanın sonuç ekranını aç
  useEffect(() => {
    if (lastFinished?.type === 'search' && lastFinished.status === 'succeeded') {
      setOpenId(null)
      go(`scan/${lastFinished.id}`)
    }
  }, [lastFinished])

  const { page, param } = route
  const nav = [
    { id: 'dashboard', label: 'Panel', icon: LayoutDashboard },
    { id: 'discover', label: 'Ürün Keşfi', icon: Radar, count: hasRunning ? jobs.filter((j) => j.status === 'running').length : null, running: hasRunning, match: ['discover', 'scan'] },
    { id: 'products', label: 'Ürün Listesi', icon: Package, count: products.length || null },
    { id: 'settings', label: 'Kriterler', icon: SlidersHorizontal },
  ]

  const Page = PAGES[page]
  const navItems = nav.map((n) => (
    <button key={n.id} className={`nav-item ${(n.match || [n.id]).includes(page) ? 'active' : ''}`} onClick={() => go(n.id)}>
      <n.icon size={17} />
      {n.label}
      {n.count != null && (
        <span className="count">
          {n.running ? <LoaderCircle size={11} className="spin" style={{ verticalAlign: -1 }} /> : n.count}
        </span>
      )}
    </button>
  ))

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Target size={19} strokeWidth={2.4} />
          </span>
          <div>
            <div className="brand-name">Roasell</div>
            <div className="brand-sub">Trendyol Ürün Radarı</div>
          </div>
        </div>
        <div className="nav-label">Menü</div>
        {navItems}
        <div className="sidebar-foot">
          <div className="api-pill">
            <KeyRound size={16} color={health?.tokenConfigured ? 'var(--ok)' : 'var(--warn)'} />
            <div>
              <b>
                {!health?.tokenConfigured ? 'Apify token yok' : usage?.remainingUsd != null ? `Apify · ${fmtUsd(usage.remainingUsd, 2)} kaldı` : 'Apify bağlı'}
              </b>
              {!health?.tokenConfigured ? '.env → APIFY_TOKEN' : usage?.limitUsd ? `${fmtUsd(usage.usedUsd, 3)} / ${fmtUsd(usage.limitUsd, 2)} kullanıldı` : 'Taramalar hazır'}
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <nav className="mobile-nav">{navItems}</nav>
        <Page key={`${page}/${param || ''}`} go={go} openProduct={setOpenId} param={param} />
      </main>

      {openId && <ProductDrawer id={openId} onClose={() => setOpenId(null)} />}
      <Toasts />
    </div>
  )
}
