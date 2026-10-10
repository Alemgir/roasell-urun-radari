import { useEffect, useState } from 'react'
import { Store, Copy, Phone, MessageCircle, TriangleAlert, ShieldCheck, RefreshCw, Mail } from 'lucide-react'
import { useStore } from '../store.jsx'
import { api } from '../api.js'
import { Badge, BlurInput, Card, ExtLink, Field, Seg, Spinner } from './ui.jsx'
import { fmtTL, fmtUsd, sellerName } from '../lib/format.js'

const fill = (tpl, p, name) =>
  String(tpl || '')
    .replaceAll('{satici}', name || 'X')
    .replaceAll('{urun}', p.title)

// Türkiye numarasını wa.me formatına çevirir: 0532… / 532… / +90 532… → 90532…
const waNumber = (phone) => {
  let d = String(phone || '').replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('0')) d = `9${d}`
  if (d.length === 10 && d.startsWith('5')) d = `90${d}`
  return d
}

export default function SupplierTab({ p, settings, setManual, run, running }) {
  const { toast, pricing } = useStore()
  const ev = pricing?.trendyol?.events || {}
  const detailCost = pricing ? (pricing.trendyol.startUsd || 0) + (ev.productDetail || 0) : null
  const googleQ = (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`
  const m = p.manual || {}
  const name = m.supplierName || p.merchantName
  const [msg, setMsg] = useState(() => m.supplierMessage || fill(settings?.whatsappTemplate, p, name))

  useEffect(() => {
    if (!m.supplierMessage) setMsg(fill(settings?.whatsappTemplate, p, name))
  }, [name, settings?.whatsappTemplate]) // eslint-disable-line react-hooks/exhaustive-deps

  const phone = waNumber(m.supplierPhone)
  const copy = async () => {
    await navigator.clipboard.writeText(msg)
    toast('Mesaj panoya kopyalandı', 'ok')
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <Card
        title={<><Store size={16} color="var(--brand)" /> Trendyol satıcısı</>}
        sub="Madde 7 · Toplu alım yapılacak tedarikçi"
        actions={
          <>
            <button className="btn btn-sm btn-soft" disabled={running.has('enrich')} onClick={() => run(() => api.enrich(p.id, { emails: false }))}>
              {running.has('enrich') ? <Spinner size={13} /> : <RefreshCw size={13} />} Satıcı bilgisi çek{detailCost ? ` · ≈${fmtUsd(detailCost)}` : ''}
            </button>
            <button className="btn btn-sm" disabled={running.has('enrich')} onClick={() => run(() => api.enrich(p.id, { emails: true }))} title="E-posta yalnızca bulunursa ücretlendirilir">
              <Mail size={13} /> E-posta bul{ev.sellerEmail ? ` · ${fmtUsd(ev.sellerEmail, 2)} bulunursa` : ''}
            </button>
          </>
        }
      >
        <dl className="kv">
          <dt>Satıcı</dt><dd>{sellerName(p)}</dd>
          <dt>Ticari ünvan</dt><dd>{p.officialName || <span className="muted">“Satıcı bilgisi çek” ile gelir</span>}</dd>
          {p.contactEmail && (<><dt>E-posta</dt><dd><a className="link" href={`mailto:${p.contactEmail}`}>{p.contactEmail}</a></dd></>)}
          {p.contactWebsite && (<><dt>Web sitesi</dt><dd><ExtLink href={p.contactWebsite}>{p.contactWebsite.replace(/^https?:\/\//, '')}</ExtLink></dd></>)}
          {p.merchantScore != null && (<><dt>Satıcı puanı</dt><dd>{p.merchantScore}</dd></>)}
          {p.merchantLocation && (<><dt>Konum</dt><dd>{p.merchantLocation}</dd></>)}
          <dt>Trendyol fiyatı</dt><dd>{fmtTL(p.price)}</dd>
          <dt>Mağaza linki</dt><dd><ExtLink href={p.storeUrl}>{p.storeUrl ? 'Mağazayı aç' : '—'}</ExtLink></dd>
          <dt>Ürün linki</dt><dd><ExtLink href={p.url}>Ürünü aç</ExtLink></dd>
        </dl>
        {p.officialName && (
          <div className="row" style={{ marginTop: 12 }}>
            <a className="btn btn-sm" href={googleQ(`"${p.officialName}" telefon`)} target="_blank" rel="noreferrer"><Phone size={13} /> Google’da telefon ara</a>
            <a className="btn btn-sm btn-ghost" href={googleQ(`"${p.officialName}" iletişim`)} target="_blank" rel="noreferrer">İletişim ara</a>
          </div>
        )}
        <div className="hint" style={{ marginTop: 10 }}>
          Telefon Trendyol’da herkese açık değil; yalnızca giriş yapılmış hesapta ödeme sayfasındaki Mesafeli Satış Sözleşmesi’nde görünür. Ticari ünvanla Google’da arama genelde firmanın numarasını verir.
        </div>
      </Card>

      <Card title={<><Phone size={16} color="var(--brand)" /> Satıcının telefonuna nasıl ulaşılır?</>}>
        <ol className="howto">
          <li><span>Kişisel <b>Trendyol hesabına</b> gir.</span></li>
          <li><span><ExtLink href={p.url}>Ürünü</ExtLink> <b>sepete ekle → ödeme sayfasına</b> git. Satın alma yapma.</span></li>
          <li><span>Aşağı kaydır: <b>Sözleşmeler ve Formlar → Mesafeli Satış Sözleşmesi</b>.</span></li>
          <li><span>Satıcının <b>Ad/Soyad</b> ve <b>telefon numarasını</b> aşağıya yaz, WhatsApp ile ulaş.</span></li>
        </ol>
        <div className="grid grid-2" style={{ gap: 12, marginTop: 16 }}>
          <Field label="Satıcı ad / soyad">
            <BlurInput className="input" value={m.supplierName} onSave={(v) => setManual({ supplierName: v })} placeholder={p.merchantName || p.officialName || 'Mesafeli satış sözleşmesindeki isim'} />
          </Field>
          <Field label="Telefon" hint={phone ? `WhatsApp: +${phone}` : 'örn. 0532 123 45 67'}>
            <BlurInput className="input" value={m.supplierPhone} onSave={(v) => setManual({ supplierPhone: v })} placeholder="05xx xxx xx xx" inputMode="tel" />
          </Field>
        </div>
      </Card>

      <Card
        title={<><MessageCircle size={16} color="#1aa851" /> WhatsApp mesaj taslağı</>}
        sub="Dokümandaki şablon — düzenleyebilirsiniz"
        actions={m.supplierMessage ? <button className="btn btn-ghost btn-sm" onClick={() => { setManual({ supplierMessage: null }); setMsg(fill(settings?.whatsappTemplate, p, name)) }}>Şablona dön</button> : null}
      >
        <div className="wa-bubble" style={{ marginBottom: 12 }}>{msg}</div>
        <textarea className="textarea" rows={6} value={msg} onChange={(e) => setMsg(e.target.value)} onBlur={() => msg !== fill(settings?.whatsappTemplate, p, name) && setManual({ supplierMessage: msg })} />
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={copy}><Copy size={14} /> Kopyala</button>
          <a
            className={`btn btn-wa ${phone ? '' : 'disabled'}`}
            href={phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : undefined}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              if (!phone) {
                e.preventDefault()
                toast('Önce satıcının telefon numarasını girin', 'warn')
              } else if (!m.supplierStatus) setManual({ supplierStatus: 'contacted' })
            }}
            style={!phone ? { opacity: 0.55 } : undefined}
          >
            <MessageCircle size={15} /> WhatsApp’ta aç
          </a>
        </div>
      </Card>

      <Card title={<><ShieldCheck size={16} color="var(--brand)" /> Anlaşma durumu</>}>
        <Seg
          value={m.supplierStatus || null}
          onChange={(v) => setManual({ supplierStatus: v })}
          options={[{ value: null, label: 'İletişim yok' }, { value: 'contacted', label: 'Mesaj gönderildi', tone: 'warn' }, { value: 'agreed', label: 'Anlaşıldı', tone: 'ok' }, { value: 'rejected', label: 'Olumsuz', tone: 'bad' }]}
        />
        <div className="grid grid-2" style={{ gap: 12, marginTop: 14 }}>
          <Field label="Anlaşılan birim fiyat" hint="Madde 2 hesaplayıcısına da yazılır">
            <div className="input-suffix">
              <BlurInput className="input" type="number" min={0} value={m.calc?.cost} onSave={(v) => setManual({ calc: { cost: v } })} placeholder="örn. 180" />
              <span>TL</span>
            </div>
          </Field>
          <Field label="İlk sipariş adedi">
            <BlurInput className="input" type="number" min={0} value={m.orderQty} onSave={(v) => setManual({ orderQty: v })} placeholder="100–250" />
          </Field>
        </div>
        <Field label="Notlar">
          <BlurInput as="textarea" className="textarea" rows={3} value={m.notes} onSave={(v) => setManual({ notes: v })} placeholder="Görüşme notları, kargo süresi, numune…" />
        </Field>
        <div className="banner tone-bad" style={{ marginTop: 14 }}>
          <TriangleAlert size={16} style={{ flex: 'none' }} />
          <span className="small"><b>Satıcısız mağaza kurulmaz, satıcısız reklam verilmez.</b> {m.supplierStatus === 'agreed' ? <Badge tone="ok">Anlaşma sağlandı ✓</Badge> : null}</span>
        </div>
      </Card>
    </div>
  )
}
