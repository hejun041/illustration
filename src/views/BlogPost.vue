<template>
  <div class="blog-post-page">
    <div v-if="loading" class="blog-post-state">{{ $t('blogPost.loading') }}</div>
    <div v-else-if="!post" class="blog-post-state">
      <p>{{ $t('blogPost.notFound') }}</p>
      <router-link to="/blog" class="blog-back">{{ $t('blog.backToList') }}</router-link>
    </div>

    <article v-else class="blog-article">
      <router-link to="/blog" class="blog-back blog-back--top">{{ $t('blog.backToList') }}</router-link>

      <header class="blog-article-header">
        <p v-if="post.categories?.length" class="blog-categories">
          <span v-for="cat in post.categories" :key="cat">{{ cat }}</span>
        </p>
        <h1>{{ post.title }}</h1>
        <p v-if="post.excerpt" class="blog-lead">{{ post.excerpt }}</p>
        <time v-if="post.publishedAt" class="blog-date">{{ formatDate(post.publishedAt) }}</time>
      </header>

      <figure v-if="post.coverImageUrl" class="blog-cover">
        <img
          :src="post.coverImageUrl"
          :alt="post.coverImageAlt || post.title"
          loading="lazy"
        />
      </figure>

      <div
        v-if="post.htmlContent"
        class="blog-content"
        v-html="post.htmlContent"
      />
      <div v-else class="blog-post-state">{{ $t('blogPost.emptyContent') }}</div>
    </article>
  </div>
</template>

<script>
import { fetchBlogPost } from '@/utils/blogApi'
import { takePublicPageData } from '@/utils/publicPageData'
import { SEO, setLinkRel, canonicalForPath, applyRouteSeo } from '@/utils/seo'

export default {
  name: 'BlogPost',
  props: {
    slug: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      loading: true,
      post: null,
      requestId: 0,
    }
  },
  watch: {
    slug: {
      immediate: true,
      handler() {
        this.loadPost()
      },
    },
  },
  beforeUnmount() {
    this.requestId += 1
  },
  methods: {
    async loadPost() {
      const requestId = ++this.requestId
      const slug = String(this.slug || this.$route?.params?.slug || '').trim()
      if (!slug) {
        this.post = null
        this.loading = false
        return
      }
      this.loading = true
      try {
        const post = takePublicPageData('blog') ?? await fetchBlogPost(this.$http, slug)
        if (requestId !== this.requestId) return
        this.post = post
        if (this.post?.slug && this.post.slug !== slug) {
          this.$router.replace({ name: 'blog-post', params: { slug: this.post.slug } })
        }
        if (this.post) this.applySeo(this.post)
        else this.resetSeo()
      } catch (e) {
        if (requestId !== this.requestId) return
        this.post = null
        this.$message?.error?.(e?.message || this.$t('blog.loadFailed'))
        this.resetSeo()
      } finally {
        if (requestId === this.requestId) this.loading = false
      }
    },
    applySeo(post) {
      if (!post || typeof document === 'undefined') return
      const title = post.seoTitle || post.title
      document.title = title ? `${title} | ${SEO.siteName}` : SEO.defaultTitle
      setLinkRel('canonical', canonicalForPath(`/blog/${post.slug}`))
      this.setMeta('description', post.metaDescription || post.excerpt || SEO.defaultDescription)
      this.setMeta('og:title', title)
      this.setMeta('og:description', post.metaDescription || post.excerpt || SEO.defaultDescription)
      this.setMeta('og:url', canonicalForPath(`/blog/${post.slug}`))
      this.setMeta('twitter:title', title)
      this.setMeta('twitter:description', post.metaDescription || post.excerpt || SEO.defaultDescription)
      if (post.coverImageUrl) this.setMeta('og:image', post.coverImageUrl)
    },
    resetSeo() {
      if (typeof document === 'undefined') return
      applyRouteSeo(this.$route)
      if (!this.post) this.setMeta('robots', 'noindex, follow')
    },
    setMeta(name, content) {
      if (!content || typeof document === 'undefined') return
      let el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
      if (!el) {
        el = document.createElement('meta')
        if (name.startsWith('og:')) el.setAttribute('property', name)
        else el.setAttribute('name', name)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    },
    formatDate(value) {
      if (!value) return ''
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return ''
      return `${this.$t('blogPost.publishedAt')} ${d.toLocaleDateString(this.$i18n?.locale === 'en' ? 'en-US' : 'zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}`
    },
  },
}
</script>

