import { isCurrentUserAdmin } from './auth'

let initialization
let measurementId = ''
let previousLocation = ''
const allowedEvents = new Set(['page_view', 'tutorial_cta', 'creation_start', 'export_start', 'export_complete', 'export_failed'])
function excluded() {
  try { return isCurrentUserAdmin() || navigator.doNotTrack === '1' } catch { return true }
}
export function analyticsLocation(value) {
  const url = new URL(value, location.origin)
  const output = new URL(url.origin + url.pathname)
  // Keep campaign attribution, never send login codes, searches, story input or IDs in queries.
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const value = url.searchParams.get(key)
    if (/^[a-z0-9_-]{1,80}$/i.test(value || '')) output.searchParams.set(key, value)
  }
  return output.href
}
async function initialize() {
  if (!initialization) initialization = (async () => {
    try {
      const response = await fetch('/js/ga-config.json', { cache: 'no-store', credentials: 'omit' })
      if (!response.ok) return false
      const config = await response.json()
      if (!/^G-[A-Z0-9]{6,20}$/.test(config.measurementId || '')) return false
      measurementId = config.measurementId
      window.dataLayer = window.dataLayer || []
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments) }
      window.gtag('js', new Date())
      window.gtag('config', measurementId, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false })
      const script = document.createElement('script')
      script.async = true
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
      document.head.appendChild(script)
      return true
    } catch { return false }
  })()
  return initialization
}
export async function trackAnalytics(event, details = {}) {
  try {
    if (excluded() || !allowedEvents.has(event)) return
    // Capture the route before awaiting initialization; fast navigation must not relabel the event.
    const parameters = { page_location: analyticsLocation(location.href), page_title: document.title }
    for (const key of ['tool', 'format', 'placement']) if (/^[a-z0-9_-]{1,40}$/i.test(details[key] || '')) parameters[key] = details[key]
    if (details.page_location) parameters.page_location = analyticsLocation(details.page_location)
    if (details.page_referrer) parameters.page_referrer = analyticsLocation(details.page_referrer)
    if (!await initialize() || excluded()) return
    window.gtag('event', event, { ...parameters, send_to: measurementId })
  } catch { /* Analytics availability must not affect creation or downloads. */ }
}
export function installGoogleAnalytics(router) {
  router.afterEach((to, _from, failure) => {
    if (failure || /^\/(admin|user|member|wechat|forgot-password)(\/|$)/.test(to.path)) return
    const current = analyticsLocation(location.origin + to.fullPath)
    if (current === previousLocation) return
    const referrer = previousLocation || document.referrer
    previousLocation = current
    void trackAnalytics('page_view', { page_location: current, page_referrer: referrer })
  })
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[data-creation-cta]')
    if (!link) return
    void trackAnalytics('tutorial_cta', { placement: link.dataset.creationCta, tool: link.getAttribute('href').includes('topdf') ? 'layout' : 'book' })
    // Keep normal in-app clicks in the SPA so login continuation and the event
    // are not discarded by a full page unload. Modified clicks keep native behavior.
    if (!event.defaultPrevented && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      event.preventDefault()
      router.push(link.getAttribute('href'))
    }
  })
}
