<template>
  <div class="topdf">
    <section class="topdf-preview">
      <header class="topdf-preview-head">
        <button type="button" class="topdf-back" @click="handleBack">
          ← {{ $t('toPdf.backToSelect') }}
        </button>
        <div class="topdf-preview-tools">
          <el-radio-group v-model="viewMode" size="small">
            <el-radio-button label="book">{{ $t('toPdf.viewBook') }}</el-radio-button>
            <el-radio-button label="pages">{{ $t('toPdf.viewPages') }}</el-radio-button>
          </el-radio-group>
          <button
            v-if="totalPages"
            type="button"
            class="topdf-fs-btn"
            @click="openFullscreenPreview"
          >
            {{ $t('toPdf.fullscreenPreview') }}
          </button>
          <span v-if="totalPages" class="topdf-page-count">
            {{ $t('toPdf.totalPages', { total: totalPages }) }}
          </span>
        </div>
      </header>

      <div v-if="!totalPages" class="topdf-empty" @click="handleBack">
        <span class="topdf-empty-icon">+</span>
        <span>{{ $t('toPdf.addIllustrations') }}</span>
      </div>

      <template v-else>
      <!-- 书册预览：全屏时 Teleport 到 body -->
      <Teleport to="body" :disabled="!fullscreenPreview">
      <div
        v-show="viewMode === 'book' || fullscreenPreview"
        class="book-stage"
        :class="{ 'is-fullscreen': fullscreenPreview }"
      >
        <div v-if="fullscreenPreview" class="book-fs-bar">
          <span class="book-fs-progress">{{ progressShort }}</span>
          <button type="button" class="book-fs-close" @click="closeFullscreenPreview">
            {{ $t('toPdf.exitFullscreen') }}
          </button>
        </div>
        <p v-if="!fullscreenPreview && oddPairHint" class="book-stage-alert">{{ oddPairHint }}</p>

        <div
          class="book-viewer"
          :class="{ 'is-spread': isSpreadView }"
          @click="onBookClick"
        >
          <button
            type="button"
            class="book-nav book-nav--prev"
            :disabled="sheetIndex <= 0 || isFlipping"
            @click.stop="prevSheet"
          >
            ‹
          </button>

          <div
            class="book-stage-frame"
            :class="{
              'is-cover-motion': !!coverLeaf,
              'is-cover-open': coverLeafFlipped,
              'is-cover-from-back': coverLeaf && coverLeaf.side === 'left',
              'is-cover-opening': coverLeaf && coverLeaf.mode === 'open',
              'is-cover-closing': coverLeaf && coverLeaf.mode === 'close',
            }"
            :style="bookFrameStyle"
          >
            <!-- 封面 / 封底：静止单页（开合书时由 coverLeaf 接管） -->
            <div
              v-if="showSingleFace"
              :key="`sheet-${sheetIndex}-single`"
              class="book-face book-face--single"
            >
              <div class="book-face-spine" aria-hidden="true" />
              <div class="book-face-art">
                <img
                  v-if="currentSheet.page && !currentSheet.page.blank && currentSheet.page.src"
                  :src="currentSheet.page.src"
                  alt=""
                />
                <div
                  v-else
                  class="book-placeholder book-blank-slot"
                  :class="{ 'book-placeholder--muted': currentSheet.type === 'back' }"
                >
                  <strong>{{ currentSheet.type === 'cover' ? $t('toPdf.roleCover') : $t('toPdf.roleBack') }}</strong>
                  <span v-if="form.title">{{ form.title }}</span>
                  <div
                    v-if="currentSheet.type === 'cover' && !fullscreenPreview"
                    class="book-blank-actions"
                    @click.stop
                  >
                    <button type="button" @click="onBlankInsert('cover')">{{ $t('toPdf.blankInsert') }}</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 扉页 / 内页 -->
            <div
              v-else-if="isSpreadView"
              class="book-spread-veil"
            >
            <div class="book-face book-face--spread">
              <div class="book-half book-half--left">
                <div :key="`sheet-${sheetIndex}-left`" class="book-face-art">
                  <img
                    v-if="leftUnderPage && !leftUnderPage.blank && leftUnderPage.src"
                    :src="leftUnderPage.src"
                    alt=""
                  />
                  <div v-else class="book-placeholder book-placeholder--muted book-blank-slot">
                    <span>{{ currentSheet.leftLabel || $t('toPdf.blankPage') }}</span>
                    <div
                      v-if="!fullscreenPreview && currentSheet.type !== 'title'"
                      class="book-blank-actions"
                      @click.stop
                    >
                      <button type="button" @click="onBlankInsert('left')">{{ $t('toPdf.blankInsert') }}</button>
                      <button type="button" @click="onBlankEdit('left')">{{ $t('toPdf.blankEdit') }}</button>
                      <button
                        v-if="canDeleteBlank('left')"
                        type="button"
                        class="is-danger"
                        @click="onBlankDelete('left')"
                      >{{ $t('toPdf.deletePage') }}</button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="book-half book-half--right">
                <div class="book-page-stack">
                  <div class="book-face-art book-page-under">
                    <template v-if="rightUnderPage && !rightUnderPage.blank && rightUnderPage.src">
                      <img :src="rightUnderPage.src" alt="" />
                    </template>
                    <div
                      v-else-if="currentSheet.type === 'title' && !(rightUnderPage && rightUnderPage.src)"
                      class="book-placeholder book-placeholder--title"
                    >
                      <em>{{ $t('toPdf.roleTitle') }}</em>
                      <strong>{{ form.title || $t('toPdf.bookTitlePlaceholder') }}</strong>
                      <span v-if="form.desc" class="book-title-desc">{{ form.desc }}</span>
                    </div>
                    <div v-else class="book-placeholder book-placeholder--muted book-blank-slot">
                      <span>{{ $t('toPdf.blankPage') }}</span>
                      <div
                        v-if="!fullscreenPreview"
                        class="book-blank-actions"
                        @click.stop
                      >
                        <button type="button" @click="onBlankInsert('right')">{{ $t('toPdf.blankInsert') }}</button>
                        <button type="button" @click="onBlankEdit('right')">{{ $t('toPdf.blankEdit') }}</button>
                        <button
                          v-if="canDeleteBlank('right')"
                          type="button"
                          class="is-danger"
                          @click="onBlankDelete('right')"
                        >{{ $t('toPdf.deletePage') }}</button>
                      </div>
                    </div>
                  </div>

                  <div
                    v-if="flipLeaf"
                    class="book-page-leaf"
                    :class="{ 'is-flipped': flipLeafFlipped }"
                  >
                    <div class="book-page-leaf__face book-page-leaf__front">
                      <div class="book-face-art">
                        <template v-if="flipLeaf.page && !flipLeaf.page.blank && flipLeaf.page.src">
                          <img :src="flipLeaf.page.src" alt="" />
                        </template>
                        <div
                          v-else-if="flipLeaf.sheetType === 'title'"
                          class="book-placeholder book-placeholder--title"
                        >
                          <em>{{ $t('toPdf.roleTitle') }}</em>
                          <strong>{{ form.title || $t('toPdf.bookTitlePlaceholder') }}</strong>
                        </div>
                        <div v-else class="book-placeholder book-placeholder--muted">
                          <span>{{ $t('toPdf.blankPage') }}</span>
                        </div>
                      </div>
                      <span class="book-page-leaf__gloss" aria-hidden="true" />
                    </div>
                    <div class="book-page-leaf__face book-page-leaf__back" aria-hidden="true">
                      <div class="book-face-art">
                        <template v-if="flipLeaf.backPage && !flipLeaf.backPage.blank && flipLeaf.backPage.src">
                          <img :src="flipLeaf.backPage.src" alt="" />
                        </template>
                        <div
                          v-else-if="flipLeaf.backSheetType === 'title'"
                          class="book-placeholder book-placeholder--title"
                        >
                          <em>{{ $t('toPdf.roleTitle') }}</em>
                          <strong>{{ form.title || $t('toPdf.bookTitlePlaceholder') }}</strong>
                        </div>
                        <div v-else class="book-placeholder book-placeholder--muted">
                          <span>{{ flipLeaf.backLabel || $t('toPdf.blankPage') }}</span>
                        </div>
                      </div>
                      <span class="book-page-leaf__gloss book-page-leaf__gloss--back" aria-hidden="true" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>

            <div
              v-if="coverLeaf"
              class="book-cover-leaf"
              :class="{
                'is-flipped': coverLeafFlipped,
                'book-cover-leaf--left': coverLeaf.side === 'left',
              }"
            >
              <div class="book-cover-leaf__face book-cover-leaf__front">
                <div class="book-face-spine" aria-hidden="true" />
                <div class="book-face-art">
                  <img
                    v-if="coverLeaf.page && !coverLeaf.page.blank && coverLeaf.page.src"
                    :src="coverLeaf.page.src"
                    alt=""
                  />
                  <div
                    v-else
                    class="book-placeholder"
                    :class="{ 'book-placeholder--muted': coverLeaf.sheetType === 'back' }"
                  >
                    <strong>
                      {{
                        coverLeaf.sheetType === 'back'
                          ? $t('toPdf.roleBack')
                          : $t('toPdf.roleCover')
                      }}
                    </strong>
                    <span v-if="form.title">{{ form.title }}</span>
                  </div>
                </div>
              </div>
              <div class="book-cover-leaf__face book-cover-leaf__back" aria-hidden="true">
                <div class="book-face-art">
                  <img
                    v-if="coverLeaf.backPage && !coverLeaf.backPage.blank && coverLeaf.backPage.src"
                    :src="coverLeaf.backPage.src"
                    alt=""
                  />
                  <div v-else class="book-placeholder book-placeholder--muted">
                    <span>{{ coverLeaf.backLabel || $t('toPdf.blankPage') }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            class="book-nav book-nav--next"
            :disabled="sheetIndex >= sheets.length - 1 || isFlipping"
            @click.stop="nextSheet"
          >
            ›
          </button>
        </div>

        <div class="book-pager">
          <button type="button" :disabled="sheetIndex <= 0 || isFlipping" @click="prevSheet">
            {{ $t('toPdf.prevPage') }}
          </button>
          <span v-if="!fullscreenPreview">{{ progressShort }}</span>
          <button type="button" :disabled="sheetIndex >= sheets.length - 1 || isFlipping" @click="nextSheet">
            {{ $t('toPdf.nextPage') }}
          </button>
        </div>
        <p v-if="!fullscreenPreview" class="book-flip-hint">{{ $t('toPdf.keyboardFlipHint') }}</p>
      </div>
      </Teleport>

      <!-- 页面编辑：替换 / 排序 -->
      <div
        v-show="viewMode === 'pages' && !fullscreenPreview"
        class="topdf-scroll"
      >
        <div class="topdf-pages-toolbar">
          <p class="topdf-pages-hint">{{ $t('toPdf.pageEditHint') }}</p>
          <div class="topdf-pages-toolbar-actions">
            <el-button size="small" @click="addBlankPage">{{ $t('toPdf.addBlankPage') }}</el-button>
            <el-button size="small" @click="handleBack">{{ $t('toPdf.addMoreArt') }}</el-button>
          </div>
        </div>
        <div class="topdf-pages-grid">
          <div
            v-for="(page, index) in editablePages"
            :key="page.key"
            class="topdf-page-card"
            :class="{
              'is-dragging': dragIndex === index,
              'is-drag-over': dragOverIndex === index && dragIndex !== index,
            }"
            :style="pageCardStyle"
            draggable="true"
            @dragstart="onDragStart($event, index)"
            @dragover="onDragOver($event, index)"
            @dragleave="onDragLeave"
            @drop="onDrop($event, index)"
            @dragend="onDragEnd"
          >
            <div class="topdf-page-toolbar">
              <span class="topdf-page-label">
                {{ roleLabel(index) }}
                <em>{{ $t('toPdf.pageLabel', { n: index + 1 }) }}</em>
              </span>
              <span class="topdf-page-drag-hint" aria-hidden="true">⋮⋮</span>
            </div>

            <div
              class="topdf-page-stage"
              :class="{ 'is-empty': page.blank || !page.src }"
              :style="pageStageStyle"
            >
              <div v-if="page.blank || !page.src" class="topdf-page-blank">
                {{ $t('toPdf.blankPage') }}
              </div>
              <el-image lazy loading="lazy" decoding="async" v-else :src="$illustrationPreview({ content: page.src, thumbnail: page.thumbnail })" @error="$thumbnailFailed(page)" fit="contain" class="topdf-page-img" />
              <div class="topdf-page-hover">
                <el-button size="small" type="primary" @click.stop="openReplacePicker(index)">
                  {{ page.blank || !page.src ? $t('toPdf.pickIllustration') : $t('toPdf.replaceIllustration') }}
                </el-button>
                <el-button
                  v-if="!page.blank && page.src"
                  size="small"
                  @click.stop="editPageInEditor(index)"
                >
                  {{ $t('toPdf.editInEditor') }}
                </el-button>
              </div>
            </div>

            <div class="topdf-page-footer">
              <button type="button" :disabled="index === 0" @click.stop="movePage(index, -1)">↑</button>
              <button
                type="button"
                :disabled="index === editablePages.length - 1"
                @click.stop="movePage(index, 1)"
              >↓</button>
              <button
                type="button"
                class="is-danger"
                :disabled="editablePages.length <= 1"
                @click.stop="removePage(index)"
              >
                {{ $t('toPdf.deletePage') }}
              </button>
            </div>
          </div>
        </div>

        <MyIllustrationPicker
          ref="illPicker"
          class="topdf-hidden-picker"
          :dialog-title="replaceDialogTitle"
          @select="onReplaceIllustration"
        />
      </div>
      </template>
    </section>

    <aside class="topdf-sidebar">
      <h2 class="topdf-sidebar-title">{{ $t('toPdf.exportTitle') }}</h2>

      <div class="topdf-format-block">
        <div class="topdf-format-row">
          <div>
            <p class="topdf-format-value">{{ $t(activeFormat.nameKey) }}</p>
            <p class="topdf-format-meta">{{ formatMetaLabel }}</p>
            <p class="topdf-format-size">{{ formatSizeTip }}</p>
          </div>
          <button type="button" class="topdf-format-change" @click="goChangeFormat">
            {{ $t('toPdf.changeFormat') }}
          </button>
        </div>
      </div>

      <div v-if="totalPages" class="topdf-checklist">
        <h3 class="topdf-checklist-title">{{ $t('toPdf.checklistTitle') }}</h3>
        <ul>
          <li
            v-for="item in exportChecklist"
            :key="item.key"
            :class="{ 'is-ok': item.ok, 'is-warn': !item.ok }"
          >
            <span class="topdf-check-mark" aria-hidden="true">{{ item.ok ? '✓' : '!' }}</span>
            {{ item.label }}
          </li>
        </ul>
      </div>

      <el-form ref="form" :model="form" label-position="top" class="topdf-form">
        <el-form-item :label="$t('toPdf.bookTitle')">
          <el-input
            v-model="form.title"
            maxlength="24"
            show-word-limit
            :placeholder="$t('toPdf.bookTitlePlaceholder')"
          />
        </el-form-item>
        <el-form-item :label="$t('toPdf.bookCategory')">
          <el-select v-model="form.category" :placeholder="$t('toPdf.categoryPlaceholder')">
            <el-option :label="$t('toPdf.catReading')" value="reading" />
            <el-option :label="$t('toPdf.catHabit')" value="habit" />
            <el-option :label="$t('toPdf.catEnglish')" value="english" />
            <el-option :label="$t('toPdf.catMath')" value="math" />
            <el-option :label="$t('toPdf.catKnowledge')" value="knowledge" />
            <el-option :label="$t('toPdf.catOthers')" value="others" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('toPdf.bookDesc')">
          <el-input
            v-model="form.desc"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 6 }"
            maxlength="500"
            show-word-limit
            :placeholder="$t('toPdf.descPlaceholder')"
          />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="form.authorizationConfirmed">
            {{ $t('toPdf.compliance') }}
          </el-checkbox>
        </el-form-item>

        <div class="topdf-actions">
          <el-button type="primary" :disabled="exporting || !totalPages" @click="downPDF">
            {{ $t('toPdf.downloadPdf') }}
          </el-button>
          <el-button :disabled="exporting || !totalPages" @click="downImages">
            {{ $t('toPdf.downloadImages') }}
          </el-button>
          <el-button type="primary" :disabled="!publishablePages.length" @click="submit">
            {{ $t('toPdf.publish') }}
          </el-button>
        </div>
      </el-form>
    </aside>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import { trackAnalytics } from '@/utils/googleAnalytics';
