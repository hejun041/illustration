const { catalog, escapeHtml, renderPageContent } = require('../../src/utils/publicSeoContent.cjs')
const fs = require('node:fs')
const path = require('node:path')
const stylesheet = fs.readFileSync(path.resolve(__dirname, '../../src/styles/publicSeo.css'), 'utf8')

function replaceMeta(html, attribute, name, content) {
  const regex = new RegExp(`<meta\\b(?=[^>]*\\b${attribute}=["']${name}["'])[^>]*>`, 'gi')
  const tag = `<meta ${attribute}="${name}" content="${escapeHtml(content)}">`
  return regex.test(html) ? html.replace(regex, () => tag) : html.replace('</head>', `${tag}</head>`)
}
function renderPublicHtml(template, page) {
  const canonical = `${catalog.siteUrl}${page.path === '/' ? '/' : page.path}`
  let html = template.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escapeHtml(page.title)}</title>`)
  html = html.replace(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/gi, '')
  html = html.replace('</head>', `<link rel="canonical" href="${canonical}"></head>`)
  for (const [attribute, name, content] of [
    ['name', 'description', page.description], ['property', 'og:title', page.title],
    ['property', 'og:description', page.description], ['property', 'og:url', canonical],
    ['name', 'twitter:title', page.title], ['name', 'twitter:description', page.description],
    ['property', 'og:image', `${catalog.siteUrl}${page.image || '/android-chrome-512x512.png'}`],
    ['property', 'og:image:alt', page.imageAlt || 'KidStory 插画与绘本创作平台'],
    ['name', 'twitter:image', `${catalog.siteUrl}${page.image || '/android-chrome-512x512.png'}`],
  ]) html = replaceMeta(html, attribute, name, content)
  if (page.sections) {
    if (!/<div id="app">\s*<\/div>/.test(html)) throw new Error('Public SEO: app mount point not found')
    html = html.replace(/<noscript>[\s\S]*?<\/noscript>/i, '')
    html = html.replace(/<div id="app">\s*<\/div>/, () => `<div id="app"><main class="seo-static-shell"><a class="seo-static-home" href="/">KidStory 首页</a>${renderPageContent(page)}</main></div>`)
    html = html.replace('</head>', `<style>${stylesheet}\n.seo-static-shell{height:100vh;overflow:auto;background:white}.seo-static-home{display:block;margin:16px 28px;color:#674796}</style></head>`)
  }
  // Keep related reading reachable after the SPA replaces the initial #app HTML.
  html = html.replace('</body>', '<nav aria-label="创作相关阅读" style="padding:20px;display:flex;flex-wrap:wrap;gap:16px;background:#fff"><a href="/blog">绘本与插画创作文章</a><a href="/guides/ai-picture-book-pdf-layout">绘本 PDF 排版指南</a><a href="/blog/ai-illustration-without-installing-skills">照片与 AI 插画创作方法</a></nav></body>')
  return html
}
class PublicSeoBuildPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap('PublicSeoBuildPlugin', compilation => {
      compilation.hooks.processAssets.tap({ name: 'PublicSeoBuildPlugin', stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT }, () => {
        const template = compilation.getAsset('index.html')?.source.source().toString()
        if (!template) throw new Error('Public SEO: index.html not found')
        const Source = compiler.webpack.sources.RawSource
        compilation.emitAsset('app-routes.json', new Source(JSON.stringify(require('./publicRoutes.cjs').appRoutePatterns())))
        // SPA fallback must not declare every unknown route canonical to the homepage.
        compilation.emitAsset('app.html', new Source(template.replace(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/gi, '')))
        for (const page of [...catalog.metadata, ...catalog.pages]) {
          const output = page.path === '/' ? 'index.html' : `${page.path.slice(1)}/index.html`
          const contentPage = page.path === '/connection' ? { ...page, heading: '绘本与插画创作指南', intro: page.description, sections: [{ id: 'start', heading: '从故事到成品', paragraphs: ['选择制作教程，查看故事分镜、角色参考、插画编辑与 PDF 排版的操作步骤。'] }], links: catalog.pages.filter(item => item.path !== '/').map(item => ({ href: item.path, label: item.heading })).concat([{ href: '/blog', label: '阅读全部创作文章' }, { href: '/books', label: '浏览公开绘本' }]) } : page
          const html = new Source(renderPublicHtml(template, contentPage))
          if (compilation.getAsset(output)) compilation.updateAsset(output, html)
          else compilation.emitAsset(output, html)
        }
        const sitemapAsset = compilation.getAsset('sitemap.xml')
        if (sitemapAsset) {
          const source = sitemapAsset.source.source().toString()
          const entries = new Map([...source.matchAll(/<url>\s*<loc>([^<]+)<\/loc>([\s\S]*?)<\/url>/g)].map(match => [match[1], match[0]]))
          for (const page of catalog.pages) {
            const url = `${catalog.siteUrl}${page.path}`
            entries.set(url, `<url><loc>${escapeHtml(url)}</loc>${page.updated ? `<lastmod>${escapeHtml(page.updated)}</lastmod>` : ''}</url>`)
          }
          const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...entries.values()].join('\n')}\n</urlset>\n`
          compilation.updateAsset('sitemap.xml', new Source(sitemap))
          if (compilation.getAsset('sitemap-pages.xml')) compilation.updateAsset('sitemap-pages.xml', new Source(sitemap))
          else compilation.emitAsset('sitemap-pages.xml', new Source(sitemap))
        }
      })
    })
  }
}
module.exports = { PublicSeoBuildPlugin, renderPublicHtml, replaceMeta }
