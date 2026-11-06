<template>
  <div class="user-stat" :aria-busy="loading" aria-live="polite">
    <div class="stat-label">网站用户总数</div>
    <div v-if="loading && total === null" class="stat-value stat-message">正在加载…</div>
    <div v-else-if="error && total === null" class="stat-value stat-message">加载失败</div>
    <div v-else class="stat-value">{{ total.toLocaleString('zh-CN') }} <span>人</span></div>
    <div class="stat-footer">
      <span>{{ error ? '更新失败，请重试' : '包含所有用户账号' }}</span>
      <button type="button" :disabled="loading" @click="load">{{ loading ? '更新中…' : '刷新' }}</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AdminUserCount',
  data() { return { total: null, loading: false, error: false } },
  mounted() { this.load() },
  methods: {
    async load() {
      if (this.loading) return
      this.loading = true
      this.error = false
      try {
        const response = await this.$http.get('/admin/users', {
          params: { page: 1, pageSize: 1 }, timeout: 15000,
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        })
        const body = response.data || {}
        const total = body.message?.total
        if (!(body.code === 0 || body.code === '0' || body.desc === 'success') || !Number.isSafeInteger(total) || total < 0) throw new Error('Invalid user count')
        this.total = total
      } catch (error) { this.error = true } finally { this.loading = false }
    },
  },
}
</script>

<style scoped>
.user-stat { margin: 26px 0 0; padding: 16px; border: 1px solid #e7dff0; border-radius: 12px; background: #faf7fd; }
.stat-label { color: #61566c; font-size: 13px; font-weight: 600; }
.stat-value { margin: 8px 0; color: #654b83; font-size: 30px; line-height: 1.2; font-weight: 700; }
.stat-value span { font-size: 14px; font-weight: 400; }
.stat-message { font-size: 16px; }
.stat-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: #6e6877; font-size: 12px; }
.stat-footer button { padding: 6px 0 6px 8px; border: 0; background: transparent; color: #654b83; cursor: pointer; font: inherit; }
.stat-footer button:disabled { cursor: wait; opacity: .65; }
@media (max-width: 768px) { .user-stat { width: 100%; margin: 4px 0; } }
</style>
