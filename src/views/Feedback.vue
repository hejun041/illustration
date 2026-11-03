<template>
  <main class="feedback-page">
    <div class="feedback-wrap">
        <section class="board"  :aria-label="$t('feedback.boardTitle')">
          <div class="board-body" aria-live="polite">
            <div v-if="loading" class="board-state">{{ $t('feedback.loading') }}</div>
            <div v-else-if="loadError" class="board-state"><p>{{ $t('feedback.loadFailed') }}</p><button type="button" class="text-button" @click="loadFeedback">{{ $t('feedback.retry') }}</button></div>
            <div v-else-if="!items.length" class="board-state empty-state">
              <h3>{{ $t('feedback.emptyTitle') }}</h3><p>{{ $t('feedback.emptyDescription') }}</p>
            </div>
            <template v-else>
              <article v-for="item in items" :key="item.id" class="feedback-thread">
                <div class="thread-meta"><span class="avatar user-avatar" aria-hidden="true">{{ $t('feedback.userInitial') }}</span><strong>{{ $t('feedback.anonymousUser') }}</strong><time v-if="item.created_at" :datetime="item.created_at">{{ formatDate(item.created_at) }}</time></div>
                <p class="thread-content">{{ item.content }}</p>
                <div v-if="item.reply" class="reply"><div class="reply-title"><span class="avatar team-avatar" aria-hidden="true">{{ $t('feedback.teamInitial') }}</span><strong>{{ $t('feedback.teamReply') }}</strong><time v-if="item.replied_at" :datetime="item.replied_at">{{ formatDate(item.replied_at) }}</time></div><p>{{ item.reply }}</p></div>
              </article>
              <div v-if="hasMore || page > 1" class="pagination"><button type="button" :disabled="page <= 1" @click="changePage(page - 1)">{{ $t('feedback.previous') }}</button><span>{{ page }}</span><button type="button" :disabled="!hasMore" @click="changePage(page + 1)">{{ $t('feedback.next') }}</button></div>
            </template>
          </div>
        </section>

      <div class="feedback-side">
      <header class="feedback-hero">
        <div class="hero-copy">
          <h1 :class="{ 'hero-title-zh': $i18n.locale !== 'en' }">{{ $t('feedback.heroTitle') }}</h1>
        </div>
      </header>

      <div v-if="isAdmin" class="admin-toolbar"><button type="button" class="admin-toggle" @click="toggleReview">{{ showReview ? $t('feedback.closeReview') : $t('feedback.reviewButton') }}</button></div>
      <section v-if="showReview && isAdmin" class="review-panel panel" aria-labelledby="review-title">
        <div class="review-header"><h2 id="review-title">{{ $t('feedback.reviewTitle') }}</h2><p>{{ $t('feedback.reviewHint') }}</p></div>
        <div v-if="reviewLoading" class="review-message">{{ $t('feedback.loading') }}</div>
        <div v-else-if="reviewError" class="review-message">{{ $t('feedback.loadFailed') }} <button type="button" class="text-button" @click="loadReview">{{ $t('feedback.retry') }}</button></div>
        <div v-else-if="!reviewItems.length" class="review-message">{{ $t('feedback.reviewEmpty') }}</div>
        <article v-for="item in reviewItems" :key="item.id" class="review-item">
          <div class="review-meta"><strong>{{ item.is_published ? $t('feedback.published') : $t('feedback.private') }}</strong><time v-if="item.created_at">{{ formatDate(item.created_at) }}</time></div>
          <p class="original-label">{{ $t('feedback.original') }}</p><p class="original-content">{{ item.content }}</p>
          <button type="button" class="text-button copy-original" @click="item.public_content = item.content">{{ $t('feedback.copyOriginal') }}</button>
          <label :for="'public-' + item.id">{{ $t('feedback.publicCopy') }}</label><textarea :id="'public-' + item.id" v-model="item.public_content" maxlength="2000" rows="3"></textarea>
          <label :for="'reply-' + item.id">{{ $t('feedback.replyLabel') }}</label><textarea :id="'reply-' + item.id" v-model="item.reply" maxlength="2000" rows="3"></textarea>
          <div class="review-actions"><button type="button" :disabled="reviewSaving" @click="saveReview(item, false)">{{ $t('feedback.keepPrivate') }}</button><button type="button" class="publish-button" :disabled="reviewSaving || !item.public_content.trim()" @click="saveReview(item, true)">{{ $t('feedback.publish') }}</button></div>
        </article>
        <div v-if="reviewHasMore || reviewPage > 1" class="pagination"><button type="button" :disabled="reviewPage <= 1" @click="changeReviewPage(reviewPage - 1)">{{ $t('feedback.previous') }}</button><span>{{ reviewPage }}</span><button type="button" :disabled="!reviewHasMore" @click="changeReviewPage(reviewPage + 1)">{{ $t('feedback.next') }}</button></div>
      </section>
        <section class="form-panel panel" aria-labelledby="form-title">
          <div class="panel-heading form-heading"><div><h2 id="form-title">{{ $t('feedback.formTitle') }}</h2><p>{{ $t('feedback.formSubtitle') }}</p></div></div>
          <form class="form-body" @submit.prevent="submit">
            <label for="feedback-content" class="field-label">{{ $t('feedback.fieldLabel') }}</label>
            <el-input id="feedback-content" v-model="content" type="textarea" :rows="8" :maxlength="maxLen" show-word-limit :placeholder="$t('feedback.placeholder')" class="feedback-input" :disabled="submitting" />
            <p class="feedback-hint">{{ $t('feedback.hint') }}</p>
            <el-button native-type="submit" type="primary" size="large" class="feedback-submit" :loading="submitting" :disabled="!canSubmit">{{ $t('feedback.submit') }} <span aria-hidden="true">→</span></el-button>
            <p class="privacy-note">{{ $t('feedback.privacyNote') }}</p>
          </form>
        </section>
      </div>
    </div>
  </main>
