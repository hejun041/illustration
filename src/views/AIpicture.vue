<template>
    <div class="ai-picture-page">
        <main class="page-main">
            <div class="workspace-layout">
                <aside class="inspiration-column" aria-label="inspiration">
                    <!-- 浏览灵感（左侧） -->
                    <div class="inspiration-section">
                        <div class="inspiration-head">
                            <h2 class="inspiration-title">{{ $t('aiPicture.browseInspiration') || '浏览灵感' }}</h2>
                            <div class="inspiration-actions">
                                <button type="button" class="link-btn" :aria-expanded="styleSearchOpen" aria-controls="style-search" @click="toggleStyleSearch">
                                    {{ $t('aiPicture.searchStyles') }}
                                </button>
                                <button type="button" class="link-btn" @click="shuffleStyles">
                                    {{ $t('aiPicture.refresh') || '更新内容' }}
                                </button>
                            </div>
                        </div>

                        <form v-if="styleSearchOpen" id="style-search" class="style-search" role="search" @submit.prevent>
                            <input ref="styleSearchInput" v-model="styleSearchQuery" type="search" :aria-label="$t('aiPicture.searchStylesPlaceholder')" :placeholder="$t('aiPicture.searchStylesPlaceholder')" @keydown.esc="toggleStyleSearch" />
                            <button v-if="styleSearchQuery" type="button" class="link-btn" @click="styleSearchQuery = ''">{{ $t('aiPicture.clearStyleSearch') }}</button>
                        </form>
                        <p v-if="isSearchingStyles" class="style-search-status" role="status">{{ $t('aiPicture.styleSearchCount', { count: visibleStyles.length + visibleOaiItems.length }) }}</p>

                        <div
                            class="style-tab-row"
                            role="tablist"
                            :aria-label="$t('aiPicture.illustrationSubTabs')"
                        >
                            <button
                                v-for="tab in styleCategoryTabItems"
                                :key="'category-' + tab.id"
                                type="button"
                                class="style-tab style-tab--compact"
                                :class="{ active: activeStyleCategory === tab.id }"
                                role="tab"
                                :aria-selected="activeStyleCategory === tab.id"
                                :title="tab.title || tab.label"
                                @click="setStyleCategory(tab.id)"
                            >
                                {{ tab.label }}
                            </button>
                        </div>

                        <div class="style-list" ref="styleListRef">
                            <p v-if="!stylesLoading && !displayedStyles.length && !((activeStyleCategory === 'skill' || isSearchingStyles) && displayedOaiItems.length)" class="style-empty-state">
                                {{ $t(isSearchingStyles ? 'aiPicture.styleSearchEmpty' : 'aiPicture.styleCategoryEmpty') }}
                            </p>
                            <button
                                v-for="style in displayedStyles"
                                :key="'style-' + style.id"
                                type="button"
                                class="style-list-item"
                                :class="{ selected: selectedStyleId === style.id }"
                                :data-style-id="style.id"
                                @click="selectStyle(style.id)"
                            >
                                <div
                                    class="style-list-item-thumb"
                                    @mouseenter="enterStylePreview($event, style.image, style.artStyle)"
                                    @mouseleave="beginLeaveStylePreview"
                                >
                                    <img
                                        v-lazy-style-image="styleListImage(style)"
                                        :alt="style.artStyle"
                                        class="style-list-item-img"
                                        decoding="async"
                                        @error="onStyleImageError(style)"
                                    />
                                </div>
                                <span class="style-list-item-text">{{ style.artStyle }}</span>
                            </button>

                            <template v-if="activeStyleCategory === 'skill' || isSearchingStyles">
                                <button
                                    v-for="item in displayedOaiItems"
                                    :key="'oai-' + item.id"
                                    type="button"
                                    class="style-list-item"
                                    :class="{ selected: selectedOaiTemplateId === item.id }"
                                    :title="item.description || item.title"
                                    @click="selectOaiTemplate(item)"
                                >
                                    <div
                                        v-if="item.image"
                                        class="style-list-item-thumb"
                                        @mouseenter="enterStylePreview($event, item.image, item.title)"
                                        @mouseleave="beginLeaveStylePreview"
                                    >
                                        <img
                                            v-lazy-style-image="item.image"
                                            :alt="item.title"
                                            class="style-list-item-img"
                                            decoding="async"
                                        />
                                    </div>
                                    <div v-else class="style-list-item-thumb">
                                        <div class="style-list-item-img style-list-item-fallback" aria-hidden="true" />
                                    </div>
                                    <span class="style-list-item-text">{{ item.title }}</span>
                                </button>
                            </template>
                        </div>
                    </div>
                </aside>

                <div class="editor-column">
            <!-- 主输入框 -->
            <div class="prompt-card" :class="{ 'is-focused': isFocused }">
                <textarea
                    ref="promptInput"
                    v-model="subjectScene"
                    class="prompt-textarea"
                    :placeholder="promptPlaceholder"
                    rows="6"
                    @focus="isFocused = true"
                    @blur="isFocused = false"
                    @keydown.enter.exact.prevent="generateIllustration"
                ></textarea>

                <div v-if="isXiaoheiStyle(selectedStyle) && xiaoheiPlan" class="xiaohei-plan-card">
                    <p class="xiaohei-plan-title">{{ $t('aiPicture.xiaoheiPlanTitle') || '小黑方案' }}</p>
                    <p><span>{{ $t('aiPicture.xiaoheiCore') || '核心' }}：</span>{{ xiaoheiPlan.core_idea }}</p>
                    <p><span>{{ $t('aiPicture.xiaoheiMetaphor') || '隐喻' }}：</span>{{ xiaoheiPlan.metaphor }}</p>
                    <p><span>{{ $t('aiPicture.xiaoheiAction') || '小黑' }}：</span>{{ xiaoheiPlan.xiaohei_action }}</p>
                    <p v-if="xiaoheiPlan.labels?.length">
                        <span>{{ $t('aiPicture.xiaoheiLabels') || '标注' }}：</span>{{ xiaoheiPlan.labels.join(' / ') }}
                    </p>
                </div>

                <div v-if="isPaperPosterStyle(selectedStyle) && paperPosterPlan" class="xiaohei-plan-card">
                    <p class="xiaohei-plan-title">{{ $t('aiPicture.paperPosterPlanTitle') || '纸刊方案' }}</p>
                    <p><span>焦点：</span>{{ paperPosterPlan.focus || paperPosterPlan.core_subjects }}</p>
                    <p><span>意图：</span>{{ paperPosterPlan.concept || paperPosterPlan.proposition }}</p>
                    <p><span>对比：</span>{{ paperPosterPlan.contrast_pair || paperPosterPlan.tension }}</p>
                    <p><span>图形线索：</span>{{ paperPosterPlan.graphic_cue || paperPosterPlan.metaphor }}</p>
                    <p v-if="paperPosterPlan.accent_color || paperPosterPlan.accent_hue">
                        <span>强调色：</span>{{ paperPosterPlan.accent_color || paperPosterPlan.accent_hue }}
                    </p>
                    <p v-if="paperPosterPlan.tear_contour"><span>撕边轮廓：</span>{{ paperPosterPlan.tear_contour }}</p>
                    <p v-if="paperPosterPlan.tear_crossing"><span>穿越：</span>{{ paperPosterPlan.tear_crossing }}</p>
                </div>
                <div v-if="isPhotoEditorialStyle(selectedStyle) && photoEditorialPlan" class="xiaohei-plan-card">
                    <p class="xiaohei-plan-title">{{ $t('aiPicture.photoEditorialPlanTitle') || '编页方案' }}</p>
                    <p><span>Title：</span>{{ photoEditorialPlan.title_en }}</p>
                    <p v-if="photoEditorialPlan.subtitle_en"><span>Subtitle：</span>{{ photoEditorialPlan.subtitle_en }}</p>
                    <p><span>结构：</span>{{ photoEditorialPlan.structure_notes }}</p>
                    <p><span>色彩：</span>{{ photoEditorialPlan.color_notes }}</p>
                </div>

                <!-- 底部工具栏（基础操作） -->
                <div class="prompt-toolbar">
                    <div class="toolbar-left">
                        <!-- 小黑：先扩写方案（可选） -->
                        <button
                            v-if="isXiaoheiStyle(selectedStyle)"
                            type="button"
                            class="tool-btn pill"
                            :disabled="!canGenerate || generating || xiaoheiExpanding"
                            @click="expandXiaoheiPlan"
                        >
                            {{ $t('aiPicture.xiaoheiExpandFirst') || '先看方案' }}
                        </button>
                        <!-- 添加参考图 -->
                        <button
                            type="button"
                            class="tool-btn icon-only"
                            :title="$t('aiPicture.addReference') || '添加参考图'"
                            @click="triggerReferenceUpload"
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </button>
                        <input
                            ref="referenceUpload"
                            type="file"
                            accept="image/*"
                            multiple
                            class="hidden-file-input"
                            @change="handleReferenceUpload"
                        />

                        <!-- 比例 / 输出宽高 -->
                        <div class="size-select-wrap" ref="sizeSelectRef">
                            <button
                                type="button"
                                class="tool-btn pill"
                                :class="{ active: sizeMenuOpen }"
                                :title="$t('aiPicture.sizeLabel') || '尺寸'"
                                @click="toggleSizeMenu"
                            >
                                <span class="size-icon-stage" aria-hidden="true">
                                    <span class="size-icon" :style="currentSizeIconStyle"></span>
                                </span>
                                <span class="size-toolbar-text">{{ currentSizeLabel }}</span>
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="caret">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>
                            <div v-if="sizeMenuOpen" class="size-menu">
                                <template v-for="(group, gIdx) in sizeGroups" :key="group.key || group.label">
                                    <div v-if="gIdx > 0" class="size-menu-divider"></div>
                                    <div class="size-menu-group-label">{{ group.label }}</div>
                                    <button
                                        v-for="opt in group.items"
                                        :key="opt.value"
                                        type="button"
                                        class="size-menu-item"
                                        :class="{ active: opt.value === selectedSize }"
                                        @click="selectSize(opt.value)"
                                    >
                                        <span class="size-icon" :style="{ width: opt.iconW + 'px', height: opt.iconH + 'px' }"></span>
                                        <span class="size-label">{{ opt.label }}</span>
                                        <span class="size-dim">{{ opt.value === 'auto' ? '' : opt.value }}</span>
                                    </button>
                                </template>
                            </div>
                        </div>

                        <!-- 高级设置 折叠入口 -->
                        <button
                            type="button"
                            class="tool-btn pill"
                            :class="{ active: advancedSettingsOpen }"
                            @click="advancedSettingsOpen = !advancedSettingsOpen"
                        >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="caret" :class="{ 'caret-flip': advancedSettingsOpen }">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                            <span>{{ $t('aiPicture.advancedSettings') || '高级设置' }}</span>
                        </button>

                        <!-- 已选参考图（可多张，与 /create-character 一致，最多 10 张） -->
                        <div v-if="referenceImageUrls.length" class="ref-thumbs-row">
                            <div
                                v-for="(url, idx) in referenceImageUrls"
                                :key="url"
                                class="ref-thumb-wrap"
                            >
                                <button
                                    type="button"
                                    class="ref-thumb-preview"
                                    :aria-label="($t('preview') || '预览') + ' ' + (idx + 1)"
                                    :title="$t('preview') || '预览'"
                                    @click="openReferencePreview(idx)"
                                >
                                    <img :src="url" :alt="'reference ' + (idx + 1)" class="ref-thumb" />
                                </button>
                                <span
                                    v-if="idx === handrawAutoReferenceIndex"
                                    class="ref-thumb-badge"
                                >{{ $t('aiPicture.handrawStyleRefBadge') || '风格' }}</span>
                                <button
                                    type="button"
                                    class="ref-thumb-clear"
                                    @click="removeReferenceAt(idx)"
                                    :aria-label="'remove reference ' + (idx + 1)"
                                >
                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="toolbar-right">
                        <button
                            type="button"
                            class="tool-btn pill clear-prompt-btn"
                            :disabled="!subjectScene"
                            @click="clearPrompt"
                        >
                            {{ $t('aiPicture.clearPrompt') }}
                        </button>
                        <!-- 生成按钮 -->
                        <button
                            type="button"
                            class="send-btn"
                            :class="{ 'is-loading': generating }"
                            :disabled="!canGenerate || generating"
                            @click="generateIllustration"
                            :title="$t('aiPicture.generate') || '生成'"
                        >
                            <span v-if="generating" class="send-spinner"></span>
                            <i
                                v-else
                                class="iconfont icon--fasong send-btn-icon"
                                aria-hidden="true"
                            ></i>
                        </button>
                    </div>
                </div>

                <!-- 高级设置：模型 / 画质 -->
                <div v-show="advancedSettingsOpen" class="advanced-panel" @click.stop>
                    <div class="advanced-panel-inner">
                        <div class="size-select-wrap" ref="modelSelectRef">
                            <span class="advanced-field-label">{{ $t('aiPicture.modelLabel') || '模型' }}</span>
                            <button
                                type="button"
                                class="tool-btn pill"
                                :class="{ active: modelMenuOpen }"
                                @click="toggleModelMenu"
                            >
                                <span class="toolbar-dropdown-label">{{ currentModelLabel }}</span>
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="caret">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>
                            <div v-if="modelMenuOpen" class="size-menu menu-model">
                                <button
                                    v-for="opt in modelMenuOptions"
                                    :key="opt.value"
                                    type="button"
                                    class="size-menu-item"
                                    :class="{ active: opt.value === selectedModel }"
                                    @click="selectModel(opt.value)"
                                >
                                    <span class="size-label">{{ opt.label }}</span>
                                    <span class="size-dim">{{ opt.value }}</span>
                                </button>
                            </div>
                        </div>

                        <div class="size-select-wrap" ref="qualitySelectRef">
                            <span class="advanced-field-label">{{ $t('aiPicture.qualityLabel') || '画质' }}</span>
                            <button
                                type="button"
                                class="tool-btn pill"
                                :class="{ active: qualityMenuOpen }"
                                @click="toggleQualityMenu"
                            >
                                <span class="toolbar-dropdown-label">{{ currentQualityLabel }}</span>
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="caret">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>
                            <div v-if="qualityMenuOpen" class="size-menu menu-quality">
                                <button
                                    v-for="opt in qualityMenuOptions"
                                    :key="opt.value"
                                    type="button"
                                    class="size-menu-item"
                                    :class="{ active: opt.value === selectedQuality }"
                                    @click="selectQuality(opt.value)"
                                >
                                    <span class="size-label">{{ opt.label }}</span>
                                    <span class="size-dim">{{ opt.hint || '' }}</span>
                                </button>
                            </div>
                        </div>

                        <label
                            v-if="isHandrawLibraryStyle(selectedStyle)"
                            class="handraw-ref-toggle advanced-field-row"
                        >
                            <input
                                type="checkbox"
                                v-model="handrawStyleReferenceAuto"
                                @change="onHandrawStyleReferenceAutoChange"
                            />
                            <span>{{ $t('aiPicture.handrawStyleReferenceAuto') || '垫入手绘库风格示意图作参考（仅学画风）' }}</span>
                        </label>
                    </div>
                </div>
            </div>

            <!-- 生成进度 / 结果 / 失败 / 空占位 -->
            <div class="result-section">
                <div v-if="generating" class="result-card">
                    <div class="result-skeleton">
                        <div class="result-skeleton-shimmer"></div>
                        <div class="result-loading">
                            <span class="result-spinner"></span>
                            <p>{{ $t('aiPicture.generating') || '正在生成插画…' }}</p>
                        </div>
                    </div>
                </div>

                <div v-else-if="generatedImageUrl && imageLoadError" class="result-card result-card--error">
                    <div class="result-placeholder result-placeholder--error">
                        <div class="result-placeholder-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="9" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>
                        <p class="result-placeholder-title">{{ $t('aiPicture.loadFailedTitle') || '图片加载失败' }}</p>
                        <p class="result-placeholder-hint">{{ $t('aiPicture.loadFailedHint') || '可能是网络问题或链接已过期，可重试生成或清除后重来' }}</p>
                        <div class="result-actions result-actions--compact">
                            <button type="button" class="result-btn primary" @click="retryLoadImage">
                                <span>{{ $t('aiPicture.retryLoad') || '重新加载' }}</span>
                            </button>
                            <button type="button" class="result-btn ghost" :disabled="generating" @click="retryGenerate">
                                <span>{{ $t('aiPicture.retryGenerate') || '重新生成' }}</span>
                            </button>
                            <button
                                type="button"
                                class="result-btn ghost icon-only danger"
                                :title="$t('aiPicture.clear') || '清除'"
                                :aria-label="$t('aiPicture.clear') || '清除'"
                                @click="clearGeneratedImage"
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                    <path d="M10 11v6" />
                                    <path d="M14 11v6" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div v-else-if="generatedImageUrl" class="result-card">
                    <img
                        :key="'result-img-' + imageReloadKey"
                        :src="generatedImageUrl"
                        :alt="$t('aiPicture.resultImageAlt') || '生成的插画'"
                        class="result-image"
                        @load="handleImageLoad"
                        @error="handleImageError"
                    />
                    <div class="result-actions result-actions--compact">
                        <button type="button" class="result-btn ghost" @click="openInpaintDialog">
                            <span>{{ $t('aibooks.inpaintTitle') }}</span>
                        </button>
                        <button type="button" class="result-btn primary" :disabled="collecting" @click="collectIllustration">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                            <span>{{ collecting ? ($t('aiPicture.saving') || '收集中…') : ($t('aiPicture.collect') || '收集插画') }}</span>
                        </button>
                        <button
                            type="button"
                            class="result-btn ghost icon-only"
                            :disabled="downloading"
                            :title="downloading ? ($t('aiPicture.downloading') || '下载中…') : ($t('aiPicture.download') || '下载到本地')"
                            :aria-label="$t('aiPicture.download') || '下载到本地'"
                            @click="downloadIllustration"
                        >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            class="result-btn ghost icon-only danger"
                            :title="$t('aiPicture.clear') || '清除'"
                            :aria-label="$t('aiPicture.clear') || '清除'"
                            @click="clearGeneratedImage"
                        >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div v-else class="result-card result-card--empty">
                    <div class="result-placeholder">
                        <div class="result-placeholder-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="3" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <path d="M21 15l-5-5L5 21" />
                            </svg>
                        </div>
                        <p class="result-placeholder-title">{{ $t('aiPicture.emptyResultTitle') || '插画预览' }}</p>
                        <p class="result-placeholder-hint">{{ $t('aiPicture.emptyResultHint') || '生成的插画将显示在这里' }}</p>
                        <ol class="result-placeholder-steps">
                            <li>{{ $t('aiPicture.emptyStep1') || '左侧选一个风格灵感' }}</li>
                            <li>{{ $t('aiPicture.emptyStep2') || '用一句话描述画面' }}</li>
                            <li>{{ $t('aiPicture.emptyStep3') || '点击发送开始生成' }}</li>
                        </ol>
                    </div>
                </div>
            </div>
                </div>
            </div>
        </main>
        <el-image-viewer
            v-if="referencePreview"
            :url-list="referencePreview.urls"
            :initial-index="referencePreview.index"
            hide-on-click-modal
            teleported
            @close="referencePreview = null"
        />
        <teleport to="body">
            <div
                v-if="stylePreview.show"
                class="style-image-preview-floater"
                :style="{
                    left: stylePreview.left + 'px',
                    top: stylePreview.top + 'px',
                }"
                @mouseenter="cancelLeaveStylePreview"
                @mouseleave="hideStyleImagePreview"
            >
                <img
                    :src="stylePreview.src"
                    :alt="stylePreview.alt"
                    class="style-image-preview-img"
                    :style="{
                        maxWidth: stylePreview.maxW + 'px',
                        maxHeight: stylePreview.maxH + 'px',
                    }"
                />
            </div>
        </teleport>
        <AibooksInpaintDialog ref="inpaintDialogRef" :api-base-url="apiBaseUrl" match-image-ratio @success="onInpaintSuccess" />
    </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { originalImageExtension } from '@/utils/illustrationDownload'
