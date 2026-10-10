import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { api } from './api.js'
import { JOB_TYPE } from './lib/format.js'

const StoreCtx = createContext(null)
export const useStore = () => useContext(StoreCtx)

export function StoreProvider({ children }) {
  const [products, setProducts] = useState([])
  const [productsLoaded, setProductsLoaded] = useState(false)
  const [jobs, setJobs] = useState([])
  const [settings, setSettings] = useState(null)
  const [health, setHealth] = useState(null)
  const [usage, setUsage] = useState(null)
  const [pricing, setPricing] = useState(null)
  const [generalQueries, setGeneralQueries] = useState([])
  const [queryLog, setQueryLog] = useState({})
  const [toasts, setToasts] = useState([])
  const [lastFinished, setLastFinished] = useState(null)
  const prevJobs = useRef(new Map())

  const toast = useCallback((message, tone = 'ok') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5200)
  }, [])

  const refreshProducts = useCallback(async () => {
    try {
      const { products } = await api.products()
      setProducts(products)
    } finally {
      setProductsLoaded(true)
    }
  }, [])

  const refreshSettings = useCallback(async () => {
    const { settings } = await api.settings()
    setSettings(settings)
    return settings
  }, [])

  const refreshHealth = useCallback(async (check = false) => {
    const h = await api.health(check)
    setHealth(h)
    return h
  }, [])

  const refreshUsage = useCallback(async () => {
    try {
      const { usage } = await api.usage()
      setUsage(usage)
    } catch (err) {
      setUsage((u) => ({ ...(u || {}), error: err.message }))
    }
  }, [])

  const refreshPricing = useCallback(async () => {
    try {
      const r = await api.pricing()
      setPricing(r.pricing)
    } catch {
      setPricing(null)
    }
  }, [])

  const refreshQueries = useCallback(async () => {
    try {
      const r = await api.queries()
      setGeneralQueries(r.groups || [])
      setQueryLog(r.log || {})
    } catch {}
  }, [])

  const refreshJobs = useCallback(async () => {
    const { jobs } = await api.jobs()
    let finished = null
    for (const j of jobs) {
      const prev = prevJobs.current.get(j.id)
      if (prev === 'running' && j.status !== 'running') {
        finished = j
        if (j.status === 'succeeded') toast(`${JOB_TYPE[j.type] || 'İş'} tamamlandı · ${j.resultCount} sonuç`, 'ok')
        else toast(`${JOB_TYPE[j.type] || 'İş'} başarısız: ${j.error || 'bilinmeyen hata'}`, 'bad')
      }
    }
    prevJobs.current = new Map(jobs.map((j) => [j.id, j.status]))
    setJobs(jobs)
    if (finished) {
      setLastFinished({ id: finished.id, productId: finished.productId, type: finished.type, status: finished.status, at: Date.now() })
      refreshProducts()
      refreshUsage()
      if (finished.type === 'search') refreshQueries()
    }
    return jobs
  }, [refreshProducts, refreshUsage, refreshQueries, toast])

  const trackJob = useCallback(
    (job) => {
      if (job.status === 'failed') {
        toast(job.error || 'İş başlatılamadı', 'bad')
      } else {
        prevJobs.current.set(job.id, 'running')
        toast(`${JOB_TYPE[job.type]} başlatıldı`, 'brand')
      }
      refreshJobs()
    },
    [refreshJobs, toast],
  )

  useEffect(() => {
    refreshProducts()
    refreshSettings()
    refreshJobs()
    refreshQueries()
    refreshHealth().then((h) => {
      if (h.tokenConfigured) {
        refreshUsage()
        refreshPricing()
      }
    })
  }, [refreshProducts, refreshSettings, refreshHealth, refreshJobs, refreshQueries, refreshUsage, refreshPricing])

  const hasRunning = jobs.some((j) => j.status === 'running')
  useEffect(() => {
    const t = setInterval(refreshJobs, hasRunning ? 3000 : 20000)
    return () => clearInterval(t)
  }, [hasRunning, refreshJobs])

  // Bakiye canlı: tarama sürerken 10 sn, boştayken 30 sn'de bir
  useEffect(() => {
    if (!health?.tokenConfigured) return
    const t = setInterval(refreshUsage, hasRunning ? 10000 : 30000)
    return () => clearInterval(t)
  }, [health?.tokenConfigured, hasRunning, refreshUsage])

  const value = {
    products, productsLoaded, jobs, settings, health, usage, pricing, generalQueries, queryLog, toasts, lastFinished, hasRunning,
    setProducts, setSettings, toast, trackJob, refreshProducts, refreshJobs, refreshSettings, refreshHealth, refreshUsage,
    dismissToast: (id) => setToasts((t) => t.filter((x) => x.id !== id)),
  }
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}