import { ElMessage } from 'element-plus';
import {
  formatSizeLabel,
  getBookExportFormat,
  normalizeBookExportFormatId,
} from '@/data/bookExportFormats';
import {
  buildBookPdfFromPages,
  downloadBookPagesAsPng,
} from '@/utils/bookExport/renderBookPage';
import { getLayoutExportFormatId, readLayoutExportSession, writeLayoutExportSession } from '@/utils/layoutExportSession';
import { setEditorproPendingImage } from '@/utils/editorproPendingImage';
import MyIllustrationPicker from '@/components/MyIllustrationPicker.vue';

function pageKey(item, index) {
  if (item?.blank) return item._id || `blank-${index}`;
  return item?._id || `page-${index}`;
}

function toStorePage(item) {
  if (item?.blank) {
    return {
      blank: true,
      _id: item._id || `blank-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      content: null,
      title: item.title || '',
    };
  }
  return {
    _id: item._id,
    content: item.content,
    thumbnail: item.thumbnail || '',
    title: item.title,
  };
}

export default {
  components: { MyIllustrationPicker },
  data() {
    return {
      exporting: false,
      viewMode: 'book',
      sheetIndex: 0,
      isFlipping: false,
      flipTimer: null,
      flipLeaf: null,
      flipLeafFlipped: false,
      /** 封面/封底开合叶 */
      coverLeaf: null,
      coverLeafFlipped: false,
      /** 翻页过程中强制下层右页（上一页），避免 prev 时闪成新图 */
      rightUnderOverride: null,
      leftUnderOverride: null,
      dragIndex: null,
      dragOverIndex: null,
      replacingPageIndex: null,
      fullscreenPreview: false,
      form: {
        title: '',
        category: '',
        desc: '',
        authorizationConfirmed: false,
      },
      editablePages: [],
    };
  },
  computed: {
    ...mapState(['imgToPDF', 'bookExportFormatId']),
    activeFormat() {
      return getBookExportFormat(this.bookExportFormatId);
    },
    formatMetaLabel() {
      return formatSizeLabel(this.activeFormat);
    },
    pageCardStyle() {
      return { aspectRatio: this.activeFormat.aspectRatioCss };
    },
    pageStageStyle() {
      return { aspectRatio: this.pageCardStyle.aspectRatio };
    },
    /** 单页 trim 比例，来自印刷尺寸而非 CSS 预览字符串 */
    pageAspectValue() {
      const w = this.activeFormat.trimWidthIn || 1;
      const h = this.activeFormat.trimHeightIn || 1;
      return w / h;
    },
    formatSizeTip() {
      const f = this.activeFormat;
      return this.$t('toPdf.formatSizeTip', { w: f.trimWidthIn, h: f.trimHeightIn });
    },
    /** 外框按高度锁定，宽度由单页/双页比例推导，避免被撑扁 */
    bookFrameStyle() {
      const isSpread = this.isSpreadView;
      const pageAr = this.pageAspectValue;
      const frameAr = isSpread ? pageAr * 2 : pageAr;
      return {
        '--frame-ar': String(frameAr),
      };
    },
    isSpreadView() {
      const t = this.currentSheet?.type;
      if (t === 'title' || t === 'spread') return true;
      return !!this.coverLeaf;
    },
    showSingleFace() {
      const t = this.currentSheet?.type;
      return (t === 'cover' || t === 'back') && !this.coverLeaf;
    },
    leftUnderPage() {
      return this.leftUnderOverride || this.currentSheet.left || null;
    },
    rightUnderPage() {
      if (this.rightUnderOverride) return this.rightUnderOverride;
      return this.currentSheet.right || null;
    },
    totalPages() {
      return this.editablePages.length;
    },
    blankArtCount() {
      return this.editablePages.filter((p) => p.blank || !p.src).length;
    },
    hasOddInteriorPair() {
      if (this.editablePages.length < 3) return false;
      return (this.editablePages.length - 2) % 2 === 1;
    },
    oddPairHint() {
      return this.hasOddInteriorPair ? this.$t('toPdf.oddPairHint') : '';
    },
    progressShort() {
      return this.$t('toPdf.progressShort', {
        current: this.sheetIndex + 1,
        total: this.sheets.length || 0,
      });
    },
    replaceDialogTitle() {
      if (this.replacingPageIndex == null) return '';
      return this.$t('toPdf.replaceDialogTitle', {
        role: this.roleLabel(this.replacingPageIndex),
      });
    },
    exportChecklist() {
      const cover = this.editablePages[0];
      const coverOk = !!(cover && !cover.blank && cover.src);
      const titleOk = !!(this.form.title || '').trim();
      const blank = this.blankArtCount;
      const pairOk = !this.hasOddInteriorPair;
      return [
        {
          key: 'cover',
          ok: coverOk,
          label: coverOk ? this.$t('toPdf.checkCoverOk') : this.$t('toPdf.checkCoverMissing'),
        },
        {
          key: 'title',
          ok: titleOk,
          label: titleOk ? this.$t('toPdf.checkTitleOk') : this.$t('toPdf.checkTitleMissing'),
        },
        {
          key: 'blank',
          ok: blank === 0,
          label: blank === 0
            ? this.$t('toPdf.checkBlankOk')
            : this.$t('toPdf.checkBlankWarn', { count: blank }),
        },
        {
          key: 'pair',
          ok: pairOk,
          label: pairOk ? this.$t('toPdf.checkPairOk') : this.$t('toPdf.checkPairWarn'),
        },
      ];
    },
    publishablePages() {
      return this.editablePages.filter((p) => !p.blank && p.id);
    },
    /**
     * 书册结构：
     * 0 封面(pages[0])
     * 1 扉页展开：左空白 / 右扉页(pages[1] 或书名卡)
     * 2… 内页双页展开(pages[2] 起成对)
     * 末 封底(最后一页若 ≥3 页且未成对用空白，或单独用末页)
     */
    sheets() {
      const pages = this.editablePages;
      if (!pages.length) return [];

      const list = [
        { type: 'cover', page: pages[0] },
        {
          type: 'title',
          left: null,
          right: pages[1] || null,
          leftLabel: this.$t('toPdf.roleEndpaperShort'),
        },
      ];

      for (let i = 2; i < pages.length; i += 2) {
        list.push({
          type: 'spread',
          left: pages[i],
          right: pages[i + 1] || null,
        });
      }

      list.push({ type: 'back', page: null });
      return list;
    },
    currentSheet() {
      return this.sheets[this.sheetIndex] || { type: 'cover', page: null };
    },
  },
  watch: {
    imgToPDF: {
      immediate: true,
      handler(list) {
        this.hydratePages(list);
      },
    },
    sheets() {
      if (this.sheetIndex > this.sheets.length - 1) {
        this.sheetIndex = Math.max(0, this.sheets.length - 1);
      }
    },
    viewMode(mode) {
      if (mode === 'pages') this.closeFullscreenPreview();
    },
  },
  mounted() {
    readLayoutExportSession();
    const formatId = normalizeBookExportFormatId(getLayoutExportFormatId());
    this.$store.commit('setBookExportFormat', formatId);
    window.addEventListener('keydown', this.onKeydown);
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onKeydown);
    if (this.flipTimer) clearTimeout(this.flipTimer);
    this.closeFullscreenPreview();
  },
  methods: {
    hydratePages(list) {
      const source = Array.isArray(list) && list.length
        ? list
        : (readLayoutExportSession().checkedImages || []);
      this.editablePages = source.map((item, index) => {
        if (item?.blank) {
          return {
            key: pageKey(item, index),
            blank: true,
            _id: item._id || pageKey(item, index),
            id: null,
            src: '',
            title: item.title || '',
          };
        }
        const content = item?.content;
        const src = !content
          ? ''
          : (String(content).startsWith('http') ? content : `https://static.kidstory.cc/${content}`);
        return {
          key: pageKey(item, index),
          blank: false,
          _id: item._id,
          id: item._id,
          src,
          thumbnail: item.thumbnail || '',
          content,
          title: item.title || '',
        };
      }).filter((p) => p.blank || p.src);
    },
    persistPages() {
      const pages = this.editablePages.map((p) => toStorePage(p));
      this.$store.commit('setBookIllustrations', pages);
      writeLayoutExportSession({ checkedImages: pages });
    },
    roleLabel(index) {
      if (index === 0) return this.$t('toPdf.roleCover');
      if (index === 1) return this.$t('toPdf.roleTitle');
      if (index === this.editablePages.length - 1 && this.editablePages.length >= 3) {
        return this.$t('toPdf.roleInterior');
      }
      return this.$t('toPdf.roleInterior');
    },
    /** 当前展开面某侧对应 editablePages 下标；环衬 / 越界返回 -1 */
    resolvePageIndex(side) {
      const sheet = this.currentSheet;
      if (!sheet) return -1;
      if (side === 'cover' || sheet.type === 'cover') return 0;
      if (sheet.type === 'back') return -1;
      if (sheet.type === 'title') return side === 'right' ? 1 : -1;
      if (sheet.type === 'spread') {
        const base = 2 + (this.sheetIndex - 2) * 2;
        return side === 'left' ? base : base + 1;
      }
      return -1;
    },
    canDeleteBlank(side) {
      const idx = this.resolvePageIndex(side);
      if (idx < 0 || idx >= this.editablePages.length) return false;
      return !!this.editablePages[idx]?.blank;
    },
    onBlankInsert(side) {
      if (side === 'cover') {
        this.openReplacePicker(0);
        return;
      }
      const idx = this.resolvePageIndex(side);
      if (idx >= 0) {
        this.openReplacePicker(idx);
        return;
      }
      this.handleBack();
    },
    onBlankEdit(side) {
      const idx = side === 'cover' ? 0 : this.resolvePageIndex(side);
      if (idx >= 0) {
        this.editPageInEditor(idx);
        return;
      }
      this.viewMode = 'pages';
      ElMessage.info(this.$t('toPdf.blankEditHint'));
    },
    openReplacePicker(index) {
      this.replacingPageIndex = index;
      this.$refs.illPicker?.open();
    },
    onReplaceIllustration({ item, url }) {
      const index = this.replacingPageIndex;
      this.replacingPageIndex = null;
      if (index == null || index < 0) return;
      this.applyIllustrationToPage(index, item, url);
      ElMessage.success(this.$t('toPdf.replaceSuccess'));
    },
    applyIllustrationToPage(index, item, url) {
      const page = this.editablePages[index];
      if (!page || !url) return;
      let content = item?.content || '';
      if (!content && url.includes('static.kidstory.cc/')) {
        content = url.split('static.kidstory.cc/')[1] || '';
      }
      page.blank = false;
      page._id = item?._id || page._id;
      page.id = item?._id || page.id;
      page.content = content || page.content;
      page.src = url;
      page.title = item?.title || page.title || '';
      page.key = pageKey(page, index);
      this.persistPages();
    },
    editPageInEditor(index) {
      const page = this.editablePages[index];
      if (!page || page.blank || !page.src) {
        this.openReplacePicker(index);
        return;
      }
      setEditorproPendingImage(page.src, { title: page.title || '' });
      this.$router.push({ name: 'editorpro' });
    },
    onBlankDelete(side) {
      const idx = this.resolvePageIndex(side);
      if (idx >= 0 && this.editablePages[idx]?.blank) {
        this.removePage(idx);
      }
    },
    goChangeFormat() {
      this.$router.push({ name: 'compose-illustration', query: { edit: 'format' } });
    },
    exportFileBaseName() {
      const title = (this.form.title || '').trim();
      const safe = title.replace(/[^\w\u4e00-\u9fa5-]+/g, '-').replace(/^-+|-+$/g, '');
      return safe || 'KidStory';
    },
    handleBack() {
      this.$router.push({ name: 'compose-illustration' });
    },
    validateCompliance() {
      if (!this.form.authorizationConfirmed) {
        ElMessage.warning(this.$t('toPdf.complianceRequired'));
        return false;
      }
      return true;
    },
    buildExportPages() {
      return this.editablePages.map((p) => (
        p.blank ? { blank: true } : { src: p.src }
      ));
    },
    addBlankPage() {
      const id = `blank-${Date.now()}`;
      this.editablePages.push({
        key: id,
        blank: true,
        _id: id,
        id: null,
        src: '',
        title: '',
      });
      this.persistPages();
      this.viewMode = 'pages';
    },
    removePage(index) {
      this.editablePages.splice(index, 1);
      this.persistPages();
    },
    reorderPages(from, to) {
      if (from === to || from < 0 || to < 0 || from >= this.editablePages.length || to >= this.editablePages.length) {
        return;
      }
      const list = [...this.editablePages];
      const [item] = list.splice(from, 1);
      list.splice(to, 0, item);
      this.editablePages = list;
      this.persistPages();
    },
    movePage(index, delta) {
      this.reorderPages(index, index + delta);
    },
    onDragStart(event, index) {
      this.dragIndex = index;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    },
    onDragOver(event, index) {
      event.preventDefault();
      if (this.dragIndex !== null && this.dragIndex !== index) {
        this.dragOverIndex = index;
      }
    },
    onDragLeave() {
      this.dragOverIndex = null;
    },
    onDrop(event, dropIndex) {
      event.preventDefault();
      if (this.dragIndex === null || this.dragIndex === dropIndex) {
        this.dragOverIndex = null;
        return;
      }
      this.reorderPages(this.dragIndex, dropIndex);
      this.dragIndex = null;
      this.dragOverIndex = null;
    },
    onDragEnd() {
      this.dragIndex = null;
      this.dragOverIndex = null;
    },
    goSheet(idx) {
      if (idx === this.sheetIndex || this.isFlipping) return;
      const direction = idx > this.sheetIndex ? 'next' : 'prev';
      const fromSheet = this.sheets[this.sheetIndex];
      const toSheet = this.sheets[idx];
      const isSpread = (s) => s && (s.type === 'title' || s.type === 'spread');
      const isSingle = (s) => s && (s.type === 'cover' || s.type === 'back');

      this.isFlipping = true;
      if (this.flipTimer) clearTimeout(this.flipTimer);

      if (isSpread(fromSheet) && isSpread(toSheet)) {
        // 同一张纸：正面=较早展的右页，背面=较晚展的左页；下层右页=较晚展的右页
        // 往前 A→B：正 from.right / 背 to.left / 下 to.right
        // 往后 B→A：正 to.right / 背 from.left / 下 from.right（起始 -180 先见背面）
        if (direction === 'next') {
          this.flipLeaf = {
            page: fromSheet.right,
            sheetType: fromSheet.type,
            backPage: toSheet.left,
            backSheetType: toSheet.type,
            backLabel: toSheet.leftLabel,
          };
          this.flipLeafFlipped = false;
          this.rightUnderOverride = null;
          this.leftUnderOverride = fromSheet.left || { blank: true };
          this.sheetIndex = idx;
          this.$nextTick(() => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                this.flipLeafFlipped = true;
              });
            });
          });
        } else {
          this.rightUnderOverride = fromSheet.right || { blank: true };
          this.flipLeaf = {
            page: toSheet.right,
            sheetType: toSheet.type,
            backPage: fromSheet.left,
            backSheetType: fromSheet.type,
            backLabel: fromSheet.leftLabel,
          };
          this.flipLeafFlipped = true;
          this.sheetIndex = idx;
          this.$nextTick(() => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                this.flipLeafFlipped = false;
              });
            });
          });
        }

        this.flipTimer = setTimeout(() => {
          this.flipLeaf = null;
          this.flipLeafFlipped = false;
          this.rightUnderOverride = null;
          this.leftUnderOverride = null;
          this.isFlipping = false;
          this.flipTimer = null;
        }, 920);
        return;
      }

      // 封面/封底 ↔ 双页：书体平移 + 封面绕书脊翻开
      if (isSingle(fromSheet) && isSpread(toSheet)) {
        const openFromBack = fromSheet.type === 'back';
        this.coverLeaf = {
          mode: 'open',
          side: openFromBack ? 'left' : 'right',
          page: fromSheet.page,
          sheetType: fromSheet.type,
          backPage: openFromBack ? toSheet.right : toSheet.left,
          backSheetType: toSheet.type,
          backLabel: toSheet.leftLabel,
        };
        // 先落在「合上」位移（封面居中），再与翻页同时移到展开位
        this.coverLeafFlipped = false;
        this.sheetIndex = idx;
        this.$nextTick(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              this.coverLeafFlipped = true;
            });
          });
        });
        this.flipTimer = setTimeout(() => {
          this.coverLeaf = null;
          this.coverLeafFlipped = false;
          this.isFlipping = false;
          this.flipTimer = null;
        }, 1000);
        return;
      }

      if (isSpread(fromSheet) && isSingle(toSheet)) {
        const closeToBack = toSheet.type === 'back';
        this.coverLeaf = {
          mode: 'close',
          side: closeToBack ? 'left' : 'right',
          page: toSheet.page,
          sheetType: toSheet.type,
          backPage: closeToBack ? fromSheet.right : fromSheet.left,
          backSheetType: fromSheet.type,
          backLabel: fromSheet.leftLabel,
        };
        this.coverLeafFlipped = true;
        this.$nextTick(() => {
          requestAnimationFrame(() => {
            this.coverLeafFlipped = false;
          });
        });
        this.flipTimer = setTimeout(() => {
          this.sheetIndex = idx;
          this.coverLeaf = null;
          this.coverLeafFlipped = false;
          this.isFlipping = false;
          this.flipTimer = null;
        }, 1000);
        return;
      }

      this.flipLeaf = null;
      this.coverLeaf = null;
      this.rightUnderOverride = null;
      this.leftUnderOverride = null;
      this.sheetIndex = idx;
      this.flipTimer = setTimeout(() => {
        this.isFlipping = false;
        this.flipTimer = null;
      }, 560);
    },
    prevSheet() {
      if (this.sheetIndex <= 0 || this.isFlipping) return;
      this.goSheet(this.sheetIndex - 1);
    },
    nextSheet() {
      if (this.sheetIndex >= this.sheets.length - 1 || this.isFlipping) return;
      this.goSheet(this.sheetIndex + 1);
    },
    onBookClick(event) {
      if (event.target.closest('.book-nav') || event.target.closest('.book-blank-actions')) return;
      const frame = event.currentTarget.querySelector('.book-stage-frame') || event.currentTarget;
      const rect = frame.getBoundingClientRect();
      const x = event.clientX - rect.left;
      if (x > rect.width / 2) this.nextSheet();
      else this.prevSheet();
    },
    onKeydown(event) {
      if (event.key === 'Escape' && this.fullscreenPreview) {
        this.closeFullscreenPreview();
        return;
      }
      if (this.viewMode !== 'book' && !this.fullscreenPreview) return;
      if (event.key === 'ArrowLeft') this.prevSheet();
      if (event.key === 'ArrowRight') this.nextSheet();
    },
    openFullscreenPreview() {
      this.viewMode = 'book';
      this.fullscreenPreview = true;
      document.body.style.overflow = 'hidden';
    },
    closeFullscreenPreview() {
      if (!this.fullscreenPreview) return;
      this.fullscreenPreview = false;
      document.body.style.overflow = '';
    },
    async submit() {
      if (!this.validateCompliance()) return;
      const content = this.publishablePages.map((p) => p.id).filter(Boolean);
      if (!content.length) {
        ElMessage.warning(this.$t('toPdf.publishNeedImages'));
        return;
      }

      try {
        const response = await this.$http.post(
          '/book/',
          {
            content,
            title: this.form.title,
            description: this.form.desc,
            type: this.form.category,
            compliance_checked: true,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );
        if (response.data.desc === 'success') {
          this.$router.push('/user/upload/submit-res/');
        } else {
          this.$router.push({ path: '/errorpage' });
        }
      } catch (error) {
        console.log(error);
        ElMessage.error(this.$t('toPdf.publishFailed'));
      }
    },
    downPDF() {
      if (!this.validateCompliance()) return;
      if (!this.editablePages.length) return;
      if (this.exporting) return;
      void trackAnalytics('export_start', { tool: 'layout', format: 'pdf' });

      this.exporting = true;
      ElMessage.info(this.$t('toPdf.downloading'));

      buildBookPdfFromPages(this.buildExportPages(), this.activeFormat, 'digital')
        .then((pdf) => {
          return pdf.save(`${this.exportFileBaseName()}-300dpi.pdf`, { returnPromise: true });
        })
        .then(() => {
          void trackAnalytics('export_complete', { tool: 'layout', format: 'pdf' });
          ElMessage.success(this.$t('toPdf.downloadDone'));
        })
        .catch((err) => {
          console.error(err);
          ElMessage.error(this.$t('toPdf.downloadFailed'));
          void trackAnalytics('export_failed', { tool: 'layout', format: 'pdf' });
        })
        .finally(() => {
          this.exporting = false;
        });
    },
    downImages() {
      if (!this.validateCompliance()) return;
      if (!this.editablePages.length) return;
      if (this.exporting) return;
      void trackAnalytics('export_start', { tool: 'layout', format: 'png' });

      this.exporting = true;
      ElMessage.info(this.$t('toPdf.downloadingImages'));

      downloadBookPagesAsPng(
        this.buildExportPages(),
        this.activeFormat,
        this.exportFileBaseName(),
        'digital'
      )
        .then(() => {
          ElMessage.success(this.$t('toPdf.downloadImagesDone'));
          void trackAnalytics('export_complete', { tool: 'layout', format: 'png' });
        })
        .catch((err) => {
          console.error(err);
          ElMessage.error(this.$t('toPdf.downloadImagesFailed'));
          void trackAnalytics('export_failed', { tool: 'layout', format: 'png' });
        })
        .finally(() => {
          this.exporting = false;
        });
    },
  },
};
</script>

