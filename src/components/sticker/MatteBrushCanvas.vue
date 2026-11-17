<template>
  <div class="matte-brush-canvas">
    <div class="matte-stage" ref="stageRef">
      <div class="matte-frame image-tool-checker">
        <div v-if="segmenting" class="matte-loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>{{ $t('stickerLab.segmenting') }}</span>
        </div>
        <canvas
          v-show="!segmenting"
          ref="canvasRef"
          class="matte-canvas"
          @pointerdown.prevent="onPointerDown"
          @pointermove.prevent="onPointerMove"
          @pointerup.prevent="onPointerUp"
          @pointercancel.prevent="onPointerUp"
        />
      </div>
    </div>
    <div class="matte-tools">
      <div class="tool-heading">{{ $t('stickerLab.refineTitle') }}</div>
      <div class="tool-row">
        <div class="tool-group">
        <span class="tool-label">{{ $t('stickerLab.brushMode') }}</span>
        <el-radio-group v-model="brush" size="small" :disabled="!ready || segmenting">
          <el-radio-button label="erase">{{ $t('stickerLab.brushErase') }}</el-radio-button>
          <el-radio-button label="restore">{{ $t('stickerLab.brushRestore') }}</el-radio-button>
        </el-radio-group>
        </div>
        <div class="tool-group">
        <span class="tool-label">{{ $t('stickerLab.brushSizeLabel') }}</span>
        <el-radio-group v-model="brushSize" size="small" class="size-group" :disabled="!ready || segmenting">
          <el-radio-button :label="16">{{ $t('stickerLab.brushSmall') }}</el-radio-button>
          <el-radio-button :label="28">{{ $t('stickerLab.brushMedium') }}</el-radio-button>
          <el-radio-button :label="44">{{ $t('stickerLab.brushLarge') }}</el-radio-button>
        </el-radio-group>
        </div>
      </div>
      <p class="brush-help">{{ $t(brush === 'restore' ? 'stickerLab.restoreHelp' : 'stickerLab.eraseHelp') }}</p>
      <p v-if="embedded" class="matte-hint">{{ $t('stickerLab.matteHintEmbedded') }}</p>
      <p v-else class="matte-hint">{{ $t('stickerLab.matteHint') }}</p>
      <div class="tool-actions">
        <el-button size="small" :loading="segmenting" @click="runSegment">
          {{ $t('stickerLab.retrySegment') }}
        </el-button>
        <template v-if="!embedded">
          <el-button size="small" :disabled="!ready || segmenting" @click="openPreview">
            {{ $t('stickerLab.preview') }}
          </el-button>
          <el-button type="primary" size="small" :disabled="!ready || segmenting" @click="generate">
            {{ $t('stickerLab.finishRefining') }}
          </el-button>
        </template>
      </div>
    </div>
    <el-dialog :z-index="12000" v-model="previewOpen" :title="$t('stickerLab.previewTitle')" width="min(520px, 92vw)" class="image-tool-dialog" align-center>
      <div class="image-tool-preview image-tool-checker">
        <img v-if="previewUrl" :src="previewUrl" alt="" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick, getCurrentInstance } from 'vue';
import { ElMessage } from 'element-plus';
import { Loading } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { loadImage, fitDisplaySize, canvasToDataUrl } from '@/utils/lassoCrop';
import {
  rembgFromImageSource,
  rembgResultToCanvas,
  formatRembgRequestError,
} from '@/utils/imageSegmentation';
import { cleanAlphaDebris, finishWithStyle } from '@/utils/stickerLab/stickerStyles';

const props = defineProps({
  imageSrc: { type: String, default: '' },
  stickerStyle: { type: String, default: 'sticker' },
  borderColor: { type: String, default: '#ffffff' },
  /** 嵌入贴纸页时隐藏预览/生成，由页面统一操作 */
  embedded: { type: Boolean, default: false },
});

const emit = defineEmits(['cropped', 'reset']);

const { t } = useI18n();
const { proxy } = getCurrentInstance() || {};

