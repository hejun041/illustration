const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { createSeoServer } = require('./public-seo-server.cjs')
const { appRoutePatterns } = require('./lib/publicRoutes.cjs')

test('public HTTP rendering, privacy, deep links and real error statuses', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'kidstory-seo-'))
  const template = '<html><head><title>App</title><meta name="robots" content="index, follow"></head><body><noscript>Enable JS</noscript><div id="app"></div><script src="/js/app.js"></script></body></html>'
  await fs.writeFile(path.join(directory, 'app.html'), template)
  await fs.writeFile(path.join(directory, 'app-routes.json'), JSON.stringify(appRoutePatterns()))
  await fs.writeFile(path.join(directory, 'sitemap-pages.xml'), '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>')
  await fs.mkdir(path.join(directory, 'js'))
  await fs.writeFile(path.join(directory, 'js/app.js'), 'console.log("ok")')
  const id = 'a'.repeat(24), privateId = 'b'.repeat(24), deletedId = 'c'.repeat(24)
  const work = { _id: id, title: '小熊的故事', description: '雨后的森林', is_public: 1, status: 0, content_snapshot: [{ path: 'upload/cover.jpg', title: '封面' }] }
  const post = { slug: 'bear', title: '故事分镜教程', excerpt: '一步一步完成绘本', coverImageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3foAAAAASUVORK5CYII=', htmlContent: '<h2>分镜</h2><p>保持角色特征</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a><img src="https://example.com/a.jpg" onerror="bad()">' }
  let unavailable = false
  const calls = []
  const fetcher = async (url, options) => {
    calls.push(url.pathname + url.search)
    assert.equal(options.headers, undefined, 'must not forward authorization or cookies')
    if (unavailable) return new Response('Unavailable', { status: 502 })
    let data
    if (url.pathname === '/api/blog/') data = [post]
    else if (url.pathname === '/api/blog/bear') data = post
    else if (url.pathname === '/book/' || url.pathname === '/ill/public') data = url.searchParams.get('page') === '999' ? [] : [work, { ...work, _id: privateId, is_public: 0, title: '私有标题' }]
    else if (url.pathname.endsWith(id)) data = work
    else if (url.pathname.endsWith(privateId)) data = { ...work, is_public: 0 }
    else return Response.json({ code: -1, message: '不存在' }, { status: 404 })
    return Response.json({ code: 0, data })
  }
  const server = createSeoServer({ directory, fetcher })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await fs.rm(directory, { recursive: true, force: true }) })
  const origin = `http://127.0.0.1:${server.address().port}`
  const get = async (p, options) => { const r = await fetch(origin + p, options); return { r, html: await r.text() } }
  for (const p of ['/books', '/illustration', '/blog']) {
    const { r, html } = await get(p, { headers: { Cookie: 'private=secret', Authorization: 'Bearer secret' } })
    assert.equal(r.status, 200)
    assert.ok(html.includes('<h1>'))
    assert.ok(html.includes(p === '/blog' ? '/blog/bear' : `/${p.slice(1)}/${id}`))
    assert.ok(!html.includes('私有标题'))
    assert.ok(html.includes('/guides/ai-picture-book-tutorial'))
    const payload = JSON.parse(html.match(/id="public-page-data">([\s\S]*?)<\/script>/)[1])
    assert.equal(payload.kind, p.slice(1))
    assert.ok(Array.isArray(payload.data))
    assert.ok(!JSON.stringify(payload.data).includes('私有标题'))
  }
  const detail = await get('/blog/bear')
  assert.ok(detail.html.includes('保持角色特征'))
  assert.ok(!detail.html.includes('alert(1)'))
  assert.ok(!detail.html.includes('onerror'))
  assert.ok(detail.html.includes('/js/app.js'), 'keep app behavior after rendering')
  assert.ok(!detail.html.includes('data:image/'), 'inline covers must not bloat initial HTML or JSON')
  const coverPath = detail.html.match(/\/blog-assets\/inline-covers\/[a-f0-9]+\.png/)[0]
  assert.equal((await get(coverPath)).r.status, 200, 'materialized cover is a real asset')
  for (const p of [`/books/${id}`, `/illustration/${id}`]) assert.equal((await get(p)).r.status, 200)
  for (const p of ['/unknown', '/blog/unknown', '/books/bad-id', `/books/${privateId}`, `/books/${deletedId}`, '/books/999/extra', '/books?page=999', '/books?page=0']) {
    const { r, html } = await get(p)
    assert.equal(r.status, 404, p)
    assert.ok(html.includes('noindex'))
  }
  const page2 = await get('/books?page=2')
  assert.ok(page2.html.includes('https://www.kidstory.cc/books?page=2'))
  assert.ok(calls.some(url => url.includes('page=2')))
  for (const p of ['/creation-studio/book/ai', '/user/profile', '/character-studio/workbench', '/character-studio/workbench/abc']) assert.equal((await get(p)).r.status, 200, p)
  const retryPage = await get('/mood-diary/recap?_chunk_reload=1792368000021')
  assert.equal(retryPage.r.status, 200)
  assert.ok(retryPage.html.includes('rel="canonical" href="https://www.kidstory.cc/mood-diary/recap"'))
  assert.ok(!retryPage.html.includes('_chunk_reload'))
  assert.equal(retryPage.r.headers.get('x-robots-tag'), 'noindex, follow')
  assert.equal((await get('/creation-studio/not-a-route')).r.status, 404)
  assert.equal((await get('/js/app.js')).r.status, 200)
  const sitemap = await get('/sitemap-pages.xml')
  assert.equal(sitemap.r.status, 200)
  assert.equal(sitemap.r.headers.get('content-type'), 'application/xml')
  assert.ok(sitemap.html.startsWith('<urlset'))
  assert.equal((await get('/js/missing.js')).r.status, 404)
  assert.equal((await get('/js/..%2fapp.html')).r.status, 404)
  assert.equal((await get('/guides', { redirect: 'manual' })).r.status, 301)
  const head = await get('/books', { method: 'HEAD' })
  assert.equal(head.r.status, 200); assert.equal(head.html, '')
  assert.equal((await get('/books', { method: 'POST' })).r.status, 405)
  unavailable = true
  const failed = await get('/books')
  assert.equal(failed.r.status, 503)
  assert.equal(failed.r.headers.get('retry-after'), '60')
})

test('initial public payload is consumed only on the matching path and page', () => {
  const vm = require('node:vm')
  const source = require('node:fs').readFileSync(path.join(__dirname, '../src/utils/publicPageData.js'), 'utf8').replace('export function', 'function')
  let removed = false
  const element = { textContent: JSON.stringify({ kind: 'books', path: '/books?page=2', data: [{ title: '公开作品' }] }), remove() { removed = true } }
  const context = vm.createContext({ URL, document: { getElementById() { return removed ? null : element } }, window: { location: { href: 'https://www.kidstory.cc/books?page=2' } } })
  vm.runInContext(source + '\nglobalThis.take = takePublicPageData;', context)
  assert.equal(context.take('blog'), null)
  assert.equal(removed, false)
  context.window.location.href = 'https://www.kidstory.cc/books'
  assert.equal(context.take('books'), null)
  context.window.location.href = 'https://www.kidstory.cc/books?page=2'
  assert.equal(context.take('books')[0].title, '公开作品')
  assert.equal(removed, true)
  assert.equal(context.take('books'), null)
})
