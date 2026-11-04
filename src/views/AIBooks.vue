<template>
    <div class="inspiration-book">
        <!-- 主内容区域 -->
        <main class="inspiration-main">
            <!-- 左侧：提示词 -->
            <div class="prompt-container">
                <el-scrollbar class="scrollbar-container">
                    <h2 class="section-title">{{ $t('aibooks.title') }}</h2>
                    
                    <el-form :model="form" class="book-form">
                        <el-form-item :label="$t('aibooks.prompt')">
                            <el-input
                                v-model="form.prompt"
                                :disabled="generating || generatingImages"
                                type="textarea"
                                :autosize="promptExpanded ? { minRows: 10, maxRows: 24 } : { minRows: 3, maxRows: 4 }"
                                resize="vertical"
                                :placeholder="$t('aibooks.promptPlaceholder')"
                                class="prompt-input">
                            </el-input>
                            <button type="button" class="prompt-expand-toggle" :aria-expanded="promptExpanded" @click="promptExpanded = !promptExpanded">
                                {{ promptExpanded ? ($i18n.locale === 'en' ? 'Collapse prompt' : '收起提示词') : ($i18n.locale === 'en' ? 'Expand prompt' : '展开完整提示词') }}
                            </button>
                        </el-form-item>

                        <el-form-item :label="$i18n.locale === 'en' ? 'Story pages' : '正文页数'">
                            <el-input-number v-model="form.targetPages" :min="6" :max="12" :precision="0" :disabled="generating || generatingImages" />
                            <p>{{ $i18n.locale === 'en' ? 'Cover excluded. Creation includes an additional review request.' : '不含封面。创作后会额外请求一次故事审稿。' }}</p>
                        </el-form-item>
                        <el-form-item :label="$t('aibooks.style')">
                            <div class="style-picker-grid">
                                <button
                                    v-for="style in styles"
                                    :key="style.key"
                                    type="button"
                                    :disabled="generating || generatingImages"
                                    class="style-picker-item"
                                    :class="{ selected: form.artStyle === style.key }"
                                    :title="style.artStyle"
                                    @click="handleStyleChange(style.key, true)"
                                >
                                    <div class="style-picker-thumb">
                                        <img
                                            v-if="style.image"
                                            v-lazy-image="style.image"
                                            :alt="style.artStyle"
                                            class="style-picker-img"
                                            decoding="async"
                                        />
                                        <div v-else class="style-picker-fallback" aria-hidden="true" />
                                    </div>
                                    <span class="style-picker-label">{{ style.artStyle }}</span>
                                </button>
                            </div>
                        </el-form-item>
                        <el-form-item v-if="selectedHandrawStyle">
                            <el-checkbox v-model="handrawStyleReferenceAuto" :disabled="generatingImages" @change="onStyleReferenceChange">
                                {{ $t('aiPicture.handrawStyleReferenceAuto') }}
                            </el-checkbox>
                            <p class="style-reference-hint">{{ $t('aibooks.styleReferenceHint') }}</p>
                        </el-form-item>

                   

                        <el-form-item>
                            <div class="generate-btn-wrapper">
                            <el-button
                                type="primary"
                                @click="generateBook"
                                :loading="generating"
                                :disabled="!form.prompt || !form.prompt.trim() || generating || generatingImages"
                                class="generate-btn">
                                {{ generating ? $t('aibooks.generating') : $t('aibooks.generate') }}
                            </el-button>
                                <div class="points-hint">{{ $t('aibooks.pointsHint') }}</div>
                            </div>
                        </el-form-item>
                    </el-form>

                    <el-alert v-if="storyDraft && !generating" type="warning" :closable="false" :title="$i18n.locale === 'en' ? 'Draft saved; review pending' : '草稿已保留，尚未完成审稿'">
                        <el-button :disabled="generatingImages" @click="retryStoryReview">{{ $i18n.locale === 'en' ? 'Retry review' : '重新审稿' }}</el-button>
                    </el-alert>
                    <el-alert v-if="storyData && storyData.review" type="success" :closable="false" :title="$i18n.locale === 'en' ? 'Story review completed' : '故事审稿完成'">
                        <p v-for="(change, index) in storyData.review.changes" :key="index">{{ change }}</p>
                        <p v-if="!storyData.review.changes.length">{{ $i18n.locale === 'en' ? 'No changes suggested.' : '审稿未提出修改。' }}</p>
                    </el-alert>
                    <!-- 生成进度 -->
                    <div v-if="generating || generatingImages || (bookData && progressStatus)" class="progress-info">
                        <el-progress
                            :percentage="progressPercentage"
                            :status="progressStatus"
                            :stroke-width="12">
                        </el-progress>
                        <p class="progress-text">{{ progressText }}</p>
                    </div>

                    <div v-if="!generating && imagePrompts && imagePrompts.length && storyData?.title" class="story-result-title">
                        <span class="story-result-icon" aria-hidden="true">✦</span>
                        <strong>{{ storyData.title }}</strong>
                    </div>
                    <!-- 角色设定卡 -->
                    <div v-if="!generating && imagePrompts && imagePrompts.length > 0" class="character-card-editor">
                        <h3 class="prompts-title">{{ $t('aibooks.characterCard') }}</h3>
                        <p class="character-card-hint">{{ $t('aibooks.characterCardHint') }}</p>
                        <div v-if="displayCharacterProfiles.length" class="character-profile-list">
                            <details v-for="(profile, index) in displayCharacterProfiles" :key="index" class="character-profile">
                                <summary class="character-profile-summary">
                                    <span class="character-avatar" :class="{ supporting: index > 0 }" aria-hidden="true">{{ profile.name.slice(0, 1) }}</span>
                                    <span class="character-profile-content">
                                        <strong>{{ profile.name }}</strong>
                                        <span class="character-profile-preview">{{ characterTraits(profile).slice(0, 3).join(' · ') }}</span>
                                    </span>
                                    <span class="character-profile-toggle" aria-hidden="true">⌄</span>
                                </summary>
                                <div class="character-tags">
                                    <span v-for="(trait, traitIndex) in characterTraits(profile)" :key="traitIndex" class="character-tag">{{ trait }}</span>
                                </div>
                            </details>
                        </div>
                        <details class="character-edit-details" :open="!displayCharacterProfiles.length">
                            <summary>{{ $i18n.locale === 'en' ? 'Edit character descriptions' : '编辑角色设定' }}</summary>
                        <el-input
                            v-model="characterCard"
                            type="textarea"
                            :rows="6"
                            :placeholder="$t('aibooks.characterCardPlaceholder')"
                            class="character-card-textarea"
                        />
                        </details>
                        <p class="character-ref-section-title">{{ $t('aibooks.characterRefOptional') }}</p>
                        <p class="character-ref-section-hint">{{ $t('aibooks.protagonistRefHint') }}</p>
                        <div
                            v-for="slot in [1, 2]"
                            :key="slot"
                            class="character-ref-row character-my-picker"
                        >
                            <span class="character-ref-label">{{ protagonistSlotLabel(slot) }}</span>
                            <el-select
                                v-model="protagonistRefs[slot].characterId"
                                clearable
                                filterable
                                size="small"
                                class="character-select"
                                :placeholder="$t('aibooks.protagonistPickPlaceholder')"
                                :loading="loadingMyCharacters"
                                @change="(id) => onProtagonistChange(slot, id)"
                            >
                                <el-option
                                    v-for="c in myCharacters"
                                    :key="c.id || c._id"
                                    :label="c.character_name || $t('characterStudio.unnamed')"
                                    :value="String(c.id || c._id)"
                                    :disabled="isCharacterDisabledForSlot(c, slot)"
                                />
                            </el-select>
                        </div>
                        <div v-if="hasProtagonistReference()" class="character-ref-previews">
                            <div
                                v-for="slot in [1, 2]"
                                :key="'preview-' + slot"
                                v-show="protagonistRefs[slot].preview"
                                class="character-ref-preview-item"
                            >
                                <div class="character-ref-preview">
                                    <img
                                        :src="protagonistRefs[slot].preview"
                                        :alt="protagonistSlotLabel(slot)"
                                    />
                                </div>
                                <span class="character-ref-preview-caption">{{ protagonistSlotLabel(slot) }}</span>
                            </div>
                        </div>
                        <p class="consistency-hint">{{ $t('aibooks.consistencyHint') }}</p>
                    </div>

                    <!-- 图片生成提示词编辑区域 -->
                    <div v-if="!generating && imagePrompts && imagePrompts.length > 0" class="prompts-editor">
                        <h3 class="prompts-title">{{ $t('aibooks.editPrompts') }}</h3>
                        <p class="prompts-hint">{{ $t('aibooks.editPromptsHint') }}</p>
                        <div class="prompts-list">
                            <div
                                v-for="(prompt, index) in imagePrompts"
                                :key="promptSceneIndexes[index] ?? index"
                                class="prompt-item">
                                <div class="prompt-item-header">
                                    <div class="prompt-label">
                                        {{ $t('aibooks.page', { page: (promptSceneIndexes[index] ?? index) + 1 }) }}
                                        <span
                                            v-if="hasPageImage(promptSceneIndexes[index] ?? index)"
                                            class="prompt-status ok"
                                        >{{ $t('aibooks.promptHasImage') }}</span>
                                        <span
                                            v-else-if="bookData"
                                            class="prompt-status pending"
                                        >{{ $t('aibooks.promptNeedRegen') }}</span>
                                    </div>
                                    <el-button
                                        type="danger"
                                        link
                                        size="small"
                                        :disabled="generatingImages || imagePrompts.length <= 1"
                                        @click="removeImagePrompt(index)"
                                    >{{ $t('aibooks.deletePrompt') }}</el-button>
                                </div>
                                <div v-if="storyData?.scenes?.[promptSceneIndexes[index] ?? index]" class="scene-narration">
                                    <span class="scene-field-label">{{ $i18n.locale === 'en' ? 'Narration' : '画面旁白' }}</span>
                                    {{ storyData.scenes[promptSceneIndexes[index] ?? index] }}
                                </div>
                                <label class="scene-field-label" :for="'scene-prompt-' + (promptSceneIndexes[index] ?? index)">{{ $i18n.locale === 'en' ? 'Scene description' : '画面描述' }}</label>
                                <el-input
                                    :id="'scene-prompt-' + (promptSceneIndexes[index] ?? index)"
                                    v-model="imagePrompts[index]"
                                    type="textarea"
                                    :autosize="{ minRows: 3, maxRows: 18 }"
                                    resize="vertical"
                                    :disabled="generatingImages"
                                    :placeholder="$t('aibooks.page', { page: (promptSceneIndexes[index] ?? index) + 1 }) + ' ' + $t('aibooks.promptPlaceholder')"
                                    class="prompt-textarea">
                                </el-input>
                            </div>
                        </div>
                        <el-button
                            type="primary"
                            @click="generateImagesFromPrompts"
                            :loading="generatingImages"
                            :disabled="generatingImages || !pendingGenerateJobs.length"
                            class="generate-images-btn">
                            {{ generateImagesButtonLabel }}
                        </el-button>
                    </div>
                </el-scrollbar>
            </div>

            <!-- 右侧：生成绘本 -->
            <div class="generated-book">
                <el-scrollbar class="scrollbar-container">
                    <div v-if="!bookData && !generating" class="empty-state">
                        <el-empty :image-size="80" :description="$t('aibooks.step1')">
                            <template #image>
                                <el-icon :size="80"><Edit /></el-icon>
                            </template>
                        </el-empty>
                        <el-empty :image-size="80" :description="$t('aibooks.step2')">
                            <template #image>
                                <el-icon :size="80"><DocumentCopy /></el-icon>
                            </template>
                        </el-empty>
                        <el-empty :image-size="80" :description="$t('aibooks.step3')">
                            <template #image>
                                <el-icon :size="80"><Reading /></el-icon>
                            </template>
                        </el-empty>
                    </div>

                    <div v-if="bookData" class="book-content">
                        <!-- 书名和总结 -->
                        <div class="book-header">
                            <div class="book-header-content">
                                <h1 class="book-title">{{ bookData.title }}</h1>
                                <p class="book-summary">{{ bookData.summary }}</p>
                            </div>
                            <el-button
                                v-if="bookData"
                                type="primary"
                                @click="downloadAllImages"
                                :loading="downloading"
                                :disabled="!bookPreviewImages.length || downloading"
                                class="download-btn">
                                <el-icon><Download /></el-icon>
                                {{ $t('aibooks.downloadAll') }}
                            </el-button>
                        </div>

                        <!-- 故事内容 -->
                        <div class="story-pages">
                            <el-card
                                v-for="(scene, index) in bookData.scenes"
                                :key="index"
                                class="story-page-card"
                                shadow="hover">
                                <div class="card-image">
                                    <el-image lazy loading="lazy" decoding="async"
                                        v-if="getPageImageUrl(index)"
                                        :src="getPageImageUrl(index)"
                                        fit="cover"
                                        class="story-image"
                                        :preview-src-list="bookPreviewImages"
                                        :initial-index="getPreviewInitialIndex(index)"
                                        preview-teleported>
                                        <template #error>
                                            <div class="image-slot">
                                                <i class="el-icon-picture-outline"></i>
                                            </div>
                                        </template>
                                        <template #placeholder>
                                            <div class="image-loading">
                                                <i class="el-icon-loading"></i>
                                                <p>{{ $t('aibooks.loading') }}</p>
                                            </div>
                                        </template>
                                    </el-image>
                                    <div v-else class="image-placeholder">
                                        <i class="el-icon-picture-outline"></i>
                                        <p>{{ pageGeneration[index] === 'queued' ? $t('aibooks.imageQueued') : pageGeneration[index] === 'generating' ? $t('aibooks.imageGenerating') : bookData.imageErrors?.[index] ? $t('aibooks.imageFailed') : $t('aibooks.imageMissing') }}</p>
                                        <p v-if="bookData.imageErrors?.[index]" class="page-generation-error" role="status">{{ bookData.imageErrors[index] }}</p>
                                        <el-button v-if="pageGeneration[index] !== 'queued' && pageGeneration[index] !== 'generating'" type="primary" :disabled="generatingImages || generating" @click="regeneratePage(index)">
                                            {{ $t('aibooks.regeneratePage') }}
                                        </el-button>
                                    </div>
                                    <div
                                        v-if="pageVersionList(index).length > 1"
                                        class="page-version-strip"
                                    >
                                        <button
                                            v-for="(ver, vi) in pageVersionList(index)"
                                            :key="vi"
                                            type="button"
                                            class="page-version-btn"
                                            :class="{ active: vi === pageCurrentVersionIndex(index) }"
                                            :title="ver.source === 'inpaint' ? $t('aibooks.versionInpaint') : $t('aibooks.versionGenerate')"
                                            @click="switchPageVersion(index, vi)"
                                        >V{{ vi + 1 }}</button>
                                    </div>
                                </div>
                                <div class="card-content">
                                    <h3 class="card-title">{{ bookData.title }} - 第 {{ index + 1 }} 页</h3>
                                    <p class="scene-text">{{ scene }}</p>
                                    <p v-if="getPageImageUrl(index) && bookData.imageErrors?.[index]" class="page-generation-error" role="status">{{ bookData.imageErrors[index] }}</p>
                                    <div class="card-actions">
                                        <el-button v-if="getPageImageUrl(index) && bookData.imageErrors?.[index]" type="primary" size="small" :disabled="generatingImages || generating" @click="regeneratePage(index)">{{ $t('aibooks.regeneratePage') }}</el-button>
                                        <el-button
                                            v-if="getPageImageUrl(index)"
                                            size="small"
                                            @click="openInpaintDialog(index)">
                                            {{ $t('aibooks.aiEdit') }}
                                        </el-button>
                                        <el-button
                                            v-if="getPageImageUrl(index)"
                                            type="primary"
                                            size="small"
                                            :loading="!!collectingImageUrls[getPageImageUrl(index)]"
                                            :disabled="isIllustrationCollected(getPageImageUrl(index))"
                                            @click="collectIllustration(getPageImageUrl(index), index)">
                                            {{ $t(isIllustrationCollected(getPageImageUrl(index)) ? 'aibooks.collectedIllustration' : collectingImageUrls[getPageImageUrl(index)] ? 'aibooks.collectingIllustration' : 'aibooks.collectIllustration') }}
                                        </el-button>
                                    </div>
                                </div>
                            </el-card>
                        </div>
                    </div>
                </el-scrollbar>
            </div>
        </main>

        <AibooksInpaintDialog
            ref="inpaintDialogRef"
            :api-base-url="apiBaseUrl"
            @success="onInpaintSuccess"
        />
    </div>
