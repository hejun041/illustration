const http = require('node:http')
const fs = require('node:fs/promises')
const path = require('node:path')
const { createHash } = require('node:crypto')
const sanitize = require('sanitize-html')
const { catalog, escapeHtml: esc } = require('../src/utils/publicSeoContent.cjs')
const { renderPublicHtml } = require('./lib/publicSeoBuild.cjs')

const navigation = [
  ['/', '首页'], ['/ai-picture-book', 'AI绘本制作'],
  ['/guides/ai-picture-book-tutorial', '绘本制作教程'], ['/books', '绘本馆'],
  ['/illustration', '公开插画'], ['/blog', '创作文章'],
  ['/guides/ai-picture-book-pdf-layout', '绘本 PDF 排版指南'],
  ['/blog/ai-illustration-without-installing-skills', '照片与 AI 插画创作方法'],
]
const links = () => `<nav aria-label="网站导航">${navigation.map(([href, title]) => `<a href="${href}">${title}</a>`).join(' · ')}</nav>`
const cleanHtml = html => sanitize(html || '', { allowedTags: sanitize.defaults.allowedTags.concat(['img']), allowedAttributes: { ...sanitize.defaults.allowedAttributes, img: ['src', 'alt', 'width', 'height', 'loading'] }, allowedSchemes: ['https', 'http'], allowProtocolRelative: false })
function publicData(item, kind) {
  const keys = kind === 'blog' ? ['id', 'slug', 'title', 'excerpt', 'seoTitle', 'metaDescription', 'coverImageUrl', 'coverImageAlt', 'publishedAt', 'categories'] : ['_id', 'title', 'description', 'type', 'source', 'tags', 'content', 'content_snapshot', 'cover_thumbnail', 'is_public', 'is_draft', 'status', 'ownerid']
  const output = Object.fromEntries(keys.filter(key => item[key] !== undefined).map(key => [key, item[key]]))
  if (kind === 'books' && Array.isArray(item.content_snapshot) && item.content_snapshot.length === item.content?.length && item.content_snapshot.every(entry => typeof entry.path === 'string' && entry.path)) output.content = item.content_snapshot.map(entry => entry.path)
  if (kind === 'blog' && item.htmlContent) output.htmlContent = cleanHtml(item.htmlContent)
  return output
}
function image(src, title, origin) {
  if (!src || typeof src !== 'string') return ''
  const url = new URL(src, origin)
  if (!['http:', 'https:'].includes(url.protocol)) return ''
  return `<img src="${esc(url.href)}" alt="${esc(title)}" loading="lazy" style="max-width:100%;height:auto">`
}
function publicWork(item, kind) {
  return item && Number(item.is_public) === 1 && Number(item.is_draft || 0) !== 1 && (kind === 'books' ? Number(item.status) === 0 : item.status === undefined || Number(item.status) === 0)
}
function createSeoServer({ directory = path.resolve(__dirname, '../dist'), apiOrigin = 'https://api.kidstory.cc', fetcher = fetch } = {}) {
  let appTemplate, patterns
  async function normalizePostCover(post) {
    const cover = post?.coverImageUrl
    if (typeof cover !== 'string' || !cover.startsWith('data:')) return post
    const match = cover.length <= 3 * 1024 * 1024 && cover.match(/^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=\r\n]+)$/)
    if (!match) return { ...post, coverImageUrl: '' }
    const bytes = Buffer.from(match[2], 'base64')
    const valid = match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : /^jpe?g$/.test(match[1]) ? bytes[0] === 255 && bytes[1] === 216
        : match[1] === 'gif' ? bytes.subarray(0, 4).toString() === 'GIF8'
          : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP'
    if (!valid) return { ...post, coverImageUrl: '' }
    const filename = createHash('sha256').update(bytes).digest('hex') + '.' + (match[1] === 'jpeg' ? 'jpg' : match[1])
    const folder = path.join(directory, 'blog-assets/inline-covers')
    await fs.mkdir(folder, { recursive: true })
    try { await fs.writeFile(path.join(folder, filename), bytes, { flag: 'wx' }) }
    catch (error) { if (error.code !== 'EEXIST') throw error }
    return { ...post, coverImageUrl: `${catalog.siteUrl}/blog-assets/inline-covers/${filename}` }
  }
  async function request(endpoint) {
    const response = await fetcher(new URL(endpoint, apiOrigin), { signal: AbortSignal.timeout(15000), redirect: 'error' })
    if (response.status === 404) return null
    if (!response.ok) throw new Error('Public API unavailable')
    const body = await response.json()
    // Never forward visitor cookies or Authorization to public rendering requests.
    if (String(body.code) !== '0') {
      if ([1004, -1].includes(Number(body.code))) return null
      throw new Error('Public API failed')
    }
    return body.data ?? body.message
  }
  async function shell(title, description, pathname, content, status = 200, payload) {
    appTemplate ||= await fs.readFile(path.join(directory, 'app.html'), 'utf8')
    const html = renderPublicHtml(appTemplate, { path: pathname, title: `${title}｜KidStory`, description })
      .replace(/<noscript>[\s\S]*?<\/noscript>/i, '')
      .replace(/<div id="app">\s*<\/div>/, () => `<div id="app"><main class="seo-static-shell">${links()}<article class="public-seo-document"><h1>${esc(title)}</h1>${content}${links()}</article></main></div>`)
      .replace('</head>', '<style>.seo-static-shell{height:100vh;overflow:auto;background:white;padding:24px;box-sizing:border-box;text-align:left}.seo-static-shell article{max-width:1000px;margin:auto;line-height:1.8}.seo-static-shell nav{display:flex;flex-wrap:wrap;gap:12px}.seo-static-shell img{max-width:100%}</style></head>')
    if (payload) return html.replace('</head>', () => `<script type="application/json" id="public-page-data">${JSON.stringify(payload).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')}</script></head>`)
    return status === 200 ? html : html.replace(/<meta name="robots"[^>]*>/, '<meta name="robots" content="noindex, follow">')
  }
  return http.createServer(async (req, res) => {
    const send = (status, html) => {
      // The public theme uses an ID selector; keep primary actions legible even
      // while a visitor still has the previous immutable stylesheet cached.
      html = html.replace('</head>', '<style>#app .tutorial-start-primary{color:#fff!important}</style></head>')
      res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...(status !== 200 ? { 'X-Robots-Tag': 'noindex, follow' } : {}) })
      res.end(req.method === 'HEAD' ? undefined : html)
    }
    try {
      const url = new URL(req.url, 'http://localhost')
      if (url.pathname === '/admin/analytics' || url.pathname.startsWith('/_analytics/')) {
        send(404, '<!doctype html><html lang="zh-CN"><head><meta name="robots" content="noindex"><title>页面不存在</title></head><body><h1>页面不存在</h1><a href="/">返回首页</a></body></html>'); return
      }
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return }
      const pathname = url.pathname.replace(/\/+$/, '') || '/'
      // Caddy serves these in production; support the same assets for local smoke tests.
      const mimeTypes = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.txt': 'text/plain', '.xml': 'application/xml' }
      if (/^\/(js|css|img|images|blog-assets|fonts)\//.test(pathname) || /^\/(favicon[^/]*|android-chrome[^/]*|apple-touch-icon[^/]*|site.webmanifest|robots.txt|sitemap(?:-pages)?\.xml)$/.test(pathname)) {
        const decoded = decodeURIComponent(pathname)
        const asset = path.resolve(directory, '.' + decoded)
        const relative = path.relative(directory, asset)
        const type = mimeTypes[path.extname(asset)] || (pathname === '/site.webmanifest' ? 'application/manifest+json' : null)
        if (!type || relative.startsWith('..') || path.isAbsolute(relative) || decoded.includes('..')) { send(404, 'Not found'); return }
        try {
          const data = await fs.readFile(asset)
          res.writeHead(200, { 'Content-Type': type }); res.end(req.method === 'HEAD' ? undefined : data)
        } catch (error) {
          if (!['ENOENT', 'EISDIR'].includes(error.code)) throw error
          send(404, 'Not found')
        }
        return
      }
      if (pathname === '/guides') { res.writeHead(301, { Location: '/connection' + url.search }); res.end(); return }
      const match = pathname.match(/^\/(books|blog|illustration)(?:\/([^/]+))?$/)
      if (match) {
        const [, kind, id] = match
        if (id && kind !== 'blog' && !/^[a-f\d]{24}$/i.test(id)) { send(404, await shell('页面不存在', '', pathname, links(), 404)); return }
        const rawPage = url.searchParams.get('page') || '1'
        const page = /^\d+$/.test(rawPage) ? Number(rawPage) : 0
        if (!Number.isSafeInteger(page) || page < 1 || page > 10000) { send(404, await shell('页面不存在', '', pathname, links(), 404)); return }
        const canonicalPath = !id && page > 1 ? `${pathname}?page=${page}` : pathname
        const api = kind === 'blog' ? `/api/blog/${id ? encodeURIComponent(id) : `?limit=100&page=${page}`}` : kind === 'books' ? `/book/${id ? encodeURIComponent(id) : `?sort_param=heat&sort_num=desc&page=${page}`}` : `/ill/${id ? encodeURIComponent(id) : `public?page=${page}`}`
        let data = await request(api)
        if (kind === 'blog' && id && data) data = await normalizePostCover(data)
        if (id) {
          if (!data || (kind !== 'blog' && !publicWork(data, kind))) { send(404, await shell('页面不存在或未公开', '', pathname, links(), 404)); return }
          if (kind === 'blog' && data.slug && data.slug !== id) { res.writeHead(301, { Location: `/blog/${encodeURIComponent(data.slug)}` }); res.end(); return }
          const content = kind === 'blog'
            ? `<p>${esc(data.excerpt || '')}</p>${image(data.coverImageUrl, data.coverImageAlt || data.title, apiOrigin)}${cleanHtml(data.htmlContent)}`
            : `<p>${esc(data.description || '')}</p>${kind === 'books' ? (data.content_snapshot || []).map(item => image(item.path, item.title || data.title, apiOrigin)).join('') : image(data.content, data.title, apiOrigin)}`
          send(200, await shell(data.seoTitle || data.title, data.metaDescription || data.excerpt || data.description || '', pathname, content, 200, { kind, path: pathname, data: publicData(data, kind) })); return
        }
        // Unexpected/denied API results must not become a successful empty directory.
        const items = Array.isArray(data) ? data : data?.data
        if (!Array.isArray(items)) throw new Error('Public listing unavailable')
        if (!items.length && page > 1) { send(404, await shell('页面不存在', '', pathname, links(), 404)); return }
        const visible = kind === 'blog' ? await Promise.all(items.map(normalizePostCover)) : items.filter(item => publicWork(item, kind))
        const title = { books: '原创绘本作品与故事阅读', blog: 'AI绘本创作教程与插画指南', illustration: '公开插画作品与画风参考' }[kind]
        const content = visible.map(item => `<section><h2><a href="/${kind}/${encodeURIComponent(kind === 'blog' ? item.slug : item._id)}">${esc(item.title)}</a></h2><p>${esc(item.excerpt || item.description || '')}</p>${image(item.coverImageUrl || item.content_snapshot?.[0]?.path || (kind === 'illustration' ? item.content : ''), item.title, apiOrigin)}</section>`).join('')
        // Book page size is configurable in the API (currently 18), never assume 20.
        let hasNext = items.length >= (kind === 'blog' ? 100 : 20)
        if (kind === 'books' && items.length) {
          const next = await request(`/book/?sort_param=heat&sort_num=desc&page=${page + 1}`)
          if (!Array.isArray(next)) throw new Error('Public pagination unavailable')
          hasNext = next.some(item => publicWork(item, kind))
        }
        const pager = `<nav aria-label="分页">${page > 1 ? `<a href="/${kind}${page > 2 ? `?page=${page - 1}` : ''}">上一页</a>` : ''}${hasNext ? `<a href="/${kind}?page=${page + 1}">下一页</a>` : ''}</nav>`
        send(200, await shell(title, title, canonicalPath, content + pager, 200, { kind, path: canonicalPath, data: visible.map(item => publicData(item, kind)) })); return
      }
      // Public authored pages already have complete HTML from the build plugin.
      const fixed = [...catalog.pages, ...catalog.metadata].find(item => item.path === pathname)
      if (fixed) {
        send(200, await fs.readFile(path.join(directory, pathname === '/' ? 'index.html' : pathname.slice(1) + '/index.html'), 'utf8')); return
      }
      patterns ||= JSON.parse(await fs.readFile(path.join(directory, 'app-routes.json'), 'utf8')).map(pattern => new RegExp(pattern))
      // Dynamic public routes must be validated above, not accepted by the SPA whitelist.
      if (!/^\/(books|blog|illustration)(\/|$)/.test(pathname) && patterns.some(pattern => pattern.test(pathname))) {
        appTemplate ||= await fs.readFile(path.join(directory, 'app.html'), 'utf8')
        res.setHeader('X-Robots-Tag', 'noindex, follow')
        const html = renderPublicHtml(appTemplate, { path: pathname, title: catalog.pages[0].title, description: catalog.pages[0].description })
          .replace(/<meta name="robots"[^>]*>/, '<meta name="robots" content="noindex, follow">')
        send(200, html); return
      }
      send(404, await shell('页面不存在', '', pathname, '<p>请从导航访问作品或教程。</p>', 404))
    } catch (error) {
      console.error('Public SEO request failed:', error.message)
      res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '60', 'X-Robots-Tag': 'noindex' })
      res.end(req.method === 'HEAD' ? undefined : '<h1>内容暂时无法加载</h1><p>请稍后重试。</p>')
    }
  })
}
if (require.main === module) createSeoServer({ directory: process.env.SEO_DIST_DIR, apiOrigin: process.env.SEO_API_ORIGIN }).listen(Number(process.env.SEO_PORT || 4100), '127.0.0.1', () => console.log('Public SEO server listening'))
module.exports = { createSeoServer, publicWork }