</template>

<script>
import { ElMessage } from 'element-plus';
import { mapState } from 'vuex';
import { submitUserFeedback, listPublicFeedback, listFeedbackForReview, reviewFeedback } from '@/utils/feedbackApi';
import { isCurrentUserAdmin } from '@/utils/auth';
const MIN_LEN = 5;
const MAX_LEN = 2000;
export default {
  name: 'FeedbackPage',
  data() { return { content: '', submitting: false, maxLen: MAX_LEN, apiBaseUrl: process.env.VUE_APP_API_BASE_URL || '', items: [], loading: true, loadError: false, page: 1, hasMore: false, showReview: false, reviewItems: [], reviewLoading: false, reviewError: false, reviewSaving: false, reviewPage: 1, reviewHasMore: false }; },
  computed: { ...mapState(['isLogin']), isAdmin() { return this.isLogin && isCurrentUserAdmin(); }, canSubmit() { const len = (this.content || '').trim().length; return len >= MIN_LEN && len <= MAX_LEN && !this.submitting; } },
  mounted() { this.loadFeedback(); },
  methods: {
    toggleReview() { this.showReview = !this.showReview; if (this.showReview) this.loadReview(); },
    async loadReview() {
      this.reviewLoading = true; this.reviewError = false;
      try { const result = await listFeedbackForReview(this.$http, { page: this.reviewPage, apiBaseUrl: this.apiBaseUrl }); this.reviewItems = result.items; this.reviewHasMore = result.hasMore; }
      catch (error) { this.reviewError = true; }
      finally { this.reviewLoading = false; }
    },
    changeReviewPage(page) { this.reviewPage = page; this.loadReview(); },
    async saveReview(item, isPublished) {
      if (this.reviewSaving) return;
      this.reviewSaving = true;
      try {
        await reviewFeedback(this.$http, { id: item.id, publicContent: item.public_content.trim(), reply: item.reply.trim(), isPublished, apiBaseUrl: this.apiBaseUrl });
        item.is_published = isPublished; ElMessage.success(this.$t('feedback.reviewSaved')); await this.loadFeedback();
      } catch (error) { ElMessage.error(error?.message || this.$t('feedback.reviewFailed')); }
      finally { this.reviewSaving = false; }
    },
    async loadFeedback() {
      this.loading = true; this.loadError = false;
      try { const result = await listPublicFeedback(this.$http, { page: this.page, apiBaseUrl: this.apiBaseUrl }); this.items = result.items; this.hasMore = result.hasMore; }
      catch (error) { this.loadError = true; }
      finally { this.loading = false; }
    },
    changePage(page) { this.page = page; this.loadFeedback(); },
    formatDate(value) { const date = new Date(value); if (Number.isNaN(date.getTime())) return ''; return new Intl.DateTimeFormat(this.$i18n.locale === 'en' ? 'en' : 'zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }).format(date); },
    ensureLogin() { if (this.isLogin && localStorage.getItem('token')) return true; ElMessage.warning(this.$t('feedback.loginRequired')); this.$store.commit('showMask'); return false; },
    async submit() {
      if (!this.ensureLogin()) return;
      const text = (this.content || '').trim();
      if (text.length < MIN_LEN) { ElMessage.warning(this.$t('feedback.tooShort', { min: MIN_LEN })); return; }
      this.submitting = true;
      try { await submitUserFeedback(this.$http, { content: text, locale: this.$i18n?.locale === 'en' ? 'en' : 'zh', apiBaseUrl: this.apiBaseUrl }); this.content = ''; ElMessage.success(this.$t('feedback.success')); }
      catch (e) { ElMessage.error(e?.message || this.$t('feedback.failed')); }
      finally { this.submitting = false; }
    },
  },
};
</script>

<style scoped>
.feedback-page { min-height: calc(100vh - 112px); box-sizing: border-box; background: linear-gradient(to right, #fbe5dc 0 58.33%, #fff 58.33%); color: #291c16; text-align: left; }
.feedback-wrap { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); min-height: calc(100vh - 112px); }
.board { width: min(100% - 64px, 680px); margin: 0 auto; padding: 190px 0 90px; box-sizing: border-box; }
.feedback-side { width: min(100% - 64px, 450px); margin: 0 auto; padding: 90px 0; box-sizing: border-box; }
.feedback-hero { padding: 0 0 80px; text-align: center; }
.hero-copy { max-width: 720px; margin: 0 auto; }
.hero-copy h1 { margin: 0; color: #291c16; font-size: clamp(20px, 2.25vw, 32px); line-height: 1.25; letter-spacing: -.025em; }
.hero-title-zh { white-space: nowrap; }

.panel { overflow: hidden; border: 2px solid #291c16; border-radius: 24px; background: #fff9f1; box-shadow: 5px 5px 0 #291c16; }
.panel-heading { padding: 28px 30px 20px; }
.board-heading { padding: 4px 2px 20px; }
.form-panel { background: #e8f6f4; }
.panel-heading h2 { margin: 0; color: #291c16; font-size: 22px; line-height: 1.35; }
.panel-heading p { margin: 7px 0 0; color: #76665e; font-size: 14px; line-height: 1.6; }
.board-body { min-height: 0; padding: 0 5px 5px 0; }
.board-state { min-height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; padding: 28px; border: 2px solid #291c16; border-radius: 24px; background: #f2ebfb; box-shadow: 5px 5px 0 #291c16; color: #655b65; line-height: 1.7; text-align: center; }
.board-state p { margin: 8px 0; }
.board-state h3 { margin: 0; color: #291c16; font-size: 17px; }
.feedback-thread { min-height: 180px; box-sizing: border-box; padding: 24px; border: 2px solid #291c16; border-radius: 22px; background: #f2ebfb; box-shadow: 5px 5px 0 #291c16; }
.feedback-thread + .feedback-thread { margin-top: 20px; }
.thread-meta,.reply-title { display: flex; align-items: center; gap: 9px; color: #45352e; font-size: 14px; }
.thread-meta time,.reply-title time { margin-left: auto; color: #8a7a71; font-size: 12px; }
.avatar { display: grid; flex: none; place-items: center; width: 30px; height: 30px; border: 1px solid #291c16; border-radius: 50%; font-size: 12px; font-weight: 700; }
.user-avatar { background: #f7e5d2; color: #5f493c; }
.team-avatar { background: #b9e4f2; color: #254d5e; }
.thread-content,.reply p { overflow-wrap: anywhere; white-space: pre-wrap; font-size: 14px; line-height: 1.8; }
.thread-content { margin: 14px 0 0; color: #453a35; }
.reply { margin-top: 16px; padding: 15px 16px; border: 1px solid #d4c8e2; border-radius: 14px; background: #fff; }
.reply p { margin: 10px 0 0 39px; color: #675951; }
.form-body { padding: 0 30px 30px; }
.field-label { display: block; margin-bottom: 10px; color: #45352e; font-size: 15px; font-weight: 700; }
.feedback-input :deep(.el-textarea__inner) { min-height: 210px; padding: 15px 16px 28px; border-radius: 14px; background: #fff; box-shadow: 0 0 0 1px #bbaea4 inset; font-size: 14px; line-height: 1.7; resize: vertical; }
.feedback-input :deep(.el-textarea__inner:focus) { box-shadow: 0 0 0 2px #291c16 inset; }
.feedback-hint,.privacy-note { color: #76665e; font-size: 13px; line-height: 1.65; }
.feedback-hint { margin: 12px 0 24px; }
.privacy-note { margin: 17px 0 0; font-size: 12px; }
.feedback-submit { width: 100%; min-height: 48px; border: 2px solid #291c16; border-radius: 999px; background: #f279d0; box-shadow: 4px 4px 0 #291c16; color: #291c16; font-size: 15px; font-weight: 700; }
.feedback-submit span { margin-left: 8px; }
.feedback-submit:hover,.feedback-submit:focus { border-color: #291c16; background: #f58bda; color: #291c16; }
.feedback-submit.is-disabled,.feedback-submit.is-disabled:hover { border-color: #b7aaa2; background: #f4cfeb; box-shadow: none; color: #796a72; }
.text-button,.pagination button { border: 0; background: transparent; color: #635188; cursor: pointer; font: inherit; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 14px; color: #76665e; font-size: 14px; }
.pagination button { padding: 8px; }
.pagination button:disabled { opacity: .4; cursor: not-allowed; }
.admin-toolbar { display: flex; justify-content: flex-end; margin: 0 0 16px; }
.admin-toggle { padding: 9px 14px; border: 1px solid #291c16; border-radius: 999px; background: #fff9f1; color: #291c16; cursor: pointer; }
.review-panel { margin-bottom: 30px; padding: 26px 30px; }
.review-header h2 { margin: 0 0 6px; color: #291c16; font-size: 20px; }
.review-header p,.review-message { color: #76665e; font-size: 13px; line-height: 1.6; }
.review-item { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e7dcd2; }
.review-meta { display: flex; gap: 14px; color: #76665e; font-size: 13px; }
.original-label,.review-item label { color: #45352e; font-size: 13px; font-weight: 700; }
.original-label { margin: 15px 0 6px; }
.original-content { margin: 0; overflow-wrap: anywhere; white-space: pre-wrap; font-size: 14px; line-height: 1.7; }
.copy-original { padding: 8px 0; }
.review-item label { display: block; margin: 12px 0 7px; }
.review-item textarea { box-sizing: border-box; width: 100%; padding: 10px; border: 1px solid #bbaea4; border-radius: 10px; font: inherit; line-height: 1.6; resize: vertical; }
.review-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }
.review-actions button { padding: 9px 16px; border: 1px solid #291c16; border-radius: 999px; background: #fff; color: #291c16; cursor: pointer; }
.review-actions .publish-button { background: #f279d0; }
.review-actions button:disabled { opacity: .5; cursor: not-allowed; }
@media (max-width: 760px) {
  .feedback-page { background: #fbe5dc; }
  .feedback-wrap { display: flex; flex-direction: column; }
  .feedback-side { order: -1; width: 100%; padding: 36px 20px 40px; background: #fff; }
  .board { width: 100%; padding: 36px 20px 60px; }
  .feedback-hero { padding: 0 0 28px; }
  .hero-copy h1 { font-size: clamp(18px, 6vw, 28px); }
  .panel-heading { padding: 23px 22px 17px; }
  .board-heading { padding: 2px 2px 17px; }
  .board-body { padding: 0 5px 5px 0; }
  .feedback-thread { padding: 20px; }
  .form-body { padding: 0 22px 26px; }
  .review-panel { padding: 22px; }
}
</style>