import lazyStyleImage from '@/directives/lazyStyleImage'
import { illustrationStyleCategory } from '@/data/illustrationStyleClassification'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElImageViewer } from 'element-plus'
import AibooksInpaintDialog from '@/components/aibooks/AibooksInpaintDialog.vue'
import { checkWebPSupport } from '@/utils/imageOptimizer'
import {
    postCreateCharacter,
    isCreateCharacterResponseOk,
    resolveGenerationImageUrl
} from '@/utils/createCharacterTask'
import {
    expandXiaoheiSentence,
    generateXiaoheiIllustration,
} from '@/utils/xiaohei/api'
import { generatePaperPoster } from '@/utils/paperPoster/api'
import { generatePhotoEditorial } from '@/utils/photoEditorial/api'
import oaiImageData from '@/data/oaiImageTemplates.json'
import { useIllustrationStyles } from '@/composables/useIllustrationStyles'
import {
    isObjectDoodlePosterNoTextStyle,
    isPoeticMinimalZineStyle,
    isXiaoheiAbsurdIllustrationStyle,
    isPaperPosterSkillStyle,
    isTrueScenePaperCollageStyle,
    isMoodScenePaperRedrawStyle,
    isTruePhotoAbstractPanelStyle,
    paperPosterModeFromStyle,
    resolveStyleBasePrompt,
} from '@/utils/illustrationStyles'
import { loadImageBlob } from '@/utils/canvasImageCompose'
import {
    appendHandrawReferenceIsolation,
    readHandrawStyleReferenceAutoPreference,
    writeHandrawStyleReferenceAutoPreference,
} from '@/utils/handrawStyleReference'
import {
    isHandrawLibraryStyle as isHandrawLibStyle,
} from '@/utils/handrawStyleGroups'
import {
    sortStylesFeaturedFirst,
} from '@/utils/illustrationStyleSort'
import {
    stylesForIllustrationTab,
    visibleIllustrationCategoryIds,
} from '@/utils/illustrationStyleTabs'

