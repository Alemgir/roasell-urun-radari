import { useEffect, useState } from 'react'
import { Save, RotateCcw } from 'lucide-react'
import { useStore } from '../store.jsx'
import { api } from '../api.js'
import { Card, Field, Spinner } from '../components/ui.jsx'

const GROUPS = [
  {
    title: '💰 Fiyat (Madde 2)',
    sub: 'Satış fiyatı üst sınırı, tedarik maliyeti ve başa baş hedefi',
    fields: [
      ['maxSalePrice', 'Maks. satış fiyatı', 'TL'],
      ['costMin', 'Min. tedarik maliyeti', 'TL'],
      ['costMax', 'Maks. tedarik maliyeti', 'TL'],
      ['bulkDiscountPct', 'Toplu alım indirimi (tahmin)', '%'],
      ['breakEvenIdeal', 'Başa baş ROAS (ideal)', '×'],
      ['breakEvenMax', 'Başa baş ROAS (maks.)', '×'],
      ['defaultShipping', 'Varsayılan kargo', 'TL'],
    ],
  },
  {
    title: '⭐ Yorum sayısı baremi',
    sub: '0–20 dikkat · 20–500 ideal · 500–3.000 rakip analizi · 3.000+ geç',
    fields: [
      ['reviewLow', 'Doğrulanmış talep eşiği', 'adet'],
      ['reviewIdeal', 'İdeal aralık üst sınırı', 'adet'],
      ['reviewSaturated', 'Doygun pazar eşiği', 'adet'],
    ],
  },
  {
    title: '📣 Kreatif & rakip (Madde 5–6)',
    sub: 'Meta Ads Library eşikleri ve markalaşmış rakip limiti',
    fields: [
      ['metaAdsTest', 'Min. aktif reklam (test)', 'adet'],
      ['metaAdsScale', 'Ölçek sinyali', 'adet'],
      ['brandedCompetitorLimit', 'Maks. markalaşmış TR rakip', 'adet'],
    ],
  },
]

export default function Settings() {
  const { settings, setSettings, refreshProducts, toast } = useStore()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings) setForm({ ...settings })
  }, [settings])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const fields = [...GROUPS.flatMap((g) => g.fields.map(([k]) => k)), 'whatsappTemplate']

  const save = async () => {
    setSaving(true)
    try {
      const { settings } = await api.saveSettings(Object.fromEntries(fields.map((k) => [k, form[k]])))
      setSettings(settings)
      await refreshProducts()
      toast('Kriterler kaydedildi — tüm ürünler yeniden puanlandı', 'ok')
    } catch (err) {
      toast(err.message, 'bad')
    } finally {
      setSaving(false)
    }
  }

  const reset = async () => {
    const { settings } = await api.resetSettings()
    setSettings(settings)
    await refreshProducts()
    toast('Doküman varsayılanlarına dönüldü', 'ok')
  }

  if (!form) return <div className="page"><Spinner /></div>

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Roasell dokümanı varsayılanları</div>
          <h1>Kriterler</h1>
          <p>Eşikleri değiştirdiğinizde tüm ürünler anında yeniden puanlanır.</p>
        </div>
        <div className="row">
          <button className="btn btn-ghost" onClick={reset}><RotateCcw size={15} /> Varsayılanlar</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : <Save size={15} />} Kaydet</button>
        </div>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        {GROUPS.map((g) => (
          <Card key={g.title} title={g.title} sub={g.sub}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
              {g.fields.map(([k, label, suffix]) => (
                <Field key={k} label={label}>
                  <div className="input-suffix">
                    <input className="input" type="number" step="any" value={form[k] ?? ''} onChange={set(k)} />
                    {suffix && <span>{suffix}</span>}
                  </div>
                </Field>
              ))}
            </div>
          </Card>
        ))}
        <Card title="💬 WhatsApp mesaj taslağı (Madde 7)" sub="{satici} ve {urun} alanları otomatik doldurulur">
          <textarea className="textarea" rows={9} value={form.whatsappTemplate} onChange={set('whatsappTemplate')} />
        </Card>
      </div>
    </div>
  )
}
