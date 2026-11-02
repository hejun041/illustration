// Reuse the same anonymous public data rendered by the server on first mount.
// This avoids replacing readable HTML with a second network request/loading shell.
export function takePublicPageData(kind) {
  if (typeof document === 'undefined') return null
  const element = document.getElementById('public-page-data')
  if (!element) return null
  try {
    const payload = JSON.parse(element.textContent)
    const url = new URL(window.location.href)
    const pathname = url.pathname.replace(/\/+$/, '') || '/'
    const page = Number(url.searchParams.get('page') || 1)
    const key = page > 1 ? `${pathname}?page=${page}` : pathname
    if (payload.kind !== kind || payload.path !== key) return null
    element.remove()
    return payload.data
  } catch { return null }
}