export default {
    directives: { lazyStyleImage },
    name: 'AIPicture',
    components: { ElImageViewer, AibooksInpaintDialog },
    setup() {
        const { locale } = useI18n()
        const { styles, loading: stylesLoading } = useIllustrationStyles()
        const supportsWebP = ref(false)

        onMounted(async () => {
            supportsWebP.value = await checkWebPSupport()
        })

        return {
            styles,
            stylesLoading,
            locale
        }
    },
    data() {
        return {
            selectedStyleId: null,
            appliedRouteStyleId: null,
            activeStyleCategory: 'curated',
            styleSearchOpen: false,
            styleSearchQuery: '',
            oaiItems: oaiImageData.items,
            selectedOaiTemplateId: null,
            displayOrderOai: [],
            advancedSettingsOpen: false,
            subjectScene: '',
            editableArtStyle: '',
            editableElementDetails: '',
            isFocused: false,

            sizeMenuOpen: false,
            modelMenuOpen: false,
            qualityMenuOpen: false,
            /** 默认横图 4:3（1280×960），与 buildCreateCharacterRequest 原 auto 默认一致 */
            selectedSize: '1280x960',

            selectedModel: 'gpt-image-2',
            /** gpt-image：resolution 1k/2k/4k；dall-e：auto/high/medium/low */
            selectedQuality: '1k',
            outputFormat: 'png',
            imageCount: 1,

            /** 参考图 data URL 列表，最多 10 张（与 CreateLayoutIllustration 中 create-character 的 image 数组一致） */
            referenceImageUrls: [],
            referencePreview: null,

            displayOrder: [],
            /** 预览图 CDN/API 互为 fallback */
            styleImageOverrides: {},
            /** 手绘库：自动垫入 prompt/{id}.webp 作为首张参考图 */
            handrawStyleReferenceAuto: readHandrawStyleReferenceAutoPreference(),
            handrawAutoReferenceIndex: -1,
            handrawStyleReferenceLoading: false,

            generating: false,
            generatedImageUrl: null,
            collecting: false,
            downloading: false,
            imageLoading: false,
            imageLoadError: false,
            imageReloadKey: 0,
            /** 小黑 Skill：扩写方案预览 */
            xiaoheiPlan: null,
            xiaoheiExpanding: false,
            paperPosterPlan: null,
            photoEditorialPlan: null,

            /** 最近一次成功「生成」时请求里的 prompt 快照，与 current generatedImageUrl 一致；重选风格后不会变。 */
            lastGeneratedPromptSnapshot: '',

            stylePreview: {
                show: false,
                left: 0,
                top: 0,
                maxW: 320,
                maxH: 420,
                src: '',
                alt: ''
            },

            apiBaseUrl: process.env.VUE_APP_API_BASE_URL || ''
        }
    },
    computed: {
        selectedStyle() {
            if (this.selectedStyleId == null) return null
            return this.styles.find(s => s.id === this.selectedStyleId) || null
        },
        selectedOaiItem() {
            if (!this.selectedOaiTemplateId) return null
            return this.oaiItems.find((x) => x.id === this.selectedOaiTemplateId) || null
        },
        visibleOaiItems() {
            return this.oaiItems.filter(item => this.matchesStyleSearch(item.title, item.prompt, item.description))
        },
        isSearchingStyles() {
            return Boolean(this.styleSearchQuery.trim())
        },
        displayedOaiItems() {
            const vis = this.visibleOaiItems
            const set = new Set(vis.map((x) => x.id))
            if (this.isSearchingStyles || !this.displayOrderOai || !this.displayOrderOai.length) {
                return vis
            }
            return this.displayOrderOai
                .map((id) => this.oaiItems.find((x) => x.id === id))
                .filter((x) => x && set.has(x.id))
        },
        styleCategoryTabItems() {
            const keys = {
                curated: 'styleTabCurated',
                all: 'styleTabAll',
                sketch: 'styleTabSketch', paint: 'styleTabPaint', toon: 'styleTabToon',
                collage: 'styleTabCollage', chinese: 'styleTabChinese', other: 'styleTabOther', skill: 'styleTabSkill',
            }
            return visibleIllustrationCategoryIds(this.styles).map(id => ({ id, label: this.$t(`aiPicture.${keys[id]}`) }))
        },
        promptPlaceholder() {
            if (this.isXiaoheiStyle(this.selectedStyle)) {
                return this.$t('aiPicture.xiaoheiPlaceholder')
                    || '输入一句话，例如：信任是一块证据一块证据铺过去'
            }
            if (this.isPaperPosterStyle(this.selectedStyle)) {
                return this.$t('aiPicture.paperPosterPlaceholder')
                    || '可选：想保留的关系、文字语言或情绪方向'
            }
            if (this.isPhotoEditorialStyle(this.selectedStyle)) {
                return this.$t('aiPicture.photoEditorialPlaceholder')
                    || '可选：标题方向或想强调的画面关系'
            }
            return this.$t('aiPicture.heroPlaceholder') || '描述或编辑图片'
        },
        visibleStyles() {
            if (this.isSearchingStyles) {
                return this.styles.filter(style => this.matchesStyleSearch(style.artStyle, style.title, style.prompt, style.basePrompt, style.elementDetails, style.inputTemplate))
            }
            return stylesForIllustrationTab(this.activeStyleCategory, this.styles)
        },
        handrawStyleReferenceActive() {
            return (
                this.handrawStyleReferenceAuto
                && isHandrawLibStyle(this.selectedStyle)
                && this.handrawAutoReferenceIndex >= 0
                && (this.referenceImageUrls[this.handrawAutoReferenceIndex] || '')
            )
        },
        canGenerate() {
            if (this.isPaperPosterStyle(this.selectedStyle) || this.isPhotoEditorialStyle(this.selectedStyle)) {
                return (this.referenceImageUrls || []).some(Boolean)
            }
            return !!(this.subjectScene && this.subjectScene.trim())
        },
        sizeGroups() {
            return [
                {
                    key: 'aspect-ratio',
                    label: this.$t('aiPicture.aspectRatioGroup'),
                    items: [
                        { value: '1024x1024', compactLabel: '1:1', label: this.$t('aiPicture.ratio1_1'), iconW: 16, iconH: 16 },
                        { value: '640x960', compactLabel: '2:3', label: this.$t('aiPicture.ratio2_3'), iconW: 12, iconH: 18 },
                        { value: '768x1024', compactLabel: '3:4', label: this.$t('aiPicture.ratio3_4'), iconW: 12, iconH: 16 },
                        { value: '1280x960', compactLabel: '4:3', label: this.$t('aiPicture.ratio4_3'), iconW: 20, iconH: 15 },
                        { value: '576x1024', compactLabel: '9:16', label: this.$t('aiPicture.ratio9_16'), iconW: 10.125, iconH: 18 },
                        { value: '1024x576', compactLabel: '16:9', label: this.$t('aiPicture.ratio16_9'), iconW: 20, iconH: 11.25 }
                    ]
                }
            ]
        },
        currentSizeIconStyle() {
            const [width, height] = String(this.selectedSize).split('x').map(Number)
            const ratio = width > 0 && height > 0 ? width / height : 1
            return {
                width: `${20 * Math.min(ratio, 1)}px`,
                height: `${20 / Math.max(ratio, 1)}px`,
            }
        },
        currentSizeLabel() {
            for (const g of this.sizeGroups) {
                const hit = g.items.find(o => o.value === this.selectedSize)
                if (hit) return hit.compactLabel || hit.label
            }
            return this.selectedSize || '4:3'
        },
        isDallE() {
            return typeof this.selectedModel === 'string' && this.selectedModel.startsWith('dall-e')
        },
        modelMenuOptions() {
            return [
                { value: 'gpt-image-2', label: this.$t('aiPicture.modelGptImage2') },
                { value: 'gpt-image-1.5', label: this.$t('aiPicture.modelGptImage15') },
                { value: 'gpt-image-1', label: this.$t('aiPicture.modelGptImage1') },
                { value: 'dall-e-3', label: this.$t('aiPicture.modelDallE3') }
            ]
        },
        currentModelLabel() {
            const hit = this.modelMenuOptions.find(o => o.value === this.selectedModel)
            return hit ? hit.label : (this.selectedModel || '—')
        },
        qualityMenuOptions() {
            if (this.isDallE) {
                return [
                    { value: 'auto', label: this.$t('aiPicture.qualityAuto'), hint: 'standard' },
                    { value: 'high', label: this.$t('aiPicture.qualityHd'), hint: 'hd' },
                    { value: 'medium', label: this.$t('aiPicture.qualityBalanced'), hint: 'standard' },
                    { value: 'low', label: this.$t('aiPicture.qualityFast'), hint: 'standard' }
                ]
            }
            // gpt-image / APIMart：按 resolution 选 1k / 2k / 4k
            return [
                { value: '1k', label: this.$t('aiPicture.quality1k') || '1K', hint: '1k' },
                { value: '2k', label: this.$t('aiPicture.quality2k') || '2K', hint: '2k' },
                { value: '4k', label: this.$t('aiPicture.quality4k') || '4K', hint: '4k' },
            ]
        },
        currentQualityLabel() {
            const hit = this.qualityMenuOptions.find(o => o.value === this.selectedQuality)
            return hit ? hit.label : (this.$t('aiPicture.quality1k') || '1K')
        },
        displayedStyles() {
            const vis = this.visibleStyles
            const inTab = new Set(vis.map(s => s.id))
            if (this.isSearchingStyles || !this.displayOrder || !this.displayOrder.length) {
                if (this.activeStyleCategory !== 'curated') {
                    return sortStylesFeaturedFirst(vis)
                }
                if (this.activeStyleCategory === 'curated') {
                    return [...vis].sort((a, b) => Number(a.id) - Number(b.id))
                }
                return vis
            }
            return this.displayOrder
                .map(id => this.styles.find(s => s.id === id))
                .filter(s => s && inTab.has(s.id))
        },
        generatedPrompt() {
            if (!this.subjectScene || !this.subjectScene.trim()) return ''
            let prompt = this.subjectScene.trim()
            const style = this.selectedStyle
            // 小黑 / 纸刊：服务端扩写拼 prompt，前端只交用户补充
            if (this.isXiaoheiStyle(style) || this.isPaperPosterStyle(style) || this.isPhotoEditorialStyle(style)) return prompt
            const isDoodle = this.isObjectDoodleStyle(style)
            const isZine = this.isPoeticZineStyle(style)
            // 底词固定在网站：输入框只显示 C，生成时自动前置 A（basePrompt，不对用户展示）
            if (isZine || isDoodle || style?.prependBaseOnGenerate || isHandrawLibStyle(style)) {
                let base = ''
                if (isDoodle) {
                    // 喜茶无字：始终用本地强化底词，避免线上旧文案未绑定参考图
                    base = String(
                        this.$t('aibooks.styles.objectDoodlePosterNoText.elementDetails')
                        || style?.basePrompt
                        || style?.elementDetails
                        || ''
                    ).trim()
                } else if (isHandrawLibStyle(style)) {
                    base = resolveStyleBasePrompt(style)
                } else {
                    base = String(
                        style?.basePrompt
                        || style?.elementDetails
                        || (isZine
                            ? this.$t('aibooks.styles.poeticMinimalZine.elementDetails')
                            : '')
                        || ''
                    ).trim()
                }
                const marker = base.slice(0, 24)
                if (base && (!marker || !prompt.includes(marker))) {
                    prompt = `${base}\n\n${prompt}`
                }
                if (isZine) {
                    prompt = this.enrichPoeticZinePrompt(prompt)
                }
                if (isDoodle) {
                    prompt = this.enrichObjectDoodlePrompt(prompt)
                }
            }
            if (this.handrawStyleReferenceActive) {
                const loc = this.$i18n?.locale === 'en' ? 'en' : 'zh'
                prompt = appendHandrawReferenceIsolation(prompt, loc)
            }
            if (this.isCharacterInput(prompt)) {
                const characterAccuracy = '每个角色严格保持2只手、2只脚，肢体数量准确，解剖结构正常，肢体形态自然连贯，无重复或多余肢体。'
                prompt = `${prompt}，${characterAccuracy}`
            }
            return prompt
        }
    },
    watch: {
        styleSearchQuery() {
            this.$nextTick(() => {
                const list = this.$refs.styleListRef
                if (list) list.scrollTop = 0
            })
        },
        '$route.query.styleId': {
            handler() {
                this.appliedRouteStyleId = null
                this.applyRouteStyle()
            },
        },
        styles() {
            this.applyRouteStyle()
        },
        styleCategoryTabItems: {
            handler(items) {
                // 等风格加载完成再校正分类，避免模板先返回时把默认精选切成全部。
                if (!this.styles.length) return
                const ids = (items || []).map((t) => t.id)
                if (!ids.length) return
                if (!ids.includes(this.activeStyleCategory)) {
                    this.activeStyleCategory = 'curated'
                    this.displayOrder = []
                }
            },
            immediate: true,
        },
        selectedStyle: {
            handler(newStyle) {
                if (newStyle && this.selectedStyleId !== null) {
                    this.editableArtStyle = newStyle.artStyle
                    this.editableElementDetails = newStyle.elementDetails
                }
            },
            immediate: false
        }
    },
    mounted() {
        // 首页风格入口携带 styleId；普通入口保持空输入。
        this.applyRouteStyle()
        this.restoreLatestGeneratedImage()
        document.addEventListener('click', this.handleDocClick)
        this._onStyleListScroll = () => {
            this.hideStyleImagePreview()
        }
        this.$nextTick(() => {
            const el = this.$refs.styleListRef
            this._styleListEl = el
            if (el) el.addEventListener('scroll', this._onStyleListScroll, { passive: true })
        })
    },
    beforeUnmount() {
        document.removeEventListener('click', this.handleDocClick)
        this.clearStylePreviewTimer()
        if (this._styleListEl && this._onStyleListScroll) {
            this._styleListEl.removeEventListener('scroll', this._onStyleListScroll)
        }
        this.stylePreview.show = false
    },
    methods: {
        matchesStyleSearch(...values) {
            const query = this.styleSearchQuery.trim().toLocaleLowerCase()
            return !query || values.some(value => String(value || '').toLocaleLowerCase().includes(query))
        },
        toggleStyleSearch() {
            this.styleSearchOpen = !this.styleSearchOpen
            if (!this.styleSearchOpen) this.styleSearchQuery = ''
            else this.$nextTick(() => this.$refs.styleSearchInput?.focus())
        },
        applyRouteStyle() {
            const styleId = this.$route.query.styleId
            if (typeof styleId !== 'string' || !styleId || this.appliedRouteStyleId === styleId) return
            const style = this.styles.find(item => String(item.id) === styleId)
            if (!style) return
            this.appliedRouteStyleId = styleId
            this.activeStyleCategory = stylesForIllustrationTab('curated', [style]).length
                ? 'curated'
                : illustrationStyleCategory(style)
            this.displayOrder = []
            this.selectStyle(style.id)
            this.$nextTick(() => requestAnimationFrame(() => {
                const list = this.$refs.styleListRef
                const card = Array.from(list?.querySelectorAll('[data-style-id]') || [])
                    .find(item => item.dataset.styleId === styleId)
                if (list && card) {
                    const offset = card.getBoundingClientRect().top - list.getBoundingClientRect().top
                    list.scrollTo({ top: list.scrollTop + offset - 8, behavior: 'instant' })
                }
            }))
        },
        clearPrompt() {
            this.subjectScene = ''
            this.$nextTick(() => this.$refs.promptInput?.focus())
        },
        isHandrawLibraryStyle(style) {
            return isHandrawLibStyle(style)
        },
        styleListImage(style) {
            if (!style) return ''
            const id = style.id
            if (id != null && this.styleImageOverrides[id]) {
                return this.styleImageOverrides[id]
            }
            return style.image || style.imageUrl || ''
        },
        onStyleImageError(style) {
            if (!style || style.id == null) return
            const current = this.styleListImage(style)
            if (!current || this.styleImageOverrides[style.id + ':exhausted']) return
            let next = ''
            if (current.includes('static.kidstory.cc')) {
                next = current.replace('static.kidstory.cc', 'api.kidstory.cc')
            } else if (current.includes('api.kidstory.cc')) {
                next = current.replace('api.kidstory.cc', 'static.kidstory.cc')
            }
            if (next && next !== current) {
                this.styleImageOverrides = {
                    ...this.styleImageOverrides,
                    [style.id]: next,
                }
            } else {
                this.styleImageOverrides = {
                    ...this.styleImageOverrides,
                    [`${style.id}:exhausted`]: true,
                }
            }
        },
        setStyleCategory(groupId) {
            if (this.activeStyleCategory === groupId) return
            this.activeStyleCategory = groupId
            this.displayOrder = []
            this.$nextTick(() => {
                const list = this.$refs.styleListRef
                if (list) list.scrollTo({ top: 0, behavior: 'auto' })
            })
        },
        isPoeticZineStyle(style) {
            return isPoeticMinimalZineStyle(style)
        },
        isObjectDoodleStyle(style) {
            return isObjectDoodlePosterNoTextStyle(style)
        },
        isXiaoheiStyle(style) {
            return isXiaoheiAbsurdIllustrationStyle(style)
        },
        isPaperPosterStyle(style) {
            return isPaperPosterSkillStyle(style)
        },
        isTrueSceneCollageStyle(style) {
            return isTrueScenePaperCollageStyle(style)
        },
        isMoodSceneRedrawStyle(style) {
            return isMoodScenePaperRedrawStyle(style)
        },
        isPhotoEditorialStyle(style) {
            return isTruePhotoAbstractPanelStyle(style)
        },
        // 兼容旧方法名
        isGatheredScenesStyle(style) {
            return isPaperPosterSkillStyle(style)
        },
        isScenesGatheredStyle(style) {
            return isTrueScenePaperCollageStyle(style)
        },
        isSceneDistillationStyle(style) {
            return isMoodScenePaperRedrawStyle(style)
        },

        /** 优先 style.inputTemplate，否则按 key / zine / doodle 识别从 i18n 取短模板 */
        resolveStyleInputTemplate(style) {
            if (!style) return ''
            // 喜茶无字：强制用本地短模板（线上可能仍是弱文案「请上传图片」）
            if (this.isObjectDoodleStyle(style)) {
                const path = 'aibooks.styles.objectDoodlePosterNoText.inputTemplate'
                const v = this.$t(path)
                if (v && v !== path) return String(v).trim()
            }
            if (this.isXiaoheiStyle(style)) {
                const path = 'aibooks.styles.xiaoheiAbsurdIllustration.inputTemplate'
                const v = this.$t(path)
                if (v && v !== path) return String(v).trim()
            }
            if (this.isTrueSceneCollageStyle(style)) {
                const path = 'aibooks.styles.trueScenePaperCollage.inputTemplate'
                const v = this.$t(path)
                if (v && v !== path) return String(v).trim()
            }
            if (this.isMoodSceneRedrawStyle(style)) {
                const path = 'aibooks.styles.moodScenePaperRedraw.inputTemplate'
                const v = this.$t(path)
                if (v && v !== path) return String(v).trim()
            }
            if (this.isPhotoEditorialStyle(style)) {
                const path = 'aibooks.styles.truePhotoAbstractPanel.inputTemplate'
                const v = this.$t(path)
                if (v && v !== path) return String(v).trim()
            }
            if (style.inputTemplate) return String(style.inputTemplate).trim()
            const key = style.key
            if (key) {
                const path = `aibooks.styles.${key}.inputTemplate`
                const v = this.$t(path)
                if (v && v !== path) return String(v).trim()
            }
            if (this.isPoeticZineStyle(style)) {
                const path = 'aibooks.styles.poeticMinimalZine.inputTemplate'
                const v = this.$t(path)
                if (v && v !== path) return String(v).trim()
            }
            return ''
        },

        applyStylePromptToInput(style) {
            if (!style) return
            this.xiaoheiPlan = null
            this.paperPosterPlan = null
            this.photoEditorialPlan = null
            // 特殊风格：输入框只填精简模板 C，底词 A（basePrompt / elementDetails）永不写入输入框
            if (this.isObjectDoodleStyle(style)) {
                this.subjectScene = this.$t('aibooks.styles.objectDoodlePosterNoText.inputTemplate') || '请上传参考图'
                return
            }
            if (this.isXiaoheiStyle(style)) {
                const tmpl = this.resolveStyleInputTemplate(style)
                this.subjectScene = tmpl || ''
                return
            }
            if (this.isPaperPosterStyle(style) || this.isPhotoEditorialStyle(style)) {
                // 纸刊 / 原片编页：主输入可选
                this.subjectScene = ''
                return
            }
            const tmpl = this.resolveStyleInputTemplate(style)
            if (tmpl) {
                this.subjectScene = tmpl
                return
            }
            if (style.prependBaseOnGenerate || style.basePrompt) {
                this.subjectScene = style.artStyle || ''
                return
            }
            // 绝不用长 elementDetails 填输入框
            this.subjectScene = style.artStyle || ''
        },

        async expandXiaoheiPlan() {
            const sentence = String(this.subjectScene || '').trim()
            if (!sentence) {
                ElMessage.warning({
                    message: this.$t('aiPicture.xiaoheiNeedSentence') || '请先输入一句话',
                    offset: 200,
                })
                return
            }
            this.xiaoheiExpanding = true
            try {
                const data = await expandXiaoheiSentence(this.$http, sentence, {
                    apiBaseUrl: this.apiBaseUrl,
                })
                this.xiaoheiPlan = data.plan || null
                ElMessage.success({
                    message: this.$t('aiPicture.xiaoheiPlanReady') || '方案已就绪，可直接生成',
                    offset: 200,
                })
            } catch (e) {
                ElMessage.error({
                    message: e?.message || this.$t('aiPicture.xiaoheiExpandFailed') || '扩写失败',
                    offset: 200,
                })
            } finally {
                this.xiaoheiExpanding = false
            }
        },

        /**
         * zine 风格：用户只填「用户原文」；生成时自动补「画面主文案」。
         * 原文很短则两者相同；空原文则写「无」。
         */
        enrichPoeticZinePrompt(prompt) {
            const text = String(prompt || '')
            if (/画面主文案\s*[：:]/.test(text)) return text

            const match = text.match(/用户原文\s*[：:]\s*[“"']([^”"']*)[”"']/)
            let original = match ? String(match[1] || '').trim() : ''
            if (!original || original === '无') {
                original = '无'
            }

            let headline = '无'
            if (original !== '无') {
                // 已很短则原样；否则取首句/前 16 字，尽量保留原词
                const firstLine = original.split(/[\n。！？.!?]/).map((s) => s.trim()).filter(Boolean)[0] || original
                headline = firstLine.length <= 16 ? firstLine : `${firstLine.slice(0, 16)}…`
            }

            const block = `画面主文案：“${headline}”`
            if (/按上述规则组织/.test(text)) {
                return text.replace(/按上述规则组织/, `${block}\n按上述规则组织`)
            }
            if (/Organize a vertical 3:5/.test(text)) {
                return text.replace(/Organize a vertical 3:5/, `Main poster line: "${headline}"\nOrganize a vertical 3:5`)
            }
            return `${text}\n${block}`
        },

        /**
         * 实物简笔画：在文末再次强调必须使用附件参考图，避免模型忽略上传图另画。
         */
        enrichObjectDoodlePrompt(prompt) {
            const text = String(prompt || '')
            const codaZh = '【图像绑定】必须使用本次请求附带的参考图作为唯一物件来源：从中提取一个真实物件并保留摄影质感，仅叠加黑色简笔小人；禁止忽略参考图或另造主体。'
            const codaEn = '[IMAGE BINDING] You MUST use the reference image attached to this request as the sole object source: keep one real photographed object, add only black micro-worker doodles; do not ignore the reference or invent a new subject.'
            if (text.includes('【图像绑定】') || text.includes('[IMAGE BINDING] You MUST')) {
                return text
            }
            const coda = /Reference image:|sole object source|Please upload/i.test(text) ? codaEn : codaZh
            return `${text}\n\n${coda}`
        },

        clearSelectedStyle() {
            this.removeHandrawAutoReference()
            this.selectedStyleId = null
        },
        removeHandrawAutoReference() {
            const idx = this.handrawAutoReferenceIndex
            if (idx >= 0 && idx < this.referenceImageUrls.length) {
                this.referenceImageUrls.splice(idx, 1)
            }
            this.handrawAutoReferenceIndex = -1
        },
        async blobToDataUrl(blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result)
                reader.onerror = () => reject(new Error('read blob failed'))
                reader.readAsDataURL(blob)
            })
        },
        async syncHandrawStyleReference(style) {
            this.removeHandrawAutoReference()
            if (!style || !isHandrawLibStyle(style) || !this.handrawStyleReferenceAuto) {
                return
            }
            const previewUrl = this.styleListImage(style) || style.image || style.imageUrl
            if (!previewUrl) return
            this.handrawStyleReferenceLoading = true
            try {
                const blob = await loadImageBlob(previewUrl, {
                    http: this.$http,
                    apiBaseUrl: this.apiBaseUrl,
                })
                let dataUrl = await this.blobToDataUrl(blob)
                dataUrl = await this.compressDataUrlIfNeeded(dataUrl, 420 * 1024)
                this.referenceImageUrls.unshift(dataUrl)
                this.handrawAutoReferenceIndex = 0
            } catch (err) {
                console.warn('[AIpicture] handraw style reference load failed', err)
            } finally {
                this.handrawStyleReferenceLoading = false
            }
        },
        onHandrawStyleReferenceAutoChange() {
            writeHandrawStyleReferenceAutoPreference(this.handrawStyleReferenceAuto)
            if (this.handrawStyleReferenceAuto && this.selectedStyle) {
                this.syncHandrawStyleReference(this.selectedStyle)
            } else {
                this.removeHandrawAutoReference()
            }
        },
        clearSelectedOai() {
            this.selectedOaiTemplateId = null
        },

        async selectStyle(styleId) {
            this.selectedStyleId = styleId
            this.selectedOaiTemplateId = null
            const style = this.styles.find(s => s.id === styleId)
            if (style) {
                this.editableArtStyle = style.artStyle
                this.editableElementDetails = style.elementDetails
                this.applyStylePromptToInput(style)
                await this.syncHandrawStyleReference(style)
                if (
                    style.preferredSize ||
                    style.prependBaseOnGenerate ||
                    this.isPoeticZineStyle(style) ||
                    this.isXiaoheiStyle(style) ||
                    this.isPaperPosterStyle(style) ||
                    this.isPhotoEditorialStyle(style)
                ) {
                    this.selectedSize = style.preferredSize
                        || (this.isXiaoheiStyle(style) ? '1024x576' : '768x1024')
                }
                // 纸刊 / 原片编页：若已有参考图，按照片比例覆盖默认 preferredSize
                if (
                    (this.isPaperPosterStyle(style) || this.isPhotoEditorialStyle(style))
                    && this.referenceImageUrls[0]
                ) {
                    this.syncSizeFromPhoto(this.referenceImageUrls[0])
                }
            }
        },
        selectOaiTemplate(item) {
            if (!item) return
            this.removeHandrawAutoReference()
            this.selectedOaiTemplateId = item.id
            this.selectedStyleId = null
            this.subjectScene = (item.prompt || '').trim()
        },

        toggleSizeMenu() {
            const next = !this.sizeMenuOpen
            this.sizeMenuOpen = next
            if (next) {
                this.modelMenuOpen = false
                this.qualityMenuOpen = false
            }
        },
        selectSize(value) {
            this.selectedSize = value
            this.sizeMenuOpen = false
        },
        toggleModelMenu() {
            const next = !this.modelMenuOpen
            this.modelMenuOpen = next
            if (next) {
                this.sizeMenuOpen = false
                this.qualityMenuOpen = false
            }
        },
        selectModel(value) {
            this.selectedModel = value
            this.modelMenuOpen = false
            const valid = this.qualityMenuOptions.some(o => o.value === this.selectedQuality)
            if (!valid) this.selectedQuality = this.isDallE ? 'medium' : '1k'
        },
        toggleQualityMenu() {
            const next = !this.qualityMenuOpen
            this.qualityMenuOpen = next
            if (next) {
                this.sizeMenuOpen = false
                this.modelMenuOpen = false
            }
        },
        selectQuality(value) {
            this.selectedQuality = value
            this.qualityMenuOpen = false
        },
        enterStylePreview(e, src, alt) {
            if (!src) return
            this.clearStylePreviewTimer()
            this.openStyleImagePreviewAtThumb(e, src, alt)
        },
        openStyleImagePreviewAtThumb(e, src, alt) {
            if (!e || !e.currentTarget || !src) return
            const r = e.currentTarget.getBoundingClientRect()
            const maxW = Math.min(320, window.innerWidth - 16)
            const maxH = Math.min(420, window.innerHeight - 16)
            let left = r.right - 2
            let top = r.top
            if (left + maxW > window.innerWidth - 8) {
                left = r.left - maxW + 2
            }
            if (left < 8) {
                left = 8
            }
            if (left + maxW > window.innerWidth - 8) {
                left = Math.max(8, window.innerWidth - 8 - maxW)
            }
            if (top + maxH > window.innerHeight - 8) {
                top = r.top - maxH - 6
            }
            if (top < 8) {
                top = 8
            }
            this.stylePreview.show = true
            this.stylePreview.left = left
            this.stylePreview.top = top
            this.stylePreview.maxW = maxW
            this.stylePreview.maxH = maxH
            this.stylePreview.src = src
            this.stylePreview.alt = alt != null ? String(alt) : ''
        },
        beginLeaveStylePreview() {
            this._stylePreviewTimer = window.setTimeout(() => {
                this.stylePreview.show = false
                this._stylePreviewTimer = null
            }, 250)
        },
        cancelLeaveStylePreview() {
            this.clearStylePreviewTimer()
        },
        clearStylePreviewTimer() {
            if (this._stylePreviewTimer) {
                clearTimeout(this._stylePreviewTimer)
                this._stylePreviewTimer = null
            }
        },
        hideStyleImagePreview() {
            this.clearStylePreviewTimer()
            this.stylePreview.show = false
        },
        handleDocClick(e) {
            this.hideStyleImagePreview()
            const sizeRef = this.$refs.sizeSelectRef
            const modelRef = this.$refs.modelSelectRef
            const qualityRef = this.$refs.qualitySelectRef
            if (this.sizeMenuOpen && sizeRef && !sizeRef.contains(e.target)) this.sizeMenuOpen = false
            if (this.modelMenuOpen && modelRef && !modelRef.contains(e.target)) this.modelMenuOpen = false
            if (this.qualityMenuOpen && qualityRef && !qualityRef.contains(e.target)) this.qualityMenuOpen = false
        },

        openReferencePreview(index) {
            this.referencePreview = { urls: [...this.referenceImageUrls], index }
        },
        triggerReferenceUpload() {
            this.$refs.referenceUpload && this.$refs.referenceUpload.click()
        },
        async handleReferenceUpload(e) {
            const files = Array.from((e.target.files && e.target.files) || []).filter((f) => f.type && f.type.startsWith('image/'))
            if (!files.length) {
                e.target.value = ''
                return
            }
            const maxRef = 10
            const room = maxRef - this.referenceImageUrls.length
            if (room <= 0) {
                ElMessage.warning({ message: this.$t('aiPicture.referenceMax') || '参考图最多 10 张', offset: 200 })
                e.target.value = ''
                return
            }
            const toProcess = files.slice(0, room)
            let added = 0
            try {
                for (const file of toProcess) {
                    const dataUrl = await this.fileToDataUrl(file)
                    const compressed = await this.compressDataUrlIfNeeded(dataUrl)
                    this.referenceImageUrls.push(compressed)
                    added++
                }
                if (added > 0) {
                    // 换参考图后清空上次读图方案，避免旧 plan 绑进下次生成
                    this.clearPlansTiedToReference()
                    ElMessage.success({
                        message: this.$t('aiPicture.referenceAddedCount', { n: added }) || `已添加 ${added} 张参考图`,
                        offset: 200
                    })
                    // 纸刊风格：按首张参考图比例同步尺寸选项（用户之后仍可手动改）
                    if (
                        (this.isPaperPosterStyle(this.selectedStyle) || this.isPhotoEditorialStyle(this.selectedStyle))
                        && this.referenceImageUrls[0]
                    ) {
                        await this.syncSizeFromPhoto(this.referenceImageUrls[0])
                    }
                }
                if (files.length > room) {
                    ElMessage.info({
                        message: this.$t('aiPicture.referenceTruncated', { max: maxRef }) || `已达上限 ${maxRef} 张，其余未添加`,
                        offset: 200
                    })
                }
            } catch (err) {
                console.error(err)
                ElMessage.error({ message: this.$t('aiPicture.referenceFailed') || '参考图加载失败', offset: 200 })
            } finally {
                e.target.value = ''
            }
        },
        removeReferenceAt(index) {
            if (index < 0 || index >= this.referenceImageUrls.length) return
            if (index === this.handrawAutoReferenceIndex) {
                this.handrawAutoReferenceIndex = -1
                this.handrawStyleReferenceAuto = false
                writeHandrawStyleReferenceAutoPreference(false)
            } else if (index < this.handrawAutoReferenceIndex) {
                this.handrawAutoReferenceIndex -= 1
            }
            this.referenceImageUrls.splice(index, 1)
            this.clearPlansTiedToReference()
        },
        /** 参考图变更后，清掉依赖该照片的方案/预览，避免污染下次生成 */
        clearPlansTiedToReference() {
            this.paperPosterPlan = null
            this.photoEditorialPlan = null
            this.xiaoheiPlan = null
            if (this.isPaperPosterStyle(this.selectedStyle) || this.isPhotoEditorialStyle(this.selectedStyle)) {
                this.generatedImageUrl = null
                this.lastGeneratedPromptSnapshot = ''
                this.imageLoading = false
                this.imageLoadError = false
            }
        },
        /** 读取 dataURL / http 图片自然宽高 */
        getDataUrlImageSize(src) {
            return new Promise((resolve) => {
                if (!src) {
                    resolve({ width: 0, height: 0 })
                    return
                }
                const img = new Image()
                img.onload = () => {
                    resolve({
                        width: img.naturalWidth || img.width || 0,
                        height: img.naturalHeight || img.height || 0,
                    })
                }
                img.onerror = () => resolve({ width: 0, height: 0 })
                img.src = src
            })
        },
        /** 在尺寸菜单里选与照片最接近的选项 */
        pickClosestSizeOption(width, height) {
            if (!(width > 0) && !(height > 0)) return this.selectedSize || '768x1024'
            const ratio = width / height
            let best = this.selectedSize || '768x1024'
            let bestDiff = Infinity
            for (const g of this.sizeGroups || []) {
                for (const item of g.items || []) {
                    const m = String(item.value || '').match(/^(\d+)x(\d+)$/i)
                    if (!m) continue
                    const rw = Number(m[1]) / Number(m[2])
                    const diff = Math.abs(ratio - rw)
                    if (diff < bestDiff) {
                        bestDiff = diff
                        best = item.value
                    }
                }
            }
            return best
        },
        async syncSizeFromPhoto(photoSrc) {
            const { width, height } = await this.getDataUrlImageSize(photoSrc)
            if (!(width > 0) || !(height > 0)) return
            this.selectedSize = this.pickClosestSizeOption(width, height)
        },
        fileToDataUrl(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result)
                reader.onerror = reject
                reader.readAsDataURL(file)
            })
        },

        /** 接口常把 message 嵌套成对象，避免 new Error(obj) 变成 [object Object] */
        normalizeApiErrorToString(raw) {
            if (raw == null || raw === '') return ''
            if (typeof raw === 'string') return raw
            if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw)
            if (typeof raw === 'object') {
                const nested = raw.message ?? raw.msg ?? raw.error ?? raw.desc ?? raw.detail
                if (nested != null && nested !== raw) {
                    const s = this.normalizeApiErrorToString(nested)
                    if (s) return s
                }
                try {
                    return JSON.stringify(raw)
                } catch (e) {
                    return '请求失败'
                }
            }
            return String(raw)
        },

        shuffleStyles() {
            const shuffle = (arr) => {
                for (let i = arr.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1))
                    ;[arr[i], arr[j]] = [arr[j], arr[i]]
                }
                return arr
            }
            this.displayOrder = shuffle(this.visibleStyles.map(s => s.id))
            if (this.activeStyleCategory !== 'curated') {
                this.displayOrderOai = shuffle(this.visibleOaiItems.map(x => x.id))
            }
            this.$nextTick(() => {
                const list = this.$refs.styleListRef
                if (list) list.scrollTo({ top: 0, behavior: 'smooth' })
            })
        },

        /**
         * KidStory 后端为 POST /create-character（与 CreateCharacter / AIBooks 一致），
         * 无 OpenAI 兼容路径 /v1/images/generations，勿改路径除非网关已部署该路由。
         */
        buildCreateCharacterRequest() {
            const prompt = (this.generatedPrompt || '').slice(0, 5000)
            const size = this.selectedSize || '1280x960'
            const model = this.selectedModel || 'gpt-image-2'
            const quality = this.selectedQuality || (this.isDallE ? 'medium' : '1k')
            const body = {
                prompt,
                size,
                model,
                watermark: false,
            }
            // gpt-image：传 resolution（1k/2k/4k）；dall-e：传 quality
            if (this.isDallE) {
                body.quality = quality
            } else {
                body.resolution = quality
                body.quality = quality
            }
            return body
        },

        extractImageUrl(responseData) {
            if (!responseData) return ''
            const tryBase64 = (str, mime = 'image/png') => {
                if (!str) return ''
                const trimmed = String(str).trim()
                if (trimmed.startsWith('data:')) return trimmed
                return `data:${mime};base64,${trimmed.replace(/\s/g, '')}`
            }
            const mime = this.outputFormat === 'jpeg' ? 'image/jpeg'
                : this.outputFormat === 'webp' ? 'image/webp'
                : 'image/png'

            if (Array.isArray(responseData.data) && responseData.data.length > 0) {
                const first = responseData.data[0]
                if (first.b64_json) return tryBase64(first.b64_json, mime)
                if (first.url) return first.url
            }

            const result = responseData.message || responseData
            if (!result || typeof result !== 'object') return ''

            const fromTask = resolveGenerationImageUrl(result, this.apiBaseUrl, mime)
            if (fromTask) return fromTask

            if (result.character_image_url) {
                const u = String(result.character_image_url).trim()
                if (u.startsWith('http://') || u.startsWith('https://')) return u
                return resolveGenerationImageUrl({ image_url: u }, this.apiBaseUrl, mime)
            }
            if (result.image_base64) return tryBase64(result.image_base64, mime)
            if (result.character_image_base64) return tryBase64(result.character_image_base64, mime)
            if (result.image) return result.image
            if (result.url) return result.url
            if (result.b64_json) return tryBase64(result.b64_json, mime)

            if (result.full_response) {
                const fr = result.full_response
                if (Array.isArray(fr.data) && fr.data.length > 0) {
                    const first = fr.data[0]
                    if (first.b64_json) return tryBase64(first.b64_json, mime)
                    if (first.url || first.ResultUrl) return first.url || first.ResultUrl
                }
                return fr.result_url || fr.ResultUrl || fr.url || ''
            }
            return result.character_image_oss_url || result.result_url || result.ResultUrl || ''
        },

        async generateIllustration() {
            if (this.isPaperPosterStyle(this.selectedStyle) || this.isPhotoEditorialStyle(this.selectedStyle)) {
                const refs = (this.referenceImageUrls || []).filter(Boolean)
                if (!refs.length) {
                    ElMessage.warning({
                        message:
                            this.$t(
                              this.isPhotoEditorialStyle(this.selectedStyle)
                                ? 'aiPicture.photoEditorialNeedPhoto'
                                : 'aiPicture.paperPosterNeedPhoto'
                            ) || '该技能需要先上传一张照片',
                        offset: 200,
                    })
                    return
                }
            } else if (!this.generatedPrompt) {
                ElMessage.warning({ message: this.$t('aiPicture.needPrompt') || '请先描述你想要的画面', offset: 200 })
                return
            }
            let refs = (this.referenceImageUrls || []).filter(Boolean)
            if (
                isHandrawLibStyle(this.selectedStyle)
                && this.handrawStyleReferenceAuto
                && this.handrawAutoReferenceIndex < 0
            ) {
                await this.syncHandrawStyleReference(this.selectedStyle)
                refs = (this.referenceImageUrls || []).filter(Boolean)
            }
            if (
                (
                  this.isObjectDoodleStyle(this.selectedStyle)
                  || this.isPaperPosterStyle(this.selectedStyle)
                  || this.isPhotoEditorialStyle(this.selectedStyle)
                )
                && !refs.length
            ) {
                ElMessage.warning({
                    message: this.$t('aiPicture.needReferenceForStyle') || '该风格必须先添加参考图',
                    offset: 200,
                })
                return
            }
            this.generatedImageUrl = null
            this.lastGeneratedPromptSnapshot = ''
            this.imageLoadError = false
            this.imageLoading = false
            this.generating = true

            try {
                // SKILL·原片抽象编页：母题异步生成 → 服务端合成原片+色板+标题
                if (this.isPhotoEditorialStyle(this.selectedStyle)) {
                    const note = String(this.subjectScene || '').trim()
                    let photo = refs[0]
                    photo = await this.compressDataUrlIfNeeded(photo, 900 * 1024)
                    const dims = await this.getDataUrlImageSize(photo)
                    const size = this.selectedSize || this.pickClosestSizeOption(dims.width, dims.height)
                    const result = await generatePhotoEditorial(
                        this.$http,
                        {
                            image: photo,
                            note,
                            plan: this.photoEditorialPlan,
                            size,
                            photoWidth: dims.width,
                            photoHeight: dims.height,
                            resolution: this.selectedQuality || '1k',
                        },
                        { apiBaseUrl: this.apiBaseUrl }
                    )
                    if (result.plan) this.photoEditorialPlan = result.plan
                    const message = result.message
                    if (message && typeof message === 'object' && message.points !== undefined && this.$store && this.$store.state) {
                        this.$store.commit('setUserInfo', {
                            ...(this.$store.state.userInfo || {}),
                            points: message.points
                        })
                    }
                    this.lastGeneratedPromptSnapshot = note || '[photo-editorial]'
                    this.generatedImageUrl = result.imageUrl
                    this.imageLoading = true
                    this.imageLoadError = false
                    this.saveGeneratedImageToLocalStorage(result.imageUrl)
                    ElMessage.success({ message: this.$t('aiPicture.generateSuccess') || '插画生成成功！', offset: 200 })
                    return
                }

                // SKILL·纸刊海报：参考图 → 服务端读图分析 → create-character 异步任务
                if (this.isPaperPosterStyle(this.selectedStyle)) {
                    const note = String(this.subjectScene || '').trim()
                    let photo = refs[0]
                    // 压图，避免 vision + 生图请求体过大
                    photo = await this.compressDataUrlIfNeeded(photo, 900 * 1024)
                    const dims = await this.getDataUrlImageSize(photo)
                    // 用户当前选中的尺寸优先；同时传照片宽高作兜底
                    const size = this.selectedSize || this.pickClosestSizeOption(dims.width, dims.height)
                    const result = await generatePaperPoster(
                        this.$http,
                        {
                            mode: paperPosterModeFromStyle(this.selectedStyle),
                            image: photo,
                            note,
                            plan: this.paperPosterPlan,
                            size,
                            photoWidth: dims.width,
                            photoHeight: dims.height,
                            resolution: this.selectedQuality || '1k',
                        },
                        { apiBaseUrl: this.apiBaseUrl }
                    )
                    if (result.plan) this.paperPosterPlan = result.plan
                    const message = result.message
                    if (message && typeof message === 'object' && message.points !== undefined && this.$store && this.$store.state) {
                        this.$store.commit('setUserInfo', {
                            ...(this.$store.state.userInfo || {}),
                            points: message.points
                        })
                    }
                    this.lastGeneratedPromptSnapshot = note || '[paper-poster]'
                    this.generatedImageUrl = result.imageUrl
                    this.imageLoading = true
                    this.imageLoadError = false
                    this.saveGeneratedImageToLocalStorage(result.imageUrl)
                    ElMessage.success({ message: this.$t('aiPicture.generateSuccess') || '插画生成成功！', offset: 200 })
                    return
                }

                // SKILL·怪诞小黑：一句话 → 服务端扩写 → create-character 异步任务
                if (this.isXiaoheiStyle(this.selectedStyle)) {
                    const sentence = String(this.subjectScene || '').trim()
                    const result = await generateXiaoheiIllustration(
                        this.$http,
                        {
                            sentence,
                            plan: this.xiaoheiPlan,
                            size: this.selectedSize || '1024x576',
                            resolution: this.selectedQuality || '1k',
                        },
                        { apiBaseUrl: this.apiBaseUrl }
                    )
                    if (result.plan) this.xiaoheiPlan = result.plan
                    const message = result.message
                    if (message && typeof message === 'object' && message.points !== undefined && this.$store && this.$store.state) {
                        this.$store.commit('setUserInfo', {
                            ...(this.$store.state.userInfo || {}),
                            points: message.points
                        })
                    }
                    this.lastGeneratedPromptSnapshot = sentence
                    this.generatedImageUrl = result.imageUrl
                    this.imageLoading = true
                    this.imageLoadError = false
                    this.saveGeneratedImageToLocalStorage(result.imageUrl)
                    ElMessage.success({ message: this.$t('aiPicture.generateSuccess') || '插画生成成功！', offset: 200 })
                    return
                }

                const requestData = this.buildCreateCharacterRequest()
                // 多图时 JSON 体积极大，按张数分摊压缩，降低网关/解析失败概率
                if (refs.length > 1) {
                    const budget = 850 * 1024
                    const per = Math.max(220 * 1024, Math.floor(budget / refs.length))
                    refs = await Promise.all(
                        refs.slice(0, 10).map((u) => this.compressDataUrlIfNeeded(u, per))
                    )
                }
                // 喜茶无字：只用第一张参考图，避免多图稀释物件锚点
                if (this.isObjectDoodleStyle(this.selectedStyle) && refs.length) {
                    requestData.image = refs[0]
                } else if (refs.length === 1) {
                    requestData.image = refs[0]
                } else if (refs.length > 1) {
                    requestData.image = refs
                }

                const responseData = await postCreateCharacter(
                    this.$http,
                    requestData,
                    { apiBaseUrl: this.apiBaseUrl, source: 'ai_picture' }
                )
                if (!isCreateCharacterResponseOk(responseData)) {
                    const errorMsg = this.normalizeApiErrorToString(
                        responseData.error?.message ?? responseData.error ?? responseData.message ?? responseData.desc
                    ) || '生成失败，请重试'
                    throw new Error(errorMsg)
                }

                const message = responseData.message
                if (message && typeof message === 'object' && message.points !== undefined && this.$store && this.$store.state) {
                    this.$store.commit('setUserInfo', {
                        ...(this.$store.state.userInfo || {}),
                        points: message.points
                    })
                }

                const imageUrl = this.extractImageUrl(responseData)
                if (imageUrl) {
                    this.lastGeneratedPromptSnapshot = (requestData.prompt && String(requestData.prompt)) || ''
                    this.generatedImageUrl = imageUrl
                    this.imageLoading = true
                    this.imageLoadError = false
                    this.saveGeneratedImageToLocalStorage(imageUrl)
                    ElMessage.success({ message: this.$t('aiPicture.generateSuccess') || '插画生成成功！', offset: 200 })
                } else {
                    throw new Error('响应中未找到图片URL')
                }
            } catch (error) {
                console.error('生成插画失败:', error)
                let errorMessage = '生成失败，请重试'
                if (error.response) {
                    const status = error.response.status
                    const data = error.response.data
                    if (status === 401) errorMessage = '未授权，请先登录'
                    else if (status === 403) errorMessage = '无权限访问'
                    else if (status === 404) errorMessage = 'API接口不存在'
                    else if (status === 400) {
                        errorMessage = this.normalizeApiErrorToString(data?.message ?? data?.error) || '请求参数错误'
                    } else if (status === 500) errorMessage = '服务器错误，请稍后重试'
                    else {
                        errorMessage = this.normalizeApiErrorToString(data?.message ?? data?.error) || `请求失败 (${status})`
                    }
                } else if (error.request) {
                    errorMessage = '网络错误，请检查网络连接'
                } else if (error.message) {
                    errorMessage = error.message
                }
                const upstreamError = this.normalizeApiErrorToString(error.response?.data) || error.message || errorMessage
                if (/APIMart生图超时/i.test(upstreamError)) {
                    errorMessage = '生成图片失败，没有扣除积分，请稍后重试'
                }
                ElMessage.error({ message: errorMessage, offset: 200 })
            } finally {
                this.generating = false
            }
        },

        async compressDataUrlIfNeeded(dataUrl, maxBytes = 900 * 1024) {
            if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl
            try {
                const blob = await fetch(dataUrl).then(r => r.blob())
                if (blob.size <= maxBytes) return dataUrl
                return new Promise((resolve, reject) => {
                    const img = new Image()
                    img.onload = () => {
                        const canvas = document.createElement('canvas')
                        let w = img.width
                        let h = img.height
                        const maxDim = 1200
                        if (w > maxDim || h > maxDim) {
                            if (w >= h) {
                                h = Math.round((h * maxDim) / w)
                                w = maxDim
                            } else {
                                w = Math.round((w * maxDim) / h)
                                h = maxDim
                            }
                        }
                        canvas.width = w
                        canvas.height = h
                        const ctx = canvas.getContext('2d')
                        ctx.drawImage(img, 0, 0, w, h)
                        let quality = 0.82
                        const tryCanvas = () => {
                            canvas.toBlob(
                                (blob) => {
                                    if (blob.size <= maxBytes || quality <= 0.3) {
                                        const reader = new FileReader()
                                        reader.onload = () => resolve(reader.result)
                                        reader.onerror = reject
                                        reader.readAsDataURL(blob)
                                    } else {
                                        quality = Math.max(0.3, quality - 0.15)
                                        tryCanvas()
                                    }
                                },
                                'image/jpeg',
                                quality
                            )
                        }
                        tryCanvas()
                    }
                    img.onerror = () => resolve(dataUrl)
                    img.src = dataUrl
                })
            } catch (e) {
                console.warn('压缩插画失败，使用原图', e)
                return dataUrl
            }
        },

        async collectIllustration() {
            if (!this.generatedImageUrl) {
                ElMessage.warning({ message: '图片尚未生成，请稍候', offset: 200 })
                return
            }
            const token = localStorage.getItem('token') || ''
            if (!token) {
                ElMessage.error({ message: '请先登录', offset: 200 })
                return
            }
            this.collecting = true
            try {
                let pictureValue = this.generatedImageUrl
                if (pictureValue && !pictureValue.startsWith('http://') && !pictureValue.startsWith('https://') && !pictureValue.startsWith('data:')) {
                    pictureValue = `https://static.kidstory.cc/${pictureValue}`
                }
                const rawPrompt = (this.lastGeneratedPromptSnapshot || this.generatedPrompt || '').trim()
                const descMax = 10000
                const description = (rawPrompt || '从灵感库生成的插画').slice(0, descMax)
                let title = 'AI插画'
                if (rawPrompt) {
                    const trimmed = rawPrompt.replace(/\s+/g, ' ').trim()
                    if (trimmed) {
                        const maxLen = 8
                        title = trimmed.length > maxLen ? trimmed.slice(0, maxLen) + '…' : trimmed
                    }
                }
                // JSON + base64 整段易超过网关 1MB 限制，改为 multipart 上传，与 UploadIllustration 一致
                const form = new FormData()
                if (pictureValue && pictureValue.startsWith('data:')) {
                    // multipart 单图文件可接近 1MB；目标压在 1MB 内、尽量保画质，不再压到几百 KB
                    const underOneMb = 1000 * 1024
                    const targetBytes = 980 * 1024
                    let compact = await this.compressDataUrlIfNeeded(pictureValue, targetBytes)
                    let blob = await (await fetch(compact)).blob()
                    if (blob.size > underOneMb) {
                        compact = await this.compressDataUrlIfNeeded(compact, 900 * 1024)
                        blob = await (await fetch(compact)).blob()
                    }
                    form.append('picture', blob, 'illustration.jpg')
                } else {
                    form.append('picture', pictureValue)
                }
                form.append('title', title)
                form.append('description', description)
                form.append('type', 'others')

                const response = await this.$http.post('/ill/', form, {
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                })
                if (response.data && (response.data.desc === 'success' || response.data.code === 0 || response.data.code === '0')) {
                    ElMessage.success({ message: '收集插画成功，去我的创作中查看吧', offset: 200 })
                } else {
                    throw new Error(response.data?.message || '保存失败')
                }
            } catch (error) {
                console.error('收集插画失败:', error)
                const data = error.response?.data
                const inner = (typeof data?.message === 'object' && data?.message) ? data.message : null
                const reason = (inner && (inner.message || inner.Message)) || (typeof data?.message === 'string' ? data.message : '') || data?.error || error.message || '保存失败，请重试'
                let errorMessage = typeof reason === 'string' ? reason : String(reason)
                if (errorMessage === 'request entity too large' || inner?.limit || String(JSON.stringify(data || {})).includes('entity too large')) {
                    errorMessage = '内容超过大小限制。已用压缩后上传，若仍失败请先从本页「下载到本地」再到上传页提交'
                }
                ElMessage.error({ message: `收集插画失败: ${errorMessage}`, offset: 200 })
            } finally {
                this.collecting = false
            }
        },

        async downloadIllustration() {
            if (!this.generatedImageUrl) {
                ElMessage.warning({ message: '图片尚未生成，请稍候', offset: 200 })
                return
            }
            this.downloading = true
            try {
                const link = document.createElement('a')
                link.href = this.generatedImageUrl
                const timestamp = new Date().getTime()
                const mime = this.generatedImageUrl.match(/^data:([^;,]+)/)?.[1] || ''
                link.download = `illustration_${timestamp}.${originalImageExtension(mime, this.generatedImageUrl)}`
                if (this.generatedImageUrl.startsWith('http://') || this.generatedImageUrl.startsWith('https://')) {
                    try {
                        const response = await fetch(this.generatedImageUrl)
                        const blob = await response.blob()
                        link.download = `illustration_${timestamp}.${originalImageExtension(blob.type, this.generatedImageUrl)}`
                        const blobUrl = window.URL.createObjectURL(blob)
                        link.href = blobUrl
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100)
                        ElMessage.success({ message: '插画下载成功', offset: 200 })
                    } catch (fetchError) {
                        console.error('下载图片失败:', fetchError)
                        link.target = '_blank'
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                        ElMessage.info({ message: '已在新窗口打开图片，请右键保存', offset: 200 })
                    }
                } else {
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                    ElMessage.success({ message: '插画下载成功', offset: 200 })
                }
            } catch (error) {
                console.error('下载插画失败:', error)
                ElMessage.error({ message: '下载失败，请重试', offset: 200 })
            } finally {
                this.downloading = false
            }
        },

        openInpaintDialog() {
            if (this.generatedImageUrl) {
                this.$refs.inpaintDialogRef?.open({ imageUrl: this.generatedImageUrl })
            }
        },

        onInpaintSuccess({ imageUrl }) {
            if (!imageUrl) return
            this.generatedImageUrl = imageUrl
            this.imageLoadError = false
            this.imageLoading = true
            this.imageReloadKey++
            this.saveGeneratedImageToLocalStorage(imageUrl)
        },

        saveGeneratedImageToLocalStorage(imageUrl) {
            try {
                const imageData = {
                    url: imageUrl,
                    prompt: this.lastGeneratedPromptSnapshot || this.generatedPrompt || '',
                    artStyle: this.selectedStyle?.artStyle
                        || (this.selectedOaiItem ? this.selectedOaiItem.title : '')
                        || '',
                    timestamp: Date.now()
                }
                localStorage.setItem('home_generated_image', JSON.stringify(imageData))
            } catch (error) {
                console.error('保存插画到 localStorage 失败:', error)
                try {
                    localStorage.removeItem('home_generated_image')
                    localStorage.setItem('home_generated_image', JSON.stringify({
                        url: imageUrl,
                        prompt: this.lastGeneratedPromptSnapshot || this.generatedPrompt || '',
                        artStyle: this.selectedStyle?.artStyle
                            || (this.selectedOaiItem ? this.selectedOaiItem.title : '')
                            || '',
                        timestamp: Date.now()
                    }))
                } catch (e) {
                    console.error('清除旧数据后重新保存失败:', e)
                }
            }
        },

        restoreLatestGeneratedImage() {
            try {
                const saved = localStorage.getItem('home_generated_image')
                if (saved) {
                    const imageData = JSON.parse(saved)
                    if (imageData && imageData.url) {
                        this.generatedImageUrl = imageData.url
                        this.lastGeneratedPromptSnapshot = imageData.prompt
                            ? String(imageData.prompt)
                            : ''
                        this.imageLoading = true
                        this.imageLoadError = false
                    }
                }
            } catch (error) {
                console.error('恢复插画失败:', error)
            }
        },

        handleImageError() {
            this.imageLoadError = true
            this.imageLoading = false
            ElMessage.warning({
                message: this.$t('aiPicture.imageLoadFailed') || '图片加载失败，可能是网络问题或链接已过期',
                offset: 200
            })
        },
        handleImageLoad() {
            this.imageLoading = false
            this.imageLoadError = false
        },

        retryLoadImage() {
            if (!this.generatedImageUrl) return
            this.imageLoadError = false
            this.imageLoading = true
            this.imageReloadKey += 1
        },

        retryGenerate() {
            this.imageLoadError = false
            this.generatedImageUrl = null
            this.generateIllustration()
        },

        clearGeneratedImage() {
            try {
                localStorage.removeItem('home_generated_image')
                this.generatedImageUrl = null
                this.lastGeneratedPromptSnapshot = ''
                this.imageLoading = false
                this.imageLoadError = false
                ElMessage.success({ message: this.$t('aiPicture.cleared') || '已清除插画数据', offset: 200 })
            } catch (error) {
                ElMessage.error({ message: this.$t('aiPicture.clearFailed') || '清除失败，请重试', offset: 200 })
            }
        },

        isCharacterInput(input) {
            if (!input || typeof input !== 'string') return false
            const trimmed = input.trim()
            if (!trimmed) return false
            const text = trimmed.toLowerCase()
            const characterKeywords = [
                '人', '人物', '角色',
                '男孩', '女孩', '男人', '女人', '小孩', '儿童', '孩子', '小朋友',
                '小动物', '小精灵', '小公主', '王子', '魔法师', '骑士',
                '老人', '老年', '青年', '少年', '少女',
                'baby', 'child', 'children', 'boy', 'girl', 'man', 'woman', 'person', 'people', 'character',
                'kid', 'kids', 'adult', 'elderly', 'teenager', 'teen'
            ]
            return characterKeywords.some(k => text.includes(k))
        }
    }
}
</script>