<style scoped>
.topdf {
  display: flex;
  gap: 20px;
  min-height: calc(100vh - 50px);
  padding: 16px 20px 24px;
  box-sizing: border-box;
  background: #eef0f4;
  text-align: left;
}

.topdf-preview {
  flex: 1;
  min-width: 0;
  min-height: 0;
  max-height: calc(100vh - 50px - 40px);
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.topdf-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.topdf-preview-tools {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.topdf-back {
  border: none;
  background: transparent;
  color: #8167a9;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 0;
}

.topdf-page-count {
  font-size: 14px;
  color: #909399;
}

.topdf-fs-btn {
  border: 1px solid #dcdfe6;
  background: #fff;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
}

.topdf-fs-btn:hover {
  border-color: #8167a9;
  color: #8167a9;
}

.topdf-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 24px;
  min-height: 360px;
  border: 2px dashed #dcdfe6;
  border-radius: 12px;
  color: #909399;
  cursor: pointer;
}

.topdf-empty-icon {
  font-size: 48px;
  line-height: 1;
  font-weight: 300;
}

/* —— 书册预览 —— */
.book-stage {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 20px 16px;
  background:
    radial-gradient(ellipse at center, #f7f5fb 0%, #e8ebf1 70%);
  overflow: hidden;
}

.book-stage.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 3000;
  flex: none;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 16px 24px 28px;
  background:
    radial-gradient(ellipse at center, #1a1820 0%, #0e0d12 72%);
}

.book-stage.is-fullscreen .book-stage-alert {
  color: #e8c48a;
}

.book-stage.is-fullscreen .book-viewer {
  max-width: min(1200px, 96vw);
  margin-top: 8px;
}

.book-stage.is-fullscreen .book-pager {
  margin-top: 20px;
}

.book-stage.is-fullscreen .book-pager button {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.22);
  color: rgba(255, 255, 255, 0.88);
}

.book-stage.is-fullscreen .book-stage-frame {
  width: min(
    1100px,
    calc(100% - 96px),
    calc(min(72vh, 720px) * var(--frame-ar, 1))
  );
}

.book-stage.is-fullscreen .book-viewer.is-spread .book-stage-frame {
  width: min(
    1280px,
    calc(100% - 64px),
    calc(min(72vh, 720px) * var(--frame-ar, 1))
  );
}

.book-fs-bar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto 4px;
  padding: 4px 0;
}

