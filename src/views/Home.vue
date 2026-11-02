<template>
    <div class="home-container">
        <div class="home-inner">
            <!-- Hero -->
            <header class="home-hero">
                <h1 class="hero-title">
                    {{ $t('home.welcomeTitle') || '让想象变成美丽的故事' }}
                </h1>
            </header>

            <!-- 八个功能入口：插画与可访问的文字标签分开渲染 -->
            <div class="feature-cards-group">
                <section class="feature-cards">
                    <router-link v-for="(card, index) in [...featureCards, ...toolCards]" :key="card.key" :to="card.to" class="feature-card">
                        <img class="feature-art" :src="featureArt[card.key]" alt="" width="384" height="384" decoding="async" :loading="index < 4 ? 'eager' : 'lazy'" />
                        <div class="feature-text">
                            <h2 class="feature-name">{{ cardLabel(card) }}</h2>
                        </div>
                    </router-link>
                </section>
            </div>

            <BookWorkflow />

            <!-- 创作工作台介绍 -->
            <section class="showcase showcase--workbench">
                <div class="showcase-inner">
                    <div class="showcase-content">
                        <span class="showcase-kicker">{{ $t('home.showcaseWorkbenchKicker') }}</span>
                        <h2 class="showcase-title">{{ $t('home.showcaseWorkbenchTitle') }}</h2>
                        <p class="showcase-desc">{{ $t('home.showcaseWorkbenchDesc') }}</p>
                        <button type="button" class="showcase-cta" @click="go('/creation-studio')">
                            {{ $t('home.showcaseWorkbenchCta') }}
                            <span class="showcase-cta-arrow">→</span>
                        </button>
                    </div>
                    <div class="showcase-visual" aria-hidden="true">
                        <div class="preview-workbench">
                            <div class="preview-wb-rail">
                                <span class="preview-wb-rail-icon"></span>
                                <span class="preview-wb-rail-icon active"></span>
                                <span class="preview-wb-rail-icon"></span>
                                <span class="preview-wb-rail-icon"></span>
                            </div>
                            <div class="preview-wb-subnav">
                                <span class="preview-wb-subnav-title"></span>
                                <span class="preview-wb-subnav-item active"></span>
                                <span class="preview-wb-subnav-item"></span>
                                <span class="preview-wb-subnav-item"></span>
                            </div>
                            <div class="preview-wb-main">
                                <div class="preview-wb-header">
                                    <span class="preview-wb-heading"></span>
                                    <span class="preview-wb-btn"></span>
                                </div>
                                <div class="preview-wb-grid">
                                    <div class="preview-wb-card preview-wb-card--new">
                                        <span class="preview-wb-plus">+</span>
                                    </div>
                                    <div v-for="n in 3" :key="n" class="preview-wb-card">
                                        <div class="preview-wb-thumb">
                                            <span class="preview-wb-avatar"></span>
                                        </div>
                                        <span class="preview-wb-name"></span>
                                        <div class="preview-wb-actions">
                                            <span></span><span></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- DIY 插画介绍 -->
            <section class="showcase showcase--editor">
                <div class="showcase-inner showcase-inner--reverse">
                    <div class="showcase-content">
                        <span class="showcase-kicker">{{ $t('home.showcaseEditorKicker') }}</span>
                        <h2 class="showcase-title">{{ $t('home.showcaseEditorTitle') }}</h2>
                        <p class="showcase-desc">{{ $t('home.showcaseEditorDesc') }}</p>
                        <button type="button" class="showcase-cta" @click="go('/editorpro')">
                            {{ $t('home.showcaseEditorCta') }}
                            <span class="showcase-cta-arrow">→</span>
                        </button>
                    </div>
                    <div class="showcase-visual" aria-hidden="true">
                        <div class="showcase-screenshot-wrap">
                            <img
                                class="showcase-screenshot"
                                v-lazy-image="editorScreenshot"
                                width="1000" height="507"
                                decoding="async"
                                alt=""
                                loading="lazy"
                            />
                            <span class="showcase-screenshot-avatar"></span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- All illustration styles, presented as a paper photo album. -->
            <section ref="stylesSection" class="styles-section">
                <div class="styles-head">
                    <h2 class="styles-title">{{ $t('home.stylesTitle') }}</h2>
                    <p class="styles-subtitle">{{ $t('home.stylesSubtitle') }}</p>
                </div>
                <div class="style-gallery">
                    <button v-for="style in styleImages" :key="style.id" type="button" class="style-photo" @click="go({ name: 'AIPicture', query: { styleId: String(style.id) } })">
                        <span class="style-photo-image"><img v-lazy-image="style.image" width="300" height="400" :alt="styleLabel(style)" loading="lazy" decoding="async" /></span>
                        <span class="style-photo-caption">{{ styleLabel(style) }}</span>
                    </button>
                </div>
            </section>
            <PublicSeoContent path="/" compact />
        </div>
    </div>
