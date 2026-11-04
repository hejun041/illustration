<template>
  <div class="admin-page">
    <aside class="sidebar">
      <div class="brand">KidStory <span>管理后台</span></div>
      <router-link to="/admin/books">绘本审核</router-link>
      <router-link to="/admin/rewards">积分奖励</router-link>
      <router-link to="/admin/feedback" class="active">意见建议</router-link>
      <router-link to="/creation-studio/book/mine">返回我的绘本 ↗</router-link>
    </aside>
    <main class="content">
      <header><div><h1>意见建议</h1><p>检查问题中的个人信息，填写回复后公开。</p></div><el-button :loading="loading" @click="load">刷新列表</el-button></header>
      <el-alert v-if="error" title="加载失败，请重试" type="error" :closable="false" show-icon />
      <div v-loading="loading" class="list">
        <el-empty v-if="!items.length && !loading && !error" description="暂无建议" />
        <article v-for="item in items" :key="item.id" class="item">
          <div class="meta"><strong>{{ item.is_published ? '已公开' : '未公开' }}</strong><time v-if="item.created_at">{{ formatDate(item.created_at) }}</time></div>
          <label :for="'question-' + item.id">问题</label>
          <el-input :id="'question-' + item.id" v-model="item.public_content" type="textarea" :rows="3" maxlength="2000" />
          <label :for="'reply-' + item.id">回复</label>
          <el-input :id="'reply-' + item.id" v-model="item.reply" type="textarea" :rows="3" maxlength="2000" />
          <div class="actions"><el-button :disabled="saving" @click="save(item, false)">保存为未公开</el-button><el-button type="primary" :loading="saving === item.id" :disabled="!!saving || !item.public_content.trim()" @click="save(item, true)">保存并公开</el-button></div>
        </article>
        <div v-if="hasMore || page > 1" class="pagination"><el-button :disabled="page <= 1 || loading" @click="changePage(page - 1)">上一页</el-button><span>{{ page }}</span><el-button :disabled="!hasMore || loading" @click="changePage(page + 1)">下一页</el-button></div>
      </div>
    </main>
  </div>
</template>
<script>
import { ElMessage } from 'element-plus'
import { listFeedbackForReview, reviewFeedback } from '@/utils/feedbackApi'
export default {
  name: 'AdminFeedback',
  data() { return { items: [], page: 1, hasMore: false, loading: false, error: false, saving: null, apiBaseUrl: process.env.VUE_APP_API_BASE_URL || '' } },
  mounted() { this.load() },
  methods: {
    async load() {
      this.loading = true; this.error = false
      try {
        const result = await listFeedbackForReview(this.$http, { page: this.page, apiBaseUrl: this.apiBaseUrl })
        this.items = result.items.map(item => ({ ...item, public_content: item.public_content || item.content || '', reply: item.reply || '' }))
        this.hasMore = result.hasMore
      } catch (error) { this.error = true } finally { this.loading = false }
    },
    changePage(page) { this.page = page; this.load() },
    formatDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('zh-CN') },
    async save(item, isPublished) {
      if (this.saving) return
      this.saving = item.id
      try {
        await reviewFeedback(this.$http, { id: item.id, publicContent: item.public_content.trim(), reply: item.reply.trim(), isPublished, apiBaseUrl: this.apiBaseUrl })
        item.is_published = isPublished; ElMessage.success('保存成功')
      } catch (error) { ElMessage.error(error?.message || '保存失败，请重试') } finally { this.saving = null }
    },
  },
}
</script>
<style scoped>
.admin-page { display:flex; min-height:calc(100vh - 100px); background:#f6f7fb; color:#303441; }
.sidebar { width:220px; flex-shrink:0; box-sizing:content-box; background:#fff; padding:30px 20px; border-right:1px solid #e8e9ef; }
.brand { font-size:21px; font-weight:750; color:#765a9e; margin-bottom:32px; }.brand span { display:block; font-size:13px; color:#8b8e99; margin-top:6px; }
.sidebar a { display:block; padding:12px 16px; margin-bottom:8px; color:#626774; text-decoration:none; border-radius:9px; }.sidebar a.active { color:#765a9e; background:#f1eafa; font-weight:600; }
.content { flex:1; min-width:0; padding:36px; max-width:1000px; } header { display:flex; justify-content:space-between; align-items:center; gap:20px; margin-bottom:24px; } h1 { margin:0 0 10px; font-size:28px; } header p { margin:0; color:#737885; font-size:14px; }
.list { margin-top:16px; }.item { background:#fff; border:1px solid #e9eaf0; border-radius:14px; padding:24px; margin-bottom:16px; }.meta { display:flex; gap:16px; color:#737885; font-size:14px; }.item label { display:block; margin:18px 0 8px; font-weight:600; }.actions { display:flex; justify-content:flex-end; flex-wrap:wrap; gap:8px; margin-top:18px; }.actions .el-button { margin:0; }.pagination { display:flex; justify-content:center; align-items:center; gap:14px; }
@media(max-width:768px) { .admin-page { flex-direction:column; }.sidebar { width:auto; padding:16px; display:flex; flex-wrap:wrap; gap:8px; border-right:0; border-bottom:1px solid #e8e9ef; }.brand { width:100%; margin:0 0 6px; font-size:18px; }.brand span { display:inline; margin-left:10px; }.sidebar a { padding:8px 12px; margin:0; }.content { padding:20px 14px; }.item { padding:18px; } }
</style>
