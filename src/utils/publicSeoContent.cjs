const catalog = require('../data/publicSeoPages.json')
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
}
function renderWorkflow(workflow) {
  if (!workflow) return ''
  return `<section class="book-workflow" aria-label="绘本制作流程"><div class="book-workflow-head"><div><h2>${escapeHtml(workflow.heading)}</h2></div><a class="book-workflow-guide" href="${escapeHtml(workflow.link.href)}">${escapeHtml(workflow.link.label)} <span aria-hidden="true">↗</span></a></div><ol class="book-workflow-steps">${workflow.steps.map((step, index) => `<li><a class="book-workflow-step" href="${escapeHtml(step.href)}"><span class="book-workflow-number" aria-hidden="true">0${index + 1}</span><strong>${escapeHtml(step.title)}</strong></a>${step.image ? `<a class="book-workflow-shot" href="${escapeHtml(step.image.src)}" target="_blank" rel="noopener" aria-label="${escapeHtml(`查看大图：${step.image.alt}`)}"><img src="${escapeHtml(step.image.src)}" alt="${escapeHtml(step.image.alt)}" width="${Number(step.image.width)}" height="${Number(step.image.height)}" loading="lazy" decoding="async"></a>` : ''}</li>`).join('')}</ol></section>`
}
function renderImages(images = []) {
  return images.map(image => `<figure class="public-seo-figure"><a href="${escapeHtml(image.src)}" target="_blank" rel="noopener" aria-label="${escapeHtml(`查看大图：${image.alt}`)}"><img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" width="${Number(image.width)}" height="${Number(image.height)}" loading="lazy" decoding="async"></a><figcaption>${escapeHtml(image.caption)}</figcaption></figure>`).join('')
}
function renderPageContent(page, compact = false) {
  const headingTag = compact ? 'h2' : 'h1'
  const creationCta = placement => {
    if (compact || !(page.path?.startsWith('/guides/') || page.path === '/ai-picture-book')) return ''
    const layout = page.path.endsWith('pdf-layout')
    return `<section class="tutorial-start" aria-label="开始创作"><h2>${layout ? '已有插画？开始排版成书' : '跟着教程，动手做一本绘本'}</h2><p>${layout ? '导入已有图片，选择尺寸、调整页面，再导出 PDF。' : '打开创作工具填写故事，或先载入一段示例；确认后才开始生成。'}</p><div class="tutorial-start-links"><a class="tutorial-start-primary" data-creation-cta="${placement}" href="/creation-studio/book/${layout ? 'topdf' : 'ai'}">${layout ? '打开 PDF 排版工具' : '开始创作绘本'}</a>${layout ? '' : `<a data-creation-cta="${placement}-sample" href="/creation-studio/book/ai?sample=forest">用示例故事试一试</a>`}</div><p class="tutorial-start-note">需要登录。AI 生成以工具内显示的积分规则为准；绘本草稿保存在当前浏览器，请及时下载。</p></section>`
  }
  return `<article class="public-seo-document"><header><p class="public-seo-kicker">KidStory · 绘本创作</p><${headingTag}>${escapeHtml(page.heading)}</${headingTag}><p class="public-seo-lead">${escapeHtml(page.intro)}</p></header>${creationCta('top')}${compact ? '' : renderWorkflow(page.workflow)}${compact ? '' : `<nav aria-label="本页目录">${page.sections.map(section => `<a href="#${escapeHtml(section.id)}">${escapeHtml(section.heading)}</a>`).join('')}</nav>`}${page.sections.map(section => `<section id="${escapeHtml(section.id)}"><${compact ? 'h3' : 'h2'}>${escapeHtml(section.heading)}</${compact ? 'h3' : 'h2'}>${(section.paragraphs || []).map(text => `<p>${escapeHtml(text)}</p>`).join('')}${section.example ? `<blockquote><p>${escapeHtml(section.example)}</p></blockquote>` : ''}${renderImages(section.images)}${section.items ? `<ul>${section.items.map(text => `<li>${escapeHtml(text)}</li>`).join('')}</ul>` : ''}</section>`).join('')}${creationCta('bottom')}<nav class="public-seo-actions" aria-label="相关页面">${page.links.map(link => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`).join('')}</nav></article>`
}
module.exports = { catalog, escapeHtml, renderPageContent, renderWorkflow }