</template>

<script>
import PublicSeoContent from '@/components/PublicSeoContent.vue'
import BookWorkflow from '@/components/BookWorkflow.vue'

export default {
    name: 'Home',
    components: { PublicSeoContent, BookWorkflow },
    data() {
        return {
            featureArt: {
                book: require('@/assets/images/home/features-v2/book.webp'),
                brush: require('@/assets/images/home/features-v2/brush.webp'),
                user: require('@/assets/images/home/features-v2/user.webp'),
                mood: require('@/assets/images/home/features-v2/mood.webp'),
                editor: require('@/assets/images/home/features-v2/editor.webp'),
                segment: require('@/assets/images/home/features-v2/segment.webp'),
                lasso: require('@/assets/images/home/features-v2/lasso.webp'),
                pdf: require('@/assets/images/home/features-v2/pdf.webp'),
            },
            editorScreenshot: require('@/assets/images/home/showcase-editor.webp'),
            featureCards: [
                { key: 'book', titleKey: 'nav.aiBooks', descKey: 'home.aiBooksDesc', to: '/AIbooks', cls: 'ic-book' },
                { key: 'brush', titleKey: 'nav.aiIllustration', descKey: 'home.aiIllustrationDesc', to: '/ai-picture', cls: 'ic-brush' },
                { key: 'user', titleKey: 'nav.characterStudio', descKey: 'home.createCharacterDesc', to: '/creation-studio', cls: 'ic-user' },
                { key: 'mood', titleKey: 'nav.moodDiary', descKey: 'home.moodDiaryDesc', to: '/mood-diary', cls: 'ic-mood' }
            ],
            toolCards: [
                { key: 'editor', titleKey: 'nav.createIllustration', descKey: 'home.createIllustrationDesc', to: '/editorpro', cls: 'ic-editor' },
                { key: 'segment', titleKey: 'nav.imageSegmentation', descKey: 'home.imageSegmentationDesc', to: '/image-segmentation', cls: 'ic-segment' },
                { key: 'lasso', titleKey: 'home.lassoCropSticker', descKey: 'home.lassoCropStickerDesc', to: '/lasso-crop', cls: 'ic-lasso' },
                { key: 'pdf', to: '/creation-studio/book/topdf' }
            ],
            styleImages: [],
        };
    },
    mounted() {
        // Load the gallery data and generation presets only as it approaches the viewport.
        this.galleryObserver = new IntersectionObserver((entries) => {
            if (entries.some(entry => entry.isIntersecting)) {
                this.galleryObserver.disconnect();
                this.loadStyleGallery().catch(() => { /* Gallery is optional; keep navigation usable. */ });
            }
        }, { rootMargin: '200px' });
        this.galleryObserver.observe(this.$refs.stylesSection);
    },
    beforeUnmount() {
        this.galleryObserver?.disconnect();
    },
    methods: {
        async loadStyleGallery() {
            const { loadIllustrationStyles } = await import('@/utils/illustrationStyles');
            const locale = this.$i18n?.locale === 'en' ? 'en' : 'zh';
            const styles = await loadIllustrationStyles({ locale, t: this.$t.bind(this) });
            if (!this.$el?.isConnected) return;
            this.styleImages = styles.map(s => ({ key: s.key, id: s.id, image: s.image, artStyle: s.artStyle }));
        },
        cardLabel(card) {
            const labels = { segment: ['一键抠图', 'Remove Background'], pdf: ['图片转 PDF', 'Images to PDF'] };
            return labels[card.key]?.[this.$i18n.locale === 'en' ? 1 : 0] || this.$t(card.titleKey);
        },
        cardDescription(card) {
            const descriptions = { user: ['管理角色、插画和绘本', 'Manage characters, illustrations and books'], pdf: ['自由排版，多图合成 PDF', 'Arrange images into one PDF'] };
            return descriptions[card.key]?.[this.$i18n.locale === 'en' ? 1 : 0] || this.$t(card.descKey);
        },
        go(to) {
            this.$router.push(to);
        },
        styleLabel(style) {
            const key = `aibooks.styles.${style.key}.artStyle`;
            return style.artStyle || (this.$te(key) ? this.$t(key) : style.key);
        },
    }
}
</script>

