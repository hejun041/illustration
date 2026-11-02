<template>
  <div class="blog-page">
    <header class="blog-hero">
      <p class="blog-desc">{{ $t('blog.pageDesc') }}</p>
      <router-link to="/guides/ai-picture-book-tutorial">如何用 AI 制作一本绘本：从故事到 PDF →</router-link>
    </header>

    <div v-if="loading" class="blog-state">{{ $t('blog.loading') }}</div>
    <div v-else-if="!items.length" class="blog-state">{{ $t('blog.empty') }}</div>

    <section v-else class="blog-grid">
      <article
        v-for="item in items"
        :key="item.id"
        class="blog-card"
        @click="goPost(item.slug)"
      >
        <div class="blog-thumb">
          <img
            v-if="item.coverImageUrl"
            :src="item.coverImageUrl"
            :alt="item.coverImageAlt || item.title"
            loading="lazy"
          />
          <div v-else class="blog-thumb-empty" />
        </div>
        <div class="blog-meta">
          <div class="blog-meta-text">
            <p v-if="item.categories?.length" class="blog-categories">
              <span v-for="cat in item.categories" :key="cat">{{ cat }}</span>
            </p>
            <h2><a :href="`/blog/${encodeURIComponent(item.slug)}`" @click.stop>{{ item.title }}</a></h2>
            <p>{{ item.excerpt }}</p>
            <time v-if="item.publishedAt" class="blog-date">{{ formatDate(item.publishedAt) }}</time>
          </div>
          <span class="blog-arrow" aria-hidden="true">→</span>
        </div>
      </article>
    </section>
    <nav aria-label="文章分页">
      <a v-if="currentPage > 1" :href="currentPage > 2 ? `/blog?page=${currentPage - 1}` : '/blog'">上一页</a>
      <a v-if="items.length >= 100" :href="`/blog?page=${currentPage + 1}`">下一页</a>
    </nav>
  </div>
</template>

<script>
import { fetchBlogPosts } from '@/utils/blogApi'
import { takePublicPageData } from '@/utils/publicPageData'

export default {
  name: 'BlogList',
  data() {
    return {
      loading: true,
      items: [],
      currentPage: Math.max(1, Math.min(10000, Number(this.$route.query.page) || 1)),
    }
  },
  async created() {
    await this.loadList()
  },
  methods: {
    async loadList() {
      this.loading = true
      try {
        const list = takePublicPageData('blog') ?? await fetchBlogPosts(this.$http, { limit: 100, page: this.currentPage })
        this.items = Array.isArray(list) ? list : []
      } catch (e) {
        this.items = []
        this.$message?.error?.(e?.message || this.$t('blog.loadFailed'))
      } finally {
        this.loading = false
      }
    },
    goPost(slug) {
      if (!slug) return
      window.location.assign(`/blog/${encodeURIComponent(slug)}`)
    },
    formatDate(value) {
      if (!value) return ''
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return ''
      return d.toLocaleDateString(this.$i18n?.locale === 'en' ? 'en-US' : 'zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    },
  },
}
</script>

<style scoped>
.blog-page {
  --ink: #111;
  --muted: #6b7280;
  --line: #eceff3;
  --bg: #fff;
  max-width: 1180px;
  margin: 0 auto;
  padding: 36px 20px 72px;
  text-align: left;
  color: var(--ink);
  background: var(--bg);
}

.blog-hero {
  max-width: 720px;
  margin: 0 auto 40px;
  text-align: center;
}

.blog-desc {
  margin: 0 auto;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.65;
}

.blog-state {
  text-align: center;
  color: var(--muted);
  padding: 48px 0;
}

.blog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.blog-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.blog-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(17, 17, 17, 0.08);
}

.blog-thumb {
  aspect-ratio: 16 / 9;
  background: #f3f4f6;
  overflow: hidden;
}

.blog-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.blog-thumb-empty {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f5f0fa, #eef2ff);
}

.blog-meta {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px 20px;
}

.blog-meta-text h2 {
  margin: 0 0 8px;
  font-size: 18px;
  line-height: 1.35;
  font-weight: 700;
}

.blog-meta-text p {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.blog-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 8px;
}

.blog-categories span {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #8167a9;
  background: #f5f0fa;
  padding: 2px 8px;
  border-radius: 999px;
}

.blog-date {
  display: block;
  margin-top: 10px;
  font-size: 12px;
  color: #9ca3af;
}

.blog-arrow {
  flex-shrink: 0;
  font-size: 18px;
  color: #8167a9;
  margin-top: 4px;
}

@media (max-width: 720px) {
  .blog-grid {
    grid-template-columns: 1fr;
  }
}
</style>
