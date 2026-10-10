import { useMemo } from 'react'
import { Package, Sparkles, Star, BadgeCheck, ArrowRight, Radar, Target, TriangleAlert } from 'lucide-react'
import { useStore } from '../store.jsx'
import { api } from '../api.js'
import { Card, Empty, ScoreRing, StepsMini, Thumb, Badge } from '../components/ui.jsx'
import JobList from '../components/JobList.jsx'
import UsageCard from '../components/UsageCard.jsx'
import { VERDICT, BAND, fmtTL, fmtNum } from '../lib/format.js'

const STEP_NAMES = ['Yorumlama', 'Fiyat', 'Baz mağaza', 'İlk tıklama', 'Kreatif kontrol', 'TR rakip', 'Tedarikçi']
const VERDICT_COLORS = { ready: '#c9a14a', strong: '#1aa35f', consider: '#f2b544', weak: '#c9c5bd', skip: '#e36a58' }

export default function Dashboard({ go, openProduct }) {
  const { products, settings, health, refreshProducts, toast } = useStore()

  const stats = useMemo(() => {
    const count = (fn) => products.filter(fn).length
    return {
      total: products.length,
      strong: count((p) => ['strong', 'ready'].includes(p.eval.verdict)),
      ideal: count((p) => p.eval.criteria.reviews.band === 'ideal'),
      approved: count((p) => p.status === 'approved' || p.eval.verdict === 'ready'),
      verdicts: Object.keys(VERDICT).map((v) => ({ v, n: count((p) => p.eval.verdict === v) })),
      funnel: STEP_NAMES.map((name, i) => ({ name, n: count((p) => p.eval.steps[i]?.status === 'pass') })),
      top: products
        .filter((p) => p.eval.verdict !== 'skip' && p.status !== 'rejected')
        .sort((a, b) => b.eval.passedSteps - a.eval.passedSteps || b.eval.score - a.eval.score || (b.favoriteCount || 0) - (a.favoriteCount || 0))
        .slice(0, 6),
    }
  }, [products])

  const loadDemo = async () => {
    await api.loadDemo()
    await refreshProducts()
    toast('Demo verisi yüklendi', 'ok')
  }

  const s = settings || {}
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Türkiye Pazarı · Trendyol + Kapıda Ödeme</div>
          <h1>Ürün Radarı</h1>
          <p>Roasell’in 6 ürün kriteri ve 7 maddelik araştırma süreci, Trendyol verisiyle otomatik puanlanır.</p>
        </div>
        <button className="btn btn-primary" onClick={() => go('discover')}>
          <Radar size={16} /> Yeni tarama
        </button>
      </div>

      {health && !health.tokenConfigured && (
        <div className="banner tone-warn" style={{ marginBottom: 18 }}>
          <TriangleAlert size={18} style={{ flex: 'none', marginTop: 1 }} />
          <div className="grow">
            <b>Apify token tanımlı değil.</b> Proje kökündeki <code>.env</code> dosyasına <code>APIFY_TOKEN=...</code> ekleyip{' '}
            <code>npm run dev</code> komutunu yeniden başlatın. O zamana kadar arayüzü demo verisiyle deneyebilirsiniz.
          </div>
          {!products.length && (
            <button className="btn btn-sm" onClick={loadDemo}>
              Demo verisi yükle
            </button>
          )}
        </div>
      )}

      <div className="hero" style={{ marginBottom: 18 }}>
        <Target className="hero-glyph" size={220} strokeWidth={1.2} />
        <h2>Doğru ürün = kanıtlanmış talep + düşük maliyet + az rakip</h2>
        <p>Trendyol’da zaten satılan, sorun çözen, kargo dostu ve rekabeti doymamış ürünleri bulun. Tedarikçiyle anlaşmadan mağaza kurulmaz.</p>
        <div className="hero-rules">
          <div className="hero-rule"><span>Maks. satış</span><b>{fmtTL(s.maxSalePrice)}</b></div>
          <div className="hero-rule"><span>Tedarik maliyeti</span><b>{s.costMin}–{s.costMax} TL</b></div>
          <div className="hero-rule"><span>İdeal değerlendirme</span><b>{s.reviewLow}–{s.reviewIdeal}</b></div>
          <div className="hero-rule"><span>Meta reklam</span><b>{s.metaAdsTest}+ / {s.metaAdsScale}+</b></div>
          <div className="hero-rule"><span>Markalaşmış rakip</span><b>≤ {s.brandedCompetitorLimit}</b></div>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <Stat icon={Package} tone="tone-brand" label="Toplam ürün" value={stats.total} foot="Veritabanındaki Trendyol ürünleri" />
        <Stat icon={Sparkles} tone="tone-ok" label="Güçlü aday" value={stats.strong} foot="Skor ≥ 85, ideal bant, kritik ret yok" />
        <Stat icon={Star} tone="tone-warn" label="İdeal yorum bandı" value={stats.ideal} foot={`${s.reviewLow}–${s.reviewIdeal} değerlendirme`} />
        <Stat icon={BadgeCheck} tone="tone-gold" label="Onaylanan / 7/7" value={stats.approved} foot="Mağazaya geçmeye hazır" />
      </div>

      <div className="split">
        <Card
          title="En iyi adaylar"
          sub="Tamamlanan madde sayısı ve kriter skoruna göre"
          actions={
            <button className="btn btn-ghost btn-sm" onClick={() => go('products')}>
              Tümü <ArrowRight size={14} />
            </button>
          }
        >
          {!stats.top.length ? (
            <Empty icon={Radar} title="Henüz ürün yok" action={<button className="btn btn-primary" onClick={() => go('discover')}>Trendyol’da tara</button>}>
              Anahtar kelimelerle Trendyol taraması başlatın; ürünler otomatik puanlanıp burada sıralanır.
            </Empty>
          ) : (
            <div className="list">
              {stats.top.map((p) => (
                <div key={p.id} className="list-item clickable" onClick={() => openProduct(p.id)}>
                  <Thumb src={p.image} alt={p.title} size={50} />
                  <div className="grow">
                    <div className="strong ellipsis">{p.title}</div>
                    <div className="prod-meta">
                      <span className="mono">{fmtTL(p.price)}</span>·<span>{fmtNum(p.ratingCount)} değ.</span>·
                      <Badge tone={BAND[p.eval.criteria.reviews.band]?.tone}>{BAND[p.eval.criteria.reviews.band]?.short}</Badge>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <StepsMini steps={p.eval.steps} />
                    <div className="tiny muted" style={{ marginTop: 3 }}>{p.eval.passedSteps}/7 madde</div>
                  </div>
                  <ScoreRing score={p.eval.score} size={42} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="stack">
          <UsageCard />
          <Card title="Karar dağılımı" sub="Otomatik değerlendirme sonucu">
            <div className="verdict-bar">
              {stats.verdicts.filter((x) => x.n).map((x) => (
                <div key={x.v} style={{ flex: x.n, background: VERDICT_COLORS[x.v] }} title={`${VERDICT[x.v].label}: ${x.n}`} />
              ))}
            </div>
            <div className="legend">
              {stats.verdicts.map((x) => (
                <span key={x.v}>
                  <i style={{ background: VERDICT_COLORS[x.v] }} />
                  {VERDICT[x.v].label} <b>{x.n}</b>
                </span>
              ))}
            </div>
          </Card>

          <Card title="7 madde ilerlemesi" sub="Her maddeyi geçen ürün sayısı">
            <div className="funnel">
              {stats.funnel.map((f, i) => (
                <div className="funnel-row" key={f.name}>
                  <span className="text-2"><b className="muted mono">{i + 1}.</b> {f.name}</span>
                  <div className="progress"><div style={{ width: `${stats.total ? (f.n / stats.total) * 100 : 0}%` }} /></div>
                  <span className="mono strong" style={{ textAlign: 'right' }}>{f.n}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Son taramalar" actions={<button className="btn btn-ghost btn-sm" onClick={() => go('discover')}>Tümü <ArrowRight size={14} /></button>}>
            <JobList limit={4} onOpenProduct={openProduct} />
          </Card>
        </div>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, tone, label, value, foot }) {
  return (
    <div className="card stat">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className={`stat-icon ${tone}`}><Icon size={16} /></span>
      </div>
      <div className="stat-value">{fmtNum(value)}</div>
      <div className="stat-foot">{foot}</div>
    </div>
  )
}