const stageRef = ref(null);
const canvasRef = ref(null);
const brush = ref('erase');
const brushSize = ref(28);
const REMBG_MODE = 'background';
const segmenting = ref(false);
const ready = ref(false);
const previewUrl = ref('');
const previewOpen = ref(false);

let sourceImage = null;
let matteCanvas = null;
let painting = false;
let lastPaint = null;
let display = { w: 0, h: 0, scale: 1 };
let resizeObserver = null;
let segmentToken = 0;

function getCtx() {
  return canvasRef.value?.getContext('2d');
}

function redrawDisplay() {
  const canvas = canvasRef.value;
  const ctx = getCtx();
  if (!canvas || !ctx || !matteCanvas) return;
  ctx.clearRect(0, 0, display.w, display.h);
  ctx.drawImage(matteCanvas, 0, 0, display.w, display.h);
}

function layoutCanvas() {
  const stage = stageRef.value;
  const canvas = canvasRef.value;
  if (!stage || !canvas || !sourceImage) return;

  const nw = matteCanvas?.width || sourceImage.naturalWidth;
  const nh = matteCanvas?.height || sourceImage.naturalHeight;
  const maxW = Math.max(240, stage.clientWidth - 16);
  const maxH = Math.min(window.innerHeight * 0.55, 520);
  const fitted = fitDisplaySize(nw, nh, maxW, maxH);
  display = { w: fitted.width, h: fitted.height, scale: fitted.width / nw };

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(fitted.width * dpr);
  canvas.height = Math.round(fitted.height * dpr);
  canvas.style.width = `${fitted.width}px`;
  canvas.style.height = `${fitted.height}px`;
  const ctx = getCtx();
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  redrawDisplay();
}

async function runSegment() {
  if (!props.imageSrc) return;
  if (!proxy?.$http) {
    ElMessage.error(t('common.error'));
    return;
  }

  const token = ++segmentToken;
  segmenting.value = true;
  ready.value = false;
  previewUrl.value = '';
  painting = false;
  lastPaint = null;
  emit('reset');

  try {
    const loadedSource = await loadImage(props.imageSrc);
    if (token !== segmentToken) return;
    const result = await rembgFromImageSource(proxy.$http, props.imageSrc, {
      mode: REMBG_MODE,
    });
    if (token !== segmentToken) return;

    const rawCanvas = await rembgResultToCanvas(result.imageURL);
    if (token !== segmentToken) return;
    sourceImage = loadedSource;
    matteCanvas = cleanAlphaDebris(rawCanvas);
    ready.value = true;
    await nextTick();
    layoutCanvas();
  } catch (e) {
    if (token !== segmentToken) return;
    console.error(e);
    ElMessage.error(formatRembgRequestError(e, t('stickerLab.matteFailed')));
  } finally {
    if (token === segmentToken) segmenting.value = false;
  }
}

function canvasPoint(e) {
  const canvas = canvasRef.value;
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * display.w,
    y: ((e.clientY - rect.top) / rect.height) * display.h,
  };
}

function imagePoint(p) {
  const s = display.scale || 1;
  return { x: p.x / s, y: p.y / s };
}

function brushRadiusImage() {
  return Math.max(4, brushSize.value / (display.scale || 1));
}