<style scoped>
.ai-picture-page {
    min-height: calc(100vh - 50px);
    background: #ffffff;
    padding: 24px 16px 80px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
}

.page-main {
    max-width: 1480px;
    width: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    min-height: 0;
    flex: 1;
}

.workspace-layout {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 20px;
    width: 100%;
    min-height: min(70vh, 720px);
    max-height: calc(100vh - 120px);
}

.inspiration-column {
    flex: 0 0 520px;
    width: 520px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
    border: 1px solid #e6e8ec;
    border-radius: 20px;
    background: #fafbfc;
    padding: 14px 12px 12px;
    box-sizing: border-box;
    overflow: hidden;
}

.editor-column {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 0;
    align-self: stretch;
}

/* 输入框卡片 */
.prompt-card {
    flex-shrink: 0;
    background: #ffffff;
    border: 1px solid #e6e8ec;
    border-radius: 24px;
    padding: 18px 18px 12px;
    box-shadow: 0 6px 24px rgba(15, 23, 42, 0.04);
    transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.prompt-card.is-focused {
    border-color: #c9c4ff;
    box-shadow: 0 12px 32px rgba(99, 102, 241, 0.12);
}

.prompt-textarea {
    width: 100%;
    border: none;
    outline: none;
    resize: none;
    background: transparent;
    font-size: 15px;
    line-height: 1.6;
    color: #1f1f1f;
    font-family: inherit;
    padding: 0 4px;
    min-height: 144px;
}

.prompt-textarea::placeholder {
    color: #b5b8be;
}

.xiaohei-plan-card {
    margin: 10px 4px 4px;
    padding: 10px 12px;
    border-radius: 10px;
    background: #f7f5fb;
    border: 1px solid #e8e0f4;
    font-size: 12px;
    line-height: 1.55;
    color: #444;
}

.xiaohei-plan-card p {
    margin: 0 0 4px;
}

.xiaohei-plan-card p:last-child {
    margin-bottom: 0;
}

.xiaohei-plan-card span {
    color: #8167a9;
    font-weight: 600;
}

.xiaohei-plan-title {
    font-weight: 600;
    color: #333 !important;
    margin-bottom: 6px !important;
}

.selected-style-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
    padding: 8px 10px;
    background: linear-gradient(135deg, rgba(129, 103, 169, 0.08) 0%, rgba(99, 102, 241, 0.06) 100%);
    border: 1px solid rgba(129, 103, 169, 0.2);
    border-radius: 14px;
}