.book-fs-progress {
  margin-right: auto;
  font-size: 14px;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.7);
}

.book-fs-close {
  border: 1px solid rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
}

.book-fs-close:hover {
  background: rgba(255, 255, 255, 0.16);
}

.book-stage-alert {
  flex-shrink: 0;
  margin: 0 0 8px;
  max-width: 640px;
  text-align: center;
  font-size: 12px;
  line-height: 1.45;
  color: #b8823a;
}

.book-viewer {
  position: relative;
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 1040px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  perspective: 1600px;
}

.book-stage-frame {
  position: relative;
  /* 同时受视口高度与宽度限制，始终保持 trim / 双页比例 */
  width: min(
    980px,
    calc(100% - 96px),
    calc(min(72vh, 680px) * var(--frame-ar, 1))
  );
  aspect-ratio: var(--frame-ar, 1);
  height: auto;
  margin: 0 auto;
  transform-style: preserve-3d;
  overflow: visible;
}

.book-viewer.is-spread .book-stage-frame {
  width: min(
    1040px,
    calc(100% - 80px),
    calc(min(72vh, 680px) * var(--frame-ar, 1))
  );
}

/*
 * 开合书：双页框尺寸一次到位；框体平移 + veil 裁剪；封面叶子在外整页翻转。
 */
