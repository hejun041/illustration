<template>
  <div>
    <div class="content">
      <div class="content-left">
        <header class="library-header">
          <h1>{{ copy.title }}</h1>
          <form class="library-search" role="search" @submit.prevent="searchBooks">
            <input v-model="searchDraft" type="search" :placeholder="copy.search" :aria-label="copy.search" :disabled="loading || loadControl" />
            <button type="submit" :disabled="loading || loadControl">{{ copy.searchAction }}</button>
          </form>
        </header>
        <div class="books-toolbar">
          <span class="toolbar-label">{{ $t('books.categoryLabel') }}</span>
          <div class="category-scroll">
            <button v-for="option in categoryOptions" :key="option.value || 'all'" type="button"
              class="category-chip" :class="{ active: button2 === option.value }"
              :aria-pressed="button2 === option.value" :disabled="loading || loadControl"
              @click="selectCategory(option.value)">{{ option.value ? option.label : copy.all }}</button>
          </div>
        </div>
        <div class="results-toolbar">
          <el-radio-group v-model="sortType" :disabled="loading || loadControl" size="small" :aria-label="$t('books.sortLabel')" @change="handleSortChange">
            <el-radio-button v-for="item in sortList" :key="item.value" :label="item.value">{{ item.label }}</el-radio-button>
          </el-radio-group>
        </div>

        <div
          class="box"
          v-infinite-scroll="loadMore"
          :infinite-scroll-disabled="loading || loadControl || scrollDisabled || loadError || !initialLoaded"
          :infinite-scroll-distance="120"
        >
          <div v-if="loading" class="loading">
            <book-loading :text="$t('books.loading')" />
          </div>
          <div
            v-show="(!loading)"
            class="items"
          >
            <article
              class="book-card"
              v-for="(item, index) in books"
              :key="item._id || index"

            >
              <div class="book-cover">
                <el-image
                  v-if="item.cover"
                  :src="$illustrationPreview({ content: item.cover, cover_thumbnail: item.cover_thumbnail })" @error="$thumbnailFailed(item)"
                  :alt="item.title"
                  class="book-image"
                  fit="contain"
                  :lazy="true"
                  loading="lazy"
                  :preview-src-list="[]"
                >
                  <template #placeholder>
                    <div class="img-placeholder">
                      <div class="shimmer" />
                    </div>
                  </template>
                  <template #error>
                    <div class="img-error">
                      <i class="el-icon-picture-outline"></i>
                    </div>
                  </template>
                </el-image>
                <div v-else class="img-placeholder">
                  <div class="shimmer" />
                </div>
              </div>
              <div class="book-meta">
                <h3 class="book-title"><a :href="`/books/${item._id}`" :title="item.title">{{ item.title }}</a></h3>
                <div class="book-meta-bottom">
                  <span class="category-tag" :data-category="item.type">{{ getCategoryLabel(item.type) }}</span>
                  <button
                    class="cover-fab"
                    :class="{
                      active: collectBookArr.includes(item._id),
                      pulse: collectingIds.includes(item._id),
                      visible: collectBookArr.includes(item._id),
                    }"
                    type="button"
                    :aria-pressed="collectBookArr.includes(item._id)"
                    :aria-label="collectBookArr.includes(item._id) ? $t('books.cancelCollect') || 'uncollect' : $t('books.collect') || 'collect'"
                    @click.stop="handleCollectClick(item._id)"
                  >
                    <span
                      class="iconfont"
                      :class="collectBookArr.includes(item._id) ? 'icon-shoucang1' : 'icon-shoucang'"
                    />
                  </button>
                </div>
              </div>

            </article>
          </div>
          <div v-if="!loading && !books.length" class="empty-state" role="status">{{ loadError ? $t('books.errorOccurred') : copy.empty }}<button v-if="loadError" type="button" @click="reloadBooks">{{ copy.retry }}</button></div>
          <div v-if="!loading && books.length" class="load-more" role="status" aria-live="polite">
            <button v-if="loadError" type="button" @click="loadMore">{{ copy.retry }}</button>
            <p v-else>{{ scrollDisabled ? copy.end : loadControl ? $t('books.loading') : copy.more }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import BookLoading from '@/components/BookLoading.vue'
import { mapState } from 'vuex'
import { ElMessage } from 'element-plus'
import { getCollectionBook } from '@/api/userCollect'
import { takePublicPageData } from '@/utils/publicPageData'

export default {
  name: "OriginalBooks",
  components: {
    BookLoading
  },
  computed: {
    ...mapState(["books", "collectBookArr"]),
    copy() {
      const en = this.$i18n.locale === 'en'
      return en ? {
        title: 'Picture Book Library', search: 'Search picture books by title or topic', searchAction: 'Search',
        all: 'All', more: 'Scroll down to load more', end: 'You have reached the end', empty: 'No books found. Try another search or category.', retry: 'Retry',
      } : {
        title: '绘本馆', search: '搜索绘本名称、主题', searchAction: '搜索',
        all: '全部', more: '向下滚动，自动加载更多', end: '已经看完全部绘本了', empty: '暂无相关绘本，试试其他关键词或分类吧', retry: '重试',
      }
    },
    sortList() {
      return [
        { value: "default", label: this.$i18n.locale === 'en' ? 'Recommended' : '推荐' },
        { value: "hot", label: this.$i18n.locale === 'en' ? 'Popular' : '最受欢迎' },
        { value: "time", label: this.$i18n.locale === 'en' ? 'Newest' : '最新发布' },
      ]
    },
    categoryOptions() {
      return [
        { label: this.$t('books.categoryAll'), value: "" },
        { label: this.$t('upload.categoryAi'), value: "ai" },
        { label: this.$t('upload.categoryReading'), value: "reading" },
        { label: this.$t('upload.categoryHabit'), value: "habit" },
        { label: this.$t('upload.categoryEnglish'), value: "english" },
        { label: this.$t('upload.categoryMath'), value: "math" },
        { label: this.$t('upload.categoryKnowledge'), value: "knowledge" },
        { label: this.$t('upload.categoryOthers'), value: "others" },
      ]
    }
  },
  data() {
    return {
      searchDraft: '',
      searchKeyword: '',
      loadError: false,
      userid:localStorage.getItem("id"),
      toolArry:[],
      num:1,
      loading:true,
      loadControl:false,
      scrollDisabled:false,
      sortType: "default",
      button2: "",
      collectingIds: [],
      collectIdMap: {},
      initialLoaded: false,
    };
  },
  methods: {
    searchBooks() {
      this.searchKeyword = this.searchDraft.trim()
      return this.reloadBooks()
    },
    getCategoryLabel(type) {
      const map = {
        ai: this.$t('upload.categoryAi'),
        reading: this.$t('upload.categoryReading'),
        habit: this.$t('upload.categoryHabit'),
        english: this.$t('upload.categoryEnglish'),
        math: this.$t('upload.categoryMath'),
        knowledge: this.$t('upload.categoryKnowledge'),
        story: this.$t('upload.categoryStory'),
        nature: this.$t('upload.categoryNature'),
        history: this.$t('upload.categoryHistory'),
        art: this.$t('upload.categoryArt'),
        emotion: this.$t('upload.categoryEmotion'),
        others: this.$t('upload.categoryOthers')
      }
      return map[type] || this.$t('upload.categoryOthers')
    },
    coverUrl(path) {
      if (!path) return ''
      if (/^https?:\/\//i.test(path)) return path
      return `https://static.kidstory.cc/${path}`
    },
    selectCategory(value) {
      if (this.button2 === value) return
      this.button2 = value
      this.handleCategoryChange()
    },
    toDetail(id) {
      this.$router.push({ name: 'bookdetails', params: { bookId: id } })
    },

    getSortParams() {
      if (this.sortType === 'time') {
        return { sort_param: 'createdAt', sort_num: 'desc' }
      }
      return { sort_param: 'heat', sort_num: 'desc' }
    },

    getAuthHeaders() {
      const token = localStorage.getItem('token')
      return token && token !== 'undefined'
        ? { Authorization: `Bearer ${token}` }
        : {}
    },

    buildBookListUrl(page) {
      const { sort_param, sort_num } = this.getSortParams()
      let url = `/book/?sort_param=${sort_param}&sort_num=${sort_num}&page=${page}`
      if (this.button2 && this.button2.trim() !== '') {
        url += this.button2 === 'ai' ? '&source=ai' : `&type=${this.button2}`
      }
      if (this.searchKeyword) url += `&keyword=${encodeURIComponent(this.searchKeyword)}`
      return url
    },

    async getBooks() {
      try {
        const initial = takePublicPageData('books')
        if (Array.isArray(initial)) { this.toolArry = this.dedupById(initial); return }
        const res = await this.$http.get(this.buildBookListUrl(this.num), { headers: this.getAuthHeaders() })
        const raw = Array.isArray(res.data && res.data.message) ? res.data.message : []
        this.toolArry = this.dedupById(raw)
      } catch (err) {
        this.loadError = true
        this.loading = false
        ElMessage({ message: this.$t('books.errorOccurred'), type: 'error' })
      }
    },

    dedupById(list) {
      if (!Array.isArray(list)) return []
      const seen = new Set()
      const out = []
      for (const item of list) {
        if (!item || !item._id) continue
        if (seen.has(item._id)) continue
        seen.add(item._id)
        out.push(item)
      }
      return out
    },

    setBooks() {
      this.$store.commit('addBooks', this.toolArry)
      this.loading = false
    },

    async loadMore() {
      if (this.loading || this.loadControl || this.scrollDisabled || !this.initialLoaded) return
      this.loadError = false
      this.loadControl = true
      try {
        const nextPage = this.num + 1
        const res = await this.$http.get(this.buildBookListUrl(nextPage), { headers: this.getAuthHeaders() })
        const books = Array.isArray(res.data && res.data.message)
          ? res.data.message
          : (Array.isArray(res.data && res.data.data) ? res.data.data : [])

        if (!books.length) {
          this.scrollDisabled = true
          return
        }

        const existingIds = new Set()
        this.toolArry.forEach((b) => b && b._id && existingIds.add(b._id))
        this.$store.state.books.forEach((b) => b && b._id && existingIds.add(b._id))

        const newBooks = []
        for (const item of books) {
          if (!item || !item._id) continue
          if (existingIds.has(item._id)) continue
          existingIds.add(item._id)
          newBooks.push(item)
        }

        // 本页全部重复：跳过这页，继续向后翻。连续多页都重复时判定没有更多数据。
        if (!newBooks.length) {
          this.num = nextPage
          this.emptyPageStreak = (this.emptyPageStreak || 0) + 1
          if (this.emptyPageStreak >= 2) this.scrollDisabled = true
          return
        }
        this.emptyPageStreak = 0

        const currentLength = this.toolArry.length
        this.toolArry = this.toolArry.concat(newBooks)
        await this.fetchCoversForRange(currentLength, newBooks.length)
        this.$store.commit('addBooks', newBooks)
        this.num = nextPage
      } catch (err) {
        this.loadError = true
        ElMessage.error(this.$t('books.errorOccurred'))
      } finally {
        this.loadControl = false
      }
    },

    async fetchCoversForRange(startIndex, count) {
      const headers = this.getAuthHeaders()
      const endIndex = startIndex + (count == null ? this.toolArry.length - startIndex : count)
      const promises = []
      for (let idx = startIndex; idx < endIndex; idx++) {
        const book = this.toolArry[idx]
        if (!book) continue
        const firstId = Array.isArray(book.content) ? book.content[0] : null
        const original = book.content_snapshot?.[0]?.path || firstId
        if (original && (/^(https?:|data:)/.test(original) || original.includes('/'))) {
          book.cover = original
          continue
        }
        if (!firstId) {
          this.toolArry[idx].cover = ''
          continue
        }
        promises.push(
          this.$http.get(`/ill/${firstId}`, { headers })
            .then((res) => {
              const content = res && res.data && res.data.message && res.data.message.content
              this.toolArry[idx].cover = content || ''
            })
            .catch(() => {
              this.toolArry[idx].cover = ''
            })
        )
      }
      await Promise.allSettled(promises)
    },

    handleCollectClick(id) {
      if (!id) {
        ElMessage.error(this.$t('books.invalidBookId'))
        return
      }
      if (!this.collectingIds.includes(id)) this.collectingIds.push(id)

      if (this.collectBookArr.includes(id)) {
        this.cancelCollectBook(id)
      } else {
        this.collectBookFun(id)
      }

      setTimeout(() => {
        const index = this.collectingIds.indexOf(id)
        if (index > -1) this.collectingIds.splice(index, 1)
      }, 600)
    },

    collectBookFun(id) {
      if (!id) {
        ElMessage.error(this.$t('books.invalidBookId'))
        return
      }
      const token = localStorage.getItem('token')
      if (!token) {
        ElMessage.warning(this.$t('books.pleaseLogin'))
        return
      }

      this.$http
        .post(`/user/collect/${id}`, { type: 'book' }, { headers: { Authorization: `Bearer ${token}` } })
        .then((response) => {
          if (response.data.desc === 'success' || response.data.code === 0) {
            this.$store.commit('collectBook', [id])
            if (response.data.message && response.data.message._id) {
              this.collectIdMap[id] = response.data.message._id
            } else {
              this.loadCollectIdMap()
            }
            ElMessage.success(this.$t('books.collectSuccess'))
          } else {
            ElMessage.warning(response.data.message || this.$t('books.collectFailed'))
          }
        })
        .catch(() => {
          ElMessage.error(this.$t('books.collectFailedRetry'))
        })
    },

    cancelCollectBook(bookId) {
      const collectRecordId = this.collectIdMap[bookId]
      if (!collectRecordId) {
        this.loadCollectIdMap().then(() => {
          const recordId = this.collectIdMap[bookId]
          if (recordId) {
            this.performCancelCollect(bookId, recordId)
          } else {
            ElMessage.error(this.$t('books.collectRecordNotFound'))
          }
        })
        return
      }
      this.performCancelCollect(bookId, collectRecordId)
    },

    performCancelCollect(bookId, collectRecordId) {
      this.$http
        .delete(`/user/list/collect?id=${collectRecordId}`, { headers: this.getAuthHeaders() })
        .then((response) => {
          if (response.data.desc === 'success' || response.data.code === 0) {
            this.$store.commit('cancelCoBook', bookId)
            delete this.collectIdMap[bookId]
            ElMessage.success(this.$t('books.cancelCollectSuccess'))
          } else {
            ElMessage.warning(response.data.message || this.$t('books.cancelCollectFailed'))
          }
        })
        .catch(() => {
          ElMessage.error(this.$t('books.cancelCollectFailedRetry'))
        })
    },

    async loadCollectIdMap() {
      try {
        const userId = localStorage.getItem('id')
        const token = localStorage.getItem('token')
        if (!userId || !token) return
        const res = await this.$http.get(`/user/list/collect?id=${userId}&category=book`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.data.desc === 'success' || res.data.code === 0) {
          const collectRecords = res.data.message || []
          this.collectIdMap = {}
          collectRecords.forEach((record) => {
            if (record.collectid) this.collectIdMap[record.collectid] = record._id
          })
        }
      } catch (error) {
        // 静默失败
      }
    },

    resetListState() {
      this.num = 1
      this.scrollDisabled = false
      this.loadControl = false
      this.initialLoaded = false
      this.toolArry = []
      this.emptyPageStreak = 0
    },

    async reloadBooks(startPage = 1) {
      this.loading = true
      this.loadError = false
      this.resetListState()
      this.num = startPage
      this.$store.commit('removeBooks')
      await this.getBooks()
      await this.fetchCoversForRange(0, this.toolArry.length)
      this.setBooks()
      this.initialLoaded = true
    },

    async getAllBooks() {
      await this.reloadBooks(Math.max(1, Math.min(10000, Number(this.$route.query.page) || 1)))
    },

    handleSortChange() {
      return this.reloadBooks()
    },

    handleCategoryChange() {
      return this.reloadBooks()
    }
  },



  async mounted() {
    if (this.userid && localStorage.getItem('token')) {
      await getCollectionBook(this.$http, this.$store)
    }
    await this.getAllBooks()
    await this.loadCollectIdMap()
  },
};
</script>
<style scoped>
.content { width: 100%; background: #f7f5fd; min-height: calc(100dvh - 130px); }
.content-left { width: min(1280px, 90%); margin: 0 auto; padding: 32px 0 40px; text-align: left; }
.library-header { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
h1 { margin: 0; font-size: 32px; line-height: 1.3; color: #30204e; }
.library-header p { margin: 0; color: #716481; font-size: 16px; }
.library-search { display: flex; align-items: center; width: 370px; max-width: 100%; border: 1px solid #ded5ef; border-radius: 28px; background: #fff; padding: 5px; }
.library-search input { width: 0; flex: 1; min-width: 0; border: 0; background: transparent; padding: 9px 14px; font: inherit; font-size: 14px; color: #30204e; }
.library-search button { border: 0; border-radius: 22px; background: #f0eaf8; color: #705098; padding: 9px 16px; cursor: pointer; }
.books-toolbar { display: flex; align-items: center; gap: 24px; padding: 20px 24px; border: 1px solid #efeaf7; border-radius: 12px; background: #fff; margin-bottom: 24px; }
.toolbar-label { flex-shrink: 0; font-size: 14px; font-weight: 600; color: #30204e; }
.category-scroll { display: flex; flex-wrap: wrap; gap: 10px; min-width: 0; }
.category-chip { padding: 8px 18px; font: inherit; font-size: 14px; line-height: 20px; border: 1px solid #e9e3f2; border-radius: 24px; background: #faf9fc; color: #655776; cursor: pointer; }
.category-chip:hover { border-color: #9473b9; }
.category-chip.active { background: #8965b1; border-color: #8965b1; color: #fff; }
.results-toolbar { display: flex; justify-content: flex-end; align-items: center; gap: 16px; margin-bottom: 16px; }
h2 { margin: 0; font-size: 22px; color: #30204e; line-height: 1.5; }
h2 span { display: inline-block; margin-left: 12px; font-size: 13px; font-weight: 400; color: #776d86; }
.items { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 20px; }
.book-card { position: relative; min-width: 0; display: flex; flex-direction: column; background: #fff; border: 1px solid #eee8f5; border-radius: 12px; padding: 10px; transition: border-color .2s, box-shadow .2s; }
.book-card:hover, .book-card:focus-within { border-color: #b59ad4; box-shadow: 0 4px 16px #50346e0c; }
.book-cover { position: relative; width: 100%; aspect-ratio: 4 / 3; background: #f7f6f3; border-radius: 8px; overflow: hidden; }
.book-image { width: 100%; height: 100%; display: block; }
.book-image :deep(.el-image__inner) { object-fit: contain; }
.book-meta { padding: 10px 2px 0; flex: 1; display: flex; flex-direction: column; }
.book-title { font-size: 16px; line-height: 24px; height: 48px; margin: 0 0 8px; font-weight: 600; }
.book-title a { color: #302743; text-decoration: none; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.book-title a::after { content: ''; position: absolute; inset: 0; border-radius: 12px; }
.book-meta-bottom { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; }
.category-tag { font-size: 12px; line-height: 22px; padding: 0 10px; border-radius: 16px; background: #f0eafa; color: #77549e; }
.category-tag[data-category="knowledge"] { background: #e9f3ff; color: #427baa; }
.category-tag[data-category="habit"] { background: #fff0e2; color: #a66834; }
.category-tag[data-category="reading"] { background: #fcebf0; color: #b35c78; }
.cover-fab { position: relative; z-index: 1; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border: 0; border-radius: 50%; background: transparent; color: #8167a9; cursor: pointer; }
.cover-fab .iconfont { font-size: 20px; }
.cover-fab:hover, .cover-fab.active { background: #f3ecfb; color: #9960bc; }
button:disabled { cursor: wait; opacity: .65; }
button:focus-visible, input:focus-visible, .book-title a:focus-visible { outline: 2px solid #8965b1; outline-offset: 3px; }
.img-placeholder, .img-error { height: 100%; display: flex; align-items: center; justify-content: center; color: #8b8096; background: #f1edf5; }
.img-error i { font-size: 28px; }
.loading, .empty-state { min-height: 240px; display: flex; align-items: center; justify-content: center; gap: 16px; color: #716481; }
.load-more { text-align: center; padding-top: 28px; }
.load-more button, .empty-state button { padding: 10px 28px; border: 1px solid #a78bc7; border-radius: 8px; color: #7954a0; background: #fff; cursor: pointer; font: inherit; font-size: 14px; }
.load-more p { color: #82758e; font-size: 13px; }
:deep(.el-radio-button__inner) { padding: 9px 16px; background: #fcfbfe; border-color: #e4dcef; color: #655776; }
:deep(.el-radio-button.is-active .el-radio-button__inner), :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) { background: #8965b1 !important; border-color: #8965b1 !important; box-shadow: -1px 0 0 0 #8965b1 !important; color: #fff !important; }
@media (max-width: 1100px) { .items { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; } }
@media (max-width: 850px) { .items { grid-template-columns: repeat(3, minmax(0, 1fr)); } .library-header { align-items: flex-start; } .library-search { width: 300px; } h2 span { display: block; margin-left: 0; } }
@media (max-width: 600px) { .content-left { width: auto; padding: 24px 14px 32px; } .library-header { flex-direction: column; gap: 18px; } h1 { font-size: 28px; } .library-search { width: 100%; box-sizing: border-box; } .books-toolbar { gap: 12px; padding: 14px; align-items: flex-start; } .toolbar-label { padding-top: 7px; } .category-chip { padding: 5px 12px; font-size: 13px; } .category-scroll { gap: 8px; } .results-toolbar { align-items: flex-start; flex-direction: column; } h2 { font-size: 20px; } h2 span { display: inline-block; margin-left: 8px; } .items { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; } .book-card { padding: 7px; } .book-title { font-size: 14px; line-height: 22px; height: 44px; } .category-tag { padding: 0 8px; } }
@media (prefers-reduced-motion: reduce) { .book-card { transition: none; } }
</style>
