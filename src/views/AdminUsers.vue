<template>
  <div class="admin-page">
    <aside class="sidebar">
      <div class="brand">KidStory <span>管理后台</span></div>
      <router-link to="/admin/books">绘本审核</router-link>
      <router-link to="/admin/rewards">积分奖励</router-link>
      <router-link to="/admin/feedback">意见建议</router-link>
      <router-link to="/admin/users" class="active">用户分析</router-link>
      <AdminUserCount />
      <router-link to="/creation-studio/book/mine">返回我的绘本 ↗</router-link>
    </aside>
    <main class="content">
      <header><div><p class="eyebrow">数据统计 / 用户分析</p><h1>用户注册分析</h1><p>了解网站账号的注册规模与近期变化。</p></div><el-button :loading="loading" @click="load">刷新数据</el-button></header>
      <el-alert v-if="error" title="统计数据加载失败，请刷新重试" type="error" :closable="false" show-icon />
      <div v-if="data" :aria-busy="loading">
        <section class="metrics" aria-label="用户注册概览">
          <article><span>用户总数</span><strong>{{ data.totalUsers.toLocaleString('zh-CN') }}</strong><small>包含所有用户账号</small></article>
          <article><span>今日新增</span><strong>{{ today }}</strong><small>北京时间今日</small></article>
          <article><span>近 {{ days }} 天新增</span><strong>{{ periodTotal }}</strong><small>含今日，按注册时间统计</small></article>
        </section>
        <section class="chart-card">
          <div class="chart-heading"><div><h2>注册趋势</h2><p>每日新增注册账号 · 北京时间</p></div><div class="period" aria-label="统计时间范围"><button v-for="n in [30, 90]" :key="n" type="button" :class="{ selected: days === n }" :aria-pressed="days === n" :disabled="loading" @click="changeDays(n)">近 {{ n }} 天</button></div></div>
          <div class="chart-wrap">
            <svg viewBox="0 0 900 260" role="img" :aria-label="`近 ${days} 天每日新增注册趋势，合计 ${periodTotal} 人`" preserveAspectRatio="none">
              <line v-for="n in 5" :key="n" x1="48" x2="880" :y1="20 + (n - 1) * 50" :y2="20 + (n - 1) * 50" stroke="#ebe8ef" />
              <text v-for="n in 5" :key="'label' + n" x="38" :y="24 + (n - 1) * 50" text-anchor="end" class="axis">{{ Math.round(maxCount * (5 - n) / 4) }}</text>
              <polyline :points="points" fill="none" stroke="#8061a5" stroke-width="3" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
            </svg>
            <div class="dates"><span>{{ data.growth[0].date }}</span><span>{{ data.growth[data.growth.length - 1].date }}</span></div>
          </div>
          <p v-if="data.missingDates" class="note">{{ data.missingDates }} 个账号缺少注册时间，已计入总数，未计入趋势。</p>
          <details><summary>查看每日数据</summary><div class="table-wrap"><table><thead><tr><th>日期</th><th>新增注册</th></tr></thead><tbody><tr v-for="row in [...data.growth].reverse()" :key="row.date"><td>{{ row.date }}</td><td>{{ row.count }}</td></tr></tbody></table></div></details>
        </section>
      </div>
      <div v-else-if="loading" class="loading" role="status">正在加载用户统计…</div>
    </main>
  </div>