.book-stage-frame.is-cover-motion {
  transition: transform 0.9s cubic-bezier(0.645, 0.045, 0.355, 1);
  will-change: transform;
}

.book-stage-frame.is-cover-motion.is-cover-open {
  transform: translateX(0);
}

.book-stage-frame.is-cover-motion:not(.is-cover-from-back):not(.is-cover-open) {
  transform: translateX(-25%);
}

.book-stage-frame.is-cover-motion.is-cover-from-back:not(.is-cover-open) {
  transform: translateX(25%);
}

.book-spread-veil {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}

.book-stage-frame.is-cover-motion.is-cover-open .book-spread-veil,
.book-stage-frame:not(.is-cover-motion) .book-spread-veil {
  clip-path: inset(0);
}

.book-stage-frame.is-cover-motion:not(.is-cover-from-back):not(.is-cover-open) .book-spread-veil {
  clip-path: inset(0 0 0 50%);
}

.book-stage-frame.is-cover-motion.is-cover-from-back:not(.is-cover-open) .book-spread-veil {
  clip-path: inset(0 50% 0 0);
}

/* 打开封面：先藏内页，翻过侧立后再淡入 */
.book-stage-frame.is-cover-opening:not(.is-cover-open) .book-spread-veil {
  opacity: 0;
  pointer-events: none;
}

