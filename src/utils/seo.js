/** 站点 SEO 默认值与路由标题 */
import publicPages from '@/data/publicSeoPages.json'

export const SEO = {
  siteName: 'KidStory',
  siteUrl: 'https://www.kidstory.cc',
  defaultTitle: publicPages.pages[0].title,
  defaultDescription:
    publicPages.pages[0].description,
  defaultKeywords:
    'KidStory,AI插画,AI绘本,儿童绘本,插画创作,绘本创作,在线编辑器,图元上传,PDF导出,心情日记,原创插画',
}

function setLinkRel(rel, href) {
  if (typeof document === 'undefined' || !href) return
  let el = document.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    document.head.appendChild(el)
  }
  el.href = href
}

function canonicalForPath(path) {
  const p = String(path || '/').replace(/\/+$/, '') || ''
  return p ? `${SEO.siteUrl}${p}` : `${SEO.siteUrl}/`
}

/**
 * 根据路由更新 document.title 与 canonical（公开页可设 meta.seoTitle）
 * @param {import('vue-router').RouteLocationNormalized} route
 */
export function applyRouteSeo(route) {
  if (typeof document === 'undefined') return
  const record = route.matched
    .slice()
    .reverse()
    .find((r) => r.meta?.seoTitle)
  const seoTitle = record?.meta?.seoTitle
  const normalizedPath = route.path.replace(/\/+$/, '') || '/'
  const page = [...publicPages.pages, ...publicPages.metadata].find(page => page.path === normalizedPath)
  const title = page?.title || (seoTitle ? `${seoTitle} | ${SEO.siteName}` : SEO.defaultTitle)
  const description = page?.description || record?.meta?.seoDescription || SEO.defaultDescription
  document.title = title
  setLinkRel('canonical', canonicalForPath(route.path))
  setMeta('description', description)
  setMeta('og:title', title)
  setMeta('og:description', description)
  setMeta('og:url', canonicalForPath(route.path))
  setMeta('twitter:title', title)
  setMeta('twitter:description', description)
  const image = `${SEO.siteUrl}${page?.image || '/android-chrome-512x512.png'}`
  setMeta('og:image', image)
  setMeta('og:image:alt', page?.imageAlt || 'KidStory 插画与绘本创作平台')
  setMeta('twitter:image', image)
  const isPrivate = route.matched.some(record => record.meta?.requiresAuth) || /^\/(user|member|creation-studio)(\/|$)/.test(route.path)
  setMeta('robots', isPrivate || route.name === 'NotFound' ? 'noindex, follow' : 'index, follow')
}

function setMeta(name, content) {
  const attribute = name.startsWith('og:') ? 'property' : 'name'
  let element = document.querySelector(`meta[${attribute}="${name}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, name)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

export function applyPublicDetailSeo(item, pathname) {
  if (!item?.title || typeof document === 'undefined') return
  const title = `${item.seoTitle || item.title}｜${SEO.siteName}`
  const description = item.metaDescription || item.excerpt || item.description || item.title
  document.title = title
  setLinkRel('canonical', canonicalForPath(pathname))
  setMeta('description', description)
  setMeta('og:title', title)
  setMeta('og:description', description)
  setMeta('og:url', canonicalForPath(pathname))
  setMeta('twitter:title', title)
  setMeta('twitter:description', description)
  setMeta('robots', 'index, follow')
}

export { setLinkRel, canonicalForPath, setMeta }
