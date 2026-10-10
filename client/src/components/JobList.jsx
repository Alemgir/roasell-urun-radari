import { Radar, Store, ScanSearch, Megaphone, Square, ArrowUpRight } from 'lucide-react'
import { api } from '../api.js'
import { useStore } from '../store.jsx'
import { Badge, Empty } from './ui.jsx'
import { JOB_TYPE, timeAgo, fmtNum, fmtUsd } from '../lib/format.js'

const ICON = {
  search: [Radar, 'tone-brand'],
  'trendyol-competitors': [Store, 'tone-warn'],
  lens: [ScanSearch, 'tone-info'],
  meta: [Megaphone, 'tone-ok'],
  enrich: [Store, 'tone-info'],
}
const STATUS = { running: ['Çalışıyor', 'brand'], succeeded: ['Tamamlandı', 'ok'], failed: ['Başarısız', 'bad'] }
const TERMINAL = ['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT']

export default function JobList({ limit, onOpenProduct }) {
  const { jobs, refreshJobs, toast } = useStore()
  const list = limit ? jobs.slice(0, limit) : jobs

  if (!list.length)
    return (
      <Empty icon={Radar} title="Henüz tarama yok">
        Ürün Keşfi ekranından Trendyol taraması başlattığınızda Apify çalıştırmaları burada izlenir.
      </Empty>
    )

  const abort = async (id) => {
    try {
      await api.abortJob(id)
      refreshJobs()
    } catch (err) {
      toast(err.message, 'bad')
    }
  }

  return (
    <div>
      {list.map((j) => {
        const [Icon, tone] = ICON[j.type] || ICON.search
        const [label, stTone] = STATUS[j.status] || STATUS.running
        const total = j.totalRuns || j.runs?.length || 1
        const done = (j.runs || []).filter((r) => TERMINAL.includes(r.status)).length
        const m = j.meta || {}
        return (
          <div className="job" key={j.id}>
            <span className={`job-icon ${tone}`}>
              <Icon size={17} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="row" style={{ gap: 8 }}>
                <span className="strong ellipsis" style={{ maxWidth: 420 }}>{j.label}</span>
                <Badge tone={stTone} dot>{label}</Badge>
              </div>
              <div className="small muted" style={{ marginTop: 2 }}>
                {JOB_TYPE[j.type]} · {timeAgo(j.createdAt)}
                {j.type === 'search' && m.perQuery && ` · ${m.queries?.length || 1} sorgu × ${m.perQuery} ürün`}
                {j.costUsd ? ` · ${j.status === 'running' ? 'şu ana kadar' : 'gerçek maliyet'} ${fmtUsd(j.costUsd)}` : ''}
              </div>
              {j.status === 'succeeded' && j.type === 'search' && (
                <div className="small text-2" style={{ marginTop: 3 }}>
                  {fmtNum(m.fetched)} ürün çekildi → <b>{fmtNum(m.added)}</b> yeni, {fmtNum(m.updated)} güncellendi
                  {m.filtered ? `, ${fmtNum(m.filtered)} kriter dışı elendi` : ''}
                  {m.skipped ? `, ${fmtNum(m.skipped)} daha önce çekildiği için atlandı` : ''}
                  {m.duplicates ? `, ${fmtNum(m.duplicates)} tekrar/varyant birleştirildi` : ''}
                </div>
              )}
              {j.status === 'succeeded' && j.type !== 'search' && <div className="small text-2" style={{ marginTop: 3 }}>{fmtNum(j.resultCount)} sonuç</div>}
              {j.status === 'running' && (
                <div className="row" style={{ marginTop: 8, gap: 10, flexWrap: 'nowrap' }}>
                  <div className={`progress ${total > 1 ? '' : 'indeterminate'}`} style={{ flex: 1, maxWidth: 360 }}>
                    <div style={{ width: `${Math.max((done / total) * 100, 6)}%` }} />
                  </div>
                  {total > 1 && <span className="tiny muted">{done}/{total} sorgu</span>}
                </div>
              )}
              {j.status === 'failed' && <div className="small" style={{ color: 'var(--bad)', marginTop: 4 }}>{j.error}</div>}
              {m.failedRuns?.length > 0 && (
                <div className="tiny" style={{ color: 'var(--warn)', marginTop: 4 }}>
                  Başarısız sorgular: {m.failedRuns.map((f) => `${f.role} (${f.message})`).join(' · ')}
                </div>
              )}
            </div>
            <div className="row" style={{ gap: 6 }}>
              {j.type === 'search' && j.status === 'succeeded' && (
                <button className="btn btn-soft btn-sm" onClick={() => { window.location.hash = `scan/${j.id}` }}>
                  Sonuçlar <ArrowUpRight size={13} />
                </button>
              )}
              {j.productId && onOpenProduct && (
                <button className="btn btn-ghost btn-sm" onClick={() => onOpenProduct(j.productId)}>
                  Ürün <ArrowUpRight size={13} />
                </button>
              )}
              {j.status === 'running' && (
                <button className="btn btn-sm btn-danger" onClick={() => abort(j.id)}>
                  <Square size={11} fill="currentColor" /> Durdur
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