.book-stage-frame.is-cover-opening.is-cover-open .book-spread-veil {
  opacity: 1;
  transition:
    clip-path 0.9s cubic-bezier(0.645, 0.045, 0.355, 1),
    opacity 0.35s ease 0.4s;
}

/* 合上：内页保持可见；被盖住的一侧立刻收掉；裁剪无过渡 */
.book-stage-frame.is-cover-closing .book-spread-veil {
  opacity: 1;
  transition: none;
}

.book-stage-frame.is-cover-closing:not(.is-cover-from-back):not(.is-cover-open) .book-half--left {
  opacity: 0;
  visibility: hidden;
}

.book-stage-frame.is-cover-closing.is-cover-from-back:not(.is-cover-open) .book-half--right {
  opacity: 0;
  visibility: hidden;
}

.book-face {
  position: absolute;
  inset: 0;
  background: #fff;
  border-radius: 6px;
  box-shadow:
    0 18px 48px rgba(40, 30, 60, 0.22),
    0 1px 0 rgba(255, 255, 255, 0.75) inset;
  overflow: hidden;
  transform-origin: center center;
  backface-visibility: hidden;
}

.book-face--single {
  border-radius: 4px 10px 10px 4px;
}

.book-face-spine {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 12px;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.14), transparent 70%);
  z-index: 2;
  pointer-events: none;
}

