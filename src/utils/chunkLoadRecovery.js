/**
 * 发版后旧页面仍引用已删除的懒加载 chunk → 404/被 SPA 回退成 HTML → ChunkLoadError。
 * 监听脚本加载失败与动态 import 错误，带冷却时间自动刷新以拉取新 index 与 js。
 */

export const CHUNK_RELOAD_KEY = 'chunk_reload_ts'
const RELOAD_COOLDOWN_MS = 10000

// The retry parameter only bypasses the HTML cache for the initial request.
// Remove it after loading so copied links and later navigation use clean URLs.
export function clearChunkReloadParameter() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('_chunk_reload')) return
  url.searchParams.delete('_chunk_reload')
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
}

export function isChunkLoadErrorMessage(message) {
  const msg = String(message || '')
  return /ChunkLoadError|Loading chunk [\d]+ failed|dynamically imported module|Failed to fetch dynamically imported module/i.test(
    msg
  )
}

export function isJsChunkUrl(url) {
  return /\/js\/[^?]+\.js($|\?)/i.test(url || '')
}

export function shouldReloadForChunkFailure() {
  const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0)
  const now = Date.now()
  if (now - last < RELOAD_COOLDOWN_MS) return false
  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now))
  return true
}

/** 刷新当前页并附带 cache-bust 参数，尽量绕过 HTML 强缓存 */
export function reloadForStaleChunks() {
  if (!shouldReloadForChunkFailure()) return false
  try {
    const url = new URL(window.location.href)
    url.searchParams.set('_chunk_reload', String(Date.now()))
    window.location.replace(url.toString())
  } catch {
    window.location.reload()
  }
  return true
}

export function installChunkLoadRecovery() {
  window.addEventListener(
    'error',
    (event) => {
      const target = event.target
      if (target?.tagName === 'SCRIPT' && isJsChunkUrl(target.src)) {
        reloadForStaleChunks()
      }
    },
    true
  )

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const msg = reason?.message || String(reason || '')
    if (isChunkLoadErrorMessage(msg) && reloadForStaleChunks()) {
      event.preventDefault()
    }
  })
}