<style scoped>
.home-container {
    height: calc(100vh - 50px);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 36px 32px 72px;
    background: #e6d8c5;
}

.home-inner {
    max-width: 1160px;
    margin: 0 auto;
}

/* ===== Hero（与功能卡片同系的柔和渐变氛围） ===== */
.home-hero {
    text-align: center;
    padding: 20px 0 36px;
}

.hero-title {
    font-size: 40px;
    line-height: 1.3;
    font-weight: 700;
    color: #3d3d56;
    margin: 0 0 12px;
    letter-spacing: -0.02em;
}

.hero-subtitle {
    font-size: 16px;
    line-height: 1.6;
    color: #7a7a94;
    margin: 0 0 20px;
    max-width: 420px;
    margin-left: auto;
    margin-right: auto;
}

/* ===== 功能卡片 ===== */
.feature-cards-group {
    --feature-card-height: 176px;
    --feature-card-gap: 20px;
    margin-bottom: 32px;
}

.feature-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--feature-card-gap);
}

.feature-cards--compact {
    grid-template-columns: repeat(3, 1fr);
    margin-top: var(--feature-card-gap);
}

.feature-card {
    text-decoration: none;
    position: relative;
    display: block;
    border: none;
    cursor: pointer;
    text-align: left;
    min-height: var(--feature-card-height);
    border-radius: 28px;
    padding: 24px 26px 22px;
    color: #fff;
    overflow: hidden;
    isolation: isolate;
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s ease;
}

/* 顶部高光，减少平板呆板感 */
.feature-card::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(135% 95% at 6% -12%, rgba(255, 255, 255, 0.32), rgba(255, 255, 255, 0) 55%);
    z-index: 0;
    pointer-events: none;
}

.feature-card:hover {
    transform: translateY(-8px);
}

/* 右上角柔光，增加层次 */
.feature-rings {
    position: absolute;
    right: -28px;
    top: -28px;
    width: 132px;
    height: 132px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0) 70%);
    z-index: 0;
    pointer-events: none;
}

.feature-text {
    position: relative;
    z-index: 2;
}

.feature-name {
    font-size: 20px;
    font-weight: 800;
    color: #fff;
    margin: 0 0 6px;
    letter-spacing: 0.3px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.feature-desc {
    font-size: 13px;
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.9);
    margin: 0;
    max-width: 58%;
}

/* 统一的磨砂圆形徽章，让风格各异的图标观感一致 */
.feature-icon {
    position: absolute;
    right: 16px;
    bottom: 14px;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 96px;
    height: 96px;
    transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.feature-card:hover .feature-icon {
    transform: translateY(-5px) scale(1.08);
}

.feature-icon-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.22));
    transition: transform 0.28s ease;
}

/* 各图标轻微倾斜不同角度，更灵动、不死板 */
.ic-book .feature-icon-img { transform: rotate(-8deg); }
.ic-brush .feature-icon-img { transform: rotate(7deg); }
.ic-user .feature-icon-img { transform: rotate(-5deg); }
.ic-mood .feature-icon-img { transform: rotate(10deg); }