<style scoped>
.blog-post-page {
  max-width: 780px;
  margin: 0 auto;
  padding: 32px 20px 72px;
  color: #111;
}

.blog-post-state {
  text-align: center;
  color: #6b7280;
  padding: 48px 0;
}

.blog-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #8167a9;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
}

.blog-back--top {
  margin-bottom: 24px;
}

.blog-article-header {
  margin-bottom: 28px;
}

.blog-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 12px;
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

.blog-article-header h1 {
  margin: 0 0 12px;
  font-size: clamp(28px, 4vw, 40px);
  line-height: 1.2;
  letter-spacing: -0.03em;
  font-weight: 800;
}

.blog-lead {
  margin: 0 0 12px;
  color: #5a6578;
  font-size: 18px;
  line-height: 1.65;
}

.blog-date {
  display: block;
  font-size: 13px;
  color: #9ca3af;
}

.blog-cover {
  margin: 0 0 32px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #eceff3;
}

.blog-cover img {
  display: block;
  width: 100%;
  height: auto;
}

.blog-content :deep(.blog-el) {
  margin-bottom: 28px;
}

.blog-content :deep(h2) {
  margin: 0 0 12px;
  font-size: 24px;
  line-height: 1.3;
  font-weight: 700;
}

.blog-content :deep(h3) {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 700;
}

.blog-content :deep(.blog-prose),
.blog-content :deep(p) {
  margin: 0 0 12px;
  font-size: 17px;
  line-height: 1.78;
  color: #374151;
}

.blog-content :deep(ul),
.blog-content :deep(ol) {
  margin: 0 0 16px 1.2em;
  padding: 0;
  font-size: 17px;
  line-height: 1.75;
  color: #374151;
}

.blog-content :deep(li) {
  margin-bottom: 8px;
}

.blog-content :deep(blockquote) {
  margin: 0 0 20px;
  padding: 16px 20px;
  border-left: 4px solid #8167a9;
  background: #faf8fc;
  border-radius: 0 8px 8px 0;
}

.blog-content :deep(blockquote cite) {
  display: block;
  margin-top: 8px;
  font-size: 14px;
  color: #6b7280;
  font-style: normal;
}

.blog-content :deep(.blog-table-wrap) {
  overflow-x: auto;
  margin-bottom: 20px;
  border: 1px solid #eceff3;
  border-radius: 10px;
}

.blog-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
}

.blog-content :deep(th),
.blog-content :deep(td) {
  padding: 10px 14px;
  border-bottom: 1px solid #eceff3;
  text-align: left;
  font-size: 14px;
}

.blog-content :deep(thead th) {
  background: #f9fafb;
  font-weight: 600;
}

.blog-content :deep(.blog-faq-item) {
  border: 1px solid #eceff3;
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 10px;
}

.blog-content :deep(.blog-faq-item summary) {
  cursor: pointer;
  font-weight: 600;
}

.blog-content :deep(.blog-faq-answer) {
  margin-top: 10px;
  color: #4b5563;
  font-size: 15px;
  line-height: 1.65;
}

.blog-content :deep(.blog-el--image img) {
  width: 100%;
  border-radius: 12px;
  border: 1px solid #eceff3;
}

.blog-content :deep(figcaption) {
  margin-top: 8px;
  font-size: 13px;
  color: #9ca3af;
}

.blog-content :deep(.blog-cta-btn) {
  display: inline-block;
  padding: 10px 18px;
  background: #8167a9;
  color: #fff;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 600;
}

.blog-content :deep(pre) {
  overflow-x: auto;
  padding: 16px;
  background: #111827;
  color: #f9fafb;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.6;
}

.blog-content :deep(.blog-snippet) {
  padding: 16px 18px;
  background: #f5f0fa;
  border-radius: 10px;
}

.blog-content :deep(.blog-pros-cons-grid) {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 640px) {
  .blog-content :deep(.blog-pros-cons-grid) {
    grid-template-columns: 1fr;
  }
}
</style>
