async function req(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`)
  return data
}

export const api = {
  health: (check = false) => req('GET', `/api/health${check ? '?check=1' : ''}`),
  usage: () => req('GET', '/api/usage'),
  pricing: () => req('GET', '/api/pricing'),
  queries: () => req('GET', '/api/queries'),

  products: () => req('GET', '/api/products'),
  product: (id) => req('GET', `/api/products/${encodeURIComponent(id)}`),
  updateProduct: (id, body) => req('PATCH', `/api/products/${encodeURIComponent(id)}`, body),
  deleteProduct: (id) => req('DELETE', `/api/products/${encodeURIComponent(id)}`),
  bulkDelete: (ids) => req('POST', '/api/products/bulk-delete', { ids }),

  search: (body) => req('POST', '/api/searches', body),
  trendyolCompetitors: (id, body) => req('POST', `/api/products/${encodeURIComponent(id)}/trendyol-competitors`, body),
  lens: (id) => req('POST', `/api/products/${encodeURIComponent(id)}/lens`),
  enrich: (id, body) => req('POST', `/api/products/${encodeURIComponent(id)}/enrich`, body),
  metaAds: (body) => req('POST', '/api/meta-ads', body),

  jobs: () => req('GET', '/api/jobs'),
  abortJob: (id) => req('POST', `/api/jobs/${id}/abort`),
  clearJobs: () => req('DELETE', '/api/jobs'),

  settings: () => req('GET', '/api/settings'),
  saveSettings: (body) => req('PUT', '/api/settings', body),
  resetSettings: () => req('POST', '/api/settings/reset'),

  loadDemo: () => req('POST', '/api/demo'),
  clearDemo: () => req('DELETE', '/api/demo'),
}
