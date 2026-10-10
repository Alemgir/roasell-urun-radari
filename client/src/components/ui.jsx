import { useEffect, useState } from 'react'
import { Check, X, TriangleAlert, Clock, ExternalLink, LoaderCircle } from 'lucide-react'
import { STEP_STATUS } from '../lib/format.js'
import { useStore } from '../store.jsx'

export const Badge = ({ tone = 'muted', dot, children, className = '', title }) => (
  <span className={`badge tone-${tone} ${className}`} title={title}>
    {dot && <span className="dot" />}
    {children}
  </span>
)

export function StatusIcon({ status, size = 22 }) {
  const tone = STEP_STATUS[status]?.tone || 'muted'
  const Icon = status === 'pass' ? Check : status === 'fail' ? X : status === 'warn' ? TriangleAlert : Clock
  return (
    <span className={`sicon tone-${tone}`} style={{ width: size, height: size }}>
      <Icon size={Math.round(size * 0.58)} strokeWidth={2.6} />
    </span>
  )
}

export function ScoreRing({ score = 0, size = 46, stroke = 4.5 }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const color = score >= 85 ? 'var(--ok)' : score >= 60 ? '#e7a52a' : 'var(--bad)'
  return (
    <span className="score" style={{ width: size, height: size }} title={`Kriter skoru: ${score}/100`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .5s' }}
        />
      </svg>
      <b style={{ fontSize: Math.round(size * 0.32) }}>{score}</b>
    </span>
  )
}

export const StepsMini = ({ steps = [] }) => (
  <span className="steps-mini">
    {steps.map((s) => (
      <i key={s.n} className={s.status} title={`${s.n}. ${s.title}: ${STEP_STATUS[s.status]?.label}`} />
    ))}
  </span>
)

export function Thumb({ src, alt = '', size = 48, className = '' }) {
  const [err, setErr] = useState(false)
  const initials = alt.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toLocaleUpperCase('tr')
  const style = size ? { width: size, height: size, fontSize: Math.round(size * 0.3) } : undefined
  return (
    <span className={`thumb ${!src || err ? 'ph' : ''} ${className}`} style={style}>
      {src && !err ? <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setErr(true)} /> : initials}
    </span>
  )
}

export const Card = ({ title, sub, actions, children, className = '', bodyClass = 'card-body' }) => (
  <section className={`card ${className}`}>
    {(title || actions) && (
      <div className="card-head">
        <div>
          {title && <div className="card-title">{title}</div>}
          {sub && <div className="card-sub">{sub}</div>}
        </div>
        {actions && <div className="row">{actions}</div>}
      </div>
    )}
    <div className={bodyClass}>{children}</div>
  </section>
)

export const Empty = ({ icon: Icon, title, children, action }) => (
  <div className="empty">
    {Icon && (
      <div className="empty-icon">
        <Icon size={24} />
      </div>
    )}
    <h3>{title}</h3>
    {children && <p>{children}</p>}
    {action}
  </div>
)

export const Seg = ({ value, onChange, options }) => (
  <div className="seg">
    {options.map((o) => (
      <button key={String(o.value)} type="button" className={`${value === o.value ? 'on' : ''} ${o.tone ? `tone-${o.tone}` : ''}`} onClick={() => onChange(o.value)}>
        {o.icon}
        {o.label}
      </button>
    ))}
  </div>
)

export const Field = ({ label, hint, children }) => (
  <label className="field">
    {label && <span className="label">{label}</span>}
    {children}
    {hint && <span className="hint">{hint}</span>}
  </label>
)

export const Switch = ({ checked, onChange, children }) => (
  <label className="switch">
    <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
    <span className="track" />
    <span>{children}</span>
  </label>
)

export const ExtLink = ({ href, children, className = 'link' }) =>
  href ? (
    <a className={className} href={href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
      {children}
      <ExternalLink size={12} />
    </a>
  ) : null

export const Spinner = ({ size = 15 }) => <LoaderCircle size={size} className="spin" />

/** Odağı bırakınca (veya Enter) kaydeden input/textarea */
export function BlurInput({ value, onSave, as = 'input', ...rest }) {
  const [v, setV] = useState(value ?? '')
  useEffect(() => setV(value ?? ''), [value])
  const Tag = as === 'textarea' ? 'textarea' : 'input'
  return (
    <Tag
      {...rest}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => String(value ?? '') !== String(v) && onSave(v)}
      onKeyDown={(e) => e.key === 'Enter' && as !== 'textarea' && e.currentTarget.blur()}
    />
  )
}

/** Otomatik değerlendirmeyi elle ezmek için: Oto / ✓ / ! / ✗ */
export function Override({ value, onChange }) {
  const opts = [
    ['auto', 'Otomatik', <span key="a" style={{ fontSize: 10.5, fontWeight: 700 }}>OTO</span>],
    ['pass', 'Uygun', <Check key="p" size={13} strokeWidth={3} />],
    ['warn', 'Dikkat', <TriangleAlert key="w" size={12} strokeWidth={2.6} />],
    ['fail', 'Uygun değil', <X key="f" size={13} strokeWidth={3} />],
  ]
  const cur = value || 'auto'
  return (
    <span className="override" onClick={(e) => e.stopPropagation()}>
      {opts.map(([k, title, icon]) => (
        <button key={k} type="button" title={title} className={`${cur === k ? 'on' : ''} ${k}`} style={k === 'auto' ? { width: 36 } : undefined} onClick={() => onChange(k === 'auto' ? null : k)}>
          {icon}
        </button>
      ))}
    </span>
  )
}

export function Toasts() {
  const { toasts, dismissToast } = useStore()
  const color = { ok: '#34d27b', bad: '#ff6b57', brand: '#9b86ff', warn: '#f2b544' }
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span className="t-dot" style={{ background: color[t.tone] || color.brand }} />
          <span>{t.message}</span>
          <button onClick={() => dismissToast(t.id)} aria-label="Kapat">
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  )
}
