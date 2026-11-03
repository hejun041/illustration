<template>
    <div class="container">
        <div class="main-layout">
            <!-- 左侧：参考图和prompt输入 -->
            <div class="left-panel">
                <el-card class="panel-card" shadow="hover">
                    <template #header>
                        <div class="card-header">
                            <span>{{ $t('createGroupImages.title') }}</span>
                        </div>
                    </template>
                    <div class="panel-content-wrapper">
                    <div class="panel-content">
                        <!-- 参考图上传/导入 -->
                        <div class="reference-section">
                         
                            
                            <!-- 如果还没有参考图，显示上传和导入选项 -->
                            <div v-if="!referenceImageUrl" class="reference-upload">
                                <!-- 上传图片 -->
                                <el-upload
                                    ref="reference-upload"
                                    class="upload-demo"
                                    drag
                                    :action="uploadAction"
                                    :file-list="referenceFileList"
                                    :show-file-list="false"
                                    :auto-upload="false"
                                    :on-change="handleReferenceChange"
                                    :on-remove="handleReferenceRemove"
                                    :limit="1"
                                    accept="image/jpeg,image/jpg,image/png">
                                    <i class="el-icon-upload"></i>
                                    <div class="el-upload__text">{{ $t('createGroupImages.dragUpload') }}</div>
                                    <template #tip>
                                        <div class="el-upload__tip">
                                            {{ $t('createGroupImages.uploadTip') }}
                                        </div>
                                    </template>
                                </el-upload>
                                
                                <!-- 从我的角色页面导入 -->
                                <div class="import-section">
                                    <el-button
                                        type="primary"
                                        plain
                                        @click="goToMyCharacters">
                                        {{ $t('createGroupImages.importFromCharacters') }}
                                    </el-button>
                                </div>
                            </div>
                            
                            <!-- 如果已有参考图，显示预览和操作 -->
                            <div v-else class="reference-preview">
                                <el-image 
                                    :src="referenceImageUrl" 
                                    fit="contain"
                                    class="reference-image"
                                    :preview-src-list="[referenceImageUrl]"
                                    @error="handleImageLoadError">
                                    <template #error>
                                        <div class="image-slot">
                                            <i class="el-icon-picture-outline"></i>
                                        </div>
                                    </template>
                                </el-image>
                                <div class="reference-actions">
                                    <el-button 
                                        size="small" 
                                        @click="handleReferenceRemove">
                                        <i class="el-icon-delete"></i> {{ $t('createGroupImages.delete') }}
                                    </el-button>
                                </div>
                            </div>
                        </div>

                        <!-- 风格选择 -->
                        <div class="style-section">
                            <label class="cgi-label">{{ $t('createGroupImages.groupStyle') }}</label>
                            <el-radio-group v-model="styleMode" class="cgi-style-modes" :aria-label="$t('createGroupImages.groupStyle')">
                                <el-radio label="original">{{ $t('createGroupImages.keepOriginalStyle') }}</el-radio>
                                <el-radio label="selected">{{ $t('createGroupImages.chooseNewStyle') }}</el-radio>
                            </el-radio-group>
                            <p class="cgi-style-hint">{{ $t(styleMode === 'original' ? 'createGroupImages.originalStyleHint' : 'createGroupImages.newStyleHint') }}</p>
                            <el-popover v-if="styleMode === 'selected'" placement="bottom" :width="280" trigger="click">
                                <template #reference>
                                    <button type="button" class="cgi-style-trigger">
                                        <img v-if="selectedStyleImage" :src="selectedStyleImage" alt="" class="cgi-style-thumb" />
                                        <span>{{ selectedStyleLabel }}</span>
                                        <span class="cgi-caret">▾</span>
                                    </button>
                                </template>
                                <div class="cgi-style-popover">
                                    <button
                                        v-for="s in styles"
                                        :key="s.key"
                                        type="button"
                                        class="cgi-style-opt"
                                        :class="{ active: artStyleKey === s.key }"
                                        @click="selectStyle(s.key)"
                                    >
                                        <img v-lazy-image="s.image" decoding="async" :alt="s.artStyle" />
                                        <span>{{ s.artStyle }}</span>
                                    </button>
                                </div>
                            </el-popover>
                        </div>

                        <!-- Prompt输入框 -->
                        <div class="prompt-section">
                            
                            <div class="prompt-inputs">
                                <el-input
                                    v-for="(prompt, index) in prompts"
                                    :key="index"
                                    v-model="prompts[index]"
                                    type="textarea"
                                    :rows="3"
                                    :placeholder="$t('createGroupImages.promptPlaceholder')"
                                    class="prompt-input"
                                    maxlength="200"
                                    show-word-limit>
                                </el-input>
                                </div>
                            </div>
                        </div>

                        <!-- 提交按钮 - 固定在底部 -->
                        <div class="submit-section">
                            <div class="generate-btn-wrapper">
                            <el-button 
                                type="primary" 
                                size="large"
                                @click="handleSubmit"
                                :loading="processing"
                                :disabled="!canSubmit">
                                <i class="el-icon-magic-stick"></i> {{ $t('createGroupImages.startGenerate') }}
                            </el-button>
                                <div class="points-hint">{{ $t('createGroupImages.pointsHint') }}</div>
                            </div>
                        </div>
                    </div>
                </el-card>
            </div>

            <!-- 右侧：生成结果展示 -->
            <div class="right-panel">
                <el-card class="result-card" shadow="hover">
                    <template #header>
                        <div class="card-header">
                            <span>{{ $t('createGroupImages.resultTitle') }}</span>
                        </div>
                    </template>
                    <div class="result-content">
                        <div v-if="!filteredResultImages.length && !processing" class="result-placeholder">
                            <i class="el-icon-picture-outline"></i>
                            <p>{{ $t('createGroupImages.startCreating') }}</p>
                        </div>
                        <div v-if="processing" class="result-loading">
                            <i class="el-icon-loading"></i>
                            <p>{{ $t('createGroupImages.generatingProgress', { current: generationCurrent, total: generationTotal }) }}</p>
                        </div>
                        <div v-if="generationErrors.length" class="generation-errors" role="alert">
                            <p v-for="error in generationErrors" :key="error.order">{{ $t('createGroupImages.imageError', error) }}</p>
                        </div>
                        <el-scrollbar v-if="filteredResultImages.length > 0" class="result-scrollbar">
                            <div class="result-images">
                        <el-card 
                        v-for="(image, index) in filteredResultImages" 
                        :key="`image-${image.order || index}`"
                                    class="content-card"
                                    shadow="hover">
                                    <div class="card-image">
                                <el-image lazy loading="lazy" decoding="async"
                            :src="image.url || image" 
                                            fit="cover"
                                            class="cover-image"
                            :preview-src-list="filteredResultImageUrls"
                            :preview-teleported="true"
                            :hide-on-click-modal="true"
                            :z-index="3000">
                                            <template #error>
                                                <div class="image-slot">
                                                    <i class="el-icon-picture-outline"></i>
                                                </div>
                                            </template>
                                </el-image>
                            </div>
                                    <div class="card-content">
                                <h3 class="card-title">{{ characterTitle }} - {{ $t('createGroupImages.imageNumber', { number: getDisplayOrder(image, index) }) }}</h3>
                                        <div class="card-actions">
                                            <el-button 
                                                type="primary" 
                                                size="small" 
                                                @click="collectIllustration(image, index)">
                                                {{ $t('createGroupImages.collectIllustration') }}
                                            </el-button>
                                            <el-button
                                                size="small"
                                                :loading="downloadingImageKey === getDisplayOrder(image, index)"
                                                @click="downloadGroupImage(image, index)">
                                                {{ $t('createGroupImages.download') }}
                                            </el-button>
                        </div>
                    </div>
                </el-card>
            </div>
                        </el-scrollbar>
                    </div>
                </el-card>
            </div>
        </div>
    </div>
