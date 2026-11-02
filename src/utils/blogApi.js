/**
 * 博客 API
 * 公开：GET /api/blog
 * 管理：/api/admin/blog
 */
import { DEFAULT_API_ORIGIN } from '@/utils/createCharacterTask'

function resolveApiRoot(apiBaseUrl) {
  const raw = apiBaseUrl || process.env.VUE_APP_API_BASE_URL || DEFAULT_API_ORIGIN
  return String(raw).replace(/\/$/, '')
}

function unwrapData(res) {
  return res?.data?.data || res?.data?.message || res?.data || res
}

function authHeaders(extra = {}) {
  const headers = { ...extra }
  if (headers.Authorization === undefined) {
    const token = localStorage.getItem('token')
    if (token) headers.Authorization = `Bearer ${token}`
  }
  return headers
}

export async function fetchBlogPosts(http, opts = {}) {
  const root = resolveApiRoot(opts.apiBaseUrl)
  const params = {}
  if (opts.limit) params.limit = opts.limit
  if (opts.page) params.page = opts.page
  const res = await http.get(`${root}/api/blog/`, {
    params,
    timeout: 30000,
    headers: authHeaders(opts.headers),
  })
  if (res.data?.code !== 0 && res.data?.code !== '0') {
    throw new Error(res.data?.message || '获取文章列表失败')
  }
  return unwrapData(res) || []
}

export async function fetchBlogPost(http, slug, opts = {}) {
  const root = resolveApiRoot(opts.apiBaseUrl)
  const safeSlug = encodeURIComponent(String(slug || '').trim())
  const res = await http.get(`${root}/api/blog/${safeSlug}`, {
    timeout: 30000,
    headers: authHeaders(opts.headers),
  })
  if (res.status === 404 || res.data?.code === -1) {
    return null
  }
  if (res.data?.code !== 0 && res.data?.code !== '0') {
    throw new Error(res.data?.message || '获取文章失败')
  }
  return unwrapData(res)
}

export async function adminListBlogPosts(http, opts = {}) {
  const root = resolveApiRoot(opts.apiBaseUrl)
  const res = await http.get(`${root}/api/admin/blog/`, {
    timeout: 30000,
    headers: authHeaders(opts.headers),
  })
  if (res.data?.code !== 0 && res.data?.code !== '0') {
    throw new Error(res.data?.message || '获取列表失败')
  }
  return unwrapData(res) || []
}

export async function adminCreateBlogPost(http, payload, opts = {}) {
  const root = resolveApiRoot(opts.apiBaseUrl)
  const res = await http.post(`${root}/api/admin/blog/`, payload, {
    timeout: 60000,
    headers: authHeaders(opts.headers),
  })
  if (res.data?.code !== 0 && res.data?.code !== '0') {
    throw new Error(res.data?.message || '创建失败')
  }
  return unwrapData(res)
}

export async function adminUpdateBlogPost(http, id, payload, opts = {}) {
  const root = resolveApiRoot(opts.apiBaseUrl)
  const res = await http.put(`${root}/api/admin/blog/${id}`, payload, {
    timeout: 60000,
    headers: authHeaders(opts.headers),
  })
  if (res.data?.code !== 0 && res.data?.code !== '0') {
    throw new Error(res.data?.message || '更新失败')
  }
  return unwrapData(res)
}

export async function adminDeleteBlogPost(http, id, opts = {}) {
  const root = resolveApiRoot(opts.apiBaseUrl)
  const res = await http.delete(`${root}/api/admin/blog/${id}`, {
    timeout: 30000,
    headers: authHeaders(opts.headers),
  })
  if (res.data?.code !== 0 && res.data?.code !== '0') {
    throw new Error(res.data?.message || '删除失败')
  }
  return unwrapData(res)
}
