// Refresh public article URLs before building; fail rather than publish a partial map.
const fs = require('node:fs/promises')
const path = require('node:path')
const { catalog, escapeHtml } = require('../src/utils/publicSeoContent.cjs')
async function main() {
  const file = path.resolve(__dirname, '../public/sitemap.xml')
  const source = await fs.readFile(file, 'utf8')
  const entries = new Map([...source.matchAll(/<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/g)].map(m => [m[1], m[0]]))
  for (const url of entries.keys()) if (url.startsWith(`${catalog.siteUrl}/blog/`)) entries.delete(url)
  let count = 0
  for (let page = 1; ; page++) {
    if (page > 100) throw new Error('Blog sitemap pagination exceeded safety limit')
    const response = await fetch(`https://api.kidstory.cc/api/blog/?limit=100&page=${page}`, { signal: AbortSignal.timeout(60000) })
    if (!response.ok) throw new Error(`Blog API HTTP ${response.status}`)
    const body = await response.json()
    if (Number(body.code) !== 0 || !Array.isArray(body.data)) throw new Error('Unexpected public blog response')
    for (const post of body.data) {
      if (!post.slug || !post.publishedAt) throw new Error('Public article lacks slug or publication date')
      const url = `${catalog.siteUrl}/blog/${encodeURIComponent(post.slug)}`
      entries.set(url, `<url><loc>${escapeHtml(url)}</loc></url>`)
      count++
    }
    if (body.data.length < 100) break
  }
  if (!count) throw new Error('Refusing to publish an empty blog sitemap')
  for (const page of catalog.pages) {
    const url = `${catalog.siteUrl}${page.path}`
    entries.set(url, `<url><loc>${escapeHtml(url)}</loc>${page.updated ? `<lastmod>${escapeHtml(page.updated)}</lastmod>` : ''}</url>`)
  }
  await fs.writeFile(file, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...entries.values()].join('\n')}\n</urlset>\n`)
  console.log(`Sitemap: ${entries.size} unique URLs, ${count} public articles`)
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