</template>

<script>
import { ElMessage } from 'element-plus'
import { takeCreateGroupImagesReference } from '@/utils/createGroupImagesHandoff';
import { loadIllustrationStyles } from '@/utils/illustrationStyles';
import { resolveStyleInfo } from '@/utils/characterStudioPrompt';
import { postCreateCharacter, isCreateCharacterResponseOk, resolveGenerationImageUrl } from '@/utils/createCharacterTask';
import { extractApiErrorMessage, extractErrorMessage } from '@/utils/insufficientPoints';

const STYLE_STORAGE_KEY = 'createGroupImages_styleKey';

export default {
    name: 'CreateGroupImages',
    data() {
        return {
            // 参考图相关
            referenceImageUrl: null,
            referenceFile: null,
            referenceFileList: [],
            uploadAction: '#', // 不需要实际上传，只是用于组件
            
            // 10个prompt输入框
            prompts: Array(10).fill(''),

            // 风格
            styleMode: 'original',
            artStyleKey: localStorage.getItem(STYLE_STORAGE_KEY) || 'healingWatercolor',
            illustrationStyles: [],
            
            // 处理状态
            processing: false,
            generationCurrent: 0,
            generationTotal: 0,
            generationErrors: [],
            
            // 生成结果
            resultImages: [],
            downloadingImageKey: null,
            // 角色名称（用于生成标题）
            characterName: localStorage.getItem('lastCharacterName') || '',
            
            // API配置
            apiBaseUrl: process.env.VUE_APP_API_BASE_URL || ''
        };
    },
    computed: {
        canSubmit() {
            // 至少有一个参考图和一个prompt
            return this.referenceImageUrl && this.prompts.some(p => p && p.trim());
        },
        // 过滤掉已收集的插画（现在直接从resultImages中删除，所以直接返回resultImages）
        filteredResultImages() {
            return this.resultImages || [];
        },
        // 仅用于预览的图片URL数组
        filteredResultImageUrls() {
            return (this.resultImages || []).map(img => img.url || img);
        },
        // 角色标题前缀（只有在有角色ID时才使用角色名称）
        characterTitle() {
            const characterId = localStorage.getItem('lastCharacterId') || localStorage.getItem('viewCharacterId');
            // 只有在有角色ID的情况下才使用角色名称，否则使用默认名称
            if (characterId && this.characterName) {
                return this.characterName;
            }
            return this.$t('createGroupImages.groupIllustration');
        },
        styles() {
            return this.illustrationStyles;
        },
        selectedStyleLabel() {
            const s = this.styles.find((x) => x.key === this.artStyleKey);
            return s?.artStyle || this.$t('characterStudio.pickStyle');
        },
        selectedStyleImage() {
            const s = this.styles.find((x) => x.key === this.artStyleKey);
            return s?.image || null;
        },
        styleInfoText() {
            return resolveStyleInfo(this.styles, this.artStyleKey);
        },
    },
    activated() {
        this.importPendingReference();
        this.loadCharacterFromMyCharacters();
        this.loadIllustrationStylesList();
    },
    mounted() {
        this.importPendingReference();
        this.loadCharacterFromMyCharacters();
        this.loadGroupImagesFromLocalStorage();
        this.loadIllustrationStylesList();
    },
    methods: {
        async loadIllustrationStylesList() {
            const locale = this.$i18n?.locale === 'en' ? 'en' : 'zh';
            this.illustrationStyles = await loadIllustrationStyles({ locale, t: this.$t.bind(this) });
        },
        selectStyle(key) {
            this.artStyleKey = key;
            localStorage.setItem(STYLE_STORAGE_KEY, key);
        },
        importPendingReference() {
            const pendingRef = takeCreateGroupImagesReference();
            if (pendingRef) {
                this.referenceImageUrl = pendingRef;
                this.referenceFile = null;
                try {
                    if (!pendingRef.startsWith('data:') || pendingRef.length < 400000) {
                        localStorage.setItem('characterImage', pendingRef);
                    }
                } catch (e) {
                    /* 大图仅存内存，referenceImageUrl 已赋值即可 */
                }
                return;
            }
            this.applyStoredReferenceFallback();
        },
        /** 工作台 handoff 未命中时，读 lastCharacterId 对应的 characterImage 缓存 */
        applyStoredReferenceFallback() {
            const characterImage = localStorage.getItem('characterImage');
            if (characterImage && !this.referenceImageUrl) {
                this.referenceImageUrl = characterImage;
                this.referenceFile = null;
            }
        },
        
        // 跳转到创作工作台「我的角色」选择角色
        goToMyCharacters() {
            this.$router.push({
                name: 'character-studio',
                query: {
                    pickForGroup: '1',
                    return: this.$route.fullPath,
                },
            });
        },
        
        // 从"我的角色"页面加载角色信息
        loadCharacterFromMyCharacters() {
            // 检查是否有从"我的角色"页面传递过来的角色信息
            const characterDataStr = localStorage.getItem('selectedCharacterForGroupImages');
            
            if (characterDataStr) {
                try {
                    const characterData = JSON.parse(characterDataStr);
                    
                    // 清除标记，避免重复加载
                    localStorage.removeItem('selectedCharacterForGroupImages');
                    
                    // 加载角色图片
                    if (characterData.image_url) {
                        let imageUrl = characterData.image_url;
                        // 如果是相对路径，转换为完整URL
                        if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://') && !imageUrl.startsWith('data:')) {
                            imageUrl = `https://static.kidstory.cc/${imageUrl}`;
                        }
                        
                        this.referenceImageUrl = imageUrl;
                        this.referenceFile = null;
                        
                        // 保存角色ID（兼容 id / _id），用于后续保存组图
                        const characterId = characterData.id || characterData._id;
                        if (characterId) {
                            localStorage.setItem('lastCharacterId', String(characterId));
                        }
                        // 保存角色名称
                        if (characterData.character_name || characterData.name) {
                            this.characterName = characterData.character_name || characterData.name;
                            localStorage.setItem('lastCharacterName', this.characterName);
                        }
                    }
                } catch (error) {
                    console.error('解析角色信息失败:', error);
                }
            }
        },
        
        // 保存生成的组图到localStorage
        saveGroupImagesToLocalStorage(images) {
            try {
                if (images && images.length > 0) {
                    localStorage.setItem('groupImages', JSON.stringify(images));
                    
                } else {
                    // 如果没有图片，清除localStorage
                    localStorage.removeItem('groupImages');
                }
            } catch (error) {
                console.error('保存组图到localStorage失败:', error);
            }
        },
        
        // 从localStorage恢复生成的组图
        loadGroupImagesFromLocalStorage() {
            try {
                const savedImages = localStorage.getItem('groupImages');
                if (savedImages) {
                    const images = JSON.parse(savedImages);
                    if (Array.isArray(images) && images.length > 0) {
                        // 兼容历史数据（字符串数组），统一转换为对象数组并保留原始顺序
                        this.resultImages = images.map((img, idx) => {
                            if (typeof img === 'string') {
                                return { url: img, order: idx + 1 };
                            }
                            return { url: img.url || img, order: img.order || idx + 1 };
                        });
                        console.log('从localStorage恢复组图，共', images.length, '张');
                    }
                }
            } catch (error) {
                console.error('从localStorage恢复组图失败:', error);
            }
        },
        
        // 从resultImages和localStorage中删除已收集的插画
        removeCollectedImageFromLocalStorage(index) {
            try {
                // 从resultImages中删除对应索引的图片
                if (index >= 0 && index < this.resultImages.length) {
                    // 使用splice删除，确保响应式更新
                    this.resultImages.splice(index, 1);
                    // 更新localStorage（保存剩余的图片）
                    this.saveGroupImagesToLocalStorage(this.resultImages);
                    console.log('已从localStorage删除收集的插画，剩余', this.resultImages.length, '张');
                }
            } catch (error) {
                console.error('从localStorage删除已收集插画失败:', error);
            }
        },
        
        // 处理参考图上传
        handleReferenceChange(file, fileList) {
            const isImage = file.raw.type.startsWith('image/');
            const isLt5M = file.raw.size / 1024 / 1024 < 5;
            
            if (!isImage) {
                this.handleReferenceRemove();
                return;
            }
            
            if (!isLt5M) {
                this.handleReferenceRemove();
                return;
            }
            
            this.referenceFile = file.raw;
            this.referenceFileList = fileList;
            
            // 用户上传图片后，清除localStorage中的角色相关信息
            this.clearCharacterRelatedLocalStorage();
            
            // 生成预览URL
            const reader = new FileReader();
            reader.onload = (e) => {
                this.referenceImageUrl = e.target.result;
            };
            reader.onerror = () => {
                // 读取图片失败
            };
            reader.readAsDataURL(file.raw);
        },
        
        // 清除localStorage中与角色相关的信息
        // 当用户上传新图片时调用，表示不再使用之前的角色信息
        clearCharacterRelatedLocalStorage() {
            // 清除角色图片
            localStorage.removeItem('characterImage');
            // 清除角色名称
            this.characterName = '';
            localStorage.removeItem('lastCharacterName');
            // 清除角色ID（因为用户上传的图片与角色无关）
            localStorage.removeItem('lastCharacterId');
        },
        
        // 删除参考图
        handleReferenceRemove() {
            this.referenceFile = null;
            this.referenceFileList = [];
            this.referenceImageUrl = null;
            if (this.$refs['reference-upload']) {
                this.$refs['reference-upload'].clearFiles();
            }
        },
        
        // 处理图片加载错误
        handleImageLoadError() {
            // 图片加载失败时，直接删除参考图并显示上传框
            this.handleReferenceRemove();
        },
        
        // 提交生成
        async handleSubmit() {
            if (!this.canSubmit || this.processing) {
                return;
            }
            if (this.styleMode === 'selected' && !this.styleInfoText) {
                ElMessage.warning(this.$t('createGroupImages.selectStyleFirst'));
                return;
            }
            this.processing = true;
            this.generationErrors = [];
            
            try {
                // 过滤掉空的prompt，并在每个prompt前拼接前缀
                const prefix = this.$t('createGroupImages.promptPrefix');
                const separator = this.$i18n.locale.value === 'zh' ? '，' : ', ';
                const styleInfo = this.styleInfoText;
                const stylePart = this.styleMode === 'original'
                    ? `${separator}Preserve the reference image's existing visual style, palette, and texture.`
                    : (styleInfo ? `${separator}STYLE: ${styleInfo}` : '');
                const validPrompts = this.prompts
                    .filter(p => p && p.trim())
                    .map(p => `${prefix}${separator}${p.trim()}${stylePart}`);
                
                let referenceImageBase64 = null;
                if (this.referenceImageUrl) {
                    if (this.referenceImageUrl.startsWith('data:')) {
                        const response = await fetch(this.referenceImageUrl);
                        const blob = await response.blob();
                        const file = new File([blob], 'image.jpg', { type: blob.type });
                        const compressedBlob = await this.compressImage(file);
                        const reader = new FileReader();
                        referenceImageBase64 = await new Promise((resolve, reject) => {
                            reader.onload = () => resolve(reader.result);
                            reader.onerror = reject;
                            reader.readAsDataURL(compressedBlob);
                        });
                    } else if (this.referenceFile) {
                        referenceImageBase64 = await this.fileToBase64(this.referenceFile, true);
                    } else {
                        referenceImageBase64 = await this.imageUrlToBase64(this.referenceImageUrl, true);
                    }
                }

                if (!referenceImageBase64) throw new Error(this.$t('createGroupImages.noCharacterImage'));

                this.resultImages = [];
                this.saveGroupImagesToLocalStorage(this.resultImages);
                this.generationTotal = validPrompts.length;
                for (let index = 0; index < validPrompts.length; index++) {
                    this.generationCurrent = index + 1;
                    try {
                        const responseData = await postCreateCharacter(this.$http, {
                            prompt: validPrompts[index],
                            size: '1280x960',
                            image: referenceImageBase64,
                            watermark: false,
                        }, { apiBaseUrl: this.apiBaseUrl, source: 'group_images' });
                        if (!isCreateCharacterResponseOk(responseData) || !responseData.message) {
                            throw new Error(extractApiErrorMessage(responseData) || this.$t('createGroupImages.generateFailed'));
                        }
                        const result = responseData.message;
                        if (result.points !== undefined && this.$store?.state) {
                            this.$store.commit('setUserInfo', {
                                ...(this.$store.state.userInfo || {}),
                                points: result.points,
                            });
                        }
                        const imageUrl = resolveGenerationImageUrl(result, this.apiBaseUrl);
                        if (!imageUrl) throw new Error(this.$t('createGroupImages.noGeneratedImage'));
                        this.resultImages.push({ url: imageUrl, order: index + 1 });
                        this.saveGroupImagesToLocalStorage(this.resultImages);
                    } catch (error) {
                        this.generationErrors.push({
                            order: index + 1,
                            message: extractErrorMessage(error) || this.$t('createGroupImages.generateFailed'),
                        });
                        if (error.insufficientPoints) break;
                    }
                }
            } catch (error) {
                ElMessage.error(extractErrorMessage(error) || this.$t('createGroupImages.generateFailed'));
            } finally {
                this.processing = false;
            }
        },
        
        // 获取图片尺寸（从URL或Base64）
        getImageSize(imageUrl) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    resolve({
                        width: img.width,
                        height: img.height
                    });
                };
                img.onerror = () => {
                    // 图片加载失败时，清除参考图并显示上传框
                    this.handleReferenceRemove();
                  
                    reject(new Error('无法获取图片尺寸'));
                };
                img.src = imageUrl;
            });
        },
        
        // 从文件获取图片尺寸
        getImageSizeFromFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        resolve({
                            width: img.width,
                            height: img.height
                        });
                    };
                    img.onerror = () => {
                        // 图片加载失败时，清除参考图并显示上传框
                        this.handleReferenceRemove();
                       
                        reject(new Error('无法获取图片尺寸'));
                    };
                    img.src = e.target.result;
                };
                reader.onerror = () => {
                    // 文件读取失败时，清除参考图并显示上传框
                    this.handleReferenceRemove();
                   
                    reject(new Error('读取文件失败'));
                };
                reader.readAsDataURL(file);
            });
        },
        
        // 压缩图片
        compressImage(file, maxWidth = 1024, maxHeight = 1024, quality = 0.7, maxSizeKB = 800) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        // 计算新尺寸
                        let width = img.width;
                        let height = img.height;
                        
                        if (width > maxWidth || height > maxHeight) {
                            if (width > height) {
                                height = (height * maxWidth) / width;
                                width = maxWidth;
                            } else {
                                width = (width * maxHeight) / height;
                                height = maxHeight;
                            }
                        }
                        
                        // 创建canvas进行压缩
                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        // 转换为blob，并检查大小
                        canvas.toBlob((blob) => {
                            const sizeKB = blob.size / 1024;
                            if (sizeKB <= maxSizeKB) {
                                // 如果已经小于限制，直接返回
                                resolve(blob);
                            } else {
                                // 如果还是太大，降低质量继续压缩
                                let currentQuality = quality;
                                const compressRecursive = () => {
                                    canvas.toBlob((compressedBlob) => {
                                        const compressedSizeKB = compressedBlob.size / 1024;
                                        if (compressedSizeKB <= maxSizeKB || currentQuality <= 0.1) {
                                            resolve(compressedBlob);
                                        } else {
                                            currentQuality -= 0.1;
                                            compressRecursive();
                                        }
                                    }, 'image/jpeg', currentQuality);
                                };
                                compressRecursive();
                            }
                        }, 'image/jpeg', quality);
                    };
                    img.onerror = () => {
                        // 图片加载失败时，清除参考图并显示上传框
                        this.handleReferenceRemove();
                      
                        reject(new Error('图片加载失败'));
                    };
                    img.src = e.target.result;
                };
                reader.onerror = () => {
                    // 文件读取失败时，清除参考图并显示上传框
                    this.handleReferenceRemove();
                  
                    reject(new Error('文件读取失败'));
                };
                reader.readAsDataURL(file);
            });
        },
        
        // 将文件转换为Base64（带压缩）
        async fileToBase64(file, compress = true) {
            try {
                let fileToConvert = file;
                
                // 如果需要压缩且文件是图片
                if (compress && file.type && file.type.startsWith('image/')) {
                    const compressedBlob = await this.compressImage(file);
                    fileToConvert = compressedBlob;
                }
                
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result); // 结果已经是 data:image/xxx;base64, 格式
                    reader.onerror = reject;
                    reader.readAsDataURL(fileToConvert);
                });
            } catch (error) {
                console.error('转换文件为Base64失败:', error);
                // 如果压缩失败，尝试不压缩直接转换
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            }
        },
        
        // 将图片URL转换为Base64（带压缩）
        async imageUrlToBase64(imageUrl, compress = true) {
            try {
                // 如果已经是base64格式，需要压缩
                if (imageUrl.startsWith('data:')) {
                    if (compress) {
                        const response = await fetch(imageUrl);
                        const blob = await response.blob();
                        const file = new File([blob], 'image.jpg', { type: blob.type });
                        const compressedBlob = await this.compressImage(file);
                        return new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result);
                            reader.onerror = reject;
                            reader.readAsDataURL(compressedBlob);
                        });
                    }
                    return imageUrl;
                }
                
                // 使用fetch获取图片
                const response = await fetch(imageUrl);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const blob = await response.blob();
                
                // 如果需要压缩
                if (compress && blob.type && blob.type.startsWith('image/')) {
                    const file = new File([blob], 'image.jpg', { type: blob.type });
                    const compressedBlob = await this.compressImage(file);
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            resolve(reader.result); // 结果已经是 data:image/xxx;base64, 格式
                        };
                        reader.onerror = (error) => {
                            console.error('FileReader错误:', error);
                            reject(new Error('读取图片数据失败'));
                        };
                        reader.readAsDataURL(compressedBlob);
                    });
                }
                
                // 不压缩直接转换
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        resolve(reader.result); // 结果已经是 data:image/xxx;base64, 格式
                    };
                    reader.onerror = (error) => {
                        console.error('FileReader错误:', error);
                        reject(new Error('读取图片数据失败'));
                    };
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                console.error('转换图片URL为Base64失败:', error);
                console.error('图片URL:', imageUrl);
                
                // 如果是CORS错误，尝试使用Canvas方式转换（绕过CORS限制）
                if (error.message.includes('CORS') || error.message.includes('Failed to fetch') || error.name === 'TypeError') {
                    try {
                        return await this.imageUrlToBase64WithCanvas(imageUrl, compress);
                    } catch (canvasError) {
                        console.error('Canvas方式转换也失败:', canvasError);
                        // 图片加载失败时，清除参考图并显示上传框
                        this.handleReferenceRemove();
                      
                        throw new Error('图片跨域访问失败，请确保图片URL可访问或使用base64格式');
                    }
                }
                
                // 图片加载失败时，清除参考图并显示上传框
                this.handleReferenceRemove();
                throw new Error('转换参考图为Base64失败: ' + error.message);
            }
        },
        
        // 使用Canvas方式转换图片URL为Base64（可以绕过部分CORS限制，带压缩）
        async imageUrlToBase64WithCanvas(imageUrl, compress = true) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                img.onload = async () => {
                    try {
                        const canvas = document.createElement('canvas');
                        
                        // 如果需要压缩，调整尺寸
                        if (compress) {
                            let width = img.width;
                            let height = img.height;
                            const maxWidth = 1024;
                            const maxHeight = 1024;
                            
                            if (width > maxWidth || height > maxHeight) {
                                if (width > height) {
                                    height = (height * maxWidth) / width;
                                    width = maxWidth;
                                } else {
                                    width = (width * maxHeight) / height;
                                    height = maxHeight;
                                }
                            }
                            canvas.width = width;
                            canvas.height = height;
                        } else {
                            canvas.width = img.width;
                            canvas.height = img.height;
                        }
                        
                        const ctx = canvas.getContext('2d');
                        if (compress) {
                            ctx.fillStyle = '#ffffff';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                        }
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        
                        // 如果需要压缩，使用JPEG格式和质量
                        if (compress) {
                            // 使用toBlob获取压缩后的blob，然后转换为base64
                            canvas.toBlob((blob) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve(reader.result);
                                reader.onerror = () => reject(new Error('读取压缩图片失败'));
                                reader.readAsDataURL(blob);
                            }, 'image/jpeg', 0.7);
                        } else {
                            const base64 = canvas.toDataURL('image/png');
                            resolve(base64);
                        }
                    } catch (error) {
                        reject(new Error('Canvas转换失败: ' + error.message));
                    }
                };
                
                img.onerror = () => {
                    // 图片加载失败时，清除参考图并显示上传框
                    this.handleReferenceRemove();
                    reject(new Error('图片加载失败'));
                };
                
                img.src = imageUrl;
            });
        },

        // 保持插画序号稳定（收集后不重新计算）
        getDisplayOrder(image, index) {
            if (!image) return index + 1;
            // 已有序号直接返回
            if (image.order) return image.order;
            // 若缺少序号，则写入一次，防止删除前面的图片后序号重置
            const order = image._order || (index + 1);
            image.order = order;
            return order;
        },
        
        // 收集插画（发送URL给后端，由后端下载并保存）
        async collectIllustration(imageUrl, index) {
            try {
                const displayOrder = this.getDisplayOrder(imageUrl, index);
                const pictureUrl = imageUrl && imageUrl.url ? imageUrl.url : imageUrl;
                ElMessage.info(this.$t('createGroupImages.savingImage', { number: displayOrder }));
                
                // 处理URL格式
                let pictureValue = pictureUrl;
                
                // 如果是相对路径，转换为完整URL
                if (pictureValue && !pictureValue.startsWith('http://') && !pictureValue.startsWith('https://') && !pictureValue.startsWith('data:')) {
                    pictureValue = `https://static.kidstory.cc/${pictureValue}`;
                }
                
                // 获取角色ID
                const characterId = localStorage.getItem('lastCharacterId') || localStorage.getItem('viewCharacterId');
                // 只有在有角色ID的情况下才使用角色名称，否则使用默认名称
                const defaultTitle = this.$t('createGroupImages.groupIllustration');
                const titlePrefix = characterId && this.characterName ? this.characterName : defaultTitle;
                
                // 构建请求数据
                // 后端支持三种方式：
                // 1. 文件上传（FormData）- picture 字段为 File 对象
                // 2. Base64 - picture 字段为 base64 字符串（data:image/...;base64,... 格式）
                // 3. URL（新增）- picture 字段为 URL 字符串（自动下载并保存）
                const requestData = {
                    picture: pictureValue, // 使用 picture 字段，支持 URL 或 base64
                    title: `${titlePrefix} - 第 ${displayOrder} 张`,
                    description: `${titlePrefix} 的第 ${displayOrder} 张插画`,
                    type: 'others', // 默认类别为"其他"
                    character_id: characterId || undefined // 直接关联角色ID（只有在有角色ID时才关联）
                };
                
                // 移除 undefined 的字段
                Object.keys(requestData).forEach(key => {
                    if (requestData[key] === undefined) {
                        delete requestData[key];
                    }
                });
                
                // 获取token
                const token = localStorage.getItem('token') || '';
                if (!token) {
                    ElMessage.error(this.$t('createGroupImages.pleaseLogin'));
                    return;
                }
                
                // 发送JSON请求到服务器（后端负责下载图片并保存）
                // 使用 application/json Content-Type
                const response = await this.$http.post('/ill/', requestData, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    }
                });
                
                // 检查响应
                if (response.data && (response.data.desc === 'success' || response.data.code === 0 || response.data.code === '0')) {
                    // 从resultImages和localStorage中删除已收集的插画
                    this.removeCollectedImageFromLocalStorage(index);
                    
                    // 立即触发视图更新
                    await this.$nextTick();
                    this.$forceUpdate();
                    
                    ElMessage.success(this.$t('createGroupImages.imageSaved', { number: index + 1 }));
                } else {
                    throw new Error(response.data?.message || this.$t('createGroupImages.saveFailed'));
                }
            } catch (error) {
                console.error('收集插画失败:', error);
                const errorMessage = error.response?.data?.message || error.message || this.$t('createGroupImages.saveFailedRetry');
                ElMessage.error(this.$t('createGroupImages.collectFailed', { message: errorMessage }));
            }
        },

        async downloadGroupImage(image, index) {
            const displayOrder = this.getDisplayOrder(image, index);
            if (this.downloadingImageKey === displayOrder) return;

            let pictureUrl = image?.url || image;
            if (!pictureUrl) {
                ElMessage.error(this.$t('createGroupImages.downloadFailed'));
                return;
            }

            if (
                !pictureUrl.startsWith('http://') &&
                !pictureUrl.startsWith('https://') &&
                !pictureUrl.startsWith('data:')
            ) {
                pictureUrl = `https://static.kidstory.cc/${pictureUrl}`;
            }

            this.downloadingImageKey = displayOrder;
            try {
                const characterId = localStorage.getItem('lastCharacterId') || localStorage.getItem('viewCharacterId');
                const defaultTitle = this.$t('createGroupImages.groupIllustration');
                const titlePrefix = characterId && this.characterName ? this.characterName : defaultTitle;
                const safeName = `${titlePrefix}-${displayOrder}`.replace(/[\\/:*?"<>|]/g, '_');

                if (pictureUrl.startsWith('data:')) {
                    const link = document.createElement('a');
                    link.href = pictureUrl;
                    link.download = `${safeName}.png`;
                    link.click();
                } else {
                    const response = await fetch(pictureUrl);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const blob = await response.blob();
                    const ext = blob.type.includes('jpeg') ? 'jpg' : 'png';
                    const blobUrl = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = `${safeName}.${ext}`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(blobUrl);
                }
                ElMessage.success(this.$t('createGroupImages.downloadSuccess'));
            } catch (error) {
                console.error('下载组图失败:', error);
                ElMessage.error(this.$t('createGroupImages.downloadFailed'));
            } finally {
                this.downloadingImageKey = null;
            }
        },
        
        
    }
      
      
};
</script>

