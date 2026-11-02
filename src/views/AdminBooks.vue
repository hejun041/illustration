<template>
  <div class="admin-books">
    <aside class="admin-sidebar">
      <div class="admin-brand">KidStory <span>管理后台</span></div>
      <router-link to="/admin/books" :class="{ active: !rewardsView }">绘本审核</router-link>
      <router-link to="/admin/rewards" :class="{ active: rewardsView }">积分奖励</router-link>
      <router-link to="/creation-studio/book/mine">返回我的绘本 ↗</router-link>
      <p>仅管理员可访问</p>
    </aside>
    <section class="admin-content">
      <header class="admin-heading">
        <div><p class="eyebrow">内容管理 / {{ rewardsView ? '积分奖励' : '绘本审核' }}</p>
          <h1>{{ rewardsView ? '绘本积分奖励' : '绘本审核' }}</h1>
          <p>{{ rewardsView ? '查看奖励发放结果，处理未完成的奖励。每本绘本仅奖励一次。' : '先预览绘本内容，再通过或填写原因驳回。审核通过后自动发放积分。' }}</p>
        </div>
        <el-button :loading="loading" @click="loadBooks">刷新列表</el-button>
      </header>
      <form class="admin-filters" @submit.prevent="search">
        <el-input v-model="keyword" aria-label="搜索绘本" placeholder="搜索绘本名称或描述" clearable />
        <el-select v-if="!rewardsView" v-model="status" aria-label="审核状态" placeholder="全部状态" @change="search">
          <el-option label="待审核" value="1" /><el-option label="已通过" value="0" />
          <el-option label="已驳回" value="-1" /><el-option label="全部状态" value="" />
        </el-select>
        <el-select v-else v-model="rewardStatus" aria-label="奖励状态" placeholder="全部已通过绘本" @change="search">
          <el-option label="全部已通过绘本" value="" /><el-option label="已发放" value="paid" />
          <el-option label="待完成" value="pending" /><el-option label="发放失败" value="failed" />
        </el-select>
        <el-button type="primary" native-type="submit">搜索</el-button>
      </form>
      <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />
      <div class="admin-results" v-loading="loading">
        <div class="results-heading">共 {{ total }} 本绘本 <span>第 {{ page }} 页</span></div>
        <el-table :data="books" row-key="_id" class="review-table">
          <el-table-column label="绘本" min-width="245">
            <template #default="{ row }"><div class="book-summary">
              <el-image :src="cover(row)" fit="cover" class="book-cover"><template #error><span class="cover-fallback">绘本</span></template></el-image>
              <div><strong>{{ row.title || '未命名绘本' }}</strong><p>{{ row.owner?.name || '未知作者' }} · {{ pageCount(row) }} 页</p><small>{{ date(row.createdAt) }}</small></div>
            </div></template>
          </el-table-column>
          <el-table-column label="审核状态" min-width="105"><template #default="{ row }"><span class="status-badge" :class="statusType(row)">{{ statusLabel(row) }}</span></template></el-table-column>
          <el-table-column label="积分奖励" min-width="180"><template #default="{ row }">
            <strong :class="{ 'reward-paid': awarded(row) > 0 }">{{ rewardLabel(row) }}</strong>
            <p v-if="row.approval_points_awarded_at" class="cell-note">{{ date(row.approval_points_awarded_at) }}</p>
            <p v-if="row.approval_reward_status === 'failed'" class="cell-note failed">奖励尚未完成，可安全重试</p>
          </template></el-table-column>
          <el-table-column label="操作" min-width="130"><template #default="{ row }">
            <el-button link type="primary" @click="openBook(row)">预览 / 详情</el-button>
            <el-button v-if="canRetry(row)" link type="warning" :loading="busyId === row._id" @click="approve(row)">重试发奖</el-button>
          </template></el-table-column>
          <template #empty>{{ loading ? '正在加载…' : '暂无符合条件的绘本' }}</template>
        </el-table>
        <div class="mobile-review-list">
          <article v-for="book in books" :key="book._id" class="mobile-review-card">
            <div class="book-summary"><el-image :src="cover(book)" fit="cover" class="book-cover" /><div><strong>{{ book.title || '未命名绘本' }}</strong><p>{{ book.owner?.name || '未知作者' }} · {{ pageCount(book) }} 页</p></div></div>
            <div class="mobile-review-meta"><span class="status-badge" :class="statusType(book)">{{ statusLabel(book) }}</span><strong :class="{ 'reward-paid': awarded(book) > 0 }">{{ rewardLabel(book) }}</strong></div>
            <p class="cell-note">{{ date(book.createdAt) }}</p>
            <div class="mobile-review-actions"><el-button type="primary" plain @click="openBook(book)">预览 / 详情</el-button><el-button v-if="canRetry(book)" type="warning" :loading="busyId === book._id" @click="approve(book)">重试发奖</el-button></div>
          </article>
          <el-empty v-if="!books.length && !loading" description="暂无符合条件的绘本" />
        </div>
        <el-pagination v-if="total > pageSize" background layout="prev, pager, next" :current-page="page" :page-size="pageSize" :total="total" @current-change="changePage" />
      </div>
    </section>
    <el-dialog v-model="detailVisible" title="绘本预览与审核" width="min(960px, 94vw)" :close-on-click-modal="false" destroy-on-close>
      <div v-loading="detailLoading" class="review-detail">
        <el-alert v-if="detailError" type="error" :title="detailError" :closable="false" />
        <template v-if="detail">
          <h2>{{ detail.title || '未命名绘本' }}</h2>
          <p class="detail-description">{{ detail.description || '暂无描述' }}</p>
          <div class="detail-meta"><span class="status-badge" :class="statusType(detail)">{{ statusLabel(detail) }}</span><span>{{ rewardLabel(detail) }}</span><span>{{ pages.length }} 页</span></div>
          <p v-if="detail.reject_reason" class="failed">驳回原因：{{ detail.reject_reason }}</p>
          <el-alert v-if="detail.approval_reward_status === 'failed'" title="审核已通过，奖励发放未完成，请重试发奖。" type="warning" :closable="false" />
          <p v-if="canRetry(detail) && Number(detail.approval_points_expected) > 0" class="cell-note">已确定奖励 {{ detail.approval_points_expected }} 积分，重试不会修改金额或重复发放。</p>
          <div v-if="pages.length" class="page-preview"><el-image :src="pages[previewIndex].path" fit="contain" :preview-src-list="pages.map(p => p.path)" :initial-index="previewIndex" preview-teleported><template #error><div class="image-failed">此页图片加载失败，请勿直接通过审核。</div></template></el-image></div>
          <el-empty v-else description="没有可预览的页面" />
          <div v-if="pages.length" class="page-navigation"><el-button :disabled="previewIndex === 0" @click="previewIndex--">上一页</el-button><span>{{ previewIndex + 1 }} / {{ pages.length }}</span><el-button :disabled="previewIndex >= pages.length - 1" @click="previewIndex++">下一页</el-button></div>
          <div v-if="Number(detail.status) === 1" class="review-decision">
            <template v-if="!awarded(detail)">
              <label for="reward-points">通过审核后的奖励积分 <span class="failed">（最高 100 积分）</span></label>
              <el-input-number id="reward-points" v-model="rewardPoints" :min="1" :max="100" :step="1" :precision="0" :disabled="!!busyId || Number(detail.approval_points_expected) > 0" controls-position="right" aria-label="奖励积分" />
              <p class="cell-note">{{ Number(detail.approval_points_expected) > 0 ? '奖励金额已确定，重新审核或重试均沿用此金额。' : '请输入 1～100 的整数，确认通过后发放给作者。' }}</p>
            </template>
            <p v-else class="cell-note">此绘本已获得 {{ awarded(detail) }} 积分，本次审核不重复发放。</p>
            <label for="reject-reason">驳回原因（驳回时必填）</label>
            <el-input id="reject-reason" v-model="reason" type="textarea" :rows="3" maxlength="500" show-word-limit placeholder="说明需要修改的内容，作者可在“我的绘本”中查看" />
          </div>
        </template>
      </div>
      <template #footer><el-button @click="detailVisible = false">关闭</el-button>
        <template v-if="detail && !detailLoading && !detailError">
          <el-button v-if="Number(detail.status) === 1" type="danger" :disabled="!!busyId || !reason.trim()" @click="reject">驳回</el-button>
          <el-button v-if="Number(detail.status) === 1 || canRetry(detail)" type="primary" :loading="busyId === detail._id" :disabled="!!busyId || (!canRetry(detail) && (!pages.length || (!awarded(detail) && !validRewardPoints)))" @click="approve(detail)">{{ canRetry(detail) ? '重试发奖' : '通过审核并发放奖励' }}</el-button>
        </template>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import { bookReviewRequest } from '@/utils/bookReviewApi'
