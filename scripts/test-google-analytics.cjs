const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const vm = require('node:vm')
const path = require('node:path')
async function harness(id = 'G-TEST123456') {
  const source = (await fs.readFile(path.resolve(__dirname, '../src/utils/googleAnalytics.js'), 'utf8')).replace(/^import .*\n/, '').replace(/export (async )?function /g, '$1function ')
  const scripts = [], calls = [], navigations = []; let after, click
  const context = { isCurrentUserAdmin: () => false, navigator: {}, URL, Date, Set, location: { origin: 'https://www.kidstory.cc', href: 'https://www.kidstory.cc/guides/test?utm_source=wechat&utm_campaign=book&code=private' }, window: {}, document: { title: '教程', referrer: 'https://www.google.com/search?q=private', createElement: () => ({}), head: { appendChild: s => scripts.push(s) }, addEventListener() {} }, fetch: async () => ({ ok: true, json: async () => ({ measurementId: id }) }) }
  vm.createContext(context); vm.runInContext(source + ';this.track=trackAnalytics;this.install=installGoogleAnalytics', context)
  context.window.gtag = (...args) => calls.push(args)
  context.document.addEventListener = (_name, callback) => { click = callback }
  context.install({ afterEach: cb => { after = cb }, push: target => navigations.push(target) })
  return { context, calls, scripts, after, click, navigations }
}
test('GA4 initializes once and sends only sanitized campaign/page data', async () => {
  const h = await harness()
  await h.context.track('creation_start', { tool: 'book', prompt: 'secret' })
  await h.context.track('export_complete', { tool: 'layout', format: 'pdf' })
  assert.equal(h.scripts.length, 1)
  assert.equal(h.calls.filter(c => c[0] === 'config').length, 1)
  assert.equal(h.calls.find(c => c[0] === 'config')[2].send_page_view, false)
  const events = h.calls.filter(c => c[0] === 'event')
  assert.equal(events.length, 2); assert.ok(events[0][2].page_location.includes('utm_source=wechat'))
  assert.ok(!JSON.stringify(events).includes('private')); assert.ok(!JSON.stringify(events).includes('secret'))
})
test('successful SPA paths are counted once; failed and private routes do not generate pageviews', async () => {
  const h = await harness(); const route = { path: '/guides/test', fullPath: '/guides/test' }
  h.after(route, {}, null); h.after(route, {}, null)
  h.after({ path: '/admin/books', fullPath: '/admin/books' }, {}, null)
  h.after({ path: '/books', fullPath: '/books' }, {}, new Error('navigation aborted'))
  await new Promise(resolve => setImmediate(resolve))
  const views = h.calls.filter(c => c[0] === 'event' && c[1] === 'page_view')
  assert.equal(views.length, 1); assert.equal(views[0][2].page_referrer, 'https://www.google.com/search')
})
test('no configured ID, admin, DNT and network errors never send events or break the tool', async () => {
  const h = await harness(''); await h.context.track('creation_start'); assert.equal(h.calls.length, 0)
  const admin = await harness(); admin.context.isCurrentUserAdmin = () => true; await admin.context.track('creation_start'); assert.equal(admin.calls.length, 0)
  const dnt = await harness(); dnt.context.navigator.doNotTrack = '1'; await dnt.context.track('creation_start'); assert.equal(dnt.calls.length, 0)
  const offline = await harness(); offline.context.fetch = async () => { throw new Error('offline') }; await offline.context.track('creation_start'); assert.equal(offline.calls.length, 0)
})
test('tutorial CTA uses SPA navigation without unloading before GA receives the click', async () => {
  const h = await harness(); let prevented = false
  const link = { dataset: { creationCta: 'top' }, getAttribute: () => '/creation-studio/book/ai' }
  h.click({ target: { closest: () => link }, button: 0, preventDefault() { prevented = true } })
  await new Promise(resolve => setImmediate(resolve))
  assert.ok(prevented); assert.equal(h.navigations[0], '/creation-studio/book/ai')
  assert.equal(h.calls.filter(c => c[0] === 'event' && c[1] === 'tutorial_cta').length, 1)
})