<style scoped>
.container {
    width: 100%;
    height: calc(100vh - 50px - 40px);
    padding: 20px;
    box-sizing: border-box;
    background-color: #f5f7fa;
}

.main-layout {
    display: flex;
    gap: 20px;
    height: 100%;
}

.left-panel {
    flex: 0 0 40%;
    min-width: 0;
}

.right-panel {
    flex: 0 0 calc(60% - 20px);
    min-width: 0;
}

.panel-card,
.result-card {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.panel-card :deep(.el-card__body),
.result-card :deep(.el-card__body) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.card-header {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
}

.panel-content-wrapper {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 0 20px;
}

.panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px 0;
    min-height: 0;
}

.section-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 16px;
}

/* 参考图选择 */
.reference-section {
    margin-bottom: 32px;
}

.reference-upload {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.upload-demo {
    width: 100%;
}

.upload-demo  :deep(.el-upload) {
    width: 100%;
}

.upload-demo  :deep(.el-upload-dragger) {
    width: 240px;
    height: 180px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 2px dashed #d9d9d9;
    border-radius: 8px;
    background-color: #fafafa;
    transition: all 0.3s ease;
    cursor: pointer;
}

.upload-demo  :deep(.el-upload-dragger:hover) {
    border-color: #409eff;
    background-color: #f0f9ff;
}

.upload-demo  :deep(.el-upload-dragger .el-icon-upload) {
    font-size: 48px;
    color: #8c939d;
    margin-bottom: 12px;
    display: block;
}

.upload-demo  :deep(.el-upload-dragger .el-upload__text) {
    color: #606266;
    font-size: 14px;
    text-align: center;
    line-height: 1.5;
    margin: 0;
    display: block;
}

.upload-demo  :deep(.el-upload__tip) {
    text-align: center;
    margin-top: 12px;
    color: #909399;
    font-size: 12px;
    line-height: 1.5;
}

.import-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.import-tip {
    font-size: 12px;
    color: #909399;
}

.reference-preview {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.reference-image {
    width: 240px;
    height: 180px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #ebeef5;
    margin: 0 auto;
    display: block;
}

.reference-image  :deep(.el-image) {
    width: 100%;
    height: 100%;
}

.reference-image  :deep(.el-image__inner) {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.reference-actions {
    display: flex;
    justify-content: center;
}

/* 风格选择 */
.style-section {
    margin-bottom: 24px;
}
.cgi-style-modes { display: flex; flex-wrap: wrap; gap: 4px 16px; }
.cgi-style-modes :deep(.el-radio) { margin-right: 0; min-height: 40px; }
.cgi-style-hint { margin: 2px 0 10px; color: #77717d; font-size: 12px; line-height: 1.5; }

.cgi-label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 10px;
}

.cgi-style-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid #dcdfe6;
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
    font-size: 13px;
    text-align: left;
}

.cgi-style-thumb {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    object-fit: cover;
    flex-shrink: 0;
}

.cgi-caret {
    margin-left: auto;
    color: #999;
}

.cgi-style-popover {
    max-height: 320px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.cgi-style-opt {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 8px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
    font-size: 12px;
    text-align: left;
}

.cgi-style-opt img {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    object-fit: cover;
    flex-shrink: 0;
}

.cgi-style-opt.active,
.cgi-style-opt:hover {
    border-color: #8167a9;
    background: #f3f0f8;
}

/* Prompt输入 */
.prompt-section {
    margin-bottom: 32px;
}




.prompt-inputs {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.prompt-input {
    width: 100%;
}

/* 提交按钮 */
.submit-section {
    display: flex;
    justify-content: center;
    padding: 20px 0;
    border-top: 1px solid #ebeef5;
    background-color: #fff;
    flex-shrink: 0;
}

.generate-btn-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.points-hint {
    font-size: 12px;
    color: #909399;
    text-align: center;
    margin-top: 6px;
    line-height: 1.4;
}

/* 结果展示 */
.result-content {
    flex: 1;
    padding: 20px;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.result-scrollbar {
    flex: 1;
    min-height: 0;
}

.result-scrollbar  :deep(.el-scrollbar__wrap) {
    overflow-x: hidden;
}

.generation-errors {
    color: #b42318;
    font-size: 13px;
    padding: 0 16px;
}

.result-placeholder,
.result-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #909399;
}

.result-loading {
    height: auto;
    flex: none;
    padding: 16px;
}

.result-placeholder i,
.result-loading i {
    font-size: 64px;
    color: #c0c4cc;
    margin-bottom: 16px;
}

.result-loading i {
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

.result-images {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    width: 100%;
}

/* 单个卡片样式 */
.content-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    cursor: pointer;
    transition: transform 0.2s, opacity 0.3s, scale 0.3s;
}

.content-card:hover {
    transform: translateY(-4px);
}

/* 卡片图片区域 */
.card-image {
    width: 100%;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    position: relative;
    border-radius: 4px 4px 0 0;
    background-color: #f5f6fa;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    backface-visibility: hidden;
    transform: translateZ(0);
}

.cover-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: opacity 0.3s ease;
}

.cover-image :deep(.el-image__inner) {
    transition: transform 0.3s ease;
    will-change: transform;
}

.cover-image :deep(.el-image__preview-wrapper) {
    will-change: transform, opacity;
}

/* 优化预览遮罩层，防止闪烁 */
:deep(.el-image-viewer__wrapper) {
    backface-visibility: hidden;
    transform: translateZ(0);
    -webkit-font-smoothing: antialiased;
}

:deep(.el-image-viewer__mask) {
    transition: opacity 0.3s ease;
    will-change: opacity;
}

:deep(.el-image-viewer__canvas) {
    transition: transform 0.3s ease;
    will-change: transform;
}

.image-slot {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    background: #f5f7fa;
    color: #909399;
    font-size: 30px;
}

/* 卡片内容区域 */
.card-content {
    padding: 16px;
    flex: 1;
    display: flex;
    flex-direction: column;
}

.card-title {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: #303133;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.card-actions {
    margin-top: auto;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.collected-text {
    color: #67c23a;
    font-size: 14px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.collected-text::before {
    content: '✓';
    color: #67c23a;
    font-weight: bold;
    margin-right: 4px;
}

/* 滚动条样式 */
.panel-content::-webkit-scrollbar,
.result-content::-webkit-scrollbar {
    width: 6px;
}

.panel-content::-webkit-scrollbar-track,
.result-content::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb,
.result-content::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover,
.result-content::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
}
</style>

