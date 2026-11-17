<template>
  <div class="sticker-workshop">
    <header class="workshop-hero">
      <h1>{{ $t('lassoCrop.pageTitle') }}</h1>
      <p class="hero-desc">{{ $t('lassoCrop.pageDesc') }}</p>
    </header>

    <div class="workshop-body">
      <section class="col-work">
        <div v-if="!imageSrc" class="upload-panel">
          <el-upload
            ref="uploadRef"
            drag
            :auto-upload="false"
            :show-file-list="false"
            accept="image/*"
            class="upload-el"
            :on-change="onFileChange"
          >
            <div class="upload-drop">
              <span class="upload-circle" aria-hidden="true">
                <el-icon><UploadFilled /></el-icon>
              </span>
              <p class="upload-title">{{ $t('lassoCrop.uploadHint') }}</p>
              <p class="upload-sub">{{ $t('stickerLab.uploadFormats') }}</p>
            </div>
          </el-upload>

          <MyIllustrationPicker class="picker-btn" @select="onPickIllustration" />
        </div>

        <div v-else class="editor-panel">
          <button type="button" class="link-back" @click="resetImage">
            ← {{ $t('lassoCrop.changeImage') }}
          </button>

          <div class="editor-toolbar">
            <div class="tool-block">
              <p class="tool-label">{{ $t('stickerLab.cropMode') }}</p>
              <div class="pill-row">
                <button
                  type="button"
                  class="tool-pill"
                  :class="{ active: cropMode === 'lasso' }"
                  :aria-pressed="cropMode === 'lasso'"
                  @click="setCropMode('lasso')"
                >
                  {{ $t('stickerLab.modeLasso') }}
                </button>
                <button
                  type="button"
                  class="tool-pill"
                  :class="{ active: cropMode === 'matte' }"
                  :aria-pressed="cropMode === 'matte'"
                  @click="setCropMode('matte')"
                >
                  {{ $t('stickerLab.modeMatte') }}
                </button>
              </div>
            </div>

            <div class="tool-block">
              <p class="tool-label">{{ $t('stickerLab.borderStyle') }}</p>
              <div class="pill-row">
                <button
                  v-for="s in styleOptions"
                  :key="s.value"
                  type="button"
                  class="tool-pill"
                  :class="{ active: stickerStyle === s.value }"
                  :aria-pressed="stickerStyle === s.value"
                  @click="stickerStyle = s.value"
                >
                  {{ s.label }}
                </button>
              </div>
            </div>

            <div v-if="stickerStyle !== 'raw'" class="tool-block">
              <p class="tool-label">{{ $t('stickerLab.borderColor') }}</p>
              <div class="color-row">
                <button
                  v-for="c in borderColors"
                  :key="c"
                  type="button"
                  class="color-chip"
                  :class="{ active: borderColor === c }"
                  :style="{ background: c }"
                  :aria-label="c"
                  :aria-pressed="borderColor === c"
                  @click="borderColor = c"
                />
              </div>
            </div>

          </div>

          <div class="canvas-panel">
            <LassoCropCanvas
              v-if="cropMode === 'lasso'"
              ref="lassoRef"
              embedded
              :image-src="imageSrc"
              :sticker-style="stickerStyle"
              :border-color="borderColor"
              @cropped="onCropped"
              @reset="clearResult"
            />
            <MatteBrushCanvas
              v-else
              ref="matteRef"
              embedded
              :image-src="imageSrc"
              :sticker-style="stickerStyle"
              :border-color="borderColor"
              @cropped="onCropped"
            />
          </div>

          <div class="action-row">
            <button
              type="button"
              class="btn-preview"
              :disabled="!imageSrc"
              @click="handlePreview"
            >
              {{ $t('stickerLab.preview') }}
            </button>
            <button
              type="button"
              class="btn-generate"
              :disabled="!imageSrc"
              @click="handleGenerate"
            >
              {{ $t('stickerLab.generateSticker') }}
            </button>
          </div>

          <div v-if="resultUrl" class="extra-actions">
            <button type="button" class="text-action" @click="handleDownload">
              {{ $t('lassoCrop.download') }}
            </button>
            <button type="button" class="text-action" @click="saveToLocal">
              {{ $t('stickerLab.saveToCollection') }}
            </button>
            <button type="button" class="text-action" @click="showElementForm = true">
              {{ $t('lassoCrop.saveAsElement') }}
            </button>
            <button type="button" class="text-action" @click="showCharacterForm = true">
              {{ $t('lassoCrop.saveToMyCharacter') }}
            </button>
          </div>
        </div>
      </section>

      <aside class="col-gallery">
        <StickerCollection ref="collectionRef" variant="gallery" />
      </aside>
    </div>

    <el-dialog
      :z-index="12000"
      class="image-tool-dialog"
      v-model="showElementForm"
      :title="$t('lassoCrop.saveAsElement')"
      width="440px"
      destroy-on-close
    >
      <el-form label-width="80px">
        <el-form-item :label="$t('lassoCrop.elementName')" required>
          <el-input v-model="elementForm.name" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item :label="$t('lassoCrop.category')" required>
          <el-select popper-class="story-controls" v-model="elementForm.category" style="width: 100%">
            <el-option
              v-for="item in elementCategories"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('lassoCrop.description')">
          <el-input v-model="elementForm.desc" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item :label="$t('lassoCrop.isPublic')">
          <el-radio-group v-model="elementForm.is_public">
            <el-radio :label="1">{{ $t('lassoCrop.public') }}</el-radio>
            <el-radio :label="0">{{ $t('lassoCrop.private') }}</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showElementForm = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="handleSaveElement">
          {{ $t('common.confirm') }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      :z-index="12000"
      class="image-tool-dialog"
      v-model="showCharacterForm"
      :title="$t('lassoCrop.saveToMyCharacter')"
      width="440px"
      destroy-on-close
    >
      <el-form label-width="80px">
        <el-form-item :label="$t('lassoCrop.characterName')" required>
          <el-input v-model="characterForm.name" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item :label="$t('lassoCrop.category')" required>
          <el-select popper-class="story-controls" v-model="characterForm.category" style="width: 100%">
            <el-option
              v-for="item in characterCategories"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('lassoCrop.description')">
          <el-input v-model="characterForm.desc" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item :label="$t('lassoCrop.isPublic')">
          <el-radio-group v-model="characterForm.is_public">
            <el-radio :label="1">{{ $t('lassoCrop.public') }}</el-radio>
            <el-radio :label="0">{{ $t('lassoCrop.private') }}</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCharacterForm = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="handleSaveCharacter">
          {{ $t('common.confirm') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { UploadFilled } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import LassoCropCanvas from '@/components/editorPro/editor-components/LassoCropCanvas.vue';
import MatteBrushCanvas from '@/components/sticker/MatteBrushCanvas.vue';
import StickerCollection from '@/components/sticker/StickerCollection.vue';
import { readFileAsDataUrl, downloadDataUrl } from '@/utils/lassoCrop';
import {
  uploadPictureElement,
  saveCroppedCharacter,
  ELEMENT_CATEGORIES,
  CHARACTER_CATEGORIES,
} from '@/utils/saveCroppedAsset';
import { STICKER_BORDER_COLORS } from '@/utils/stickerLab/stickerStyles';
import { addLocalSticker } from '@/utils/stickerLab/stickerStorage';
import MyIllustrationPicker from '@/components/MyIllustrationPicker.vue';

export default {
  name: 'LassoCropPage',
  components: {
    LassoCropCanvas,
    MatteBrushCanvas,
    StickerCollection,
    UploadFilled,
    MyIllustrationPicker,
  },
  data() {
    return {
      imageSrc: '',
      objectUrl: '',
      resultUrl: '',
      cropMode: 'lasso',
      stickerStyle: 'sticker',
      borderColor: '#ffffff',
      borderColors: STICKER_BORDER_COLORS,
      lastCropMeta: null,
      showElementForm: false,
      showCharacterForm: false,
      saving: false,
      elementCategories: ELEMENT_CATEGORIES,
      characterCategories: CHARACTER_CATEGORIES,
      elementForm: {
        name: '',
        category: '',
        desc: '',
        is_public: 1,
      },
      characterForm: {
        name: '',
        category: '',
        desc: '',
        is_public: 1,
      },
    };
  },
  computed: {
    styleOptions() {
      return [
        { value: 'sticker', label: this.$t('stickerLab.styleSticker') },
        { value: 'outline', label: this.$t('stickerLab.styleOutline') },
        { value: 'raw', label: this.$t('stickerLab.styleRaw') },
      ];
    },
  },
  beforeUnmount() {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = '';
    }
  },
  methods: {
    setCropMode(mode) {
      if (this.cropMode === mode) return;
      this.cropMode = mode;
      this.clearResult();
    },
    async onFileChange(file) {
      const raw = file.raw;
      if (!raw || !raw.type.startsWith('image/')) {
        ElMessage.warning(this.$t('lassoCrop.invalidImage'));
        return;
      }
      try {
        this.imageSrc = await readFileAsDataUrl(raw);
        this.clearResult();
      } catch (e) {
        ElMessage.error(this.$t('lassoCrop.loadFailed'));
      }
    },
    onPickIllustration({ url }) {
      if (!url) {
        ElMessage.error(this.$t('lassoCrop.loadFailed'));
        return;
      }
      this.loadRemoteIllustration(url);
    },
    async loadRemoteIllustration(url) {
      try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) throw new Error('fetch failed');
        const blob = await res.blob();
        if (this.objectUrl) {
          URL.revokeObjectURL(this.objectUrl);
          this.objectUrl = '';
        }
        this.objectUrl = URL.createObjectURL(blob);
        this.imageSrc = this.objectUrl;
        this.clearResult();
      } catch (e) {
        console.warn('[lasso] fetch illustration as blob failed, fallback to url', e);
        this.imageSrc = url;
        this.clearResult();
      }
    },
    clearResult() {
      this.resultUrl = '';
      this.lastCropMeta = null;
    },
    async onCropped(payload) {
      this.resultUrl = payload.dataUrl;
      this.lastCropMeta = payload;
      if (payload.source !== 'generate') return;
      try {
        await addLocalSticker(payload.dataUrl, {
          style: payload.style || this.stickerStyle,
          borderColor: payload.borderColor || this.borderColor,
          mode: payload.mode || this.cropMode,
        });
        await this.$refs.collectionRef?.refresh?.();
        ElMessage.success(this.$t('stickerLab.addedToCollection'));
      } catch (e) {
        console.warn('[sticker] local save failed', e);
      }
    },
    resetImage() {
      if (this.objectUrl) {
        URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = '';
      }
      this.imageSrc = '';
      this.clearResult();
    },
    handlePreview() {
      if (this.cropMode === 'matte') {
        this.$refs.matteRef?.openPreview?.();
      } else {
        this.$refs.lassoRef?.openPreview?.();
      }
    },
    handleGenerate() {
      if (this.cropMode === 'matte') {
        this.$refs.matteRef?.generate?.();
      } else {
        this.$refs.lassoRef?.generate?.();
      }
    },
    handleDownload() {
      if (!this.resultUrl) return;
      downloadDataUrl(this.resultUrl, `sticker-${Date.now()}.png`);
      ElMessage.success(this.$t('lassoCrop.downloaded'));
    },
    async saveToLocal() {
      if (!this.resultUrl) return;
      try {
        await addLocalSticker(this.resultUrl, {
          style: this.lastCropMeta?.style || this.stickerStyle,
          borderColor: this.lastCropMeta?.borderColor || this.borderColor,
          mode: this.lastCropMeta?.mode || this.cropMode,
        });
        await this.$refs.collectionRef?.refresh?.();
        ElMessage.success(this.$t('stickerLab.savedToCollection'));
      } catch (e) {
        ElMessage.error(this.$t('stickerLab.saveFailed'));
      }
    },
    async handleSaveElement() {
      if (!this.resultUrl) return;
      if (!this.elementForm.name || !this.elementForm.category) {
        ElMessage.warning(this.$t('lassoCrop.fillNameAndCategory'));
        return;
      }
      this.saving = true;
      try {
        await uploadPictureElement(this.$http, this.resultUrl, {
          title: this.elementForm.name,
          type: this.elementForm.category,
          desc: this.elementForm.desc,
          is_public: this.elementForm.is_public,
        });
        ElMessage.success(this.$t('lassoCrop.elementSaved'));
        this.showElementForm = false;
      } catch (e) {
        ElMessage.error(e.message || this.$t('lassoCrop.saveFailed'));
      } finally {
        this.saving = false;
      }
    },
    async handleSaveCharacter() {
      if (!this.resultUrl) return;
      if (!this.characterForm.name || !this.characterForm.category) {
        ElMessage.warning(this.$t('lassoCrop.fillNameAndCategory'));
        return;
      }
      this.saving = true;
      try {
        await saveCroppedCharacter(this.$http, this.resultUrl, {
          character_name: this.characterForm.name,
          character_type: this.characterForm.category,
          description: this.characterForm.desc,
          is_public: this.characterForm.is_public,
        });
        ElMessage.success(this.$t('lassoCrop.characterSaved'));
        this.showCharacterForm = false;
        this.$router.push('/creation-studio/character');
      } catch (e) {
        ElMessage.error(e.message || this.$t('lassoCrop.saveFailed'));
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<style scoped>
.sticker-workshop {
  --accent: #8167a9;
  --accent-soft: #f5f0fa;
  --border: #e8e0f4;
  --ink: #1c345e;
  --muted: #6b7280;
  --el-color-primary: #8167a9;
  width: 100%;
  min-height: calc(100vh - 100px);
  padding: 28px 24px 56px;
  box-sizing: border-box;
  background: #faf9fc;
  color: var(--ink);
  text-align: left;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}
.workshop-hero {
  max-width: 1280px;
  margin: 0 auto 24px;
  text-align: center;
}
.workshop-hero h1 {
  margin: 0 0 10px;
  font-family: inherit;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--ink);
}
.hero-desc {
  margin: 0 auto;
  font-size: 14px;
  line-height: 1.65;
  color: var(--muted);
}
.workshop-body {
  --upload-height: clamp(420px, 60vh, 720px);
  max-width: 1280px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  gap: 24px;
  align-items: start;
}
.col-work, .col-gallery {
  min-width: 0;
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 28px rgba(28, 52, 94, 0.04);
}
.col-work {
  box-sizing: border-box;
}
.upload-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}
.upload-el, .upload-el :deep(.el-upload) {
  width: 100%;
}
.upload-el :deep(.el-upload-dragger) {
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  height: auto;
  display: block;
}
.upload-drop {
  min-height: var(--upload-height);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed #d9d0e6;
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  background: #fcfbfd;
  transition: border-color .2s, background .2s;
}
.upload-el :deep(.el-upload-dragger:hover) .upload-drop, .upload-el :deep(.el-upload-dragger.is-dragover) .upload-drop {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.upload-circle {
  display: inline-flex;
  width: 64px;
  height: 64px;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 32px;
  margin-bottom: 20px;
}
.upload-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
}
.upload-sub {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
}
.picker-btn :deep(.el-button) {
  height: 40px;
  padding: 10px 24px;
  border-radius: 10px;
  border-color: #c4b3dc;
  background: #fff;
  color: var(--accent);
  font-weight: 500;
}
.picker-btn :deep(.el-button:hover) {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.editor-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.link-back {
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  color: var(--accent);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.editor-toolbar {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 20px 32px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}
.tool-block {
  min-width: 0;
}
.tool-label {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}
.pill-row, .color-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.pill-row { padding: 4px; border-radius: 12px; }
.tool-pill {
  min-height: 40px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #fff;
  color: #4b5563;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.tool-pill:hover, .tool-pill.active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}
.color-chip {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid #fff;
  cursor: pointer;
  padding: 0;
  box-shadow: 0 0 0 1px #e5e7eb, inset 0 0 0 1px rgba(0,0,0,.08);
  margin: 4px 1px;
}
.color-chip.active {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.canvas-panel {
  min-width: 0;
  padding: 12px;
  border-radius: 12px;
  background: #faf9fc;
  border: 1px solid #eeeaf3;
}
.canvas-panel :deep(.lasso-crop-canvas) {
  flex-direction: column;
  gap: 16px;
}
.canvas-panel :deep(.matte-brush-canvas) {
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}
.canvas-panel :deep(.lasso-stage), .canvas-panel :deep(.matte-stage) {
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
}
.canvas-panel :deep(.lasso-side), .canvas-panel :deep(.matte-tools) {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 20px;
}
.canvas-panel :deep(.matte-tools) {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px 20px;
  padding: 18px 20px;
  background: #fff;
}
.canvas-panel :deep(.matte-tools .tool-heading),
.canvas-panel :deep(.matte-tools .tool-row) { grid-column: 1; }
.canvas-panel :deep(.matte-tools .tool-row) { flex-wrap: wrap; gap: 12px 24px; }
.canvas-panel :deep(.matte-tools .brush-help) { grid-column: 1; background: transparent; padding: 0; }
.canvas-panel :deep(.matte-tools .matte-hint) { grid-column: 1; }
.canvas-panel :deep(.matte-tools .tool-actions) { grid-column: 2; grid-row: 1 / span 4; }
.canvas-panel :deep(.matte-tools .el-radio-button__inner) { min-height: 36px; display: inline-flex; align-items: center; }
.canvas-panel :deep(.tool-row) {
  flex-direction: row;
  align-items: center;
}
.canvas-panel :deep(.matte-frame) {
  min-height: 360px;
}
.canvas-panel :deep(.lasso-hint) {
  margin: 0;
}
.action-row {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 4px;
}
.btn-preview, .btn-generate {
  min-height: 42px;
  padding: 10px 28px;
  border-radius: 10px;
  border: 1px solid #c4b3dc;
  background: #fff;
  color: var(--accent);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s;
}
.btn-preview:hover {
  background: var(--accent-soft);
}
.btn-generate {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}
.btn-generate:hover {
  background: #705795;
}
.btn-preview:disabled, .btn-generate:disabled {
  opacity: .45;
  cursor: not-allowed;
}
.extra-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}
.text-action {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  color: var(--accent);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.sticker-workshop button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
.col-gallery {
  min-height: calc(var(--upload-height) + 110px);
  box-sizing: border-box;
  position: sticky;
  top: 72px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
}
.col-gallery :deep(.sticker-collection) {
  --ink: #1c345e;
  --muted: #6b7280;
  --dash: #e8e0f4;
  --cream: #f5f0fa;
}
.col-gallery :deep(.collection-title) {
  font-size: 16px;
}
.col-gallery :deep(.collection-count) {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: var(--border);
}
.col-gallery :deep(.collection-empty) {
  min-height: calc(var(--upload-height) - 36px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-top: 24px;
  padding: 64px 12px;
  border: 1px dashed var(--border);
  border-radius: 12px;
  background: #fcfbfd;
  line-height: 1.6;
}
.col-gallery :deep(.sticker-grid) {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px 16px;
}
.col-gallery :deep(.sticker-cell:focus-within .sticker-actions) {
  opacity: 1;
}
@media (max-width: 960px) {
  .workshop-body {
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
}
  .col-work, .col-gallery {
  padding: 20px;
}
}
@media (max-width: 760px) {
  .canvas-panel :deep(.matte-tools) { grid-template-columns: minmax(0, 1fr); padding: 16px; }
  .canvas-panel :deep(.matte-tools .tool-actions) { grid-column: 1; grid-row: auto; }
  .action-row button { flex: 1; }
  .sticker-workshop {
  padding: 24px 12px 40px;
}
  .workshop-hero h1 {
  font-size: 22px;
}
  .workshop-body {
  grid-template-columns: minmax(0, 1fr);
}
  .col-work, .col-gallery {
  padding: 16px;
}
  .col-gallery {
  min-height: 0;
  position: static;
  max-height: none;
  overflow: visible;
}
  .col-gallery :deep(.sticker-grid) {
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
}
  .col-gallery :deep(.collection-empty) {
  min-height: 180px;
  padding: 40px 12px;
}
  .editor-toolbar {
  gap: 16px 24px;
}
  .canvas-panel {
  padding: 8px;
}
  .canvas-panel :deep(.matte-frame) {
  min-height: 260px;
  padding: 8px;
}
  .action-row > button {
  flex: 1;
  padding: 10px 12px;
}
  .upload-drop {
  min-height: 280px;
}
}
</style>