.selected-style-main {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.selected-style-thumb {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    object-fit: cover;
    flex-shrink: 0;
    border: 1px solid rgba(0, 0, 0, 0.06);
}

.selected-style-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.selected-style-eyebrow {
    font-size: 11px;
    color: #8167a9;
    font-weight: 500;
    letter-spacing: 0.3px;
}

.selected-style-name {
    font-size: 14px;
    color: #1f1f1f;
    font-weight: 500;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.selected-style-clear {
    flex-shrink: 0;
    border: none;
    background: #fff;
    color: #5f6368;
    font-size: 12px;
    padding: 6px 10px;
    border-radius: 10px;
    cursor: pointer;
    border: 1px solid #e4e7ed;
}

.selected-style-clear:hover {
    color: #8167a9;
    border-color: #c9c4ff;
}

.caret-flip {
    transform: rotate(180deg);
}

/* 工具栏 */
.prompt-toolbar {
    margin-top: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.toolbar-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    min-width: 0;
}

.toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.tool-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 10px;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: #5f6368;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
}

.tool-btn:hover {
    background: #f3f4f6;
    color: #1f1f1f;
}

.tool-btn.icon-only {
    width: 32px;
    padding: 0;
    justify-content: center;
}

.tool-btn.pill {
    background: #f5f6f8;
    border-radius: 999px;
    padding: 0 12px;
}

.tool-btn.pill:hover {
    background: #ebedf0;
}

.tool-btn.pill.active {
    background: #ebedf0;
}

.clear-prompt-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.caret {
    opacity: 0.7;
    margin-left: 2px;
    flex-shrink: 0;
}

.toolbar-dropdown-label {
    max-width: 112px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.menu-model {
    min-width: 260px;
}

.menu-quality {
    min-width: 200px;
}

.hidden-file-input {
    display: none;
}

.advanced-panel {
    margin-top: 10px;
    padding-top: 12px;
    border-top: 1px solid #eef0f3;
}

.advanced-panel-inner {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 12px 20px;
}

.advanced-field-label {
    display: block;
    font-size: 11px;
    color: #9aa0a6;
    margin-bottom: 4px;
    letter-spacing: 0.2px;
}

.advanced-panel .size-select-wrap {
    min-width: 0;
}

/* 尺寸下拉 */
.size-select-wrap {
    position: relative;
}

/* 下拉面版：向下展开，避免与固定 TopBar(z-index:10000) 重叠；置于顶栏之上 */
.size-menu {
    position: absolute;
    top: calc(100% + 6px);
    bottom: auto;
    left: 0;
    right: auto;
    background: #fff;
    border: 1px solid #ececf0;
    border-radius: 14px;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
    padding: 6px;
    min-width: 220px;
    max-height: min(60vh, 400px);
    overflow-y: auto;
    z-index: 10020;
}

.size-menu-group-label {
    padding: 6px 10px 2px;
    font-size: 11px;
    color: #9aa0a6;
    letter-spacing: 0.4px;
    text-transform: uppercase;
}

.size-menu-divider {
    height: 1px;
    background: #f1f2f5;
    margin: 4px 6px;
}

.size-menu-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: none;
    background: transparent;
    border-radius: 10px;
    cursor: pointer;
    color: #1f1f1f;
    font-size: 13px;
    text-align: left;
    transition: background 0.15s ease;
}

.size-menu-item:hover {
    background: #f5f6f8;
}

.size-menu-item.active {
    background: rgba(99, 102, 241, 0.08);
    color: #5b5bd6;
}

.size-icon-stage {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    flex-shrink: 0;
}

.size-icon {
    box-sizing: border-box;
    display: inline-block;
    border: 1.5px solid currentColor;
    border-radius: 3px;
    flex-shrink: 0;
    opacity: 0.85;
}

.size-label {
    flex: 1;
    font-weight: 500;
}

.size-dim {
    font-size: 11px;
    color: #9aa0a6;
}

/* 参考图缩略（可多张） */
.ref-thumbs-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    padding: 6px;
    max-width: 100%;
}