function paintAt(imgX, imgY) {
  if (!matteCanvas || !sourceImage) return;
  const ctx = matteCanvas.getContext('2d');
  const r = brushRadiusImage();
  ctx.save();
  if (brush.value === 'erase') {
    ctx.globalCompositeOperation = 'destination-out';
    const g = ctx.createRadialGradient(imgX, imgY, r * 0.15, imgX, imgY, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(imgX, imgY, r, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(imgX, imgY, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalCompositeOperation = 'source-over';
    // rembg may resize its output. Restore in the matte's coordinate space.
    ctx.clearRect(0, 0, matteCanvas.width, matteCanvas.height);
    ctx.drawImage(sourceImage, 0, 0, matteCanvas.width, matteCanvas.height);
  }
  ctx.restore();
}

function paintStroke(from, to) {
  if (!from) {
    paintAt(to.x, to.y);
    return;
  }
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const step = Math.max(2, brushRadiusImage() * 0.35);
  const n = Math.max(1, Math.ceil(dist / step));
  for (let i = 0; i <= n; i += 1) {
    const tVal = i / n;
    paintAt(from.x + dx * tVal, from.y + dy * tVal);
  }
}

function onPointerDown(e) {
  if (!ready.value || segmenting.value) return;
  canvasRef.value?.setPointerCapture?.(e.pointerId);
  painting = true;
  previewUrl.value = '';
  emit('reset');
  lastPaint = imagePoint(canvasPoint(e));
  paintAt(lastPaint.x, lastPaint.y);
  redrawDisplay();
}

function onPointerMove(e) {
  if (!painting) return;
  const ip = imagePoint(canvasPoint(e));
  paintStroke(lastPaint, ip);
  lastPaint = ip;
  redrawDisplay();
}

function onPointerUp() {
  if (!painting) return;
  painting = false;
  lastPaint = null;
  redrawDisplay();
}

function buildStyledSticker() {
  if (!matteCanvas) return null;
  // Styling must not mutate the editable pixels or remove restored details.
  const styled = finishWithStyle(matteCanvas, props.stickerStyle, props.borderColor, { clean: false });
  return {
    styled,
    dataUrl: canvasToDataUrl(styled),
  };
}

function openPreview() {
  const result = buildStyledSticker();
  if (!result) return;
  previewUrl.value = result.dataUrl;
  previewOpen.value = true;
}

function generate() {
  if (!ready.value || segmenting.value) return;
  const result = buildStyledSticker();
  if (!result) return;
  previewUrl.value = result.dataUrl;
  emit('cropped', {
    dataUrl: result.dataUrl,
    width: result.styled.width,
    height: result.styled.height,
    style: props.stickerStyle,
    borderColor: props.borderColor,
    mode: 'matte',
    source: 'generate',
  });
}

watch(() => [props.stickerStyle, props.borderColor], () => {
  previewUrl.value = '';
  emit('reset');
});

defineExpose({ openPreview, generate, ready, segmenting });

watch(() => props.imageSrc, () => {
  runSegment();
}, { immediate: true });

onMounted(() => {
  if (stageRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => layoutCanvas());
    resizeObserver.observe(stageRef.value);
  }
});

onBeforeUnmount(() => {
  segmentToken += 1;
  resizeObserver?.disconnect();
});
</script>

<style scoped>
.matte-brush-canvas {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  gap: 16px;
  align-items: start;
}

.matte-stage {
  min-width: 0;
}

.matte-frame {
  border-radius: 12px;
  border: 1px solid var(--ks-border);
  padding: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 280px;
  position: relative;
}

.matte-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--ks-muted);
  font-size: 14px;
  padding: 40px 16px;
}

.matte-loading .el-icon {
  font-size: 28px;
  color: var(--ks-primary);
}

.matte-canvas {
  touch-action: none;
  cursor: crosshair;
  border-radius: 8px;
}

.matte-tools {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--ks-divider);
  border-radius: var(--ks-radius-md);
  background: var(--ks-panel);
}

.tool-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.tool-group { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }

.tool-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--ks-muted);
}

.size-group {
  flex-wrap: wrap;
}

.tool-heading { font-size: 16px; font-weight: 600; color: var(--ks-ink); }
.brush-help { margin: 0; padding: 10px; background: var(--ks-primary-soft); border-radius: 6px; color: var(--ks-primary-hover); font-size: 13px; line-height: 1.6; }
.tool-actions :deep(.el-button) { margin-left: 0; }
.tool-actions :deep(.el-button--primary) { width: 100%; min-height: 36px; }
.matte-hint {
  margin: 0;
  font-size: 12px;
  color: var(--ks-muted);
  line-height: 1.5;
}

.tool-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 768px) {
  .matte-brush-canvas {
    grid-template-columns: minmax(0, 1fr);
  }
  .matte-tools { grid-row: 1; }
}
</style>
