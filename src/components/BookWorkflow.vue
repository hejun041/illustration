<template><div v-html="html" /></template>
<script>
import publicSeo from '@/utils/publicSeoContent.cjs'
import '@/styles/publicSeo.css'

export default {
  computed: {
    html() {
      const page = publicSeo.catalog.pages.find(page => page.path === '/')
      return publicSeo.renderWorkflow(page.workflow)
    },
  },
}
</script>