.ref-thumb-wrap {
    position: relative;
    width: 64px;
    height: 64px;
    border-radius: 10px;
    overflow: visible;
    flex-shrink: 0;
}

.ref-thumb-preview {
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: none;
    border-radius: 10px;
    background: #f5f6f8;
    cursor: zoom-in;
}

.ref-thumb-preview:hover,
.ref-thumb-preview:focus-visible {
    outline: 2px solid #8167a9;
    outline-offset: 2px;
}

.ref-thumb {
    display: block;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 10px;
    border: 1px solid #e6e8ec;
}

.ref-thumb-badge {
    position: absolute;
    left: 0;
    right: 0;
    bottom: -2px;
    font-size: 9px;
    line-height: 1.1;
    text-align: center;
    color: #fff;
    background: rgba(129, 103, 169, 0.92);
    border-radius: 0 0 6px 6px;
    padding: 1px 0;
    pointer-events: none;
}

.handraw-ref-toggle {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 10px;
    font-size: 12px;
    color: #4a4f57;
    cursor: pointer;
    max-width: 320px;
}

.handraw-ref-toggle input {
    margin-top: 2px;
    flex-shrink: 0;
}

.advanced-field-row {
    width: 100%;
}

.ref-thumb-clear {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #1f1f1f;
    color: #fff;
    border: 2px solid #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
}