.book-face--spread {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  border-radius: 10px;
  background: #ebe7f2;
  box-shadow:
    0 18px 48px rgba(40, 30, 60, 0.22);
  overflow: visible;
  padding: 0;
  transform-style: preserve-3d;
}

.book-half {
  position: relative;
  flex: 1 1 50%;
  width: 50%;
  min-width: 0;
  min-height: 0;
  height: 100%;
  background: #fff;
  overflow: hidden;
}

.book-half--left {
  border-right: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: inset -10px 0 14px -12px rgba(0, 0, 0, 0.28);
  border-radius: 10px 0 0 10px;
  z-index: 1;
}

.book-half--right {
  box-shadow: inset 10px 0 14px -12px rgba(0, 0, 0, 0.28);
  border-radius: 0 10px 10px 0;
  perspective: 2200px;
  overflow: visible;
  z-index: 2;
}

.book-page-stack {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}

.book-page-under {
  z-index: 1;
}

.book-page-leaf {
  position: absolute;
  inset: 0;
  z-index: 4;
  transform-origin: left center;
  transform-style: preserve-3d;
  transform: rotateY(0deg);
  transition: transform 0.85s cubic-bezier(0.645, 0.045, 0.355, 1);
  will-change: transform;
  pointer-events: none;
}

.book-page-leaf.is-flipped {
  transform: rotateY(-180deg);
}

.book-page-leaf__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  overflow: hidden;
  background: #fff;
}

.book-page-leaf__front {
  transform: rotateY(0deg) translateZ(0.1px);
  box-shadow:
    8px 0 24px rgba(0, 0, 0, 0.18),
    inset -1px 0 0 rgba(255, 255, 255, 0.65);
}

.book-page-leaf__back {
  transform: rotateY(180deg) translateZ(0.1px);
  background: #fff;
  box-shadow: inset 12px 0 18px rgba(0, 0, 0, 0.1);
}

.book-page-leaf__gloss {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.22) 0%,
    rgba(0, 0, 0, 0.05) 14%,
    transparent 42%
  );
  opacity: 0;
  transition: opacity 0.85s cubic-bezier(0.645, 0.045, 0.355, 1);
}

.book-page-leaf.is-flipped .book-page-leaf__gloss:not(.book-page-leaf__gloss--back) {
  opacity: 1;
}

.book-page-leaf__gloss--back {
  background: linear-gradient(
    270deg,
    rgba(0, 0, 0, 0.18) 0%,
    rgba(0, 0, 0, 0.04) 16%,
    transparent 44%
  );
  opacity: 1;
}

.book-page-leaf.is-flipped .book-page-leaf__gloss--back {
  opacity: 0;
}

/* 封面叶子：相对双页框固定整页宽，只做整体左翻，不参与任何缩放 */
.book-cover-leaf {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 50%;
  z-index: 8;
  transform-origin: left center;
  transform-style: preserve-3d;
  transform: rotateY(0deg);
  transition: transform 0.9s cubic-bezier(0.645, 0.045, 0.355, 1);
  will-change: transform;
  pointer-events: none;
  border-radius: 4px 10px 10px 4px;
}

.book-cover-leaf.is-flipped {
  transform: rotateY(-180deg);
}

.book-cover-leaf--left {
  right: auto;
  left: 0;
  transform-origin: right center;
  border-radius: 10px 4px 4px 10px;
}

.book-cover-leaf--left.is-flipped {
  transform: rotateY(180deg);
}

.book-cover-leaf__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  overflow: hidden;
  background: #fff;
  box-shadow:
    0 18px 48px rgba(40, 30, 60, 0.22),
    0 1px 0 rgba(255, 255, 255, 0.75) inset;
}

.book-cover-leaf__front {
  border-radius: inherit;
}

.book-cover-leaf__back {
  transform: rotateY(180deg);
  background: #fff;
}

.book-cover-leaf--left .book-cover-leaf__back {
  transform: rotateY(-180deg);
}

.book-cover-leaf .book-face-art {
  border-radius: inherit;
}

.book-face-art {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}

.book-face-art img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
  background: #fff;
}

