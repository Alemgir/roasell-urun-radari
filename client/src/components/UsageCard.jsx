import { useState } from 'react'
import { Wallet, RefreshCw, TriangleAlert } from 'lucide-react'
import { useStore } from '../store.jsx'
import { Badge, Spinner } from './ui.jsx'
import { fmtUsd, timeAgo } from '../lib/format.js'

export default function UsageCard() {
  const { usage, health, refreshUsage } = useStore()
  const [busy, setBusy] = useState(false)

  if (!health?.tokenConfigured) return null
  const refresh = async () => {
    setBusy(true)
    await refreshUsage()
    setBusy(false)
  }
  const pct = usage?.limitUsd ? Math.min((usage.usedUsd / usage.limitUsd) * 100, 100) : 0
  const low = usage?.remainingUsd != null && usage.remainingUsd < 0.5

  return (
    <section className="card card-pad usage">
      <div className="row-between">
        <div className="card-title"><Wallet size={16} color="var(--brand)" /> Apify bakiyesi</div>
        <div className="row" style={{ gap: 6 }}>
          {usage?.tier && <Badge tone="brand">{usage.tier} plan</Badge>}
          <button className="btn btn-ghost btn-sm btn-icon" onClick={refresh} title="Yenile">{busy ? <Spinner size={13} /> : <RefreshCw size={13} />}</button>
        </div>
      </div>
      {!usage ? (
        <div style={{ padding: '14px 0' }}><Spinner /></div>
      ) : usage.error && usage.usedUsd == null ? (
        <div className="small" style={{ color: 'var(--bad)', marginTop: 10 }}>{usage.error}</div>
      ) : (
        <>
          <div className="usage-big" style={{ color: low ? 'var(--bad)' : undefined }}>
            {fmtUsd(usage.remainingUsd, 2)} <span>kaldı</span>
          </div>
          <div className="progress" style={{ marginTop: 10 }}>
            <div style={{ width: `${pct}%`, background: pct > 85 ? 'linear-gradient(90deg,#f08a6c,var(--bad))' : undefined }} />
          </div>
          <div className="row-between small muted" style={{ marginTop: 8 }}>
            <span>Kullanılan <b className="text-2">{fmtUsd(usage.usedUsd, 3)}</b> / {fmtUsd(usage.limitUsd, 2)}</span>
            <span>%{pct.toFixed(1)}</span>
          </div>
          <div className="row-between tiny muted" style={{ marginTop: 6 }}>
            <span>Döngü sonu: {usage.cycleEnd ? new Date(usage.cycleEnd).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) : '—'}</span>
            <span>Aktif çalıştırma {usage.activeRuns}/{usage.maxConcurrentRuns ?? '—'} · {timeAgo(usage.fetchedAt)}</span>
          </div>
          {low && (
            <div className="banner tone-bad" style={{ marginTop: 12, padding: '8px 12px' }}>
              <TriangleAlert size={15} style={{ flex: 'none' }} />
              <span className="small">Bakiye azaldı — taramalar yarıda kesilebilir.</span>
            </div>
          )}
        </>
      )}
    </section>
  )
}