/* 发送按钮 */
.send-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: #1f1f1f;
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.18);
}

.send-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    background: #111;
}

.send-btn:disabled {
    background: #d8dade;
    color: #fff;
    cursor: not-allowed;
    box-shadow: none;
}

.send-btn.is-loading {
    background: #5b5bd6;
}

.send-btn-icon {
    font-size: 20px;
    line-height: 1;
    display: block;
}

.send-spinner {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.45);
    border-top-color: #fff;
    animation: ai-spin 0.8s linear infinite;
}

@keyframes ai-spin {
    to { transform: rotate(360deg); }
}

.style-tab-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 0 0 2px;
    padding-bottom: 2px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
}

.style-tab-row::-webkit-scrollbar {
    display: none;
}

.style-tab {
    border: 1px solid #e6e8ec;
    background: #fff;
    color: #5f6368;
    font-size: 12px;
    padding: 5px 11px;
    border-radius: 999px;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.style-tab:hover {
    border-color: #c9c4ff;
    color: #4a4f57;
}

.style-tab.active {
    background: linear-gradient(135deg, rgba(129, 103, 169, 0.18) 0%, rgba(99, 102, 241, 0.12) 100%);
    border-color: #8167a9;
    color: #3d3550;
    font-weight: 500;
}

.style-empty-state {
    grid-column: 1 / -1;
    padding: 24px 12px;
    text-align: center;
    color: #737784;
    font-size: 13px;
}



.style-tab--compact {
    min-width: 2rem;
    padding: 4px 10px;
    font-weight: 600;
    letter-spacing: 0.02em;
}

.style-item-fallback,
.selected-style-thumb--empty {
    background: linear-gradient(145deg, #eceef2 0%, #e0e3ea 100%);
    display: flex;
    align-items: center;
    justify-content: center;
}

.style-item-fallback::after,
.selected-style-thumb--empty::after {
    content: 'GPT';
    font-size: 10px;
    font-weight: 700;
    color: #9aa0a6;
    letter-spacing: 0.5px;
}

.selected-style-thumb--empty {
    min-width: 40px;
}

/* 浏览灵感 */
.inspiration-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
    flex: 1;
}

.inspiration-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.inspiration-title {
    font-size: 15px;
    font-weight: 600;
    color: #1f1f1f;
    margin: 0;
}

.inspiration-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.style-search {
    display: flex;
    gap: 8px;
    align-items: center;
}

.style-search input {
    min-width: 0;
    flex: 1;
    width: 100%;
    min-height: 44px;
    border: 1px solid #d8dce3;
    border-radius: 12px;
    padding: 10px 12px;
    background: #fff;
    color: #1f1f1f;
    font: inherit;
}

.style-search input:focus-visible {
    outline: 2px solid #8262b1;
    outline-offset: 2px;
}

.style-search-status {
    margin: 0;
    font-size: 13px;
    color: #5f6368;
}

.link-btn {
    border: none;
    background: transparent;
    color: #5f6368;
    font-size: 13px;
    cursor: pointer;
    padding: 0 6px;
    height: 28px;
}

.link-btn:hover {
    color: #1f1f1f;
}

.arrow-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1px solid #e6e8ec;
    background: #fff;
    color: #5f6368;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.arrow-btn:hover:not(:disabled) {
    background: #f5f6f8;
    color: #1f1f1f;
}