import { resolveBookReviewImage, getBookReviewPages } from '@/utils/bookReviewImages'
export default {
  name: 'AdminBooks',
  data() { return { books: [], total: 0, page: 1, pageSize: 20, keyword: '', status: '1', rewardStatus: '', loading: false, error: '', requestId: 0,
    detailVisible: false, detailLoading: false, detailError: '', detail: null, pages: [], previewIndex: 0, reason: '', rewardPoints: 100, busyId: '', detailRequestId: 0 } },
  computed: {
    rewardsView() { return this.$route.name === 'admin-rewards' },
    validRewardPoints() { return Number.isInteger(this.rewardPoints) && this.rewardPoints >= 1 && this.rewardPoints <= 100 },
  },
  watch: { '$route.name'() { this.page = 1; this.error = ''; this.loadBooks() } },
  mounted() { this.loadBooks() },
  methods: {
    awarded(book) { return Number(book.approval_points_awarded) || 0 },
    pageCount(book) { return book.content_snapshot?.length || book.content?.length || 0 },
    cover(book) { return resolveBookReviewImage(book.content_snapshot?.[0]?.path) || resolveBookReviewImage(book.content?.[0]) },
    date(value) { return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—' },
    statusLabel(book) { return ({ 0: '已通过', 1: '待审核', '-1': '已驳回' })[Number(book.status)] || '未知状态' },
    statusType(book) { return ({ 0: 'success', 1: 'warning', '-1': 'danger' })[Number(book.status)] || 'info' },
    rewardLabel(book) { const n = this.awarded(book); return n > 0 ? `已发放 ${n} 积分` : Number(book.status) === 0 ? ({ failed: '发放失败', pending: '待发放' })[book.approval_reward_status] || '无奖励记录' : `通过后奖励 ${Number(book.pending_approval_points) || 0} 积分` },
    canRetry(book) { return Number(book.status) === 0 && !this.awarded(book) && ['failed', 'pending'].includes(book.approval_reward_status) },
    search() { this.page = 1; this.loadBooks() },
    changePage(page) { this.page = page; this.loadBooks() },
    async loadBooks() {
      const id = ++this.requestId; this.loading = true; this.error = ''
      try {
        const params = { page: this.page, pageSize: this.pageSize, keyword: this.keyword.trim() }
        if (this.rewardsView) { params.status = 0; if (this.rewardStatus) params.rewardStatus = this.rewardStatus }
        else if (this.status !== '') params.status = this.status
        const result = await bookReviewRequest(this.$http, '', { params })
        if (id !== this.requestId) return
        this.books = result.message.list || []; this.total = result.message.total || 0
      } catch (e) { if (id === this.requestId) { this.error = e.message; this.books = []; this.total = 0 } }
      finally { if (id === this.requestId) this.loading = false }
    },
    async openBook(book) {
      const id = ++this.detailRequestId; this.detail = null; this.pages = []; this.reason = ''; this.previewIndex = 0
      this.detailVisible = true; this.detailLoading = true; this.detailError = ''
      try {
        const result = await bookReviewRequest(this.$http, `/${book._id}`)
        if (id !== this.detailRequestId) return
        this.detail = result.message.book
        this.rewardPoints = Math.min(100, Math.max(1, Number(this.detail.approval_points_expected) || Number(this.detail.pending_approval_points) || 100))
        this.pages = getBookReviewPages(this.detail, result.message.illustrations || [])
      } catch (e) { if (id === this.detailRequestId) this.detailError = e.message }
      finally { if (id === this.detailRequestId) this.detailLoading = false }
    },
    async approve(book) {
      if (this.busyId) return
      try {
        const setsReward = Number(book.status) === 1 && !this.awarded(book)
        if (setsReward && !this.validRewardPoints) { ElMessage.error('奖励积分必须为 1～100 的整数'); return }
        if (!this.canRetry(book)) await ElMessageBox.confirm(`确认已检查绘本内容？${setsReward ? `通过后奖励作者 ${this.rewardPoints} 积分。` : '此绘本已有奖励记录，不重复发放。'}`, '通过审核', { confirmButtonText: '确认通过', cancelButtonText: '继续检查' })
        this.busyId = book._id
        const result = await bookReviewRequest(this.$http, `/${book._id}/approve`, { method: 'post', data: { reviewedVersion: book.updatedAt, ...(setsReward ? { rewardPoints: this.rewardPoints } : {}) } })
        if (this.detail?._id === book._id) this.detail = result.message
        if (result.reward_error) ElMessage.warning(result.reward_error)
        else ElMessage.success(this.awarded(result.message) > 0 ? `审核通过，已发放 ${this.awarded(result.message)} 积分` : '审核通过')
        await this.loadBooks()
      } catch (e) { if (e !== 'cancel' && e !== 'close') ElMessage.error(e.message || '审核失败') }
      finally { this.busyId = '' }
    },
    async reject() {
      if (this.busyId || !this.reason.trim()) return
      this.busyId = this.detail._id
      try {
        const result = await bookReviewRequest(this.$http, `/${this.detail._id}/reject`, { method: 'post', data: { reason: this.reason.trim(), reviewedVersion: this.detail.updatedAt } })
        this.detail = result.message; ElMessage.success('已驳回，作者可查看修改原因'); await this.loadBooks()
      } catch (e) { ElMessage.error(e.message || '驳回失败') }
      finally { this.busyId = '' }
    },
  },
}
</script>

<style scoped>
.status-badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 5px; font-size: 12px; line-height: 1.6; white-space: nowrap; background: #f0f1f4; color: #656b76; }
.status-badge.success { background: #edf7ee; color: #3b7d42; }.status-badge.warning { background: #fff5df; color: #976414; }.status-badge.danger { background: #fff0ef; color: #b94a48; }

.mobile-review-list { display: none; }
.admin-books { display: flex; min-height: calc(100vh - 100px); background: #f6f7fb; color: #303441; }
.admin-sidebar { width: 220px; flex-shrink: 0; background: #fff; padding: 30px 20px; border-right: 1px solid #e8e9ef; }
.admin-brand { font-size: 21px; font-weight: 750; color: #765a9e; margin-bottom: 32px; }.admin-brand span { display: block; font-size: 13px; color: #8b8e99; margin-top: 6px; }
.admin-sidebar a { display: block; padding: 12px 16px; margin-bottom: 8px; color: #626774; text-decoration: none; border-radius: 9px; }.admin-sidebar a.active { color: #765a9e; background: #f1eafa; font-weight: 600; }.admin-sidebar p { margin: 32px 16px; color: #9699a3; font-size: 12px; }
.admin-content { flex: 1; min-width: 0; padding: 36px; max-width: 1500px; }
.admin-heading { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 24px; }.admin-heading h1 { font-size: 28px; margin: 6px 0 10px; }.admin-heading p { color: #737885; font-size: 14px; line-height: 1.7; margin: 0; }.admin-heading .eyebrow { color: #8d79a6; font-size: 12px; }
.admin-filters { display: flex; gap: 12px; margin-bottom: 20px; }.admin-filters .el-input { max-width: 360px; }.admin-filters .el-select { width: 190px; }
.admin-results { background: #fff; border: 1px solid #e9eaf0; border-radius: 14px; padding: 20px; margin-top: 16px; }.results-heading { font-weight: 600; margin-bottom: 16px; }.results-heading span { font-size: 12px; color: #9498a5; margin-left: 10px; }.el-pagination { justify-content: center; margin-top: 24px; }
.book-summary { display: flex; align-items: center; gap: 12px; padding: 10px 0; }.book-summary strong { overflow-wrap: anywhere; }.book-summary p { margin: 4px 0; color: #747b89; font-size: 12px; }.book-summary small, .cell-note { color: #979da8; font-size: 12px; }.cell-note { margin: 5px 0; }.book-cover { width: 54px; height: 70px; border-radius: 6px; flex-shrink: 0; }.cover-fallback { display: grid; place-items: center; height: 100%; width: 100%; background: #eee8f5; color: #8b76a4; font-size: 12px; }.reward-paid { color: #a06b18; }.failed { color: #bb5353; }
.review-detail { min-height: 180px; }.review-detail h2 { margin: 0 0 10px; }.detail-description { color: #777; white-space: pre-wrap; overflow-wrap: anywhere; }.detail-meta { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; margin: 16px 0; }.page-preview { background: #f5f4f8; border-radius: 10px; display: grid; place-items: center; margin-top: 18px; }.page-preview .el-image { width: 100%; height: min(46vh, 470px); }.image-failed { padding: 40px; color: #bb5353; }.page-navigation { display: flex; gap: 20px; justify-content: center; align-items: center; margin: 16px 0; }.review-decision label { display: block; margin: 22px 0 10px; }
@media (max-width: 768px) { .review-table { display: none; }.mobile-review-list { display: block; }.mobile-review-card { padding: 12px 0 18px; border-top: 1px solid #eef0f4; }.mobile-review-meta { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; font-size: 13px; }.mobile-review-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }.mobile-review-actions .el-button { margin-left: 0; } .admin-books { flex-direction: column; }.admin-sidebar { width: auto; padding: 16px; display: flex; flex-wrap: wrap; gap: 8px; border-right: 0; border-bottom: 1px solid #e8e9ef; }.admin-brand { width: 100%; margin: 0 0 6px; font-size: 18px; }.admin-brand span { display: inline; margin-left: 10px; }.admin-sidebar a { padding: 8px 12px; margin: 0; }.admin-sidebar p { display: none; }.admin-content { padding: 20px 14px; }.admin-heading { align-items: flex-start; }.admin-heading h1 { font-size: 24px; }.admin-filters { flex-wrap: wrap; }.admin-filters .el-input { max-width: none; width: 100%; }.admin-filters .el-select { flex: 1; }.admin-results { padding: 12px; }.review-table { width: 100%; } }
</style>

