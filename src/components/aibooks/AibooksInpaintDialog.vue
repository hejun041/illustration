<template>
  <el-dialog
    v-model="visible"
    :title="$t('aibooks.inpaintTitle')"
    width="min(720px, 94vw)"
    align-center
    destroy-on-close
    @closed="onClosed"
  >
    <p class="inpaint-hint">{{ $t('aibooks.inpaintHint') }}</p>
    <div class="inpaint-stage" ref="stageRef">
      <div v-if="imageLoading" class="inpaint-loading">
        <el-icon class="is-loading inpaint-loading-icon"><Loading /></el-icon>
        <p>{{ $t('aibooks.inpaintLoading') }}</p>
      </div>
      <canvas
        v-show="!imageLoading"
        ref="canvasRef"
        class="inpaint-canvas"
        @pointerdown.prevent="onPointerDown"
        @pointermove.prevent="onPointerMove"
        @pointerup.prevent="onPointerUp"
        @pointercancel.prevent="onPointerUp"
      />
    </div>
    <div class="inpaint-tools">
      <el-radio-group v-model="brushMode" size="small" :disabled="imageLoading">
        <el-radio-button label="mark">{{ $t('aibooks.inpaintBrushMark') }}</el-radio-button>
        <el-radio-button label="erase">{{ $t('aibooks.inpaintBrushErase') }}</el-radio-button>
      </el-radio-group>
      <el-radio-group v-model="brushSize" size="small" :disabled="imageLoading">
        <el-radio-button :label="18">{{ $t('stickerLab.brushSmall') }}</el-radio-button>
        <el-radio-button :label="32">{{ $t('stickerLab.brushMedium') }}</el-radio-button>
        <el-radio-button :label="48">{{ $t('stickerLab.brushLarge') }}</el-radio-button>
      </el-radio-group>
      <el-button size="small" :disabled="imageLoading" @click="clearMask">{{ $t('aibooks.inpaintClearMask') }}</el-button>
    </div>
    <el-input
      v-model="editPrompt"
      type="textarea"
      :rows="3"
      :placeholder="$t('aibooks.inpaintPromptPlaceholder')"
      class="inpaint-prompt"
    />
    <template #footer>
      <el-button @click="visible = false">{{ $t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="submitting" :disabled="imageLoading" @click="submit">
        {{ $t('aibooks.inpaintSubmit') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, nextTick, onBeforeUnmount, getCurrentInstance } from 'vue';
import { ElMessage } from 'element-plus';
import { Loading } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { postImageInpaint } from '@/api/imageEditApi';
import { handleInsufficientPointsError } from '@/utils/insufficientPoints';
import { useRouter } from 'vue-router';
import { loadImageBlob } from '@/utils/canvasImageCompose';
import {
  createEmptyKeepMask,
  applyBrushStrokesToMask,
  maskCanvasToDataUrl,
  loadImageNaturalSize,
  blobToDataUrl,
  displayPointToImage,
  brushRadiusImage,
  strokeBetween,
} from '@/utils/inpaint/exportAlphaMask';

const props = defineProps({
  apiBaseUrl: { type: String, default: '' },
  matchImageRatio: { type: Boolean, default: false },
});

const emit = defineEmits(['success']);

const { t } = useI18n();
const router = useRouter();
const { proxy } = getCurrentInstance() || {};

const visible = ref(false);
const imageLoading = ref(false);
const submitting = ref(false);
const editPrompt = ref('');
const brushMode = ref('mark');
const brushSize = ref(32);

const stageRef = ref(null);
const canvasRef = ref(null);

let imageSrcForApi = '';
let sourceBlob = null;
let loadedImage = null;
let previewObjectUrl = '';
let naturalW = 0;
let naturalH = 0;
let display = { w: 0, h: 0 };
let maskCanvas = null;
let maskStrokes = [];
let painting = false;
let lastPoint = null;
let resizeObserver = null;

function revokePreviewUrl() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = '';
  }
}

function fitDisplay(nw, nh, maxW, maxH) {
  const ratio = Math.min(maxW / nw, maxH / nh, 1);
  return { width: Math.round(nw * ratio), height: Math.round(nh * ratio) };
}

function redraw() {
  const canvas = canvasRef.value;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx || !loadedImage) return;

  ctx.clearRect(0, 0, display.w, display.h);
  ctx.drawImage(loadedImage, 0, 0, display.w, display.h);
  if (maskStrokes.length) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 80, 80, 0.45)';
    maskStrokes.forEach(({ x, y, r, erase }) => {
      if (erase) return;
      const dx = (x / naturalW) * display.w;
      const dy = (y / naturalH) * display.h;
      const dr = (r / naturalW) * display.w;
      ctx.beginPath();
      ctx.arc(dx, dy, dr, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
}

function layout() {
  const stage = stageRef.value;
  const canvas = canvasRef.value;
  if (!stage || !canvas || !naturalW) return;
  const maxW = Math.max(280, stage.clientWidth - 8);
  const maxH = Math.min(window.innerHeight * 0.5, 420);
  const fitted = fitDisplay(naturalW, naturalH, maxW, maxH);
  display = { w: fitted.width, h: fitted.height };
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(fitted.width * dpr);
  canvas.height = Math.round(fitted.height * dpr);
  canvas.style.width = `${fitted.width}px`;
  canvas.style.height = `${fitted.height}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  redraw();
}

function canvasPoint(e) {
  const canvas = canvasRef.value;
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

function paintAt(displayX, displayY) {
  const ip = displayPointToImage(displayX, displayY, display.w, display.h, naturalW, naturalH);
  const r = brushRadiusImage(brushSize.value, display.w, naturalW);
  const erase = brushMode.value === 'erase';
  maskStrokes.push({ x: ip.x, y: ip.y, r, erase: erase ? 1 : 0 });
  applyBrushStrokesToMask(maskCanvas, [{ x: ip.x, y: ip.y, r }], { erase });
}

function onPointerDown(e) {
  if (imageLoading.value) return;
  canvasRef.value?.setPointerCapture?.(e.pointerId);
  painting = true;
  const p = canvasPoint(e);
  lastPoint = p;
  paintAt(p.x, p.y);
  redraw();
}

function onPointerMove(e) {
  if (!painting || imageLoading.value) return;
  const p = canvasPoint(e);
  const r = brushRadiusImage(brushSize.value, display.w, naturalW);
  const from = displayPointToImage(lastPoint.x, lastPoint.y, display.w, display.h, naturalW, naturalH);
  const to = displayPointToImage(p.x, p.y, display.w, display.h, naturalW, naturalH);
  const erase = brushMode.value === 'erase';
  strokeBetween(from, to, r, (x, y, radius) => {
    maskStrokes.push({ x, y, r: radius, erase: erase ? 1 : 0 });
    applyBrushStrokesToMask(maskCanvas, [{ x, y, r: radius }], { erase });
  });
  lastPoint = p;
  redraw();
}

function onPointerUp() {
  painting = false;
  lastPoint = null;
}

function clearMask() {
  maskStrokes = [];
  maskCanvas = createEmptyKeepMask(naturalW, naturalH);
  redraw();
}

async function open({ imageUrl, imageBase64 = '' }) {
  if (!imageUrl && !imageBase64) return;
  editPrompt.value = '';
  brushMode.value = 'mark';
  maskStrokes = [];
  loadedImage = null;
  sourceBlob = null;
  revokePreviewUrl();
  imageSrcForApi = imageBase64 || imageUrl;
  visible.value = true;
  imageLoading.value = true;
  await nextTick();
  try {
    const src = imageBase64 || imageUrl;
    const { img, width, height, blob, objectUrl } = await loadImageNaturalSize(src, {
      http: proxy?.$http,
      apiBaseUrl: props.apiBaseUrl,
    });
    loadedImage = img;
    sourceBlob = blob;
    if (objectUrl) previewObjectUrl = objectUrl;
    naturalW = width;
    naturalH = height;
    maskCanvas = createEmptyKeepMask(naturalW, naturalH);
    layout();
    if (stageRef.value && typeof ResizeObserver !== 'undefined') {
      resizeObserver?.disconnect();
      resizeObserver = new ResizeObserver(() => layout());
      resizeObserver.observe(stageRef.value);
    }
  } catch (e) {
    ElMessage.error(t('aibooks.inpaintLoadFailed'));
    visible.value = false;
  } finally {
    imageLoading.value = false;
  }
}

function hasMarkedArea() {
  return maskStrokes.some((s) => !s.erase);
}

async function resolveImagePayload() {
  if (imageSrcForApi.startsWith('data:')) return imageSrcForApi;
  if (sourceBlob) return blobToDataUrl(sourceBlob);
  const blob = await loadImageBlob(imageSrcForApi, {
    http: proxy?.$http,
    apiBaseUrl: props.apiBaseUrl,
  });
  return blobToDataUrl(blob);
}

async function submit() {
  if (imageLoading.value) return;
  if (!editPrompt.value.trim()) {
    ElMessage.warning(t('aibooks.inpaintPromptRequired'));
    return;
  }
  if (!hasMarkedArea()) {
    ElMessage.warning(t('aibooks.inpaintMaskRequired'));
    return;
  }
  submitting.value = true;
  try {
    const imagePayload = await resolveImagePayload();
    const maskPayload = maskCanvasToDataUrl(maskCanvas);
    const result = await postImageInpaint(proxy?.$http, {
      image: imagePayload,
      mask: maskPayload,
      prompt: editPrompt.value.trim(),
      size: props.matchImageRatio
        ? ['1:1', '2:3', '3:4', '4:3', '9:16', '16:9'].reduce((best, ratio) => {
          const value = (item) => { const [w, h] = item.split(':').map(Number); return w / h; };
          return Math.abs(value(ratio) - naturalW / naturalH) < Math.abs(value(best) - naturalW / naturalH) ? ratio : best;
        })
        : '4:3',
      apiBaseUrl: props.apiBaseUrl,
    });
    if (result.points != null && proxy?.$store?.state) {
      proxy.$store.commit('setUserInfo', {
        ...(proxy.$store.state.userInfo || {}),
        points: result.points,
      });
    }
    emit('success', { imageUrl: result.image_url, prompt: editPrompt.value.trim() });
    visible.value = false;
    ElMessage.success(t('aibooks.inpaintSuccess'));
  } catch (e) {
    if (e?.insufficientPoints) {
      // 全局 axios 拦截器已弹出充值引导
    } else {
      const handled = await handleInsufficientPointsError(e, { router, t });
      if (!handled) {
        ElMessage.error(e.message || t('aibooks.inpaintFailed'));
      }
    }
  } finally {
    submitting.value = false;
  }
}

function onClosed() {
  imageSrcForApi = '';
  sourceBlob = null;
  loadedImage = null;
  maskStrokes = [];
  revokePreviewUrl();
  resizeObserver?.disconnect();
  resizeObserver = null;
}

onBeforeUnmount(() => {
  revokePreviewUrl();
  resizeObserver?.disconnect();
});

defineExpose({ open });
</script>

<style scoped>
.inpaint-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}

.inpaint-stage {
  border: 1px solid #e8e8ec;
  border-radius: 12px;
  padding: 8px;
  background: repeating-conic-gradient(#ececf0 0% 25%, #fff 0% 50%) 50% / 16px 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.inpaint-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px 24px;
  color: #606266;
  font-size: 13px;
}

.inpaint-loading-icon {
  font-size: 28px;
  color: #8167a9;
}

.inpaint-canvas {
  touch-action: none;
  cursor: crosshair;
  border-radius: 8px;
  max-width: 100%;
}

.inpaint-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin: 12px 0;
}

.inpaint-prompt {
  margin-top: 4px;
}
</style>