</template>

<script>
import { ElMessage } from 'element-plus'
import { getCurrentInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import { trackAnalytics } from '@/utils/googleAnalytics'
import { Download, Edit, DocumentCopy, Reading } from '@element-plus/icons-vue'
import {
    postCreateCharacter,
    isCreateCharacterResponseOk,
    resolveGenerationImageUrl
} from '@/utils/createCharacterTask'
import { createImageWithText as composeImageWithCaption, loadImageBlob } from '@/utils/canvasImageCompose'
import { useIllustrationStyles } from '@/composables/useIllustrationStyles'
import { replaceBookStyle, runBookImageQueue } from '@/utils/aibooksGeneration'
import { isHandrawLibraryStyle } from '@/utils/handrawStyleGroups'
import { appendHandrawReferenceIsolation, readHandrawStyleReferenceAutoPreference, writeHandrawStyleReferenceAutoPreference } from '@/utils/handrawStyleReference'
import {
    appendStorySchemaGuide,
    extractCharacterProfiles,
    formatCharacterCard,
    parseCharacterCardText,
    buildPageImagePrompt,
    buildPageCharacterCard,
    scenesDetailToImagePrompts,
    getStyleInfoText,
    buildStoryGuide,
    buildStoryReviewPrompt,
    validateStory,
} from '@/utils/aibooksPrompts'
import {
    getPageDisplayUrl,
    getPageVersions,
    getPageCurrentVersionIndex,
    setPageCurrentVersion,
    pushPageVersion,
    initPageVersionsFromImages,
    syncImagesFromCurrentVersions,
} from '@/utils/aibooksPageVersions'
import { getImageUrl } from '@/utils/characterStudioPrompt'
import AibooksInpaintDialog from '@/components/aibooks/AibooksInpaintDialog.vue'
import { getAiDraftStorageKey, loadLocalAiDraft } from '@/utils/bookLibrary'
import {
    handleInsufficientPointsError,
    extractApiErrorMessage,
    markInsufficientPointsError,
} from '@/utils/insufficientPoints'


export default {
    name: 'AIBooks',
    components: {
        Edit,
        DocumentCopy,
        Reading,
        Download,
        AibooksInpaintDialog,
    },
    setup() {
        const { proxy } = getCurrentInstance()
        const { locale } = useI18n()
        const { styles } = useIllustrationStyles()

        return {
            $http: proxy?.$http || axios,
            styles,
            locale
        }
    },
    data() {
        return {
            promptExpanded: false,
            downloading: false,
            collectingImageUrls: {},
            form: {
                prompt: '',
                targetPages: 10,
                artStyle: 'healingWatercolor' // 使用 key 作为默认值
            },
            generating: false,
            progressPercentage: 0,
            progressStatus: '', // '' | 'success' | 'exception' | 'warning'
            progressText: '准备开始...',
            bookData: null,
            storyData: null,
            storyDraft: null,
            imagePrompts: [],
            /** 与 imagePrompts 一一对应，标记该提示词属于故事第几页（0-based） */
            promptSceneIndexes: [],
            characterProfiles: [],
            characterCard: '',
            protagonistRefs: {
                1: { characterId: '', preview: '', base64: '' },
                2: { characterId: '', preview: '', base64: '' },
            },
            myCharacters: [],
            loadingMyCharacters: false,
            inpaintSceneIndex: -1,
            generatingImages: false,
            pageGeneration: {},
            handrawStyleReferenceAuto: readHandrawStyleReferenceAutoPreference(),
            // API 配置（模型名称由前端使用，具体 API 地址和密钥在后端配置）
            doubaoSeedModel: 'doubao-seed-1-6',
            apiBaseUrl: process.env.VUE_APP_API_BASE_URL || '',
            autoSaveTimer: null, // 自动保存定时器
            draftSaveFailed: false
        }
    },
    computed: {
        displayCharacterProfiles() {
            return parseCharacterCardText(this.characterCard)
        },
        selectedHandrawStyle() {
            const style = this.styles.find(s => s.key === this.form.artStyle)
            return isHandrawLibraryStyle(style) ? style : null
        },
        bookPreviewImages() {
            return (this.bookData?.images || []).filter((img) => img);
        },
        pendingGenerateJobs() {
            const prompts = this.imagePrompts || []
            const indexes = this.promptSceneIndexes || []
            const jobs = []
            for (let i = 0; i < prompts.length; i++) {
                const prompt = String(prompts[i] || '').trim()
                if (!prompt) continue
                jobs.push({
                    listIndex: i,
                    sceneIndex: Number.isInteger(indexes[i]) ? indexes[i] : i,
                    prompt,
                })
            }
            return jobs
        },
        generateImagesButtonLabel() {
            if (this.generatingImages) return this.$t('aibooks.generating')
            const n = this.pendingGenerateJobs.length
            if (this.bookData?.images?.some(Boolean)) {
                return this.$t('aibooks.regenerateSelected', { count: n })
            }
            return this.$t('aibooks.startGenerate')
        },
    },
    mounted() {
        // 页面加载时从本地存储恢复数据
        this.loadFromLocalStorage();
        if (this.$route.query.sample === 'forest' && !this.form.prompt?.trim() && !this.storyData) {
            this.form.prompt = '小熊第一次独自去森林找朋友，途中遇到下雨的小兔子。它们一起用树叶搭起小伞，最后明白了互相帮助的快乐。请写成适合亲子共读的温暖故事。';
        }
        this.fetchMyCharacters();
        // 设置自动保存
        this.setupAutoSave();
        window.addEventListener('pagehide', this.saveToLocalStorage);
    },
    beforeUnmount() {
        window.removeEventListener('pagehide', this.saveToLocalStorage);
        this.saveToLocalStorage();
        // 组件销毁前清除定时器
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
    },
    methods: {
        characterTraits(profile) {
            return [profile.appearance, profile.personality]
                .filter(Boolean)
                .flatMap(value => value.split(/[，,；;。\n]+/).map(part => part.trim()).filter(Boolean))
        },
        async notifyApiError(error, fallbackMessage) {
            if (error?.insufficientPoints) {
                return true
            }
            const handled = await handleInsufficientPointsError(error, {
                router: this.$router,
                t: this.$t.bind(this),
            })
            if (!handled) {
                const msg = extractApiErrorMessage(error?.response?.data) || error?.message
                ElMessage.error(msg || fallbackMessage || '操作失败，请重试')
            }
            return handled
        },

        getPreviewInitialIndex(pageIndex) {
            const images = this.bookData?.images || [];
            let previewIndex = 0;
            for (let i = 0; i < pageIndex; i += 1) {
                if (images[i]) previewIndex += 1;
            }
            return previewIndex;
        },
        // 处理风格选择（单选模式），并将风格信息写入提示词
        handleStyleChange(styleKey, checked) {
            if (this.generating || this.generatingImages) return
            if (!checked) {
                // 单选模式下，取消勾选不改变当前选中风格
                return;
            }
            // 更新当前选中的风格（使用 key）
            this.form.artStyle = styleKey;

            // 在 styles 数组中找到对应的风格说明
            const style = this.styles.find(s => s.key === styleKey);
            if (!style) return;

            this.form.prompt = replaceBookStyle(this.form.prompt, this.styles, style);
            this.saveToLocalStorage()
        },
        onStyleReferenceChange() {
            writeHandrawStyleReferenceAutoPreference(this.handrawStyleReferenceAuto)
        },

        // 将图片转换为 Base64（直连失败走 fetch-image 代理，避免 getapib CORS）
        async imageToBase64(imageUrl, compress = false) {
            if (!compress && typeof imageUrl === 'string' && imageUrl.startsWith('data:')) {
                return imageUrl
            }
            try {
                const blob = await loadImageBlob(imageUrl, {
                    http: this.$http,
                    apiBaseUrl: this.apiBaseUrl,
                })
                if (compress) return this.fileToBase64(blob, true)
                return new Promise((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = () => resolve(reader.result)
                    reader.onerror = reject
                    reader.readAsDataURL(blob)
                })
            } catch (error) {
                console.error('图片转换失败:', error)
                throw error
            }
        },
        
        // 生成绘本
        async generateBook() {
            if (!this.form.prompt || !this.form.prompt.trim()) {
                ElMessage.warning('请输入提示词')
                return
            }
            
            try { buildStoryGuide(this.form.targetPages) } catch (error) { ElMessage.warning(error.message); return }
            void trackAnalytics('creation_start', { tool: 'book' })
            this.storyDraft = null
            this.storyData = null
            this.generating = true
            this.progressPercentage = 0
            this.progressStatus = ''
            this.progressText = '正在生成故事...'
            this.bookData = null
            this.characterProfiles = []
            this.characterCard = ''
            this.imagePrompts = []
            this.promptSceneIndexes = []
            this.clearProtagonistRefs()
            
            try {
                // 步骤1: 调用 doubao-seed-1.6 生成故事
                this.progressPercentage = 10
                this.progressText = '正在创作故事...'
                
                const draft = await this.generateStory()
                this.storyDraft = { story: draft, prompt: this.form.prompt.trim(), targetPages: this.form.targetPages }
                this.saveToLocalStorage()
                this.progressPercentage = 60
                this.progressText = '正在审稿并修订故事...'
                const storyData = await this.generateStory(this.storyDraft)
                this.storyDraft = null
                
                this.progressPercentage = 100
                this.progressStatus = 'success'
                this.progressText = '故事创作完成！'
                
                // 保存故事数据
                this.storyData = storyData
                
                // 提取 scenes_detail 并处理为可编辑的提示词
                this.characterProfiles = extractCharacterProfiles(storyData)
                this.characterCard = formatCharacterCard(this.characterProfiles)
                this.imagePrompts = scenesDetailToImagePrompts(storyData.scenes_detail)
                this.promptSceneIndexes = this.imagePrompts.map((_, i) => i)
                
                if (!this.characterCard.trim()) {
                    console.warn('故事 JSON 未返回 character_profiles，请手动填写角色设定卡')
                }
                
                ElMessage.success('故事创作完成！请确认角色设定卡并编辑分镜提示词')
                this.fetchMyCharacters()

                // 保存到本地存储
                this.saveToLocalStorage()
            } catch (error) {
                console.error('生成绘本失败:', error)
                this.progressStatus = 'exception'
                this.progressText = this.storyDraft ? '审稿失败，草稿已保留，可重新审稿' : '生成失败，请重试'
                await this.notifyApiError(error, '生成失败，请重试')
            } finally {
                this.generating = false
            }
        },
        
        // 生成故事（调用 doubao-seed-1.6）
        async retryStoryReview() {
            if (!this.storyDraft || this.generating || this.generatingImages) return
            this.generating = true
            this.progressStatus = ''
            this.progressText = '正在重新审稿...'
            try {
                const story = await this.generateStory(this.storyDraft)
                this.storyData = story
                this.characterProfiles = extractCharacterProfiles(story)
                this.characterCard = formatCharacterCard(this.characterProfiles)
                this.imagePrompts = scenesDetailToImagePrompts(story.scenes_detail)
                this.promptSceneIndexes = this.imagePrompts.map((_, index) => index)
                this.storyDraft = null
                this.progressPercentage = 100
                this.progressStatus = 'success'
                this.progressText = '故事审稿完成！'
                this.saveToLocalStorage()
            } catch (error) {
                this.progressStatus = 'exception'
                this.progressText = '审稿失败，草稿已保留，可重新审稿'
                await this.notifyApiError(error, this.progressText)
            } finally {
                this.generating = false
            }
        },

        async generateStory(reviewDraft = null) {
            const targetPages = reviewDraft ? reviewDraft.targetPages : this.form.targetPages
            // 构建风格提示词（可选）
            let stylePrompt = ''
            if (this.form.artStyle) {
            const selectedStyle = this.styles.find(s => s.key === this.form.artStyle)
                if (selectedStyle) {
                    const styleName = selectedStyle.artStyle || ''
                    const styleDetails = selectedStyle.prependBaseOnGenerate
                        ? (selectedStyle.basePrompt || '')
                        : (selectedStyle.elementDetails || '')
                    if (styleName && styleDetails) {
                        stylePrompt = `画风要求：${styleName}。${styleDetails}`
                    } else if (styleName) {
                        stylePrompt = `画风要求：${styleName}`
                    }
                }
            }
            
            // 构建请求数据
            const requestData = {
                prompt: reviewDraft
                    ? buildStoryReviewPrompt(reviewDraft.story, reviewDraft.prompt, targetPages)
                    : appendStorySchemaGuide(this.form.prompt.trim(), targetPages),
                model: this.doubaoSeedModel,
                maxCompletionTokens: 65535,
                reasoningEffort: 'medium',
                storyGuide: buildStoryGuide(targetPages),
                targetPages,
            }
            
            // 如果存在风格提示词，添加到请求中
            if (stylePrompt) {
                requestData.stylePrompt = stylePrompt
            }
            
            // 调用后端接口
            const apiUrl = this.apiBaseUrl 
                ? `${this.apiBaseUrl}/generate-story`
                : '/generate-story'
            
            const response = await this.$http.post(apiUrl, requestData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
                },
                timeout: 120000 // 2分钟超时
            })
            
            // 解析响应
            const responseData = response.data
            let storyJson = null
            
            // 判断响应状态
            if (!responseData) {
                throw new Error('API响应为空')
            }
            
            // 检查是否有错误
            if (responseData.error) {
                throw new Error(`API错误: ${responseData.error.message || responseData.error.code || '未知错误'}`)
            }
            
            // 判断成功状态：code === 0 或 desc === 'success' 或 statuscode === 'success'
            const isSuccess = (responseData.code === 0 || responseData.code === '0') 
                || responseData.desc === 'success' 
                || responseData.statuscode === 'success'
                || (responseData.code == null && responseData.title && responseData.scenes)
            
            if (!isSuccess) {
                const errorMsg = extractApiErrorMessage(responseData) || `code: ${responseData.code}`
                throw markInsufficientPointsError(new Error(errorMsg), errorMsg)
            }
            
            // 提取故事数据（支持多种响应格式）
            // 格式1: { code: 0, desc: 'success', message: { title, summary, scenes, scenes_detail } }
            // 格式2: { code: 0, data: { title, summary, scenes, scenes_detail } }
            // 格式3: { title, summary, scenes, scenes_detail } (直接返回)
            if (responseData.message && typeof responseData.message === 'object') {
                storyJson = responseData.message
            } else if (responseData.data && typeof responseData.data === 'object') {
                storyJson = responseData.data
            } else if (responseData.title && responseData.scenes) {
                // 直接返回故事数据
                storyJson = responseData
            } else {
                // 尝试从 message 字段解析 JSON 字符串
                if (responseData.message && typeof responseData.message === 'string') {
                    try {
                        storyJson = JSON.parse(responseData.message)
                    } catch (e) {
                        // 如果不是 JSON 字符串，尝试提取 JSON
                        const jsonMatch = responseData.message.match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                try {
                    let jsonStr = jsonMatch[0]
                        .replace(/```json\n?/g, '')
                        .replace(/```\n?/g, '')
                        .trim()
                    storyJson = JSON.parse(jsonStr)
                            } catch (parseError) {
                                console.error('JSON解析失败:', parseError)
                                throw new Error('响应格式错误，无法解析故事数据')
                }
            } else {
                            throw new Error('响应中未找到有效的故事数据')
                        }
                    }
                } else {
                    throw new Error('响应中未找到有效的故事数据')
                }
            }
            
            return validateStory(storyJson, targetPages, Boolean(reviewDraft))
        },
        
        hasPageImage(sceneIndex) {
            return Boolean(getPageDisplayUrl(this.bookData, sceneIndex))
        },

        getPageImageUrl(sceneIndex) {
            return getPageDisplayUrl(this.bookData, sceneIndex)
        },

        pageVersionList(sceneIndex) {
            return getPageVersions(this.bookData, sceneIndex)
        },

        pageCurrentVersionIndex(sceneIndex) {
            return getPageCurrentVersionIndex(this.bookData, sceneIndex)
        },

        switchPageVersion(sceneIndex, versionIndex) {
            if (setPageCurrentVersion(this.bookData, sceneIndex, versionIndex)) {
                this.saveToLocalStorage()
            }
        },

        openInpaintDialog(sceneIndex) {
            const url = getPageDisplayUrl(this.bookData, sceneIndex)
            if (!url) {
                ElMessage.warning(this.$t('aibooks.inpaintNoImage'))
                return
            }
            this.inpaintSceneIndex = sceneIndex
            // 立即打开弹窗；图片在弹窗内异步加载，避免点击后长时间无反馈
            this.$refs.inpaintDialogRef?.open({ imageUrl: url })
        },

        onInpaintSuccess({ imageUrl, prompt }) {
            const sceneIndex = this.inpaintSceneIndex
            if (sceneIndex < 0 || !imageUrl) return
            pushPageVersion(this.bookData, sceneIndex, {
                url: imageUrl,
                source: 'inpaint',
                prompt: prompt || '',
            })
            this.inpaintSceneIndex = -1
            this.saveToLocalStorage()
        },

        async fetchMyCharacters() {
            const userId = localStorage.getItem('id')
            const token = localStorage.getItem('token')
            if (!userId || !token) {
                this.myCharacters = []
                return
            }
            this.loadingMyCharacters = true
            try {
                const apiUrl = this.apiBaseUrl
                    ? `${this.apiBaseUrl}/character`
                    : '/character'
                const res = await this.$http.get(apiUrl, {
                    params: { user_id: userId },
                    headers: { Authorization: `Bearer ${token}` },
                })
                const list = res?.data?.data || res?.data?.message || res?.data?.list || []
                this.myCharacters = Array.isArray(list) ? list : []
            } catch (e) {
                this.myCharacters = []
            } finally {
                this.loadingMyCharacters = false
                await this.reloadProtagonistRefsFromIds()
            }
        },

        protagonistStoryName(slot) {
            const profiles = this.characterProfiles?.length
                ? this.characterProfiles
                : parseCharacterCardText(this.characterCard)
            return profiles?.[slot - 1]?.name?.trim() || ''
        },

        protagonistSlotLabel(slot) {
            const name = this.protagonistStoryName(slot)
            const key = slot === 1 ? 'aibooks.protagonist1' : 'aibooks.protagonist2'
            const base = this.$t(key)
            return name ? `${base}（${name}）` : base
        },

        isCharacterDisabledForSlot(character, slot) {
            const id = String(character?.id || character?._id || '')
            if (!id) return false
            const otherSlot = slot === 1 ? 2 : 1
            return String(this.protagonistRefs[otherSlot].characterId) === id
        },

        hasProtagonistReference() {
            return Boolean(this.protagonistRefs[1]?.characterId || this.protagonistRefs[2]?.characterId)
        },

        getCharacterIdsForApi() {
            return [1, 2]
                .map((slot) => String(this.protagonistRefs[slot]?.characterId || '').trim())
                .filter(Boolean)
        },

        clearProtagonistSlot(slot) {
            if (!this.protagonistRefs[slot]) return
            this.protagonistRefs[slot].characterId = ''
            this.protagonistRefs[slot].preview = ''
            this.protagonistRefs[slot].base64 = ''
        },

        clearProtagonistRefs() {
            this.clearProtagonistSlot(1)
            this.clearProtagonistSlot(2)
        },

        async onProtagonistChange(slot, characterId, { silent = false } = {}) {
            if (!characterId) {
                this.clearProtagonistSlot(slot)
                if (!silent) this.saveToLocalStorage()
                return
            }
            const item = this.myCharacters.find(
                (c) => String(c.id || c._id) === String(characterId)
            )
            if (!item) return
            const imageUrl = getImageUrl(item.image_url || item.character_image_url)
            if (!imageUrl) {
                if (!silent) ElMessage.warning(this.$t('aibooks.myCharacterNoImage'))
                this.clearProtagonistSlot(slot)
                return
            }
            this.protagonistRefs[slot].characterId = String(characterId)
            this.protagonistRefs[slot].base64 = ''
            this.protagonistRefs[slot].preview = imageUrl
            if (!silent) {
                ElMessage.success(this.$t('aibooks.protagonistSelected', { label: this.protagonistSlotLabel(slot) }))
                this.saveToLocalStorage()
            }
        },

        async reloadProtagonistRefsFromIds() {
            if (!this.myCharacters?.length) return
            for (const slot of [1, 2]) {
                const id = this.protagonistRefs[slot]?.characterId
                if (!id || this.protagonistRefs[slot]?.preview) continue
                await this.onProtagonistChange(slot, id, { silent: true })
            }
        },

        removeImagePrompt(index) {
            if (this.generatingImages) return
            if (!this.imagePrompts || this.imagePrompts.length <= 1) {
                ElMessage.warning(this.$t('aibooks.keepAtLeastOnePrompt'))
                return
            }
            const sceneIndex = this.promptSceneIndexes[index] ?? index
            this.imagePrompts.splice(index, 1)
            this.promptSceneIndexes.splice(index, 1)
            this.saveToLocalStorage()
            ElMessage.success(this.$t('aibooks.promptRemoved', { page: sceneIndex + 1 }))
        },

        syncPromptSceneIndexes() {
            const n = (this.imagePrompts || []).length
            if (!Array.isArray(this.promptSceneIndexes) || this.promptSceneIndexes.length !== n) {
                this.promptSceneIndexes = Array.from({ length: n }, (_, i) => {
                    const existing = this.promptSceneIndexes?.[i]
                    return Number.isInteger(existing) ? existing : i
                })
            }
        },

        // 从编辑后的提示词生成图片（只提交列表中剩余的提示词；已删页不请求后端）
        async regeneratePage(sceneIndex) {
            if (this.generatingImages || this.generating) return
            this.syncPromptSceneIndexes()
            const listIndex = this.promptSceneIndexes.indexOf(sceneIndex)
            const prompt = listIndex >= 0 ? this.imagePrompts[listIndex] : this.storyData?.scenes_detail?.[sceneIndex]
            if (!String(prompt || '').trim()) {
                ElMessage.warning(this.$t('aibooks.noPromptsToGenerate'))
                return
            }
            await this.generateImagesFromPrompts([{sceneIndex, listIndex, prompt: String(prompt).trim()}])
        },
        async generateImagesFromPrompts(onlyJobs) {
            if (this.generatingImages || this.generating) return
            this.syncPromptSceneIndexes()
            const jobs = Array.isArray(onlyJobs) ? onlyJobs : this.pendingGenerateJobs
            if (!jobs.length) {
                ElMessage.warning(this.$t('aibooks.noPromptsToGenerate'));
                return;
            }
            
            if (!this.storyData) {
                ElMessage.warning('请先生成故事');
                return;
            }

            if (!this.characterCard?.trim() && !this.hasProtagonistReference()) {
                ElMessage.warning(this.$t('aibooks.characterCardOrRefRequired'));
                return;
            }

            this.characterProfiles = this.characterCard?.trim()
                ? parseCharacterCardText(this.characterCard)
                : []
            
            this.generatingImages = true
            this.progressPercentage = 0
            this.progressStatus = ''
            this.progressText = '开始生成图片...'

            const sceneCount = Array.isArray(this.storyData.scenes)
                ? this.storyData.scenes.length
                : jobs.length
            const prevImages = Array.isArray(this.bookData?.images)
                ? [...this.bookData.images]
                : []
            while (prevImages.length < sceneCount) prevImages.push(null)

            this.bookData = {
                ...this.bookData,
                title: this.storyData.title,
                summary: this.storyData.summary,
                scenes: this.storyData.scenes,
                scenes_detail: this.storyData.scenes_detail,
                character_profiles: this.characterProfiles,
                character_card: this.characterCard,
                images: prevImages,
                imageErrors: { ...this.bookData?.imageErrors },
            }
            this.saveToLocalStorage()
            
            try {
                await this.generateImagesForJobs(jobs)

                const okCount = jobs.filter((j) => this.pageGeneration[j.sceneIndex] === 'succeeded').length
                const totalBookOk = (this.bookData.images || []).filter(Boolean).length
                this.progressPercentage = 100
                if (okCount === 0) {
                    this.progressStatus = 'exception'
                    this.progressText = '生成失败，请重试'
                    ElMessage.error('图片生成失败，请重试')
                } else if (okCount < jobs.length) {
                    this.progressStatus = 'warning'
                    this.progressText = `本次生成 ${okCount}/${jobs.length} 张，全书已有 ${totalBookOk} 张`
                    this.saveToLocalStorage()
                    ElMessage.warning(`本次已生成 ${okCount}/${jobs.length} 张，失败页可改提示词后重试`)
                } else {
                    this.progressStatus = 'success'
                    this.progressText = `生成完成（全书 ${totalBookOk} 张）`
                    this.saveToLocalStorage()
                    ElMessage.success(jobs.length < sceneCount
                        ? `已重新生成 ${okCount} 张，其余页保留原图`
                        : '绘本生成成功！')
                }
            } catch (error) {
                console.error('生成图片失败:', error)
                this.progressStatus = 'exception'
                this.progressText = '生成失败，请重试'
                this.saveToLocalStorage()
                await this.notifyApiError(error, '生成失败，请重试')
            } finally {
                this.generatingImages = false
                for (const job of jobs) {
                    if (this.pageGeneration[job.sceneIndex] === 'queued') this.pageGeneration[job.sceneIndex] = 'idle'
                }
                this.saveToLocalStorage()
            }
        },
        
        // 将文件转换为Base64
        async fileToBase64(file, compress = false) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = async (e) => {
                    let result = e.target.result
                    
                    // 如果需要压缩
                    if (compress) {
                        try {
                            const img = new Image()
                            img.onload = () => {
                                const canvas = document.createElement('canvas')
                                const maxWidth = 1024
                                const maxHeight = 1024
                                let width = img.width
                                let height = img.height
                                
                                if (width > maxWidth || height > maxHeight) {
                                    if (width > height) {
                                        height = (height * maxWidth) / width
                                        width = maxWidth
                                    } else {
                                        width = (width * maxHeight) / height
                                        height = maxHeight
                                    }
                                }
                                
                                canvas.width = width
                                canvas.height = height
                                const ctx = canvas.getContext('2d')
                                ctx.drawImage(img, 0, 0, width, height)
                                
                                canvas.toBlob((blob) => {
                                    const reader2 = new FileReader()
                                    reader2.onload = () => resolve(reader2.result)
                                    reader2.onerror = reject
                                    reader2.readAsDataURL(blob)
                                }, 'image/jpeg', 0.8)
                            }
                            img.onerror = reject
                            img.src = result
                        } catch (error) {
                            resolve(result) // 压缩失败，返回原始结果
                        }
                    } else {
                        resolve(result)
                    }
                }
                reader.onerror = reject
                reader.readAsDataURL(file)
            })
        },
        
        // 生成单页：POST /create-character（异步 task_id 会在工具内轮询至有图）
        async generateOnePageImage(sceneIndex, scenePrompt, styleInfo, allProfiles, referenceImage, styleReference = '') {
            const sceneText = this.storyData?.scenes?.[sceneIndex] || ''
            const { card: pageCharacterCard, names: pageCharacterNames } = buildPageCharacterCard({
                scenePrompt,
                sceneText,
                profiles: allProfiles,
            })

            const characterIds = this.getCharacterIdsForApi()
            const withReferenceImage = characterIds.length > 0 || Boolean(referenceImage)

            const requestData = {
                prompt: buildPageImagePrompt({
                    scenePrompt: String(scenePrompt || '').trim(),
                    characterCard: pageCharacterCard,
                    characterNames: pageCharacterNames,
                    styleInfo,
                    withReferenceImage,
                }),
                size: '1280x960',
                watermark: false,
            }

            if (characterIds.length) {
                requestData.character_ids = characterIds
            }

            const references = [referenceImage, styleReference].filter(Boolean)
            if (references.length) requestData.image = references.length === 1 ? references[0] : references
            if (styleReference) {
                const isolation = appendHandrawReferenceIsolation('', this.locale)
                    .replace('所附图片仅用于参考画风。', '本段指定的风格参考图仅用于参考画风。')
                    .replace('Use the attached image only as a style reference.', 'Use only the image designated in this block as a style reference.')
                requestData.prompt += `\n\n【风格参考图（image 字段第 ${references.length} 张）】${isolation}`
                if (referenceImage || characterIds.length) requestData.prompt += '\n其余参考为角色或已生成的故事页，只保持出场角色的形象；不得照搬故事页构图。'
            }

            const responseData = await postCreateCharacter(
                this.$http,
                requestData,
                { apiBaseUrl: this.apiBaseUrl, source: 'aibooks' }
            )

            if (!responseData) {
                throw new Error('API响应为空')
            }

            if (responseData.error) {
                const errorMsg = responseData.error.message || responseData.error.code || '未知错误'
                throw new Error(`生成图片失败: ${errorMsg}`)
            }

            if (!isCreateCharacterResponseOk(responseData) || !responseData.message) {
                const errorMsg = extractApiErrorMessage(responseData) || `code: ${responseData.code}`
                throw markInsufficientPointsError(new Error(errorMsg), errorMsg)
            }

            const result = responseData.message

            if (result && typeof result === 'object' && result.points !== undefined && this.$store?.state) {
                this.$store.commit('setUserInfo', {
                    ...(this.$store.state.userInfo || {}),
                    points: result.points,
                })
            }

            const imageUrl = this.resolveGeneratedImageUrl(result)
            if (!imageUrl) {
                throw new Error(`第 ${sceneIndex + 1} 张图片生成成功但未找到图片URL`)
            }
            return imageUrl
        },

        setPageImage(index, imageUrl, { source = 'generate', prompt = '' } = {}) {
            if (!this.bookData || !Array.isArray(this.bookData.images)) return
            if (imageUrl) {
                pushPageVersion(this.bookData, index, { url: imageUrl, source, prompt })
            } else {
                this.bookData.images[index] = null
            }
            this.saveToLocalStorage()
        },

        async pickAnchorImageBase64(excludeSceneIndexes = []) {
            const exclude = new Set(excludeSceneIndexes)
            const images = this.bookData?.images || []
            for (let i = 0; i < images.length; i++) {
                if (exclude.has(i) || !images[i]) continue
                try {
                    return await this.imageToBase64(images[i], true)
                } catch (e) {
                    console.warn('已有页参考图转换失败:', e)
                }
            }
            return ''
        },

        // 仅生成 jobs 中的页；保留其它页已有插画
        async generateImagesForJobs(jobs) {
            const jobList = Array.isArray(jobs) ? jobs.filter((j) => j && j.prompt) : []
            const total = jobList.length
            if (!total) return this.bookData?.images || []

            const styleInfo = getStyleInfoText(this.styles, this.form.artStyle, { forGenerate: true })
            const allProfiles = this.characterProfiles?.length
                ? this.characterProfiles
                : parseCharacterCardText(this.characterCard)
            let styleReference = ''
            if (this.selectedHandrawStyle && this.handrawStyleReferenceAuto) {
                try {
                    styleReference = await this.imageToBase64(this.selectedHandrawStyle.imageUrl || this.selectedHandrawStyle.image, true)
                } catch (error) {
                    throw new Error(this.$t('aibooks.styleReferenceFailed'))
                }
            }
            for (const job of jobList) this.pageGeneration[job.sceneIndex] = 'queued'

            const sceneCount = Array.isArray(this.storyData?.scenes)
                ? this.storyData.scenes.length
                : Math.max(...jobList.map((j) => j.sceneIndex), 0) + 1

            if (!this.bookData) {
                this.bookData = {
                    title: this.storyData?.title || '',
                    summary: this.storyData?.summary || '',
                    scenes: this.storyData?.scenes || [],
                    scenes_detail: this.storyData?.scenes_detail,
                    character_profiles: this.characterProfiles,
                    character_card: this.characterCard,
                    images: Array(sceneCount).fill(null),
                }
            } else if (!Array.isArray(this.bookData.images)) {
                this.bookData.images = Array(sceneCount).fill(null)
            } else if (this.bookData.images.length < sceneCount) {
                while (this.bookData.images.length < sceneCount) {
                    this.bookData.images.push(null)
                }
            }

            let completed = 0
            const bumpProgress = (pageLabel) => {
                completed += 1
                this.progressPercentage = Math.min(99, Math.floor((completed / total) * 100))
                this.progressText = pageLabel
                    ? `第 ${pageLabel} 页已完成（${completed}/${total}）`
                    : `已完成 ${completed}/${total} 张`
            }

            const runJob = async (job, referenceImage) => {
                const sceneIndex = job.sceneIndex
                this.pageGeneration[sceneIndex] = 'generating'
                delete this.bookData.imageErrors?.[sceneIndex]
                try {
                    const imageUrl = await this.generateOnePageImage(
                        sceneIndex,
                        job.prompt,
                        styleInfo,
                        allProfiles,
                        referenceImage,
                        styleReference
                    )
                    this.setPageImage(sceneIndex, imageUrl)
                    this.pageGeneration[sceneIndex] = 'succeeded'
                    bumpProgress(sceneIndex + 1)
                    return imageUrl
                } catch (error) {
                    console.error(`生成第 ${sceneIndex + 1} 张图片失败:`, error)
                    this.pageGeneration[sceneIndex] = 'failed'
                    if (!this.bookData.imageErrors) this.bookData.imageErrors = {}
                    this.bookData.imageErrors[sceneIndex] = extractApiErrorMessage(error?.response?.data) || error?.message || this.$t('aibooks.imageFailed')
                    this.saveToLocalStorage()
                    bumpProgress(sceneIndex + 1)
                    if (error?.insufficientPoints) throw error
                    return null
                }
            }

            const regenIndexes = jobList.map((j) => j.sceneIndex)
            const anchorImageBase64 = await this.pickAnchorImageBase64(regenIndexes)
            const hasProtagonistRefs = this.getCharacterIdsForApi().length > 0

            if (anchorImageBase64 || hasProtagonistRefs) {
                this.progressText = `正在生成 ${total} 张图片（最多同时 2 张）...`
                await runBookImageQueue(jobList, (job) => runJob(job, anchorImageBase64 || ''))
                return this.bookData.images
            }

            // 无参考图：先生成列表第一项作锚点，再并行其余
            this.progressText = `正在生成第 ${jobList[0].sceneIndex + 1} 页（1/${total}）...`
            const firstUrl = await runJob(jobList[0], '')
            let firstPageImageBase64 = ''
            if (firstUrl) {
                try {
                    firstPageImageBase64 = await this.imageToBase64(firstUrl)
                } catch (e) {
                    console.warn('第一页参考图转换失败，后续页面将仅依赖文字设定卡:', e)
                }
            }

            if (jobList.length > 1) {
                this.progressText = `正在生成其余 ${jobList.length - 1} 张（最多同时 2 张）...`
                await runBookImageQueue(jobList.slice(1), (job) => runJob(job, firstPageImageBase64))
            }

            return this.bookData.images
        },

        resolveGeneratedImageUrl(result) {
            // 优先 image_url（api 落盘），再 image_remote_url / 其它字段
            let imageUrl = resolveGenerationImageUrl(result, this.apiBaseUrl)
            if (!imageUrl && result.character_image_url) {
                imageUrl = result.character_image_url
            }
            if (!imageUrl && result.character_image_base64) {
                let base64Str = result.character_image_base64.trim()
                if (!base64Str.startsWith('data:')) {
                    base64Str = base64Str.replace(/\s/g, '')
                    base64Str = `data:image/jpeg;base64,${base64Str}`
                }
                imageUrl = base64Str
            }
            if (!imageUrl && result.full_response) {
                if (result.full_response.data && Array.isArray(result.full_response.data) && result.full_response.data.length > 0) {
                    const firstData = result.full_response.data[0]
                    if (firstData.b64_json) {
                        imageUrl = `data:image/jpeg;base64,${firstData.b64_json.trim()}`
                    } else {
                        imageUrl = firstData.url || firstData.ResultUrl || ''
                    }
                }
                if (!imageUrl) {
                    imageUrl = result.full_response.result_url || result.full_response.ResultUrl || result.full_response.url || ''
                }
            }
            if (!imageUrl) {
                imageUrl = result.character_image_oss_url || result.result_url || result.ResultUrl || ''
            }
            if (!imageUrl && result.b64_json) {
                imageUrl = `data:image/jpeg;base64,${result.b64_json.trim()}`
            }
            return imageUrl || ''
        },

        isIllustrationCollected(imageUrl) {
            return !!imageUrl && !!this.bookData?.collectedImageUrls?.includes(imageUrl);
        },

        // 收集插画（只保存纯插画；图下文案仅在「下载全部」时拼接）
        async collectIllustration(imageUrl, index) {
            if (!imageUrl) {
                ElMessage.warning('图片尚未生成，请稍候');
                return;
            }
            if (this.isIllustrationCollected(imageUrl) || this.collectingImageUrls[imageUrl]) return;
            const bookData = this.bookData;
            this.collectingImageUrls[imageUrl] = true;
            try {
                ElMessage.info(`正在保存第 ${index + 1} 张插画...`);
                
                let pictureValue = imageUrl;
                if (pictureValue && !pictureValue.startsWith('http://') && !pictureValue.startsWith('https://') && !pictureValue.startsWith('data:')) {
                    pictureValue = `https://static.kidstory.cc/${pictureValue}`;
                }
                
                const requestData = {
                    picture: pictureValue,
                    title: `${this.bookData.title} - 第 ${index + 1} 页`,
                    description: `${this.bookData.title} 的第 ${index + 1} 页插画`,
                    type: 'others'
                };
                
                const token = localStorage.getItem('token') || '';
                if (!token) {
                    ElMessage.error('请先登录');
                    return;
                }
                
                const response = await this.$http.post('/ill/', requestData, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    }
                });
                
                if (response.data && (response.data.desc === 'success' || response.data.code === 0 || response.data.code === '0')) {
                    bookData.collectedImageUrls = [...new Set([...(bookData.collectedImageUrls || []), imageUrl])];
                    this.saveToLocalStorage();
                    ElMessage.success(`第 ${index + 1} 张插画已保存到"我的插画"`);
                } else {
                    throw new Error(response.data?.message || '保存失败');
                }
            } catch (error) {
                console.error('收集插画失败:', error);
                const errorMessage = error.response?.data?.message || error.message || '保存失败，请重试';
                ElMessage.error(`收集插画失败: ${errorMessage}`);
            } finally {
                delete this.collectingImageUrls[imageUrl];
            }
        },
        
        // 下载所有图片（图片+文字组合）
        async downloadAllImages() {
            if (!this.bookData || !this.bookData.images || this.bookData.images.length === 0) {
                ElMessage.warning('没有可下载的图片');
                return;
            }
            
            if (this.downloading) {
                return;
            }
            
            this.downloading = true;
            void trackAnalytics('export_start', { tool: 'book', format: 'png' });
            ElMessage.info('正在准备下载，请稍候...');
            
            try {
                const images = this.bookData.images;
                const scenes = this.bookData.scenes || [];
                let okCount = 0;
                
                for (let i = 0; i < images.length; i++) {
                    if (!images[i]) {
                        console.warn(`第 ${i + 1} 张图片不存在，跳过`);
                        continue;
                    }
                    
                    try {
                        const blob = await this.createImageWithText(images[i], scenes[i] || '');
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${this.bookData.title || '绘本'}_第${i + 1}页.png`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        okCount += 1;
                        
                        if (i < images.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 300));
                        }
                    } catch (error) {
                        console.error(`处理第 ${i + 1} 张图片失败:`, error);
                        ElMessage.warning(`第 ${i + 1} 张图片处理失败，已跳过`);
                    }
                }
                
                if (okCount === 0) {
                    void trackAnalytics('export_failed', { tool: 'book', format: 'png' });
                    ElMessage.error('下载失败：图片无法读取（跨域），请确认已部署图片代理后重试');
                } else if (okCount < images.filter(Boolean).length) {
                    void trackAnalytics('export_failed', { tool: 'book', format: 'png' });
                    ElMessage.warning(`已下载 ${okCount} 张，其余失败已跳过`);
                } else {
                    void trackAnalytics('export_complete', { tool: 'book', format: 'png' });
                    ElMessage.success(`已成功下载 ${okCount} 张图片`);
                }
            } catch (error) {
                console.error('下载图片失败:', error);
                void trackAnalytics('export_failed', { tool: 'book', format: 'png' });
                ElMessage.error('下载失败，请重试');
            } finally {
                this.downloading = false;
            }
        },

        // 下载拼字：直连 → /create-character/fetch-image 代理 → canvas
        createImageWithText(imageUrl, text) {
            return composeImageWithCaption(imageUrl, text, {
                http: this.$http,
                apiBaseUrl: this.apiBaseUrl,
            })
        },
        
        // 从本地存储恢复数据
        loadFromLocalStorage() {
            try {
                const data = loadLocalAiDraft(localStorage, localStorage.getItem('id'));
                if (data) {

                    // 恢复用户输入
                    if (data.form) {
                        this.form = { ...this.form, ...data.form };
                        if (!Number.isInteger(this.form.targetPages) || this.form.targetPages < 6 || this.form.targetPages > 12) this.form.targetPages = 10;
                    }

                    // 恢复故事数据
                    if (data.storyData) {
                        this.storyData = data.storyData;
                    }

                    // 恢复编辑后的提示词
                    if (data.imagePrompts && data.imagePrompts.length > 0) {
                        this.imagePrompts = data.imagePrompts;
                        if (Array.isArray(data.promptSceneIndexes) && data.promptSceneIndexes.length === data.imagePrompts.length) {
                            this.promptSceneIndexes = data.promptSceneIndexes;
                        } else {
                            this.promptSceneIndexes = data.imagePrompts.map((_, i) => i);
                        }
                    }

                    if (data.characterProfiles) {
                        this.characterProfiles = data.characterProfiles;
                    }
                    if (data.characterCard) {
                        this.characterCard = data.characterCard;
                    }
                    if (data.protagonistRefs) {
                        this.protagonistRefs = {
                            1: { characterId: '', preview: '', base64: '', ...data.protagonistRefs[1] },
                            2: { characterId: '', preview: '', base64: '', ...data.protagonistRefs[2] },
                        }
                    } else if (data.selectedCharacterId || data.characterReferencePreview) {
                        this.protagonistRefs[1].characterId = data.selectedCharacterId || ''
                        this.protagonistRefs[1].preview = data.characterReferencePreview || ''
                        this.protagonistRefs[1].base64 = data.characterReferencePreview || ''
                    }

                    this.storyDraft = data.storyDraft || null;

                    // 恢复生成的绘本数据
                    if (data.bookData) {
                        this.bookData = data.bookData;
                        initPageVersionsFromImages(this.bookData);
                        syncImagesFromCurrentVersions(this.bookData);
                    }

                    console.log('已从本地存储恢复AI绘本数据');

                }
            } catch (error) {
                console.error('从本地存储恢复AI绘本数据失败:', error);
            }
        },

        // 保存数据到本地存储
        saveToLocalStorage() {
            try {
                const dataToSave = {
                    ownerId: localStorage.getItem('id'),
                    form: {
                        prompt: this.form.prompt,
                        targetPages: this.form.targetPages,
                        artStyle: this.form.artStyle
                    },
                    storyDraft: this.storyDraft,
                    storyData: this.storyData,
                    imagePrompts: this.imagePrompts,
                    promptSceneIndexes: this.promptSceneIndexes,
                    characterProfiles: this.characterProfiles,
                    characterCard: this.characterCard,
                    protagonistRefs: {
                        1: {
                            characterId: this.protagonistRefs[1]?.characterId || '',
                            preview: this.protagonistRefs[1]?.preview || '',
                        },
                        2: {
                            characterId: this.protagonistRefs[2]?.characterId || '',
                            preview: this.protagonistRefs[2]?.preview || '',
                        },
                    },
                    bookData: this.bookData,
                    timestamp: Date.now()
                };

                localStorage.setItem(getAiDraftStorageKey(dataToSave.ownerId), JSON.stringify(dataToSave));
                this.draftSaveFailed = false;
            } catch (error) {
                console.error('保存AI绘本数据到本地存储失败:', error);
                // setItem is atomic: retain the last successful draft when quota is exceeded.
                if (!this.draftSaveFailed) {
                    ElMessage.warning(this.$t('bookLibrary.saveFailed'));
                    this.draftSaveFailed = true;
                }
            }
        },
        
        // 设置自动保存（使用防抖）
        setupAutoSave() {
            const debounceSave = () => {
                if (this.autoSaveTimer) {
                    clearTimeout(this.autoSaveTimer);
                }
                this.autoSaveTimer = setTimeout(() => {
                    this.saveToLocalStorage();
                }, 2000); // 2秒后保存
            };
            
            // 监听用户输入变化
            this.$watch('form', () => {
                debounceSave();
            }, { deep: true });
            
            this.$watch('characterCard', () => {
                debounceSave();
            });

            this.$watch('protagonistRefs', () => {
                debounceSave();
            }, { deep: true });
            
            // 监听提示词编辑变化
            this.$watch('imagePrompts', () => {
                debounceSave();
            }, { deep: true });

            this.$watch('promptSceneIndexes', () => {
                debounceSave();
            }, { deep: true });

            // 监听故事数据变化
            this.$watch('storyData', () => {
                debounceSave();
            }, { deep: true });
            
            // 监听绘本数据变化
            this.$watch('bookData', () => {
                debounceSave();
            }, { deep: true });
        }
    }
}
</script>

<style scoped>
.inspiration-book {
    min-height: 100%;
    background-color: #f5f7fa;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
}

.inspiration-main {
    flex: 1;
    max-width: 100%;
    margin: 0 auto;
    padding: 24px;
    display: flex;
    gap: 16px;
    width: 100%;
    box-sizing: border-box;
}

.prompt-container {
    width: 30%;
    flex-shrink: 0;
    background-color: #fff;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
    min-height: 480px;
    max-height: none;
    overflow: hidden;
}

.scrollbar-container {
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

.scrollbar-container :deep(.el-scrollbar__wrap) {
    overflow-x: hidden;
    overflow-y: auto;
}

.scrollbar-container :deep(.el-scrollbar__bar) {
    right: 0;
}

.section-title {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
    margin: 0;
    padding-bottom: 12px;
    border-bottom: 2px solid #ebeef5;
}

.book-form {
    margin-top: 20px;
}

.prompt-input {
    width: 100%;
}
.prompt-expand-toggle { border: 0; background: none; padding: 2px 0; color: #5268bc; cursor: pointer; font: inherit; font-size: 13px; }
.prompt-expand-toggle:focus-visible, .character-profile-summary:focus-visible { outline: 2px solid #386af4; outline-offset: 2px; }
.book-form :deep(.el-form-item__content) { min-width: 0; }
.prompt-input :deep(textarea), .prompt-textarea :deep(textarea) { line-height: 1.7; }
.style-reference-hint { margin: 6px 0 0; font-size: 12px; line-height: 1.6; color: #606266; }
.book-form :deep(.el-checkbox) { height: auto; align-items: flex-start; }
.book-form :deep(.el-checkbox__label) { white-space: normal; line-height: 1.6; }
.page-generation-error { padding: 0 12px; font-size: 12px; color: #b84a35; line-height: 1.6; overflow-wrap: anywhere; max-height: 110px; overflow-y: auto; }
.style-picker-item:disabled { cursor: wait; opacity: .65; }

.reference-upload {
    width: 100%;
}

.reference-preview {
    margin-top: 12px;
    padding: 12px;
    background-color: #f5f7fa;
    border-radius: 8px;
    text-align: center;
}

.generate-btn-wrapper {
    width: 100%;
}

.generate-btn {
    width: 100%;
    height: 44px;
    font-size: 16px;
}

.points-hint {
    font-size: 12px;
    color: #909399;
    text-align: center;
    margin-top: 6px;
    line-height: 1.4;
}

.story-result-title {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 24px;
    padding: 14px;
    border-radius: 12px;
    background: linear-gradient(110deg, #eaf2ff, #fbeef6);
    color: #30354a;
    font-size: 17px;
    overflow-wrap: anywhere;
}
.story-result-icon {
    display: grid;
    flex: 0 0 40px;
    height: 40px;
    place-items: center;
    border-radius: 10px;
    background: #386af4;
    color: white;
}
.character-card-editor {
    margin-top: 24px;
}
.character-profile-list { display: grid; gap: 10px; margin: 14px 0; }
.character-profile {
    padding: 14px;
    border: 1px solid #edf0f7;
    border-radius: 10px;
    background: #fff;
}
.character-profile-summary { display: flex; align-items: center; gap: 12px; cursor: pointer; list-style: none; }
.character-profile-summary::-webkit-details-marker { display: none; }
.character-profile-preview { display: block; margin-top: 3px; color: #606a7d; font-size: 13px; line-height: 1.5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.character-profile-content { flex: 1; }
.character-profile-toggle { color: #5268bc; font-size: 20px; }
.character-profile[open] .character-profile-toggle { transform: rotate(180deg); }
.character-avatar {
    display: grid;
    flex: 0 0 38px;
    height: 38px;
    place-items: center;
    border-radius: 50%;
    background: #eb63c7;
    color: #fff;
    font-weight: 600;
}
.character-avatar.supporting { background: #efa94e; }
.character-profile-content { min-width: 0; color: #303133; }
.character-tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 0 50px; }
.character-tag {
    max-width: 100%;
    padding: 5px 9px;
    border-radius: 4px;
    background: #f2f3f7;
    color: #536079;
    font-size: 13px;
    line-height: 1.5;
    overflow-wrap: anywhere;
}
.character-edit-details summary { cursor: pointer; color: #5268bc; font-size: 13px; padding: 8px 0; }
.character-edit-details summary:focus-visible { outline: 2px solid #386af4; outline-offset: 2px; }

.character-card-hint,
.consistency-hint {
    margin: 0 0 10px;
    font-size: 12px;
    line-height: 1.5;
    color: #909399;
}

.consistency-hint {
    margin-top: 10px;
    margin-bottom: 0;
}

.character-card-textarea {
    width: 100%;
}

.character-ref-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
}

.character-ref-label {
    font-size: 13px;
    color: #606266;
}

.character-ref-section-title {
    margin: 14px 0 4px;
    font-size: 13px;
    font-weight: 600;
    color: #303133;
}

.character-ref-section-hint {
    margin: 0 0 8px;
    font-size: 12px;
    color: #909399;
    line-height: 1.45;
}

.character-ref-previews {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 10px;
}

.character-ref-preview-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
}

.character-ref-preview {
    width: 72px;
    height: 72px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e4e7ed;
    background: #fff;
}

.character-ref-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.character-ref-preview-caption {
    font-size: 11px;
    color: #606266;
    text-align: center;
    max-width: 88px;
    line-height: 1.3;
}

.prompts-editor {
    margin-top: 32px;
    padding-top: 24px;
    border-top: 2px solid #ebeef5;
}

.prompts-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 8px 0;
}

.prompts-hint {
    margin: 0 0 16px 0;
    font-size: 13px;
    line-height: 1.5;
    color: #909399;
}

.prompts-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-bottom: 20px;
    padding: 16px 16px 4px 26px;
    border: 1px solid #edf0f7;
    border-radius: 10px;
    background: #fff;
}

.prompt-item {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 0 22px 18px;
    border-left: 1px solid #e6e2f2;
}
.prompt-item:last-child { border-left-color: transparent; }
.prompt-item::before {
    content: '';
    position: absolute;
    top: 4px;
    left: -6px;
    width: 10px;
    height: 10px;
    border: 1px solid #a75cff;
    border-radius: 50%;
    background: #fff;
}
.scene-narration { padding: 10px 12px; border-radius: 8px; background: #edf1ff; color: #465575; font-size: 13px; line-height: 1.7; overflow-wrap: anywhere; }
.scene-field-label { color: #536079; font-size: 13px; font-weight: 600; }
.scene-narration .scene-field-label { margin-right: 5px; }

.prompt-item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.prompt-label {
    font-size: 14px;
    font-weight: 500;
    color: #606266;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.prompt-status {
    font-size: 12px;
    font-weight: 400;
    padding: 1px 8px;
    border-radius: 999px;
}

.prompt-status.ok {
    color: #67c23a;
    background: #f0f9eb;
}

.prompt-status.pending {
    color: #e6a23c;
    background: #fdf6ec;
}

.prompt-textarea {
    width: 100%;
}

.generate-images-btn {
    width: 100%;
    height: 44px;
    font-size: 16px;
    margin-top: 8px;
}

.progress-info {
    margin-top: 24px;
    padding: 20px;
    background-color: #f5f7fa;
    border-radius: 8px;
}

.progress-text {
    margin-top: 12px;
    text-align: center;
    color: #606266;
    font-size: 14px;
}

.generated-book {
    width: 70%;
    flex-shrink: 0;
    background-color: #fff;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    min-height: 480px;
    max-height: none;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #c0c4cc;
    padding: 60px 20px;
}

.flow-image {
    max-width: 300px;
    max-height: 600px;
    object-fit: contain;
    display: block;
    margin: 0 auto;
    opacity: 0.4;
}

.empty-state i {
    font-size: 64px;
    margin-bottom: 16px;
}

.empty-state p {
    font-size: 16px;
    margin: 0;
}

.book-content {
    width: 100%;
    display: flex;
    flex-direction: column;
}

.book-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 32px;
    padding-bottom: 24px;
    border-bottom: 2px solid #ebeef5;
    gap: 20px;
}

.book-header-content {
    flex: 1;
    text-align: left;
}

.book-title {
    font-size: 24px;
    font-weight: 700;
    color: #303133;
    margin: 0 0 12px 0;
}

.book-summary {
    font-size: 14px;
    color: #606266;
    margin: 0;
    line-height: 1.6;
}

.download-btn {
    flex-shrink: 0;
    height: 40px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.download-btn :deep(.el-icon) {
    font-size: 16px;
}

.story-pages {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 20px;
    padding: 20px 0;
    width: 100%;
    box-sizing: border-box;
    align-items: start;
}

.story-page-card {
    display: flex;
    flex-direction: column;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    width: 100%;
    min-width: 0;
    overflow: visible;
    height: auto;
}

.story-page-card :deep(.el-card__body) {
    padding: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    height: 100%;
    min-height: 0;
    overflow: visible;
}

.story-page-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
}

.card-image {
    width: 100%;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    background-color: #f5f7fa;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    border-radius: 8px 8px 0 0;
    flex-shrink: 0;
}

.story-image {
    width: 100%;
    flex: 1;
    min-height: 0;
}

.image-slot,
.image-loading,
.image-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: #909399;
    background-color: #f5f7fa;
}

.image-slot i,
.image-loading i,
.image-placeholder i {
    font-size: 48px;
    margin-bottom: 12px;
}

.image-loading i {
    animation: rotating 2s linear infinite;
}

@keyframes rotating {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

.card-content {
    padding: 16px !important;
    flex: 1;
    display: flex !important;
    flex-direction: column !important;
    min-height: 0;
    width: 100%;
    box-sizing: border-box;
    visibility: visible !important;
    opacity: 1 !important;
}

.card-title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 12px 0;
}

.scene-text {
    font-size: 14px;
    line-height: 1.6;
    color: #606266;
    margin: 0 0 16px 0;
    text-align: left;
    flex: 1;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    line-clamp: 3;
    -webkit-line-clamp: 3;
}

.card-actions {
    margin-top: auto;
    padding-top: 12px;
    border-top: 1px solid #ebeef5;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.character-my-picker {
    margin-bottom: 8px;
}

.character-select {
    flex: 1;
    min-width: 0;
}

.page-version-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.92);
    border-top: 1px solid #ebeef5;
}

.page-version-btn {
    border: 1px solid #dcdfe6;
    background: #fff;
    color: #606266;
    font-size: 12px;
    font-weight: 600;
    padding: 2px 10px;
    border-radius: 999px;
    cursor: pointer;
}

.page-version-btn.active {
    border-color: #409eff;
    background: #ecf5ff;
    color: #409eff;
}

@media (max-width: 1200px) {
    .story-pages {
        grid-template-columns: repeat(2, 1fr) !important;
    }
}

@media (max-width: 1024px) {
    .inspiration-main {
        flex-direction: column;
    }

    /* 单列堆叠后放开固定高度，避免预览区被压成小滚动框 */
    .prompt-container,
    .generated-book {
        width: 100%;
        min-height: auto;
        max-height: none;
        overflow: visible;
    }
}

@media (max-width: 768px) {
    .inspiration-book {
        background: var(--kid-bg, #f5f7fa);
    }

    /* 故事页两列卡片，更紧凑、信息密度更高 */
    .story-pages {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 12px;
        padding: 14px 0;
    }

    .inspiration-main {
        padding: 12px;
        width: 100%;
        max-width: 100%;
        gap: 12px;
    }

    .prompt-container,
    .generated-book {
        width: 100%;
        min-height: auto;
        max-height: none;
        overflow: visible;
        padding: 16px;
        border-radius: var(--kid-radius, 16px);
        box-shadow: var(--kid-shadow-soft, 0 2px 10px rgba(24, 24, 40, 0.06));
    }

    .story-page-card {
        border-radius: var(--kid-radius, 16px);
    }

    /* 书名与下载按钮在窄屏纵向排列 */
    .book-header {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
        margin-bottom: 20px;
        padding-bottom: 16px;
    }

    .download-btn {
        width: 100%;
        justify-content: center;
    }

    .section-title {
        font-size: 16px;
    }

    .book-title {
        font-size: 20px;
    }

    .book-summary,
    .scene-text {
        font-size: 13px;
    }

    .card-title {
        font-size: 13px;
    }
}

@media (max-width: 420px) {
    /* 超小屏回退单列，保证卡片信息可读 */
    .story-pages {
        grid-template-columns: 1fr !important;
    }
}

/* 风格选择（带预览图） */
.style-picker-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-top: 8px;
    width: 100%;
    max-height: min(320px, 42vh);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-right: 4px;
}

.style-picker-item {
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    padding: 6px;
    border-radius: 10px;
    border: 1px solid #ececf0;
    background: #fff;
    cursor: pointer;
    text-align: center;
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.style-picker-item:hover {
    border-color: #d6d9df;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
    transform: translateY(-1px);
}

.style-picker-item.selected {
    border-color: #5b5bd6;
    box-shadow: 0 0 0 2px rgba(91, 91, 214, 0.35);
    background: #f7f7ff;
}

.style-picker-thumb {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 8px;
    overflow: hidden;
    background: #f0f1f3;
    border: 1px solid rgba(0, 0, 0, 0.04);
    display: flex;
    align-items: center;
    justify-content: center;
}

.style-picker-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.style-picker-fallback {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #e8eaf0 0%, #f5f6f8 100%);
}

.style-picker-label {
    font-size: 11px;
    line-height: 1.3;
    color: #303133;
    font-weight: 500;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

@media (max-width: 420px) {
    .style-picker-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}
</style>

