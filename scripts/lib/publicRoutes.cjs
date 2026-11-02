const fs = require('node:fs')
const path = require('node:path')
const { parse } = require('@babel/parser')

// Generate from Vue's route records so server deep links cannot drift from the app.
function appRoutePatterns(source = fs.readFileSync(path.join(__dirname, '../../src/router/index.js'), 'utf8')) {
  const ast = parse(source, { sourceType: 'module' })
  const routes = ast.program.body.flatMap(node => node.declarations || []).find(node => node.id.name === 'routes')?.init
  if (!routes || routes.type !== 'ArrayExpression') throw new Error('Vue routes not found')
  const patterns = []
  function walk(array, parent = '') {
    for (const record of array.elements) {
      if (!record || record.type !== 'ObjectExpression') continue
      const fields = Object.fromEntries(record.properties.filter(p => p.type === 'ObjectProperty').map(p => [p.key.name || p.key.value, p.value]))
      const value = fields.path?.value
      if (typeof value !== 'string' || value.includes('pathMatch')) continue
      const full = value.startsWith('/') ? value : `${parent.replace(/\/$/, '')}/${value}`
      const segments = full.replace(/\/$/, '').split('/').filter(Boolean)
      const pattern = segments.map(segment => {
        if (segment.startsWith(':')) return segment.endsWith('?') ? '(?:/[^/]+)?' : '/[^/]+'
        return '/' + segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      }).join('')
      patterns.push(`^${pattern || '/'}${pattern ? '/?' : ''}$`)
      if (fields.children?.type === 'ArrayExpression') walk(fields.children, full)
    }
  }
  walk(routes)
  return [...new Set(patterns)]
}
module.exports = { appRoutePatterns }
