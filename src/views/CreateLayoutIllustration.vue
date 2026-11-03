<template>
    <div class="container">
        <div class="main-layout">
            <!-- 左侧：我的角色列表（可拖拽） -->
            <div class="left-panel">
                <el-card class="panel-card" shadow="hover">
                    <template #header>
                        <div class="card-header">
                            <span>{{ $t('createLayoutIllustration.myCharacters') }}</span>
                            <el-button 
                                size="small" 
                                type="text" 
                                @click="refreshCharacters"
                                :loading="loadingCharacters">
                                <i class="el-icon-refresh"></i> {{ $t('createLayoutIllustration.refresh') }}
                            </el-button>
                        </div>
                    </template>
                    <div class="characters-list">
                        <!-- 加载中 -->
                        <div v-if="loadingCharacters" class="loading-state">
                            <i class="el-icon-loading"></i>
                            <p>{{ $t('createLayoutIllustration.loading') }}</p>
                        </div>
                        
                        <!-- 角色列表 -->
                        <div v-else-if="characterList.length > 0" class="characters-grid">
                            <div
                                v-for="character in characterList"
                                :key="character.id || character._id"
                                class="character-item"
                                draggable="true"
                                @dragstart="handleCharacterDragStart(character, $event)"
                                @dragend="handleCharacterDragEnd">
                                <div class="character-image">
                                    <el-image lazy loading="lazy" decoding="async"
                                        :src="getCharacterImageUrl(character)"
                                        fit="cover"
                                        class="character-img">
                                        <template #error>
                                            <div class="image-slot">
                                                <i class="el-icon-picture-outline"></i>
                                            </div>
                                        </template>
                                    </el-image>
                                </div>
                                <div class="character-name">
                                    {{ character.character_name || $t('createLayoutIllustration.unnamedCharacter') }}
                                </div>
                            </div>
                        </div>
                        
                        <!-- 空状态 -->
                        <div v-else class="empty-state">
                            <i class="el-icon-user"></i>
                            <p>{{ $t('createLayoutIllustration.noCharacters') }}</p>
                            <el-button 
                                type="primary" 
                                size="small"
                                @click="goToCreateCharacter">
                                {{ $t('createLayoutIllustration.createCharacter') }}
                            </el-button>
                        </div>
                    </div>
                </el-card>
            </div>

            <!-- 中间：布局编辑器 -->
            <div class="center-panel">
                <el-card class="panel-card" shadow="hover">
                    <div class="layout-editor">
                        <!-- 工具栏 -->
                        <div class="layout-toolbar">
                            <el-button-group>
                                <el-button 
                                    size="small" 
                                    @click="addLayoutBox"
                                    icon="el-icon-plus">
                                    添加角色
                                </el-button>
                                <el-button 
                                    size="small" 
                                    @click="deleteSelectedBox"
                                    :disabled="!selectedBoxId"
                                    icon="el-icon-delete">
                                    删除选中
                                </el-button>
                                <el-button 
                                    size="small" 
                                    @click="toggleGrid"
                                    :type="showGrid ? 'primary' : ''"
                                    icon="el-icon-menu">
                                    网格
                                </el-button>
                            </el-button-group>
                            
                            <el-button-group style="margin-left: 12px;">
                                <el-dropdown @command="applyPresetLayout">
                                    <el-button size="small" icon="el-icon-s-grid">
                                        预设布局 <i class="el-icon-arrow-down el-icon--right"></i>
                                    </el-button>
                                    <template #dropdown>
                                        <el-dropdown-menu>
                                            <el-dropdown-item command="left-right">左右分布</el-dropdown-item>
                                            <el-dropdown-item command="top-bottom">上下分布</el-dropdown-item>
                                            <el-dropdown-item command="grid-3x3">九宫格</el-dropdown-item>
                                            <el-dropdown-item command="center-surround">中心+环绕</el-dropdown-item>
                                        </el-dropdown-menu>
                                    </template>
                                </el-dropdown>
                            </el-button-group>
                            
                            <!-- 宽高比选择器 -->
                            <div class="aspect-ratio-selector">
                                <span class="aspect-label">{{ $t('creation.canvasRatio') }}</span>
                                <el-select 
                                    v-model="selectedAspectRatio" 
                                    @change="handleAspectRatioChange"
                                    size="small"
                                    style="width: 100px;">
                                    <el-option label="4:3" value="4:3"></el-option>
                                    <el-option label="1:1" value="1:1"></el-option>
                                    <el-option label="3:4" value="3:4"></el-option>
                                    <el-option label="9:16" value="9:16"></el-option>
                                    <el-option label="16:9" value="16:9"></el-option>
                                    <el-option label="2:1" value="2:1"></el-option>
                                </el-select>
                            </div>
                            
                            <div class="toolbar-info">
                                <span>已添加 {{ layoutBoxes.length }} 个角色</span>
                            </div>
                        </div>

                        <!-- 画布区域 -->
                        <div 
                            class="layout-canvas-wrapper"
                            ref="canvasWrapper"
                            @click="handleCanvasClick"
                            @mousemove="handleMouseMove"
                            @mouseup="handleMouseUp">
                            <div class="layout-canvas-stage" :style="canvasStageStyle">
                            <div 
                                class="layout-canvas-container"
                                :style="canvasContainerStyle">
                                <div 
                                    class="layout-canvas"
                                    :style="canvasStyle"
                                    ref="canvasRef">
                                
                                <!-- 网格线 -->
                                <div v-if="showGrid" class="grid-overlay">
                                    <div 
                                        v-for="i in 10" 
                                        :key="'v-' + i"
                                        class="grid-line vertical"
                                        :style="{ left: (i * 10) + '%' }">
                                    </div>
                                    <div 
                                        v-for="i in 10" 
                                        :key="'h-' + i"
                                        class="grid-line horizontal"
                                        :style="{ top: (i * 10) + '%' }">
                                    </div>
                                </div>

                                <!-- 布局框 -->
                                <div
                                    v-for="box in layoutBoxes"
                                    :key="box.id"
                                    class="layout-box"
                                    :class="{ 
                                        'selected': selectedBoxId === box.id,
                                        'locked': box.locked,
                                        'has-image': !!getBoxPreviewImageUrl(box)
                                    }"
                                    :style="getBoxStyle(box)"
                                    @mousedown.stop="handleBoxMouseDown(box.id, $event)"
                                    @click.stop="selectBox(box.id)">
                                    <!-- 角色参考图预览 -->
                                    <div v-if="getBoxPreviewImageUrl(box)" class="layout-box-preview">
                                        <img
                                            :src="getBoxPreviewImageUrl(box)"
                                            alt=""
                                            draggable="false"
                                        />
                                    </div>
                                    <!-- 布局框标签 -->
                                    <div class="box-label">
                                        {{ box.label || `角色${box.id}` }}
                                    </div>
                                    
                                    <!-- 调整大小的控制点 -->
                                    <template v-if="selectedBoxId === box.id && !box.locked">
                                        <div 
                                            v-for="handle in resizeHandles"
                                            :key="handle"
                                            class="resize-handle"
                                            :class="'handle-' + handle"
                                            :style="{ '--handle-size': (14 / canvasScale) + 'px' }"
                                            @pointerdown.stop.prevent="handleResizeStart(box.id, handle, $event)">
                                        </div>
                                    </template>
                                    
                                    <!-- 锁定图标 -->
                                    <div v-if="box.locked" class="lock-icon">
                                        <i class="el-icon-lock"></i>
                                    </div>
                                </div>
                                </div>
                            </div>
                            </div>
                        </div>
                    </div>
                </el-card>
            </div>

            <!-- 右侧：属性设置和生成结果 -->
            <div class="right-panel">
                <!-- 属性设置区域 -->
                <el-card class="panel-card" shadow="hover">
                    <template #header>
                        <div class="card-header">
                            <span>{{ $t('createLayoutIllustration.promptSettings') }}</span>
                        </div>
                    </template>
                    <div class="properties-section">
                        <!-- 背景提示词设置（始终显示） -->
                        <div class="background-prompt-section">
                            <div class="property-group">
                                <label>{{ $t('createLayoutIllustration.backgroundPrompt') || '背景提示词' }}</label>
                                <el-input
                                    v-model="backgroundPrompt"
                                    type="textarea"
                                    :rows="3"
                                    :placeholder="$t('createLayoutIllustration.backgroundPromptPlaceholder') || '例如：白色背景，简洁干净，无多余元素'"
                                    maxlength="200"
                                    show-word-limit>
                                </el-input>
                              
                            </div>
                        </div>
                        
                        <!-- 每位角色独立标签页：位置 / 大小 / Prompt -->
                        <div v-if="layoutBoxes.length > 0" class="character-tabs-section">
                            <p class="character-tabs-hint">{{ $t('createLayoutIllustration.characterTabsHint') }}</p>
                            <el-tabs
                                v-model="characterPropsTab"
                                class="character-props-tabs"
                                type="card"
                                @tab-change="handleCharacterTabChange">
                                <el-tab-pane
                                    v-for="box in layoutBoxes"
                                    :key="box.id"
                                    :name="String(box.id)">
                                    <template #label>
                                        <span class="character-tab-label">
                                            <span class="character-tab-title">{{ box.label || $t('createLayoutIllustration.character', { number: box.id }) }}</span>
                                            <el-button
                                                type="danger"
                                                link
                                                size="small"
                                                class="character-tab-remove"
                                                @click.stop="removeLayoutBox(box.id)">
                                                <i class="el-icon-delete"></i>
                                            </el-button>
                                        </span>
                                    </template>
                                    <div class="properties-content">
                                        <div class="property-group property-group-inline">
                                            <label>{{ $t('createLayoutIllustration.position') || '位置' }}</label>
                                            <div class="property-row">
                                                <el-input-number
                                                    v-model="box.position.xPercent"
                                                    :min="0"
                                                    :max="100"
                                                    :step="1"
                                                    size="small"
                                                    @change="updateBoxPosition(box.id)">
                                                    <template #prepend>X</template>
                                                    <template #append>%</template>
                                                </el-input-number>
                                                <el-input-number
                                                    v-model="box.position.yPercent"
                                                    :min="0"
                                                    :max="100"
                                                    :step="1"
                                                    size="small"
                                                    @change="updateBoxPosition(box.id)">
                                                    <template #prepend>Y</template>
                                                    <template #append>%</template>
                                                </el-input-number>
                                            </div>
                                        </div>
                                        <div class="property-group property-group-inline">
                                            <label>{{ $t('createLayoutIllustration.size') || '大小' }}</label>
                                            <div class="property-row">
                                                <el-input-number
                                                    v-model="box.size.widthPercent"
                                                    :min="5"
                                                    :max="100"
                                                    :step="1"
                                                    size="small"
                                                    @change="updateBoxSize(box.id)">
                                                    <template #prepend>{{ $t('createLayoutIllustration.width') || '宽' }}</template>
                                                    <template #append>%</template>
                                                </el-input-number>
                                                <el-input-number
                                                    v-model="box.size.heightPercent"
                                                    :min="5"
                                                    :max="100"
                                                    :step="1"
                                                    size="small"
                                                    @change="updateBoxSize(box.id)">
                                                    <template #prepend>{{ $t('createLayoutIllustration.height') || '高' }}</template>
                                                    <template #append>%</template>
                                                </el-input-number>
                                            </div>
                                        </div>
                                        <div class="property-group">
                                            <label>Prompt</label>
                                            <el-input
                                                v-model="box.prompt"
                                                type="textarea"
                                                :rows="4"
                                                :placeholder="$t('createLayoutIllustration.promptPlaceholder', { character: box.label || box.id })"
                                                maxlength="200"
                                                show-word-limit>
                                            </el-input>
                                        </div>
                                    </div>
                                </el-tab-pane>
                            </el-tabs>
                        </div>
                        
                        <!-- 如果没有布局框，显示提示 -->
                        <div v-if="layoutBoxes.length === 0" class="empty-prompt-hint">
                            <i class="el-icon-info"></i>
                            <p>{{ $t('createLayoutIllustration.dragCharacterHint') }}</p>
                        </div>
                    </div>
                </el-card>

                <!-- 生成按钮和结果 -->
                <el-card class="panel-card result-card" shadow="hover">
                    <template #header>
                        <div class="card-header">
                            <span>{{ $t('createLayoutIllustration.result') }}</span>
                        </div>
                    </template>
                    <div class="result-content">
                        <!-- 生成按钮 -->
                        <div class="generate-section">
                            <div class="generate-btn-wrapper">
                                <el-button 
                                    type="primary" 
                                    size="large"
                                    @click="handleGenerate"
                                    :loading="processing"
                                    :disabled="!canGenerate"
                                    class="generate-btn">
                                    <i class="el-icon-magic-stick"></i> 
                                    {{ processing ? $t('createLayoutIllustration.generating') : $t('createLayoutIllustration.startGenerate') }}
                                </el-button>
                                <div class="points-hint">{{ $t('createLayoutIllustration.pointsHint') }}</div>
                            </div>
                        </div>

                        <!-- 生成中 -->
                        <div v-if="processing" class="result-loading">
                            <i class="el-icon-loading"></i>
                            <p>{{ $t('createLayoutIllustration.generatingWait') }}</p>
                        </div>

                        <!-- 生成结果 -->
                        <div v-else-if="resultImageUrl" class="result-image">
                            <el-image
                                :src="resultImageUrl"
                                fit="contain"
                                class="generated-image"
                                :preview-src-list="[resultImageUrl]">
                                <template #error>
                                    <div class="image-slot">
                                        <i class="el-icon-picture-outline"></i>
                                    </div>
                                </template>
                            </el-image>
                            <div class="result-actions">
                                <el-button 
                                    type="primary" 
                                    size="small"
                                    @click="handleSave">
                                    <i class="el-icon-check"></i> {{ $t('createLayoutIllustration.save') }}
                                </el-button>
                                <el-button 
                                    size="small"
                                    @click="handleDownload">
                                    <i class="el-icon-download"></i> {{ $t('createLayoutIllustration.download') }}
                                </el-button>
                            </div>
                        </div>

                        <!-- 空状态 -->
                        <div v-else class="result-placeholder">
                            <i class="el-icon-picture-outline"></i>
                            <p>{{ $t('createLayoutIllustration.resultPlaceholder') }}</p>
                        </div>
                    </div>
                </el-card>
            </div>
        </div>
    </div>