.book-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 100%;
  padding: 24px;
  box-sizing: border-box;
  text-align: center;
  color: #606266;
  background:
    repeating-linear-gradient(-45deg, #fff, #fff 10px, #f7f8fa 10px, #f7f8fa 20px);
}

.book-placeholder strong {
  font-size: 22px;
  color: #303133;
}

.book-placeholder em {
  font-style: normal;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: #8167a9;
  text-transform: uppercase;
}

.book-placeholder--muted {
  color: #c0c4cc;
  /* 环衬等空白页：纯白，不要灰白斜纹 */
  background: #fff;
}

.book-placeholder--title {
  background: linear-gradient(160deg, #f9f7fc, #efeaf8);
}

.book-blank-slot {
  gap: 12px;
}

.book-blank-note {
  margin: 0;
  font-size: 12px;
  color: #c0c4cc;
}

.book-blank-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.book-blank-actions button {
  border: 1px solid #dcdfe6;
  background: #fff;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  color: #606266;
  cursor: pointer;
}

.book-blank-actions button:hover {
  border-color: #8167a9;
  color: #8167a9;
}

.book-blank-actions button.is-danger {
  color: #f56c6c;
  border-color: #fbc4c4;
}

.book-title-desc {
  max-width: 80%;
  font-size: 13px;
  line-height: 1.5;
  color: #909399;
}

.book-nav {
  position: relative;
  flex: 0 0 auto;
  z-index: 5;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
  color: #8167a9;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}

.book-nav:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.book-pager {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
  margin-top: 12px;
  font-size: 13px;
  color: #606266;
}

.book-flip-hint {
  flex-shrink: 0;
  margin: 6px 0 0;
  font-size: 12px;
  color: #909399;
}

.book-pager button {
  border: 1px solid #dcdfe6;
  background: #fff;
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  color: #606266;
}

.book-pager button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* —— 页面列表编辑 —— */
.topdf-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 20px 24px;
  background: linear-gradient(180deg, #f0f2f6 0%, #e4e7ed 100%);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
}

.topdf-pages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
  width: 100%;
}

.topdf-hidden-picker {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.topdf-page-card {
  position: relative;
  width: 100%;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid transparent;
  cursor: grab;
}

.topdf-page-card.is-drag-over { border-color: #8167a9; }
.topdf-page-card.is-dragging { opacity: 0.55; }

.topdf-page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  background: #fafbfc;
  border-bottom: 1px solid #ebeef5;
}

.topdf-page-label {
  font-size: 12px;
  font-weight: 600;
  color: #303133;
}

.topdf-page-label em {
  margin-left: 6px;
  font-style: normal;
  font-weight: 500;
  color: #909399;
}

.topdf-page-drag-hint {
  color: #c0c4cc;
  font-size: 14px;
  letter-spacing: -2px;
  user-select: none;
}

.topdf-page-footer {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  padding: 6px 8px 8px;
  border-top: 1px solid #ebeef5;
  background: #fafbfc;
}

.topdf-page-footer button {
  border: 1px solid #dcdfe6;
  background: #fff;
  border-radius: 6px;
  padding: 2px 10px;
  font-size: 12px;
  cursor: pointer;
  color: #606266;
}

.topdf-page-footer button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.topdf-page-footer button.is-danger {
  color: #f56c6c;
  border-color: #f5c6c6;
}

.topdf-page-hover {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.88);
  opacity: 0;
  transition: opacity 0.15s ease;
}

.topdf-page-stage:hover .topdf-page-hover,
.topdf-page-stage.is-empty .topdf-page-hover {
  opacity: 1;
}

.topdf-page-stage {
  position: relative;
  width: 100%;
  background: #fff;
  overflow: hidden;
}

.topdf-page-img {
  width: 100%;
  height: 100%;
}

.topdf-page-img :deep(.el-image__inner) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.topdf-page-blank {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  font-size: 14px;
  background: #fff;
}

.topdf-sidebar {
  width: 340px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  padding: 24px 22px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 50px - 40px);
  overflow-y: auto;
}

.topdf-sidebar-title {
  margin: 0 0 20px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.topdf-format-block {
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid #ebeef5;
}

.topdf-format-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.topdf-format-value {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
}

.topdf-format-meta {
  margin: 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.45;
}

.topdf-format-size {
  margin: 4px 0 0;
  font-size: 12px;
  color: #a8abb2;
}

.topdf-checklist {
  margin: 0 0 18px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #f7f5fb;
  border: 1px solid #ebe4f5;
}

.topdf-checklist-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}

.topdf-checklist ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.topdf-checklist li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0 0 6px;
  font-size: 12px;
  line-height: 1.4;
  color: #909399;
}

.topdf-checklist li:last-child {
  margin-bottom: 0;
}

.topdf-checklist li.is-ok {
  color: #67a36c;
}

.topdf-checklist li.is-warn {
  color: #b8823a;
}

.topdf-check-mark {
  flex-shrink: 0;
  width: 14px;
  font-weight: 700;
}

.topdf-format-change {
  flex-shrink: 0;
  margin-top: 2px;
  padding: 0;
  border: none;
  background: transparent;
  color: #8167a9;
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  white-space: nowrap;
}

.topdf-pages-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.topdf-pages-hint {
  margin: 0;
  flex: 1 1 240px;
  font-size: 13px;
  line-height: 1.5;
  color: #606266;
}

.topdf-pages-toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.topdf-form :deep(.el-form-item) { margin-bottom: 16px; }
.topdf-form :deep(.el-form-item__label) {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
  padding-bottom: 6px;
}
.topdf-form :deep(.el-select) { width: 100%; }
.topdf-form :deep(.el-checkbox__label) {
  white-space: normal;
  line-height: 1.6;
  color: #606266;
  font-size: 13px;
}

.topdf-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 8px;
}

.topdf-actions :deep(.el-button) {
  width: 100%;
  height: 42px;
  margin: 0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
}

.topdf-actions :deep(.el-button--primary) {
  --el-button-text-color: #ffffff;
  --el-button-hover-text-color: #ffffff;
  --el-button-active-text-color: #ffffff;
  --el-button-disabled-text-color: rgba(255, 255, 255, 0.75);
  background-color: #8167a9;
  border-color: #8167a9;
  color: #ffffff;
}

.topdf-actions :deep(.el-button--primary:hover),
.topdf-actions :deep(.el-button--primary:focus) {
  background-color: #6f5698;
  border-color: #6f5698;
  color: #ffffff;
}

.topdf-actions :deep(.el-button--primary.is-disabled),
.topdf-actions :deep(.el-button--primary.is-disabled:hover) {
  background-color: #b7a8d1;
  border-color: #b7a8d1;
  color: #ffffff;
}

@media (max-width: 960px) {
  .topdf {
    flex-direction: column;
    padding: 12px;
  }

  .topdf-sidebar {
    width: 100%;
    max-height: none;
  }

  .book-stage-frame {
    width: min(100%, calc(100% - 72px));
    max-height: min(58vh, 520px);
  }

  .book-nav {
    width: 36px;
    height: 36px;
  }
}
</style>