</template>
<script>
import AdminUserCount from '@/components/AdminUserCount.vue'
export default {
  name: 'AdminUsers', components: { AdminUserCount },
  data() { return { data: null, days: 30, loading: false, error: false } },
  computed: {
    today() { return this.data.growth[this.data.growth.length - 1].count },
    periodTotal() { return this.data.growth.reduce((sum, row) => sum + row.count, 0) },
    maxCount() { return Math.max(4, Math.ceil(Math.max(...this.data.growth.map(row => row.count)) / 4) * 4) },
    points() { return this.data.growth.map((row, index) => `${48 + index * 832 / (this.data.growth.length - 1)},${220 - row.count / this.maxCount * 200}`).join(' ') },
  },
  mounted() { this.load() },
  methods: {
    changeDays(days) { if (days !== this.days) { this.days = days; this.data = null; this.load() } },
    async load() {
      if (this.loading) return
      this.loading = true; this.error = false
      try {
        const response = await this.$http.get('/admin/statistics/users', { params: { days: this.days }, timeout: 15000, headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } })
        const body = response.data || {}; const data = body.message
        if (!(body.code === 0 || body.code === '0' || body.desc === 'success') || !data || !Number.isSafeInteger(data.totalUsers) || !Array.isArray(data.growth) || data.growth.length !== this.days || !data.growth.every(row => typeof row.date === 'string' && Number.isSafeInteger(row.count) && row.count >= 0)) throw new Error('Invalid statistics')
        this.data = data
      } catch (error) { this.error = true } finally { this.loading = false }
    },
  },
}
</script>
<style scoped>
.admin-page { display:flex; min-height:calc(100vh - 100px); background:#f6f7fb; color:#303441; }
.sidebar { width:220px; flex-shrink:0; box-sizing:content-box; background:#fff; padding:30px 20px; border-right:1px solid #e8e9ef; }
.brand { font-size:21px; font-weight:750; color:#765a9e; margin-bottom:32px; }.brand span { display:block; font-size:13px; color:#8b8e99; margin-top:6px; }
.sidebar a { display:block; padding:12px 16px; margin-bottom:8px; color:#626774; text-decoration:none; border-radius:9px; }.sidebar a.active { color:#765a9e; background:#f1eafa; font-weight:600; }
.content { flex:1; min-width:0; max-width:1500px; padding:36px; } header { display:flex; justify-content:space-between; align-items:center; gap:20px; margin-bottom:24px; } h1 { margin:6px 0 10px; font-size:28px; } header p,.chart-heading p { margin:0; color:#737885; font-size:14px; }.eyebrow { color:#8d79a6; font-size:12px; }
.metrics { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; margin:20px 0; }.metrics article,.chart-card { background:#fff; border:1px solid #e9eaf0; border-radius:14px; padding:22px; }.metrics span,.metrics small { display:block; color:#6f7481; }.metrics span { font-size:14px; }.metrics strong { display:block; margin:12px 0; color:#654b83; font-size:32px; }.metrics small { font-size:12px; }
.chart-heading { display:flex; justify-content:space-between; gap:16px; align-items:center; }.chart-heading h2 { margin:0 0 8px; font-size:19px; }.period { display:flex; gap:6px; }.period button { min-height:40px; padding:0 12px; border:1px solid #e3dfeb; border-radius:8px; color:#625a6c; background:#fff; cursor:pointer; }.period button.selected { color:#654b83; background:#f1eafa; border-color:#d4c4e4; }.chart-wrap { margin-top:24px; } svg { display:block; width:100%; height:260px; overflow:visible; }.axis { font-size:12px; fill:#75717d; }.dates { display:flex; justify-content:space-between; padding:0 2% 0 5%; color:#75717d; font-size:12px; }.note { color:#75667e; font-size:13px; } details { margin-top:20px; color:#655276; } summary { cursor:pointer; }.table-wrap { max-height:300px; overflow:auto; } table { width:100%; border-collapse:collapse; color:#45414b; } th,td { padding:10px; text-align:left; border-bottom:1px solid #eee; }.loading { padding:30px; color:#737885; }
@media(max-width:768px) { .admin-page { flex-direction:column; }.sidebar { width:auto; padding:16px; display:flex; flex-wrap:wrap; gap:8px; border-right:0; border-bottom:1px solid #e8e9ef; }.brand { width:100%; margin:0 0 6px; font-size:18px; }.brand span { display:inline; margin-left:10px; }.sidebar a { padding:8px 12px; margin:0; }.content { padding:20px 14px; }.metrics { grid-template-columns:1fr; gap:10px; }.metrics article { padding:16px; }.metrics strong { margin:6px 0; }.chart-card { padding:16px; }.chart-heading { align-items:flex-start; flex-direction:column; } svg { height:200px; } }
</style>
