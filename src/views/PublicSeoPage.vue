<template><PublicSeoContent :path="$route.path.replace(/\/$/, '')" /></template>
<script>
import PublicSeoContent from '@/components/PublicSeoContent.vue'
export default {
  components: { PublicSeoContent },
  mounted() { this.scrollToSection() },
  watch: { '$route.hash'() { this.scrollToSection() } },
  methods: {
    async scrollToSection() {
      await this.$nextTick()
      const id = this.$route.hash.slice(1)
      if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' })
    },
  },
}
</script>