.arrow-btn:disabled {
    color: #c9ccd2;
    cursor: not-allowed;
}

/* 风格列表（纵向滚轴） */
.style-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px 8px;
    align-content: start;
    padding: 4px 2px 8px 0;
    scroll-behavior: smooth;
    scrollbar-width: thin;
    scrollbar-gutter: stable;
}

.style-list::-webkit-scrollbar {
    width: 6px;
}

.style-list::-webkit-scrollbar-track {
    background: transparent;
}

.style-list::-webkit-scrollbar-thumb {
    background: #e1e3e8;
    border-radius: 3px;
}

.style-list::-webkit-scrollbar-thumb:hover {
    background: #c9ccd2;
}

.style-list-item {
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    padding: 6px 4px 8px;
    border-radius: 12px;
    border: 1px solid #ececf0;
    background: #fff;
    cursor: pointer;
    text-align: center;
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.style-list-item:hover {
    border-color: #d6d9df;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
    transform: translateY(-1px);
}

.style-list-item.selected {
    border-color: #5b5bd6;
    box-shadow: 0 0 0 2px rgba(91, 91, 214, 0.35);
    background: #f7f7ff;
}

.style-list-item-thumb {
    width: 100%;
    aspect-ratio: 1;
    min-height: 0;
    border-radius: 12px;
    overflow: hidden;
    flex-shrink: 0;
    position: relative;
    background: #f0f1f3;
    border: 1px solid rgba(0, 0, 0, 0.04);
    display: flex;
    align-items: center;
    justify-content: center;
}

.style-list-item-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.style-list-item-text {
    font-size: 11px;
    line-height: 1.4;
    color: #1f1f1f;
    font-weight: 500;
    min-width: 0;
    width: 100%;
    text-align: center;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

/* 悬停放大预览（挂到 body，避免在滚动层被裁切） */
.style-image-preview-floater {
    position: fixed;
    z-index: 10050;
    pointer-events: auto;
    line-height: 0;
    background: #fff;
    border: 1px solid #e6e8ec;
    border-radius: 12px;
    box-shadow: 0 12px 40px rgba(15, 23, 42, 0.2);
    overflow: hidden;
}

.style-image-preview-img {
    display: block;
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}

/* 结果区：撑满右侧剩余高度，底部与左侧风格容器对齐 */
.result-section {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
}

.result-skeleton {
    position: relative;
    flex: 1;
    width: 100%;
    min-height: 0;
    border-radius: 14px;
    overflow: hidden;
    background: linear-gradient(135deg, #f3f4f8 0%, #eceef4 100%);
    display: flex;
    align-items: center;
    justify-content: center;
}

.result-placeholder {
    position: relative;
    flex: 1;
    width: 100%;
    min-height: 0;
    border-radius: 14px;
    border: 1.5px dashed #d7dbe3;
    background: linear-gradient(180deg, #fafbfc 0%, #f3f5f8 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 24px 16px;
    box-sizing: border-box;
    text-align: center;
    color: #8b93a7;
}

.result-placeholder-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 72px;
    height: 72px;
    border-radius: 18px;
    background: #fff;
    border: 1px solid #e8ebf0;
    color: #a0a8b8;
    margin-bottom: 4px;
}

.result-placeholder-title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: #5f6678;
}

.result-placeholder-hint {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: #9aa3b5;
    max-width: 320px;
}

.result-placeholder-steps {
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 280px;
    text-align: left;
    counter-reset: step;
}

.result-placeholder-steps li {
    position: relative;
    padding-left: 22px;
    font-size: 12px;
    line-height: 1.45;
    color: #8b93a7;
}

.result-placeholder-steps li::before {
    content: counter(step);
    counter-increment: step;
    position: absolute;
    left: 0;
    top: 0;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #eef0f4;
    color: #6b7280;
    font-size: 10px;
    font-weight: 600;
    line-height: 16px;
    text-align: center;
}

.result-placeholder--error {
    border-style: solid;
    border-color: #f0d4d8;
    background: linear-gradient(180deg, #fffbfb 0%, #f8f2f3 100%);
    color: #9a6b73;
}

.result-placeholder--error .result-placeholder-icon {
    color: #c0394a;
    border-color: #f0d4d8;
}

.result-placeholder--error .result-actions {
    margin-top: 8px;
}

.result-card--empty {
    background: #fcfcfd;
}

.result-card--error {
    background: #fcfcfd;
}

.result-skeleton-shimmer {
    position: absolute;
    inset: 0;
    background: linear-gradient(
        100deg,
        rgba(255, 255, 255, 0) 30%,
        rgba(255, 255, 255, 0.55) 50%,
        rgba(255, 255, 255, 0) 70%
    );
    background-size: 200% 100%;
    animation: ai-shimmer 1.4s ease-in-out infinite;
}

@keyframes ai-shimmer {
    0% {
        background-position: 150% 0;
    }
    100% {
        background-position: -150% 0;
    }
}

.result-loading {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: #6b7280;
}

.result-spinner {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid rgba(91, 91, 214, 0.18);
    border-top-color: #5b5bd6;
    animation: ai-spin 0.8s linear infinite;
}

.result-card {
    flex: 1;
    min-height: 0;
    width: 100%;
    background: #fff;
    border: 1px solid #ececf0;
    border-radius: 20px;
    padding: 16px;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
    display: flex;
    flex-direction: column;
    gap: 14px;
    box-sizing: border-box;
}

.result-image {
    display: block;
    flex: 1;
    min-height: 0;
    width: 100%;
    object-fit: contain;
    border-radius: 14px;
    background: #f5f6f8;
}

.result-actions {
    flex-shrink: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
}

.result-actions--compact {
    gap: 8px;
}

.result-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 16px;
    border-radius: 999px;
    border: 1px solid #e6e8ec;
    background: #fff;
    color: #1f1f1f;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.result-btn.icon-only {
    width: 36px;
    padding: 0;
    justify-content: center;
}

.result-btn:hover:not(:disabled) {
    transform: translateY(-1px);
}

.result-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.result-btn.primary {
    background: #1f1f1f;
    color: #fff;
    border-color: #1f1f1f;
}

.result-btn.primary:hover:not(:disabled) {
    background: #111;
}

.result-btn.ghost.danger {
    color: #c0394a;
    border-color: rgba(192, 57, 74, 0.3);
}

.result-btn.ghost.danger:hover:not(:disabled) {
    background: rgba(192, 57, 74, 0.08);
}

/* 中等宽度：略收窄灵感栏，仍尽量保持三列 */
@media (max-width: 1200px) {
    .inspiration-column {
        flex: 0 0 420px;
        width: 420px;
    }
}

@media (max-width: 1024px) {
    .inspiration-column {
        flex: 0 0 340px;
        width: 340px;
    }

    .style-list {
        grid-template-columns: repeat(2, 1fr);
    }
}

/* 移动端适配（断点与全站手机端 768 对齐） */
@media (max-width: 768px) {
    .ai-picture-page {
        min-height: 0;
        height: auto;
        padding: 12px 12px 60px;
    }

    .page-main {
        flex: none;
        height: auto;
    }

    .prompt-card {
        padding: 14px 14px 10px;
        border-radius: 20px;
    }

    .prompt-textarea {
        font-size: 14px;
    }

    .tool-btn.pill {
        height: 30px;
        padding: 0 10px;
        font-size: 12px;
    }

    .tool-btn.pill > span:not(.size-icon-stage) {
        display: inline;
    }

    .workspace-layout {
        flex-direction: column;
        max-height: none;
        min-height: 0;
        gap: 16px;
    }

    .editor-column {
        order: 1;
        flex: none;
        min-height: 0;
    }

    .inspiration-column {
        order: 2;
        flex: 0 0 auto;
        width: 100%;
        max-width: 100%;
        max-height: none;
        overflow: visible;
    }

    .result-section {
        flex: none;
    }

    .result-card {
        flex: none;
    }

    /* 风格图改为一行横向滑动展示全部 */
    .style-list {
        display: flex;
        flex-wrap: nowrap;
        grid-template-columns: none;
        gap: 8px;
        max-height: none;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 4px 0 10px;
        scroll-snap-type: x proximity;
        -webkit-overflow-scrolling: touch;
    }

    .style-list-item {
        flex: 0 0 88px;
        width: 88px;
        scroll-snap-align: start;
    }

    .result-image {
        flex: none;
        max-height: 50vh;
    }

    .result-skeleton,
    .result-placeholder {
        flex: none;
        min-height: 220px;
        aspect-ratio: 4 / 3;
    }
}

@media (max-width: 380px) {
    .toolbar-left {
        gap: 6px;
    }

    .size-toolbar-text {
        max-width: 72px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

}
</style>