</template>

<script>
import { ElMessage } from 'element-plus';
import { postCreateCharacter, isCreateCharacterResponseOk } from '@/utils/createCharacterTask';

export default {
    name: 'CreateLayoutIllustration',
    data() {
        return {
            // 角色列表
            characterList: [],
            loadingCharacters: false,
            
            // 布局编辑器
            layoutBoxes: [],
            
            // 生成状态
            processing: false,
            resultImageUrl: null,
            
            // 拖拽事件处理器（用于清理）
            canvasDragOverHandler: null,
            canvasDropHandler: null,
            
            // API配置
            apiBaseUrl: process.env.VUE_APP_API_BASE_URL || '',
            
            // 画布尺寸（默认 3:4 比例，使用 1280 作为高度基准）
            canvasWidth: 960, // 默认 3:4 比例 (1280 * 3/4 = 960)
            canvasHeight: 1280,
            canvasViewport: { width: 800, height: 600 },
            canvasResizeObserver: null,
            
            // 选中的布局框ID
            selectedBoxId: null,
            /** 右侧属性面板当前标签页（与 layoutBoxes[].id 对应，字符串） */
            characterPropsTab: '',
            
            // 布局编辑器相关
            showGrid: false,
            isDragging: false,
            isResizing: false,
            dragStartPos: { x: 0, y: 0 },
            resizeStartSize: { width: 0, height: 0 },
            resizeHandle: null,
            nextBoxId: 1,
            resizeHandles: ['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'],
            selectedAspectRatio: '3:4', // 默认 3:4 (竖屏，适合插画)
            
            // 背景提示词
            backgroundPrompt: '白色背景，简洁干净，无多余元素。'
        };
    },
    computed: {
        canGenerate() {
            // 至少需要一个布局框且有 prompt
            return this.layoutBoxes.length > 0 && 
                   this.layoutBoxes.some(box => box.prompt && box.prompt.trim());
        },
        // 选中的布局框
        selectedBox() {
            if (!this.selectedBoxId || !this.layoutBoxes || this.layoutBoxes.length === 0) {
                return null;
            }
            const box = this.layoutBoxes.find(box => box.id === this.selectedBoxId);
            return box || null;
        },
        // 计算画布尺寸（用于显示，确保完整显示在容器内）
        internalCanvasWidth() {
            return this.canvasWidth;
        },
        internalCanvasHeight() {
            return this.canvasHeight;
        },
        // 计算画布缩放比例（用于鼠标事件计算）
        canvasScale() {
            return Math.min(
                this.canvasViewport.width / this.canvasWidth,
                this.canvasViewport.height / this.canvasHeight,
                1.5
            );
        },
        canvasStageStyle() {
            return {
                width: `${this.canvasWidth * this.canvasScale}px`,
                height: `${this.canvasHeight * this.canvasScale}px`
            };
        },
        // 计算画布容器的缩放比例
        canvasContainerStyle() {
            // 实际尺寸（用于发送给后端，保持1280基准）
            const actualWidth = this.canvasWidth;
            const actualHeight = this.canvasHeight;
            
            // 计算缩放比例，确保画布完整显示
            const scale = this.canvasScale;
            
            return {
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                width: actualWidth + 'px',
                height: actualHeight + 'px',
                position: 'relative',
                margin: '0'
            };
        },
        canvasStyle() {
            // 使用实际尺寸（用于发送给后端，保持1280基准）
            return {
                width: this.canvasWidth + 'px',
                height: this.canvasHeight + 'px',
                position: 'relative',
                background: '#f5f5f5',
                border: '1px solid #ddd',
                boxSizing: 'border-box'
            };
        }
    },
    watch: {
        selectedBoxId(val) {
            if (val != null && this.layoutBoxes.some(b => b.id === val)) {
                this.characterPropsTab = String(val);
            } else if (val == null) {
                this.characterPropsTab = '';
            }
        }
    },
    mounted() {
        this.loadCharacters();
        const updateCanvasViewport = () => {
            const wrapper = this.$refs.canvasWrapper;
            if (!wrapper) return;
            const style = window.getComputedStyle(wrapper);
            const width = wrapper.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
            const height = wrapper.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
            if (width > 0 && height > 0) this.canvasViewport = { width, height };
        };
        this.canvasResizeObserver = new ResizeObserver(updateCanvasViewport);
        this.canvasResizeObserver.observe(this.$refs.canvasWrapper);
        updateCanvasViewport();
        // 延迟设置拖拽监听，确保画布已渲染
        setTimeout(() => {
            this.setupCanvasDropListeners();
        }, 500);
        // 初始化画布尺寸
        this.handleAspectRatioChange();
        // 初始化 nextBoxId
        if (this.layoutBoxes.length > 0) {
            this.nextBoxId = Math.max(...this.layoutBoxes.map(b => b.id), 0) + 1;
        }
    },
    beforeUnmount() {
        // 清理事件监听
        this.removeCanvasDropListeners();
        if (this.canvasResizeObserver) this.canvasResizeObserver.disconnect();
        this.handleDragEnd();
        this.handleResizeEnd();
    },
    methods: {
        // 加载角色列表
        async loadCharacters() {
            this.loadingCharacters = true;
            try {
                const userId = localStorage.getItem('id');
                if (!userId) {
                    ElMessage.warning(this.$t('createLayoutIllustration.pleaseLogin'));
                    this.characterList = [];
                    return;
                }
                
                const apiUrl = this.apiBaseUrl 
                    ? `${this.apiBaseUrl}/character`
                    : '/character';
                
                const response = await this.$http.get(apiUrl, {
                    params: {
                        ownerid: userId
                    },
                    headers: {
                        'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
                    }
                });
                
                if (response.data && (response.data.code === 0 || response.data.code === '0' || response.data.desc === 'success')) {
                    this.characterList = response.data.data || response.data.message || response.data.list || [];
                } else {
                    this.characterList = [];
                }
            } catch (error) {
                ElMessage.error(this.$t('createLayoutIllustration.loadCharactersFailed'));
                this.characterList = [];
            } finally {
                this.loadingCharacters = false;
            }
        },
        
        // 刷新角色列表
        refreshCharacters() {
            this.loadCharacters();
        },
        
        // 获取角色图片URL
        getCharacterImageUrl(character) {
            const imageUrl = character.image_url || character.character_image_url;
            if (!imageUrl) return '';
            
            // 如果已经是完整URL，直接返回
            if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                return imageUrl;
            }
            
            // 如果是相对路径，添加前缀
            if (imageUrl.startsWith('data:')) {
                return imageUrl;
            }
            
            return `https://static.kidstory.cc/${imageUrl}`;
        },

        /** 布局框内预览图 URL（与生成逻辑一致） */
        getBoxPreviewImageUrl(box) {
            const raw = box && box.characterImageUrl;
            if (!raw || !String(raw).trim()) return '';
            const imageUrl = String(raw).trim();
            if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                return imageUrl;
            }
            if (imageUrl.startsWith('data:')) {
                return imageUrl;
            }
            return `https://static.kidstory.cc/${imageUrl}`;
        },
        
        // 角色拖拽开始
        handleCharacterDragStart(character, event) {
            // 将角色数据存储到 dataTransfer
            event.dataTransfer.setData('application/json', JSON.stringify({
                type: 'character',
                character: character
            }));
            event.dataTransfer.effectAllowed = 'copy';
            
            // 添加拖拽样式
            event.target.classList.add('dragging');
        },
        
        // 角色拖拽结束
        handleCharacterDragEnd(event) {
            event.target.classList.remove('dragging');
        },
        
        // 设置画布拖拽监听
        setupCanvasDropListeners() {
            this.$nextTick(() => {
                const canvas = this.$refs.canvasRef;
                if (canvas) {
                    this.canvasDragOverHandler = (e) => this.handleCanvasDragOver(e);
                    this.canvasDropHandler = (e) => this.handleCanvasDrop(e);
                    canvas.addEventListener('dragover', this.canvasDragOverHandler);
                    canvas.addEventListener('drop', this.canvasDropHandler);
                }
            });
        },
        
        // 移除画布拖拽监听
        removeCanvasDropListeners() {
            const canvas = this.$refs.canvasRef;
            if (canvas && this.canvasDragOverHandler && this.canvasDropHandler) {
                canvas.removeEventListener('dragover', this.canvasDragOverHandler);
                canvas.removeEventListener('drop', this.canvasDropHandler);
            }
        },
        
        // 画布拖拽悬停
        handleCanvasDragOver(event) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
        },
        
        // 画布放置
        handleCanvasDrop(event) {
            event.preventDefault();
            
            try {
                const data = JSON.parse(event.dataTransfer.getData('application/json'));
                
                if (data.type === 'character' && data.character) {
                    // 获取画布位置
                    const canvas = this.$refs.canvasRef;
                    if (!canvas) return;
                    
                    const rect = canvas.getBoundingClientRect();
                    const x = event.clientX - rect.left;
                    const y = event.clientY - rect.top;
                    
                    // 转换为百分比
                    const xPercent = (x / rect.width) * 100;
                    const yPercent = (y / rect.height) * 100;
                    
                    // 创建布局框
                    this.addCharacterToLayout(data.character, xPercent, yPercent);
                }
            } catch (error) {
                // 解析失败，忽略
            }
        },
        
        // 添加角色到布局
        addCharacterToLayout(character, xPercent, yPercent) {
            // 使用内部方法添加布局框
            this.addLayoutBoxFromExternal({
                label: character.character_name || this.$t('createLayoutIllustration.unnamedCharacter'),
                xPercent: Math.max(0, Math.min(100, xPercent - 10)), // 默认大小20%，居中
                yPercent: Math.max(0, Math.min(100, yPercent - 10)),
                widthPercent: 20,
                heightPercent: 20,
                characterId: character.id || character._id,
                characterImageUrl: this.getCharacterImageUrl(character)
            });
            
            ElMessage.success(this.$t('createLayoutIllustration.characterAdded'));
        },
        
        // 移除布局框
        removeLayoutBox(boxId) {
            const index = this.layoutBoxes.findIndex(box => box.id === boxId);
            if (index === -1) return;
            const wasActiveTab = String(this.characterPropsTab) === String(boxId);
            this.layoutBoxes.splice(index, 1);
            if (this.layoutBoxes.length === 0) {
                this.selectedBoxId = null;
                this.characterPropsTab = '';
                return;
            }
            if (wasActiveTab || this.selectedBoxId === boxId) {
                const next = this.layoutBoxes[Math.min(index, this.layoutBoxes.length - 1)];
                this.characterPropsTab = String(next.id);
                this.selectBox(next.id);
            }
        },

        handleCharacterTabChange(name) {
            if (name === undefined || name === null || name === '') return;
            const id = typeof name === 'number' ? name : parseInt(String(name), 10);
            if (!Number.isNaN(id)) {
                this.selectBox(id);
            }
        },
        
        // 布局变化回调
        onLayoutChange() {
            // 布局已更新
        },
        
        // 在编辑器中选中布局框
        selectBoxInEditor(boxId) {
            this.selectBox(boxId);
        },
        
        // 更新布局框位置
        updateBoxPosition(boxId) {
            const box = this.layoutBoxes.find(b => b.id === boxId);
            if (!box) return;
            
            // 更新像素值
            box.position.x = (box.position.xPercent / 100) * this.internalCanvasWidth;
            box.position.y = (box.position.yPercent / 100) * this.internalCanvasHeight;
        },
        
        // 更新布局框大小
        updateBoxSize(boxId) {
            const box = this.layoutBoxes.find(b => b.id === boxId);
            if (!box) return;
            
            // 更新像素值
            box.size.width = (box.size.widthPercent / 100) * this.internalCanvasWidth;
            box.size.height = (box.size.heightPercent / 100) * this.internalCanvasHeight;
        },
        
        // ========== LayoutEditor 方法 ==========
        
        // 计算画布尺寸
        calculateCanvasSize() {
            // 使用 1280 作为基准，确保满足火山引擎的最小尺寸要求（最小 512x512）
            // 这样所有比例都能满足要求：
            // 3:4: 960x1280, 4:3: 1707x1280, 1:1: 1280x1280, 9:16: 720x1280, 16:9: 2276x1280, 2:1: 2560x1280
            const baseSize = 1280;
            let width, height;
            
            switch(this.selectedAspectRatio) {
                case '4:3':
                    height = baseSize;
                    width = Math.round(height * 4 / 3);
                    break;
                case '1:1':
                    height = baseSize;
                    width = height;
                    break;
                case '3:4':
                    height = baseSize;
                    width = Math.round(height * 3 / 4);
                    break;
                case '9:16':
                    height = baseSize;
                    width = Math.round(height * 9 / 16);
                    break;
                case '16:9':
                    height = baseSize;
                    width = Math.round(height * 16 / 9);
                    break;
                case '2:1':
                    height = baseSize;
                    width = height * 2;
                    break;
                default:
                    height = baseSize;
                    width = Math.round(height * 3 / 4);
            }
            
            return { width, height };
        },
        
        // 处理宽高比变化
        handleAspectRatioChange() {
            const size = this.calculateCanvasSize();
            this.canvasWidth = size.width;
            this.canvasHeight = size.height;
        },
        
        // 添加布局框
        addLayoutBox() {
            const newBox = this.createLayoutBox({
                xPercent: 40,
                yPercent: 40
            });
            this.layoutBoxes.push(newBox);
            this.selectBox(newBox.id);
        },
        
        // 创建布局框
        createLayoutBox(options = {}) {
            let boxId = options.id;
            if (!boxId) {
                boxId = this.nextBoxId++;
            } else {
                if (boxId >= this.nextBoxId) {
                    this.nextBoxId = boxId + 1;
                }
            }
            
            const {
                label = `角色${boxId}`,
                xPercent = 40,
                yPercent = 40,
                widthPercent = 20,
                heightPercent = 20,
                prompt = '',
                characterId = null,
                characterImageUrl = null,
                ...otherProps
            } = options;
            
            const newBox = {
                id: boxId,
                label,
                position: {
                    x: (xPercent / 100) * this.internalCanvasWidth,
                    y: (yPercent / 100) * this.internalCanvasHeight,
                    xPercent: Math.max(0, Math.min(100, xPercent)),
                    yPercent: Math.max(0, Math.min(100, yPercent))
                },
                size: {
                    width: (widthPercent / 100) * this.internalCanvasWidth,
                    height: (heightPercent / 100) * this.internalCanvasHeight,
                    widthPercent: Math.max(5, Math.min(100, widthPercent)),
                    heightPercent: Math.max(5, Math.min(100, heightPercent))
                },
                prompt,
                zIndex: this.layoutBoxes.length + 1,
                locked: false,
                ...otherProps
            };
            
            if (characterId) {
                newBox.characterId = characterId;
            }
            if (characterImageUrl) {
                newBox.characterImageUrl = characterImageUrl;
            }
            
            return newBox;
        },
        
        // 从外部添加布局框
        addLayoutBoxFromExternal(options) {
            const newBox = this.createLayoutBox(options);
            this.layoutBoxes.push(newBox);
            this.selectBox(newBox.id);
            return newBox;
        },
        
        // 删除选中的布局框
        deleteSelectedBox() {
            if (this.selectedBoxId) {
                const index = this.layoutBoxes.findIndex(box => box.id === this.selectedBoxId);
                if (index > -1) {
                    this.layoutBoxes.splice(index, 1);
                    this.selectedBoxId = null;
                }
            }
        },
        
        // 选择布局框
        selectBox(boxId) {
            this.selectedBoxId = boxId;
        },
        
        // 获取布局框样式
        getBoxStyle(box) {
            return {
                left: box.position.xPercent + '%',
                top: box.position.yPercent + '%',
                width: box.size.widthPercent + '%',
                height: box.size.heightPercent + '%',
                zIndex: box.zIndex
            };
        },
        
        // 布局框鼠标按下（开始拖拽）
        handleBoxMouseDown(boxId, event) {
            const box = this.layoutBoxes.find(b => b.id === boxId);
            if (!box || box.locked) return;
            
            this.isDragging = true;
            this.selectedBoxId = boxId;
            
            // 获取画布容器的位置（考虑缩放）
            const container = event.currentTarget.closest('.layout-canvas-container');
            const containerRect = container ? container.getBoundingClientRect() : this.$refs.canvasRef.getBoundingClientRect();
            const scale = this.canvasScale;
            
            // 计算鼠标位置（需要除以缩放比例）
            const mouseX = (event.clientX - containerRect.left) / scale;
            const mouseY = (event.clientY - containerRect.top) / scale;
            
            this.dragStartPos = {
                x: mouseX - (box.position.xPercent / 100 * this.internalCanvasWidth),
                y: mouseY - (box.position.yPercent / 100 * this.internalCanvasHeight)
            };
            
            document.addEventListener('mousemove', this.handleDragMove);
            document.addEventListener('mouseup', this.handleDragEnd);
        },
        
        // 拖拽移动
        handleDragMove(event) {
            if (!this.isDragging || !this.selectedBoxId) return;
            
            const box = this.layoutBoxes.find(b => b.id === this.selectedBoxId);
            if (!box || box.locked) return;
            
            // 获取画布容器的位置（考虑缩放）
            const container = document.querySelector('.layout-canvas-container');
            const containerRect = container ? container.getBoundingClientRect() : this.$refs.canvasRef.getBoundingClientRect();
            const scale = this.canvasScale;
            
            // 计算鼠标位置（需要除以缩放比例）
            const mouseX = (event.clientX - containerRect.left) / scale;
            const mouseY = (event.clientY - containerRect.top) / scale;
            
            const newX = mouseX - this.dragStartPos.x;
            const newY = mouseY - this.dragStartPos.y;
            
            box.position.xPercent = Math.max(0, Math.min(100 - box.size.widthPercent, (newX / this.internalCanvasWidth) * 100));
            box.position.yPercent = Math.max(0, Math.min(100 - box.size.heightPercent, (newY / this.internalCanvasHeight) * 100));
            
            box.position.x = (box.position.xPercent / 100) * this.internalCanvasWidth;
            box.position.y = (box.position.yPercent / 100) * this.internalCanvasHeight;
        },
        
        // 拖拽结束
        handleDragEnd() {
            this.isDragging = false;
            document.removeEventListener('mousemove', this.handleDragMove);
            document.removeEventListener('mouseup', this.handleDragEnd);
        },
        
        // 开始调整大小
        handleResizeStart(boxId, handle, event) {
            const box = this.layoutBoxes.find(b => b.id === boxId);
            if (!box || box.locked) return;
            
            if (event.button !== 0) return;
            this.selectedBoxId = boxId;
            this.isResizing = true;
            this.resizeHandle = handle;
            this.resizeStartSize = {
                width: box.size.widthPercent,
                height: box.size.heightPercent,
                x: box.position.xPercent,
                y: box.position.yPercent
            };
            
            this.dragStartPos = {
                x: event.clientX,
                y: event.clientY
            };
            
            document.addEventListener('pointermove', this.handleResizeMove);
            document.addEventListener('pointerup', this.handleResizeEnd);
            document.addEventListener('pointercancel', this.handleResizeEnd);
        },
        
        // 调整大小移动
        handleResizeMove(event) {
            if (!this.isResizing || !this.selectedBoxId) return;
            
            const box = this.layoutBoxes.find(b => b.id === this.selectedBoxId);
            if (!box || box.locked) return;
            
            const rect = this.$refs.canvasRef.getBoundingClientRect();
            const deltaX = (event.clientX - this.dragStartPos.x) / rect.width * 100;
            const deltaY = (event.clientY - this.dragStartPos.y) / rect.height * 100;
            const start = this.resizeStartSize;
            const right = start.x + start.width;
            const bottom = start.y + start.height;
            const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

            if (this.resizeHandle.includes('w')) {
                box.position.xPercent = clamp(start.x + deltaX, 0, right - 5);
                box.size.widthPercent = right - box.position.xPercent;
            } else if (this.resizeHandle.includes('e')) {
                box.size.widthPercent = clamp(start.width + deltaX, 5, 100 - start.x);
            }
            if (this.resizeHandle.includes('n')) {
                box.position.yPercent = clamp(start.y + deltaY, 0, bottom - 5);
                box.size.heightPercent = bottom - box.position.yPercent;
            } else if (this.resizeHandle.includes('s')) {
                box.size.heightPercent = clamp(start.height + deltaY, 5, 100 - start.y);
            }

            box.position.x = (box.position.xPercent / 100) * this.internalCanvasWidth;
            box.position.y = (box.position.yPercent / 100) * this.internalCanvasHeight;
            box.size.width = (box.size.widthPercent / 100) * this.internalCanvasWidth;
            box.size.height = (box.size.heightPercent / 100) * this.internalCanvasHeight;
        },
        
        // 调整大小结束
        handleResizeEnd() {
            this.isResizing = false;
            this.resizeHandle = null;
            document.removeEventListener('pointermove', this.handleResizeMove);
            document.removeEventListener('pointerup', this.handleResizeEnd);
            document.removeEventListener('pointercancel', this.handleResizeEnd);
        },
        
        // 切换网格
        toggleGrid() {
            this.showGrid = !this.showGrid;
        },
        
        // 应用预设布局
        applyPresetLayout(command) {
            this.layoutBoxes = [];
            
            switch (command) {
                case 'left-right':
                    this.layoutBoxes = [
                        {
                            id: 1,
                            label: '角色1',
                            position: { x: this.internalCanvasWidth * 0.1, y: this.internalCanvasHeight * 0.3, xPercent: 10, yPercent: 30 },
                            size: { width: this.internalCanvasWidth * 0.35, height: this.internalCanvasHeight * 0.4, widthPercent: 35, heightPercent: 40 },
                            prompt: '',
                            zIndex: 1,
                            locked: false
                        },
                        {
                            id: 2,
                            label: '角色2',
                            position: { x: this.internalCanvasWidth * 0.55, y: this.internalCanvasHeight * 0.3, xPercent: 55, yPercent: 30 },
                            size: { width: this.internalCanvasWidth * 0.35, height: this.internalCanvasHeight * 0.4, widthPercent: 35, heightPercent: 40 },
                            prompt: '',
                            zIndex: 2,
                            locked: false
                        }
                    ];
                    break;
                case 'top-bottom':
                    this.layoutBoxes = [
                        {
                            id: 1,
                            label: '角色1',
                            position: { x: this.internalCanvasWidth * 0.3, y: this.internalCanvasHeight * 0.1, xPercent: 30, yPercent: 10 },
                            size: { width: this.internalCanvasWidth * 0.4, height: this.internalCanvasHeight * 0.35, widthPercent: 40, heightPercent: 35 },
                            prompt: '',
                            zIndex: 1,
                            locked: false
                        },
                        {
                            id: 2,
                            label: '角色2',
                            position: { x: this.internalCanvasWidth * 0.3, y: this.internalCanvasHeight * 0.55, xPercent: 30, yPercent: 55 },
                            size: { width: this.internalCanvasWidth * 0.4, height: this.internalCanvasHeight * 0.35, widthPercent: 40, heightPercent: 35 },
                            prompt: '',
                            zIndex: 2,
                            locked: false
                        }
                    ];
                    break;
                case 'grid-3x3': {
                    const gridSize = 3;
                    const boxWidth = 28;
                    const boxHeight = 28;
                    for (let i = 0; i < 9; i++) {
                        const row = Math.floor(i / gridSize);
                        const col = i % gridSize;
                        this.layoutBoxes.push({
                            id: i + 1,
                            label: `角色${i + 1}`,
                            position: {
                                x: this.internalCanvasWidth * (0.05 + col * 0.3),
                                y: this.internalCanvasHeight * (0.05 + row * 0.3),
                                xPercent: 5 + col * 30,
                                yPercent: 5 + row * 30
                            },
                            size: {
                                width: this.internalCanvasWidth * boxWidth / 100,
                                height: this.internalCanvasHeight * boxHeight / 100,
                                widthPercent: boxWidth,
                                heightPercent: boxHeight
                            },
                            prompt: '',
                            zIndex: i + 1,
                            locked: false
                        });
                    }
                    break;
                }
                case 'center-surround':
                    this.layoutBoxes = [
                        {
                            id: 1,
                            label: '角色1',
                            position: { x: this.internalCanvasWidth * 0.1, y: this.internalCanvasHeight * 0.3, xPercent: 10, yPercent: 30 },
                            size: { width: this.internalCanvasWidth * 0.25, height: this.internalCanvasHeight * 0.35, widthPercent: 25, heightPercent: 35 },
                            prompt: '',
                            zIndex: 1,
                            locked: false
                        },
                        {
                            id: 2,
                            label: '角色2（主）',
                            position: { x: this.internalCanvasWidth * 0.375, y: this.internalCanvasHeight * 0.25, xPercent: 37.5, yPercent: 25 },
                            size: { width: this.internalCanvasWidth * 0.35, height: this.internalCanvasHeight * 0.5, widthPercent: 35, heightPercent: 50 },
                            prompt: '',
                            zIndex: 2,
                            locked: false
                        },
                        {
                            id: 3,
                            label: '角色3',
                            position: { x: this.internalCanvasWidth * 0.65, y: this.internalCanvasHeight * 0.3, xPercent: 65, yPercent: 30 },
                            size: { width: this.internalCanvasWidth * 0.25, height: this.internalCanvasHeight * 0.35, widthPercent: 25, heightPercent: 35 },
                            prompt: '',
                            zIndex: 3,
                            locked: false
                        }
                    ];
                    break;
            }
            
            this.nextBoxId = Math.max(...this.layoutBoxes.map(b => b.id), 0) + 1;
        },
        
        // 画布点击
        handleCanvasClick(event) {
            if (event.target === this.$refs.canvasRef || event.target.classList.contains('grid-overlay')) {
                this.selectedBoxId = null;
            }
        },
        
        // 鼠标移动
        handleMouseMove() {
            // 可以在这里实现对齐线显示逻辑
        },
        
        // 鼠标释放
        handleMouseUp() {
            // 处理鼠标释放
        },
        
        // 生成图片
        async handleGenerate() {
            if (!this.canGenerate) {
                return;
            }
            
            this.processing = true;
            this.resultImageUrl = null;
            
            try {
                // 获取所有有 prompt 和角色图片的布局框（最多10个）
                const validBoxes = this.layoutBoxes
                    .filter(box => box.prompt && box.prompt.trim() && box.characterImageUrl && box.characterImageUrl.trim())
                    .slice(0, 10); // 最多10个
                
                if (validBoxes.length === 0) {
                    ElMessage.warning(this.$t('createLayoutIllustration.fillPromptAndAddCharacter') || '请至少添加一个角色并填写prompt');
                    this.processing = false;
                    return;
                }
                
                // 转换所有参考图
                const referenceImagesBase64 = [];
                const conversionErrors = [];
                
                for (let i = 0; i < validBoxes.length; i++) {
                    const box = validBoxes[i];
                    try {
                        const base64Image = await this.imageUrlToBase64(box.characterImageUrl, true);
                        if (base64Image) {
                            referenceImagesBase64.push(base64Image);
                        } else {
                            conversionErrors.push(box.label || `角色${box.id}`);
                        }
                    } catch (error) {
                        conversionErrors.push(box.label || `角色${box.id}`);
                    }
                }
                
                if (referenceImagesBase64.length === 0) {
                    ElMessage.error(this.$t('createLayoutIllustration.allImagesConvertFailed') || '所有角色图片转换失败，请检查图片URL是否可访问');
                    this.processing = false;
                    return;
                }
                
                if (conversionErrors.length > 0) {
                    ElMessage.warning(
                        this.$t('createLayoutIllustration.someImagesConvertFailed', { 
                            count: conversionErrors.length,
                            names: conversionErrors.join('、')
                        }) || `部分角色图片转换失败：${conversionErrors.join('、')}`
                    );
                }
                
                // 构建合并的 prompt（明确"多角色同框"核心指令）
                const mergedPrompt = this.buildMergedPrompt(validBoxes);
                
                // 重新计算当前画布尺寸（确保使用最新的宽高比）
                const currentSize = this.calculateCanvasSize();
                
                // 构建请求数据（使用 /create-character 接口格式）
                const requestData = {
                    prompt: mergedPrompt, // 使用单个合并的 prompt（字符串）
                    size: `${currentSize.width}x${currentSize.height}` // 使用重新计算的尺寸
                };
                
                // 设置 image 字段：支持单个Base64字符串或Base64字符串数组（最多10张）
                if (referenceImagesBase64.length === 1) {
                    // 单张图片：直接使用字符串
                    requestData.image = referenceImagesBase64[0];
                } else {
                    // 多张图片：使用数组（最多10张）
                    requestData.image = referenceImagesBase64.slice(0, 10);
                }
                
                const responseData = await postCreateCharacter(
                    this.$http,
                    requestData,
                    { apiBaseUrl: this.apiBaseUrl }
                );
                
                if (!isCreateCharacterResponseOk(responseData) || !responseData.message) {
                    const errorMsg = responseData.message?.error || responseData.desc || this.$t('createLayoutIllustration.generateFailed');
                    throw new Error(errorMsg);
                }

                const result = responseData.message;

                    // 如果后端返回了最新积分，更新全局用户信息，TopBar 会自动刷新显示
                    if (result && typeof result === 'object' && result.points !== undefined && this.$store && this.$store.state) {
                        this.$store.commit('setUserInfo', {
                            ...(this.$store.state.userInfo || {}),
                            points: result.points
                        })
                    }
                    
                    // 提取图片URL（兼容多种响应格式）
                    // 优先使用 image_url，其次使用 character_image_url，最后使用 base64
                    if (result.image_url) {
                        this.resultImageUrl = result.image_url;
                    } else if (result.character_image_url) {
                        this.resultImageUrl = result.character_image_url;
                    } else if (result.image_base64) {
                        // 处理base64格式
                        let base64Str = result.image_base64.trim();
                        if (base64Str && !base64Str.startsWith('data:')) {
                            base64Str = base64Str.replace(/\s/g, '');
                            base64Str = `data:image/jpeg;base64,${base64Str}`;
                        }
                        if (base64Str) {
                            this.resultImageUrl = base64Str;
                        }
                    } else if (result.character_image_base64) {
                        // 处理character_image_base64格式
                        let base64Str = result.character_image_base64.trim();
                        if (base64Str && !base64Str.startsWith('data:')) {
                            base64Str = base64Str.replace(/\s/g, '');
                            base64Str = `data:image/jpeg;base64,${base64Str}`;
                        }
                        if (base64Str) {
                            this.resultImageUrl = base64Str;
                        }
                    } else if (result.images && Array.isArray(result.images) && result.images.length > 0) {
                        // 兼容数组格式
                        this.resultImageUrl = result.images[0];
                    } else if (result.full_response && result.full_response.data && Array.isArray(result.full_response.data) && result.full_response.data.length > 0) {
                        // 从 full_response 中获取
                        this.resultImageUrl = result.full_response.data[0].url || result.full_response.data[0].ResultUrl || '';
                    } else if (typeof result === 'string') {
                        this.resultImageUrl = result;
                    }
                    
                    if (this.resultImageUrl) {
                        ElMessage.success(this.$t('createLayoutIllustration.generateSuccess'));
                    } else {
                        ElMessage.warning(this.$t('createLayoutIllustration.noImageUrl'));
                    }
            } catch (error) {
                ElMessage.error(error.message || this.$t('createLayoutIllustration.generateFailed'));
            } finally {
                this.processing = false;
            }
        },
        
        // 将布局信息转换为文字描述
        getLayoutDescription(box) {
            const pos = box.position;
            const size = box.size;
            
            // 位置描述
            let positionDesc = '';
            if (pos.xPercent < 30) {
                positionDesc = this.$t('createLayoutIllustration.positionLeft');
            } else if (pos.xPercent > 70) {
                positionDesc = this.$t('createLayoutIllustration.positionRight');
            } else {
                positionDesc = this.$t('createLayoutIllustration.positionCenter');
            }
            
            if (pos.yPercent < 30) {
                positionDesc += this.$t('createLayoutIllustration.positionTop');
            } else if (pos.yPercent > 70) {
                positionDesc += this.$t('createLayoutIllustration.positionBottom');
            } else {
                positionDesc += this.$t('createLayoutIllustration.positionMiddle');
            }
            
            // 大小描述（改进：使用更精确的描述，同时考虑宽度、高度和面积）
            const areaPercent = (size.widthPercent * size.heightPercent) / 100; // 面积百分比
            let sizeDesc = '';
            
            // 基于面积和宽高比进行更精确的分类
            if (areaPercent > 20) {
                // 大面积：面积 > 20%
                if (size.widthPercent > size.heightPercent * 1.2) {
                    sizeDesc = `占据画面宽度的${Math.round(size.widthPercent)}%，高度的${Math.round(size.heightPercent)}%，横向较大尺寸`;
                } else if (size.heightPercent > size.widthPercent * 1.2) {
                    sizeDesc = `占据画面宽度的${Math.round(size.widthPercent)}%，高度的${Math.round(size.heightPercent)}%，纵向较大尺寸`;
                } else {
                    sizeDesc = `占据画面宽度的${Math.round(size.widthPercent)}%，高度的${Math.round(size.heightPercent)}%，较大尺寸`;
                }
            } else if (areaPercent < 5) {
                // 小面积：面积 < 5%
                sizeDesc = `占据画面宽度的${Math.round(size.widthPercent)}%，高度的${Math.round(size.heightPercent)}%，较小尺寸`;
            } else {
                // 中等面积：5% <= 面积 <= 20%
                sizeDesc = `占据画面宽度的${Math.round(size.widthPercent)}%，高度的${Math.round(size.heightPercent)}%，中等尺寸`;
            }
            
            return `${positionDesc}，${sizeDesc}`;
        },
        
        // 构建合并的 prompt（明确"多角色同框"核心指令）
        buildMergedPrompt(validBoxes) {
            const characterCount = validBoxes.length;
            
            // 1. 核心指令：明确"多角色同框"
            let mergedPrompt = '';
            if (characterCount === 1) {
                mergedPrompt = '创作单一插画角色，完整呈现角色形象。';
            } else if (characterCount === 2) {
                mergedPrompt = '同时包含两个角色，两个角色必须同时出现在画面中，无缺失，双角色同框。';
            } else {
                mergedPrompt = `同时包含${characterCount}个角色，所有角色必须同时出现在画面中，无缺失，多角色同框。`;
            }
            
            // 2. 计算所有角色的面积，用于相对尺寸比较
            const characterAreas = validBoxes.map(box => ({
                id: box.id,
                label: box.label || `角色${box.id}`,
                area: (box.size.widthPercent * box.size.heightPercent) / 100,
                widthPercent: box.size.widthPercent,
                heightPercent: box.size.heightPercent
            }));
            
            // 按面积排序，用于相对尺寸描述
            characterAreas.sort((a, b) => b.area - a.area);
            
            // 3. 逐个描述每个角色，明确绑定参考图
            const characterDescriptions = [];
            for (let i = 0; i < validBoxes.length; i++) {
                const box = validBoxes[i];
                const layoutDesc = this.getLayoutDescription(box);
                const characterLabel = box.label || `角色${box.id}`;
                
                // 明确绑定参考图编号（从1开始）
                const referenceImageIndex = i + 1;
                
                // 计算相对尺寸排名
                const areaRank = characterAreas.findIndex(a => a.id === box.id) + 1;
                const relativeSizeDesc = characterCount > 1 
                    ? `，在${characterCount}个角色中尺寸排名第${areaRank}位`
                    : '';
                
                let characterDesc = '';
                
                if (characterCount === 1) {
                    // 单个角色，不需要强调参考图绑定
                    characterDesc = `${box.prompt.trim()}，${layoutDesc}`;
                } else {
                    // 多个角色，明确绑定参考图，并强调尺寸
                    characterDesc = `基于参考图${referenceImageIndex}生成${characterLabel}：${box.prompt.trim()}，${layoutDesc}${relativeSizeDesc}。请严格按照指定的尺寸比例生成该角色`;
                }
                
                characterDescriptions.push(characterDesc);
            }
            
            // 4. 组合所有角色描述
            if (characterDescriptions.length > 0) {
                mergedPrompt += ' ' + characterDescriptions.join(' ');
            }
            
            // 5. 添加构图约束，特别强调尺寸准确性
            mergedPrompt += ' 画面构图要合理，所有角色都要完整呈现，不要遮挡，不要缺失任何角色。每个角色的尺寸必须严格按照上述描述的比例生成，不得随意改变大小。';
            
            // 5. 添加背景提示词（如果有）
            if (this.backgroundPrompt && this.backgroundPrompt.trim()) {
                mergedPrompt += ' ' + this.backgroundPrompt.trim();
            }
            
            return mergedPrompt;
        },
        
        // 获取布局信息（用于 prompt 增强）
        getLayoutInfoForPrompt() {
            return this.layoutBoxes.map(box => ({
                id: box.id,
                label: box.label,
                position: box.position,
                size: box.size
            }));
        },
        
        // 保存结果
        async handleSave() {
            if (!this.resultImageUrl) {
                return;
            }
            
            try {
                // 处理URL格式
                let pictureValue = this.resultImageUrl;
                
                // 如果是相对路径，转换为完整URL
                if (pictureValue && !pictureValue.startsWith('http://') && !pictureValue.startsWith('https://') && !pictureValue.startsWith('data:')) {
                    pictureValue = `https://static.kidstory.cc/${pictureValue}`;
                }
                
                // 构建请求数据
                const requestData = {
                    picture: pictureValue,
                    title: this.$t('createLayoutIllustration.savedTitle'),
                    description: this.$t('createLayoutIllustration.savedDescription'),
                    type: 'others'
                };
                
                // 获取token
                const token = localStorage.getItem('token') || '';
                if (!token) {
                    ElMessage.error(this.$t('createLayoutIllustration.pleaseLogin'));
                    return;
                }
                
                // 发送请求
                const response = await this.$http.post('/ill/', requestData, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    }
                });
                
                // 检查响应
                if (response.data && (response.data.desc === 'success' || response.data.code === 0 || response.data.code === '0')) {
                    ElMessage.success(this.$t('createLayoutIllustration.saveSuccess'));
                } else {
                    throw new Error(response.data?.message || this.$t('createLayoutIllustration.saveFailed'));
                }
            } catch (error) {
                ElMessage.error(error.message || this.$t('createLayoutIllustration.saveFailed'));
            }
        },
        
        // 下载结果
        async handleDownload() {
            if (!this.resultImageUrl) {
                return;
            }
            
            try {
                // 处理URL格式
                let imageUrl = this.resultImageUrl;
                
                // 如果是相对路径，转换为完整URL
                if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://') && !imageUrl.startsWith('data:')) {
                    imageUrl = `https://static.kidstory.cc/${imageUrl}`;
                }
                
                // 下载图片
                if (imageUrl.startsWith('data:')) {
                    // Base64 格式
                    const link = document.createElement('a');
                    link.href = imageUrl;
                    link.download = `layout_illustration_${Date.now()}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else {
                    // URL 格式
                    const response = await fetch(imageUrl);
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `layout_illustration_${Date.now()}.jpg`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                }
                
                ElMessage.success(this.$t('createLayoutIllustration.downloadSuccess'));
            } catch (error) {
                ElMessage.error(this.$t('createLayoutIllustration.downloadFailed'));
            }
        },
        
        // 跳转到创建角色页面
        goToCreateCharacter() {
            this.$router.push({ name: 'character-studio-workbench', params: { characterId: 'new' } });
        },
        
        // ========== 图片处理方法（从 CreateGroupImages 复制） ==========
        
        // 压缩图片
        compressImage(file, maxWidth = 1024, maxHeight = 1024, quality = 0.7, maxSizeKB = 800) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
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
                        
                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        canvas.toBlob((blob) => {
                            const sizeKB = blob.size / 1024;
                            if (sizeKB <= maxSizeKB) {
                                resolve(blob);
                            } else {
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
                    img.onerror = () => reject(new Error('图片加载失败'));
                    img.src = e.target.result;
                };
                reader.onerror = () => reject(new Error('文件读取失败'));
                reader.readAsDataURL(file);
            });
        },
        
        // 将图片URL转换为Base64（带压缩）
        async imageUrlToBase64(imageUrl, compress = true) {
            try {
                // 如果已经是base64格式
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
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = () => reject(new Error('读取图片数据失败'));
                        reader.readAsDataURL(compressedBlob);
                    });
                }
                
                // 不压缩直接转换
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject(new Error('读取图片数据失败'));
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                // 如果是CORS错误，尝试使用Canvas方式转换
                if (error.message.includes('CORS') || error.message.includes('Failed to fetch') || error.name === 'TypeError') {
                    try {
                        return await this.imageUrlToBase64WithCanvas(imageUrl, compress);
                    } catch (canvasError) {
                        throw new Error('图片跨域访问失败，请确保图片URL可访问或使用base64格式');
                    }
                }
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
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        
                        const dataUrl = canvas.toDataURL('image/jpeg', compress ? 0.7 : 1.0);
                        resolve(dataUrl);
                    } catch (error) {
                        reject(new Error('Canvas转换失败: ' + error.message));
                    }
                };
                
                img.onerror = () => reject(new Error('图片加载失败'));
                img.src = imageUrl;
            });
        }
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
    flex: 0 0 280px;
    min-width: 0;
}

.center-panel {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
}

.right-panel {
    flex: 0 0 360px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.panel-card {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.panel-card :deep(.el-card__body) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 18px;
    font-weight: 600;
    color: #303133;
}

.aspect-ratio-selector {
    display: flex;
    align-items: center;
    gap: 8px;
}

.aspect-label {
    font-size: 14px;
    color: #606266;
    white-space: nowrap;
}

/* 角色列表 */
.characters-list {
    flex: 1;
    overflow-y: auto;
    padding: 10px 0;
}

.loading-state,
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: #909399;
    text-align: center;
}

.loading-state i {
    font-size: 48px;
    margin-bottom: 16px;
    animation: rotating 2s linear infinite;
}

.empty-state i {
    font-size: 48px;
    margin-bottom: 16px;
    color: #c0c4cc;
}

.characters-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding: 0 10px;
}

.character-item {
    cursor: grab;
    border: 2px solid #e4e7ed;
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.3s;
    background: #fff;
}

.character-item:hover {
    border-color: #409eff;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

.character-item.dragging {
    opacity: 0.5;
    cursor: grabbing;
}

.character-image {
    width: 100%;
    aspect-ratio: 1;
    overflow: hidden;
    background: #f5f7fa;
}

.character-img {
    width: 100%;
    height: 100%;
}

.character-name {
    padding: 8px;
    font-size: 12px;
    color: #606266;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    background: #fff;
}

.image-slot {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    background: #f5f7fa;
    color: #909399;
    font-size: 24px;
}

/* 布局编辑器 */
.layout-editor-wrapper {
    flex: 1;
    overflow: hidden;
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
}

/* 属性设置区域 */
.properties-section {
    flex: 1;
    overflow-y: auto;
    padding: 10px 0;
}

.character-tabs-section {
    margin-top: 4px;
}

.character-tabs-hint {
    font-size: 12px;
    color: #909399;
    line-height: 1.5;
    margin: 0 0 12px 0;
}

.character-props-tabs :deep(.el-tabs__header) {
    margin-bottom: 14px;
}

.character-tab-label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    max-width: 148px;
}

.character-tab-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.character-tab-remove {
    flex-shrink: 0;
    padding: 0 4px !important;
    min-height: auto !important;
}

.selected-box-properties {
    margin-bottom: 20px;
}

.properties-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #ebeef5;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
}

.properties-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.property-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.property-group-inline {
    flex-direction: row;
    align-items: center;
    gap: 12px;
}

.property-group-inline label {
    min-width: 50px;
    flex-shrink: 0;
}

.property-group label {
    font-size: 14px;
    font-weight: 500;
    color: #606266;
}

.property-row {
    display: flex;
    gap: 8px;
}

.property-row .el-input-number {
    flex: 1;
}

.remove-box-btn {
    padding: 0;
    color: #f56c6c;
}

.all-boxes-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.box-list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: #f5f7fa;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
}

.box-list-item:hover {
    background: #e4e7ed;
}

.background-prompt-section {
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid #e4e7ed;
}

.property-hint {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    font-size: 12px;
    color: #909399;
}

.property-hint i {
    font-size: 14px;
}

.empty-prompt-hint {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: #909399;
    text-align: center;
}

.empty-prompt-hint i {
    font-size: 48px;
    margin-bottom: 16px;
    color: #c0c4cc;
}

/* 结果区域 */
.result-card {
    flex: 1;
    min-height: 400px;
}

.result-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.generate-section {
    margin-bottom: 20px;
    text-align: center;
}

.generate-btn-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.generate-btn {
    width: 100%;
}

.points-hint {
    font-size: 12px;
    color: #909399;
    text-align: center;
    margin-top: 6px;
    line-height: 1.4;
}

.result-loading,
.result-placeholder {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #909399;
}

.result-loading i {
    font-size: 64px;
    color: #c0c4cc;
    margin-bottom: 16px;
    animation: rotating 2s linear infinite;
}

.result-placeholder i {
    font-size: 64px;
    color: #c0c4cc;
    margin-bottom: 16px;
}

.result-image {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.generated-image {
    flex: 1;
    width: 100%;
    min-height: 300px;
    border-radius: 8px;
    overflow: hidden;
    background: #f5f7fa;
}

.result-actions {
    margin-top: 16px;
    display: flex;
    gap: 12px;
    justify-content: center;
}

@keyframes rotating {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

/* 滚动条样式 */
.characters-list::-webkit-scrollbar,
.properties-section::-webkit-scrollbar,
.layout-editor-wrapper::-webkit-scrollbar {
    width: 6px;
}

.characters-list::-webkit-scrollbar-track,
.properties-section::-webkit-scrollbar-track,
.layout-editor-wrapper::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
}

.characters-list::-webkit-scrollbar-thumb,
.properties-section::-webkit-scrollbar-thumb,
.layout-editor-wrapper::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
}

.characters-list::-webkit-scrollbar-thumb:hover,
.properties-section::-webkit-scrollbar-thumb:hover,
.layout-editor-wrapper::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
}

/* LayoutEditor 样式 */
.layout-editor {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.layout-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    padding: 12px;
    background: #f5f7fa;
    border-radius: 8px;
}

.toolbar-info {
    margin-left: auto;
    color: #606266;
    font-size: 14px;
}

.layout-canvas-wrapper {
    position: relative;
    overflow: hidden;
    box-sizing: border-box;
    background: #f2f4f7;
    border-radius: 8px;
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    min-height: 0;
    width: 100%;
}

.layout-canvas-stage {
    flex: none;
}

.layout-canvas-container {
    display: block;
}

.layout-canvas {
    box-shadow: 0 4px 18px rgba(31, 41, 55, 0.12);
    position: relative;
    background: #fafafa;
    border: 2px dashed #dcdfe6;
    box-sizing: border-box;
    min-width: 200px;
    min-height: 200px;
}

.grid-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

.grid-line {
    position: absolute;
    background: rgba(64, 158, 255, 0.1);
}

.grid-line.vertical {
    width: 1px;
    height: 100%;
}

.grid-line.horizontal {
    height: 1px;
    width: 100%;
}

.layout-box {
    position: absolute;
    border: 2px solid #409eff;
    background: rgba(64, 158, 255, 0.1);
    cursor: move;
    box-sizing: border-box;
    transition: border-color 0.2s;
    overflow: visible;
}

.layout-box.has-image {
    background: rgba(245, 245, 245, 0.95);
}

.layout-box-preview {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
}

.layout-box-preview img {
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    object-fit: contain;
    display: block;
}

.layout-box.selected {
    border-color: #67c23a;
    border-width: 3px;
    box-shadow: 0 0 0 2px rgba(103, 194, 58, 0.2);
}

.layout-box.locked {
    opacity: 0.6;
    cursor: not-allowed;
}

.box-label {
    position: absolute;
    top: -24px;
    left: 0;
    z-index: 2;
    background: #409eff;
    color: #fff;
    padding: 2px 8px;
    font-size: 12px;
    border-radius: 4px 4px 0 0;
    white-space: nowrap;
}

.layout-box.selected .box-label {
    background: #67c23a;
}

.resize-handle {
    position: absolute;
    z-index: 3;
    width: var(--handle-size);
    height: var(--handle-size);
    box-sizing: border-box;
    touch-action: none;
    background: #67c23a;
    border: 2px solid #fff;
    border-radius: 50%;
    cursor: nwse-resize;
}

.handle-nw { top: calc(var(--handle-size) / -2); left: calc(var(--handle-size) / -2); cursor: nw-resize; }
.handle-ne { top: calc(var(--handle-size) / -2); right: calc(var(--handle-size) / -2); cursor: ne-resize; }
.handle-sw { bottom: calc(var(--handle-size) / -2); left: calc(var(--handle-size) / -2); cursor: sw-resize; }
.handle-se { bottom: calc(var(--handle-size) / -2); right: calc(var(--handle-size) / -2); cursor: se-resize; }
.handle-n { top: calc(var(--handle-size) / -2); left: 50%; transform: translateX(-50%); cursor: n-resize; }
.handle-s { bottom: calc(var(--handle-size) / -2); left: 50%; transform: translateX(-50%); cursor: s-resize; }
.handle-w { top: 50%; left: calc(var(--handle-size) / -2); transform: translateY(-50%); cursor: w-resize; }
.handle-e { top: 50%; right: calc(var(--handle-size) / -2); transform: translateY(-50%); cursor: e-resize; }

.lock-icon {
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 2;
    color: #909399;
    font-size: 16px;
}
@media (max-width: 1100px) {
    .container { height: auto; min-height: calc(100vh - 90px); }
    .main-layout { flex-wrap: wrap; }
    .left-panel { flex: 0 0 220px; }
    .center-panel { flex: 1 1 500px; min-height: 650px; }
    .right-panel { flex: 1 1 100%; flex-direction: row; }
    .right-panel > .panel-card { flex: 1; min-width: 0; }
}

@media (max-width: 700px) {
    .container { padding: 12px; }
    .main-layout { gap: 12px; }
    .left-panel, .center-panel, .right-panel { flex: 1 1 100%; }
    .left-panel .characters-list { max-height: 220px; }
    .characters-grid { grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); }
    .center-panel { min-height: 520px; }
    .right-panel { flex-direction: column; }
    .layout-canvas-wrapper { padding: 12px; }
    .toolbar-info { margin-left: 0; }
}
</style>