/* 每张卡片的渐变主题色与配套阴影 */
.ic-book {
    background: linear-gradient(135deg, #8b7cf0, #a99bf5);
    box-shadow: 0 16px 32px -16px rgba(124, 108, 240, 0.7);
}
.ic-brush {
    background: linear-gradient(135deg, #58a6f0, #84c2f7);
    box-shadow: 0 16px 32px -16px rgba(74, 141, 240, 0.65);
}
.ic-user {
    background: linear-gradient(135deg, #f1858f, #f4a9ac);
    box-shadow: 0 16px 32px -16px rgba(240, 120, 130, 0.6);
}
.ic-mood {
    background: linear-gradient(135deg, #74cf86, #9bd97f);
    box-shadow: 0 16px 32px -16px rgba(90, 190, 120, 0.6);
}

/* 下排三个工具卡片：高度为上排一半，无配图，文字样式与上排一致 */
.feature-card--compact {
    min-height: calc(var(--feature-card-height) / 2);
    padding: 18px 26px;
    display: flex;
    align-items: center;
}

.feature-card--compact .feature-desc {
    max-width: 100%;
}

.ic-editor {
    background: linear-gradient(135deg, #6b8cf0, #8aa8f8);
    box-shadow: 0 12px 24px -14px rgba(90, 120, 230, 0.65);
}
.ic-segment {
    background: linear-gradient(135deg, #f0a060, #f5c078);
    box-shadow: 0 12px 24px -14px rgba(230, 140, 70, 0.6);
}
.ic-lasso {
    background: linear-gradient(135deg, #b088f0, #c8a8f5);
    box-shadow: 0 12px 24px -14px rgba(150, 110, 220, 0.6);
}

/* ===== 产品介绍区块 ===== */
.showcase {
    margin-bottom: 56px;
}

.showcase-inner {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
    gap: 40px;
    align-items: center;
    background: #f5ecdf;
    border: 1px solid #d6c3aa;
    border-radius: 28px;
    padding: 36px 36px 36px 40px;
    box-shadow: 0 12px 32px -24px rgba(106, 76, 49, 0.16);
}

.showcase-inner--reverse {
    direction: rtl;
}

.showcase-inner--reverse > * {
    direction: ltr;
}

.showcase-kicker {
    display: inline-block;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #8167a9;
    background: #ede8f5;
    padding: 5px 12px;
    border-radius: 999px;
    margin-bottom: 14px;
}

.showcase-title {
    font-size: 28px;
    line-height: 1.25;
    font-weight: 800;
    color: #3d3d56;
    margin: 0 0 12px;
    letter-spacing: -0.02em;
}

.showcase-desc {
    font-size: 15px;
    line-height: 1.65;
    color: #6b6b84;
    margin: 0 0 24px;
}

.showcase-cta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: none;
    cursor: pointer;
    padding: 12px 22px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 700;
    color: #fff;
    background: linear-gradient(135deg, #8167a9, #9d8bb8);
    box-shadow: 0 12px 28px -14px rgba(129, 103, 169, 0.65);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.showcase-cta:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 32px -12px rgba(129, 103, 169, 0.72);
}

.showcase-cta-arrow {
    font-size: 16px;
}

.showcase-visual {
    min-width: 0;
}

/* 创作工作台预览（参照「我的角色」页，头像用占位符） */
.preview-workbench {
    display: flex;
    height: 300px;
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid #e8e8ec;
    background: #f5f6f8;
    box-shadow: 0 12px 32px -20px rgba(60, 50, 90, 0.35);
}

.preview-wb-rail {
    width: 48px;
    flex-shrink: 0;
    background: #fff;
    border-right: 1px solid #ececf0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px 0;
}

.preview-wb-rail-icon {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    background: #f0f0f4;
}

.preview-wb-rail-icon.active {
    background: #ede8f5;
    box-shadow: inset 0 0 0 2px #8167a9;
}

.preview-wb-subnav {
    width: 96px;
    flex-shrink: 0;
    background: #fff;
    border-right: 1px solid #ececf0;
    padding: 14px 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.preview-wb-subnav-title {
    height: 10px;
    width: 70%;
    border-radius: 4px;
    background: #d8d8e0;
    margin-bottom: 4px;
}

.preview-wb-subnav-item {
    height: 22px;
    border-radius: 6px;
    background: #f0f0f4;
}

.preview-wb-subnav-item.active {
    background: #ede8f5;
    border-left: 3px solid #8167a9;
}

.preview-wb-main {
    flex: 1;
    min-width: 0;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.preview-wb-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.preview-wb-heading {
    height: 12px;
    width: 40%;
    border-radius: 4px;
    background: #d0d0d8;
}

.preview-wb-btn {
    height: 24px;
    width: 72px;
    border-radius: 6px;
    background: #8167a9;
    opacity: 0.85;
}

.preview-wb-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    align-content: start;
}

.preview-wb-card {
    border-radius: 10px;
    background: #fff;
    border: 1px solid #ececf0;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.preview-wb-card--new {
    border-style: dashed;
    border-color: #c8c8d4;
    background: #fafbfc;
    align-items: center;
    justify-content: center;
    min-height: 100px;
}

.preview-wb-plus {
    font-size: 22px;
    color: #b0b0bc;
    line-height: 1;
}

.preview-wb-thumb {
    aspect-ratio: 1;
    border-radius: 6px;
    background:
        linear-gradient(45deg, #ececf0 25%, transparent 25%),
        linear-gradient(-45deg, #ececf0 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #ececf0 75%),
        linear-gradient(-45deg, transparent 75%, #ececf0 75%);
    background-size: 10px 10px;
    background-position: 0 0, 0 5px, 5px -5px, -5px 0;
    background-color: #f8f8fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.preview-wb-avatar {
    width: 36%;
    height: 36%;
    border-radius: 50%;
    background: #d4d4dc;
    position: relative;
}

.preview-wb-avatar::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 58%;
    transform: translate(-50%, -50%);
    width: 55%;
    height: 38%;
    border-radius: 50% 50% 0 0;
    background: #c0c0c8;
}

.preview-wb-name {
    height: 8px;
    width: 55%;
    margin: 0 auto;
    border-radius: 3px;
    background: #e4e4ea;
}

.preview-wb-actions {
    display: flex;
    gap: 4px;
    justify-content: center;
}

.preview-wb-actions span {
    height: 14px;
    flex: 1;
    border-radius: 4px;
    background: #ede8f5;
}

/* DIY 插画编辑器截图 */
.showcase-screenshot-wrap {
    position: relative;
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid #e8e8ec;
    box-shadow: 0 12px 32px -20px rgba(60, 50, 90, 0.35);
    background: #f5f6f8;
}

.showcase-screenshot {
    display: block;
    width: 100%;
    height: auto;
    vertical-align: top;
}

.showcase-screenshot-avatar {
    position: absolute;
    left: 0.9%;
    bottom: 1.6%;
    width: 2.8%;
    aspect-ratio: 1;
    border-radius: 50%;
    background: #d4d4dc;
    box-shadow: 0 0 0 2px #fff;
}

/* ===== 风格轮播（参照横向画廊） ===== */
.styles-section {
    margin-bottom: 56px;
    padding: 8px 0 12px;
}

.styles-head {
    text-align: center;
    margin-bottom: 28px;
    padding: 0 8px;
}

.styles-title {
    font-size: 28px;
    font-weight: 800;
    color: #3d3d56;
    margin: 0 0 8px;
    letter-spacing: -0.02em;
}

.styles-subtitle {
    font-size: 15px;
    color: #7a7a94;
    margin: 0;
}

/* ===== 平板 ===== */
@media (max-width: 1024px) {
    .hero-title {
        font-size: 34px;
    }

    .feature-cards {
        grid-template-columns: repeat(2, 1fr);
    }

    .feature-cards--compact {
        grid-template-columns: repeat(3, 1fr);
    }

    .showcase-inner {
        grid-template-columns: 1fr;
        gap: 28px;
        padding: 28px 24px;
    }

    .showcase-inner--reverse {
        direction: ltr;
    }

    .showcase-title {
        font-size: 24px;
    }
}

/* ===== 手机 ===== */
@media (max-width: 768px) {
    .home-container {
        /* 手机端无固定页脚，交给 .app-main 滚动（底部已为 TabBar 预留留白） */
        height: auto;
        overflow: visible;
        padding: 20px 14px 32px;
    }

    .home-hero {
        padding: 8px 0 24px;
    }

    .hero-title {
        font-size: 27px;
        margin-bottom: 12px;
    }

    .hero-subtitle {
        font-size: 14px;
        margin-bottom: 18px;
    }

    .feature-cards-group {
        --feature-card-height: 132px;
        --feature-card-gap: 12px;
        margin-bottom: 32px;
    }

    .feature-cards {
        grid-template-columns: repeat(2, 1fr);
    }

    .feature-cards--compact {
        grid-template-columns: repeat(3, 1fr);
    }

    .showcase {
        margin-bottom: 32px;
    }

    .showcase-inner {
        padding: 22px 18px;
        border-radius: 20px;
    }

    .showcase-title {
        font-size: 22px;
    }

    .preview-workbench {
        height: 240px;
    }

    .preview-wb-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .preview-wb-subnav {
        display: none;
    }

    .feature-card {
        border-radius: 20px;
        padding: 16px 16px 14px;
    }

    .feature-card--compact {
        padding: 12px 16px;
    }

    .feature-icon {
        right: 10px;
        bottom: 10px;
        width: 66px;
        height: 66px;
    }

    .feature-rings {
        right: -20px;
        top: -20px;
        width: 92px;
        height: 92px;
    }

    .feature-name {
        font-size: 16px;
    }

    .feature-desc {
        font-size: 12px;
        max-width: 70%;
    }

    .styles-section {
        margin-bottom: 32px;
        padding: 16px 0 8px;
    }

    .styles-title {
        font-size: 22px;
    }

    .styles-subtitle {
        font-size: 14px;
    }




}

@media (prefers-reduced-motion: reduce) {


    .styles-carousel-track::-webkit-scrollbar {
        display: none;
    }

}

@media (max-width: 420px) {
}

/* Reference palette: white page, cream paper, dark plum captions. */
.feature-card { padding: 0 12px 10px; min-height: 0; border-radius: 20px; background: transparent; box-shadow: none; text-align: center; overflow: visible; }
.feature-card::before { display:none; }
.feature-card:hover { transform:translateY(-4px) rotate(-.5deg); }
.feature-card:focus-visible { outline:3px solid #be9fda; outline-offset:4px; }
.feature-name { color:#412039; text-shadow:none; font-size:18px; }
.feature-desc { color:#806e7c; max-width:none; font-size:13px; }
.feature-card :deep(.home-sticker) { max-width:240px; margin:0 auto -16px; }
@media(max-width:768px) {
    .feature-card { padding:0 2px 14px; }
    .feature-name { font-size:16px; }
    .feature-desc { font-size:12px; max-width:none; }
}
@media(prefers-reduced-motion:reduce) { .feature-card { transition:none; } .feature-card:hover { transform:none; } }
.feature-card:nth-child(4n+1) { --sticker-tilt:-3deg; }
.feature-card:nth-child(4n+2) { --sticker-tilt:2deg; }
.feature-card:nth-child(4n+3) { --sticker-tilt:-1.5deg; }
.feature-card:nth-child(4n) { --sticker-tilt:3deg; }
/* Offset each whole sticker entry, including its caption. */
.feature-card { --entry-offset:0px; translate:0 var(--entry-offset); }
.feature-card:nth-child(8n+1) { --entry-offset:-7px; }
.feature-card:nth-child(8n+2) { --entry-offset:13px; }
.feature-card:nth-child(8n+3) { --entry-offset:-2px; }
.feature-card:nth-child(8n+4) { --entry-offset:19px; }
.feature-card:nth-child(8n+5) { --entry-offset:10px; }
.feature-card:nth-child(8n+6) { --entry-offset:-6px; }
.feature-card:nth-child(8n+7) { --entry-offset:16px; }
.feature-card:nth-child(8n+8) { --entry-offset:3px; }
.feature-card:hover :deep(.home-sticker) { transform:rotate(0deg) translateY(-3px); }
/* Clean system sans keeps Chinese and Latin labels visually consistent. */
.home-container {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}
.home-container button { font-family: inherit; }
.hero-title, .feature-name, .showcase-kicker, .showcase-title, .showcase-cta, .styles-title {
    font-weight: 600;
    letter-spacing: .01em;
}
.hero-title { line-height: 1.4; letter-spacing:0; }
.feature-name { font-size: 21px; line-height: 1.5; }
.hero-subtitle, .feature-desc { line-height: 1.8; }
@media (max-width:768px) { .feature-name { font-size:18px; } }
.hero-subtitle, .feature-desc, .showcase-desc, .styles-subtitle {
    font-family: inherit;
    color: #685b67;
    font-size:14px;
    line-height:1.7;
}
.home-hero { padding:4px 0 10px; }
.hero-subtitle { margin-bottom:6px; }
.feature-cards-group { --feature-card-gap:12px; margin-bottom:28px; }
.feature-cards { row-gap:18px; padding-top:7px; padding-bottom:16px; }
.feature-card :deep(.home-sticker) { max-width:200px; margin-top:-6px; margin-bottom:-28px; }
@media(max-width:768px) {
    .home-hero { padding:4px 0 8px; }
    .feature-desc { font-size:13px; }
    .feature-cards-group { --feature-card-gap:10px; }
    .feature-cards { row-gap:16px; padding-top:4px; padding-bottom:10px; }
    .feature-card { translate:0 calc(var(--entry-offset) * .5); }
    .feature-card :deep(.home-sticker) { margin-top:0; margin-bottom:-22px; }
}
.style-gallery { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:28px 22px; padding:12px 6px 28px; }
.style-photo { --photo-tilt:-1.4deg; display:flex; flex-direction:column; min-width:0; padding:10px 10px 12px; border:1px solid #e6d9c5; border-radius:3px 5px 4px 6px; background:#fff7e9; box-shadow:0 5px 12px -7px #795b42; color:#412039; cursor:pointer; transform:rotate(var(--photo-tilt)); transition:transform .22s ease,box-shadow .22s ease; }
.style-photo:nth-child(3n+2) { --photo-tilt:1.8deg; }
.style-photo:nth-child(3n) { --photo-tilt:-.6deg; }
.style-photo:nth-child(even) { translate:0 5px; }
.style-photo-image { display:block; width:100%; aspect-ratio:3/4; overflow:hidden; background:#eee4d5; }
.style-photo-image img { display:block; width:100%; height:100%; object-fit:cover; }
.style-photo-caption { display:block; width:100%; padding:12px 2px 0; font-family:inherit; font-size:17px; line-height:1.5; overflow-wrap:anywhere; }
.style-photo:hover, .style-photo:focus-visible { transform:translateY(-5px) rotate(0deg); box-shadow:0 10px 18px -10px #795b42; }
.style-photo:focus-visible { outline:2px solid #8167a9; outline-offset:4px; }
@media(max-width:1200px) { .style-gallery { grid-template-columns:repeat(4,minmax(0,1fr)); } }
@media(max-width:900px) { .style-gallery { grid-template-columns:repeat(3,minmax(0,1fr)); gap:24px 16px; } }
@media(max-width:600px) { .style-gallery { grid-template-columns:repeat(2,minmax(0,1fr)); gap:20px 14px; } .style-photo { padding:7px 7px 10px; } .style-photo-caption { font-size:16px; padding-top:9px; } }
@media(prefers-reduced-motion:reduce) { .style-photo { transition:none; } }
</style>
