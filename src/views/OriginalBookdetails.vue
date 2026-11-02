<template>
  <div class="book-reader-container">
    <div class="book-layout">
      <!-- 左侧信息栏 -->
      <div class="book-info">
        <div class="title">
          <span>{{bookDetails.title}}</span>
          <el-tag
            size="small"
            style="background-color:#b7a6d6; color:#fff; border:none;"
          >
            {{typeLabel}}
          </el-tag>
        </div>
        <!-- 作者信息 -->
        <div class="header-content">
          <el-avatar :src="authorDetails.avatar" :size="40" class="avatar" @click="toAuthor(authorDetails._id)"></el-avatar>
          <div class="author-info">
            <span class="author-name" @click="toAuthor(authorDetails._id)">{{authorDetails.name}}</span>
            <el-button 
              v-if="authorDetails && authorDetails._id && String(authorDetails._id) !== String(userid)"
              :class="[
                'follow-btn',
                attentionArr && attentionArr.includes(authorDetails._id) ? 'followed' : 'not-followed',
                { 'follow-animating': isFollowingAnimating }
              ]"
              size="small" 
              @click="handleFollowClick(authorDetails._id)">
              <span class="follow-btn-text">
                {{ attentionArr && attentionArr.includes(authorDetails._id) ? $t('originalBookDetails.followed') : $t('originalBookDetails.follow') }}
              </span>
            </el-button>
          </div>
        </div>
        <div class="book-description" v-if="bookDetails.description">
          <p>{{bookDetails.description}}</p>
        </div>
        <div class="header-actions">
          <el-button 
            type="text" 
            size="large"
            class="collect-btn"
            :class="{ 'collecting': isCollecting }"
            @click="handleCollectClick">
            <i
              :class="[
                collectBookArr.includes(bookDetails._id) ? 'iconfont icon-shoucang1' : 'iconfont icon-shoucang',
                { 'collect-animate': isCollecting }
              ]" 
              :style="collectBookArr.includes(bookDetails._id) ? 'color:#FFd301' : ''"
            ></i>
          </el-button>
          <el-button
            size="large"
            @click="downPDF"
            :disabled="disabled"
          >
            {{ $t('originalBookDetails.download') }}
          </el-button>
        </div>
      </div>
  
      <!-- 右侧书本翻页区域 -->
      <div class="book-viewer-wrapper">
    <!-- 书本翻页区域 -->
    <div class="book-viewer">
      <div class="book-wrapper" :class="{ 'flipping': isFlipping, 'spread-mode': isSpreadMode }">
        <!-- 单页显示（横版绘本） -->
        <div v-if="!isSpreadMode" class="book-page single-page" @click="handlePageClick" :class="{ 'flipping': isFlipping }">
          <div class="page-content">
            <transition name="page-flip">
              <div :key="currentPageIndex" class="page-content-inner">
                <div v-if="getCurrentPageContent()" class="page-image-wrapper">
                  <div v-if="isImageId(getCurrentPageContent())" class="image-loading">
                    <i class="el-icon-loading"></i>
                    <p>{{ $t('originalBookDetails.loading') }}</p>
                  </div>
                  <el-image 
                    v-else
                    :src="getImageUrl(getCurrentPageContent())" 
                    fit="contain"
                    class="page-image"
                    @load="handlePageImageLoad(currentPageIndex)"
                    @error="handlePageImageError(currentPageIndex)">
                    <template #placeholder>
                      <div class="image-loading">
                        <i class="el-icon-loading"></i>
                        <p>{{ $t('originalBookDetails.loading') }}</p>
                      </div>
                    </template>
                    <template #error>
                      <div class="image-error">
                        <i class="el-icon-picture-outline"></i>
                        <p>{{ $t('originalBookDetails.loadFailed') }}</p>
                      </div>
                    </template>
                  </el-image>
                </div>
                <div v-else class="page-empty">
                  <p v-if="currentPageIndex === 0">封面</p>
                  <p v-else-if="currentPageIndex >= totalPages - 1">封底</p>
                </div>
              </div>
            </transition>
            <!-- 右侧书页边缘 -->
            <div class="page-edge right-edge"></div>
            <!-- 左侧书页边缘 -->
            <div class="page-edge left-edge"></div>
            <!-- 右侧边缘翻页按钮区域 -->
            <div 
              class="page-flip-trigger right-trigger" 
              @click.stop="nextPage"
              @mouseenter="showFlipButton = true"
              @mouseleave="showFlipButton = false">
              <transition name="fade">
                <el-button 
                  v-if="showFlipButton && currentPageIndex < totalPages - 1"
                  class="flip-button"
                  size="large">
                  <el-icon><ArrowRightBold /></el-icon>
                </el-button>
              </transition>
            </div>
            <!-- 左侧边缘翻页按钮区域 -->
            <div 
              class="page-flip-trigger left-trigger" 
              @click.stop="prevPage"
              @mouseenter="showPrevButton = true"
              @mouseleave="showPrevButton = false">
              <transition name="fade">
                <el-button 
                  v-if="showPrevButton && currentPageIndex > 0"
                  class="flip-button"
                  size="large">
                  <el-icon><ArrowLeftBold /></el-icon>
                </el-button>
              </transition>
            </div>
          </div>
        </div>
        
        <!-- 双页显示（竖版书页） -->
        <div v-else class="book-page spread-page" @click="handlePageClick" :class="{ 'flipping': isFlipping }">
          <div class="spread-content">
            <transition name="page-flip">
              <div :key="currentPageIndex" class="spread-content-inner">
                <!-- 左页 -->
                <div class="spread-page-left">
                  <div v-if="getCurrentSpreadContent().left" class="page-image-wrapper">
                    <div v-if="isImageId(getCurrentSpreadContent().left)" class="image-loading">
                      <i class="el-icon-loading"></i>
                      <p>{{ $t('originalBookDetails.loading') }}</p>
                    </div>
                    <el-image 
                      v-else
                      :src="getImageUrl(getCurrentSpreadContent().left)" 
                      fit="contain"
                      class="page-image"
                      @load="handlePageImageLoad(currentPageIndex * 2)"
                      @error="handlePageImageError(currentPageIndex * 2)">
                      <template #placeholder>
                        <div class="image-loading">
                          <i class="el-icon-loading"></i>
                          <p>{{ $t('originalBookDetails.loading') }}</p>
                        </div>
                      </template>
                      <template #error>
                        <div class="image-error">
                          <i class="el-icon-picture-outline"></i>
                          <p>{{ $t('originalBookDetails.loadFailed') }}</p>
                        </div>
                      </template>
                    </el-image>
                  </div>
                  <div v-else class="page-empty">
                    <p>{{ $t('originalBookDetails.cover') }}</p>
                  </div>
                  <div class="page-edge left-edge"></div>
                </div>
                
                <!-- 右页 -->
                <div class="spread-page-right">
                  <div v-if="getCurrentSpreadContent().right" class="page-image-wrapper">
                    <div v-if="isImageId(getCurrentSpreadContent().right)" class="image-loading">
                      <i class="el-icon-loading"></i>
                      <p>{{ $t('originalBookDetails.loading') }}</p>
                    </div>
                    <el-image 
                      v-else
                      :src="getImageUrl(getCurrentSpreadContent().right)" 
                      fit="contain"
                      class="page-image"
                      @load="handlePageImageLoad(currentPageIndex * 2 + 1)"
                      @error="handlePageImageError(currentPageIndex * 2 + 1)">
                      <template #placeholder>
                        <div class="image-loading">
                          <i class="el-icon-loading"></i>
                          <p>{{ $t('originalBookDetails.loading') }}</p>
                        </div>
                      </template>
                      <template #error>
                        <div class="image-error">
                          <i class="el-icon-picture-outline"></i>
                          <p>{{ $t('originalBookDetails.loadFailed') }}</p>
                        </div>
                      </template>
                    </el-image>
                  </div>
                  <div v-else class="page-empty">
                    <p>{{ $t('originalBookDetails.backCover') }}</p>
                  </div>
                  <div class="page-edge right-edge"></div>
                </div>
              </div>
            </transition>
            <!-- 右侧边缘翻页按钮区域 -->
            <div 
              class="page-flip-trigger right-trigger" 
              @click.stop="nextPage"
              @mouseenter="showFlipButton = true"
              @mouseleave="showFlipButton = false">
              <transition name="fade">
                <el-button 
                  v-if="showFlipButton && currentPageIndex < totalPages - 1"
                  class="flip-button"
                  size="large">
                  <el-icon><ArrowRightBold /></el-icon>
                </el-button>
              </transition>
            </div>
            <!-- 左侧边缘翻页按钮区域 -->
            <div 
              class="page-flip-trigger left-trigger" 
              @click.stop="prevPage"
              @mouseenter="showPrevButton = true"
              @mouseleave="showPrevButton = false">
              <transition name="fade">
                <el-button 
                  v-if="showPrevButton && currentPageIndex > 0"
                  class="flip-button"
                  size="large">
                  <el-icon><ArrowLeftBold /></el-icon>
                </el-button>
              </transition>
            </div>
          </div>
        </div>
      </div>

      <!-- 翻页控制按钮 -->
      <div class="page-controls">
        <el-button 
          class="page-btn prev-btn"
          :disabled="currentPageIndex <= 0"
          @click="prevPage"
          size="large">
          <el-icon><ArrowLeftBold /></el-icon>
        </el-button>
        
        <div class="page-indicator">
          <template v-if="isSpreadMode">
            <span class="current-page">{{ (currentPageIndex * 2) + 1 }}-{{ Math.min((currentPageIndex * 2) + 2, allPages.length) }}</span>
            <span class="separator">/</span>
            <span class="total-pages">{{ allPages.length }}</span>
            <span class="spread-hint">{{ $t('originalBookDetails.spreadMode') }}</span>
          </template>
          <template v-else>
            <span class="current-page">{{ currentPageIndex + 1 }}</span>
            <span class="separator">/</span>
            <span class="total-pages">{{ totalPages }}</span>
          </template>
        </div>
        
        <el-button 
          class="page-btn next-btn"
          :disabled="currentPageIndex >= totalPages - 1"
          @click="nextPage"
          size="large">
          <el-icon><ArrowRightBold /></el-icon>
        </el-button>
      </div>
    </div>
      </div>
    </div>
  </div>
</template>

<script>
import { takePublicPageData } from '@/utils/publicPageData'
import { applyPublicDetailSeo } from '@/utils/seo'
// @ is an alias to /src


import JsPDF from "jspdf";
import { mapState } from 'vuex'
import { ElMessage } from 'element-plus'
import { ArrowRightBold, ArrowLeftBold } from '@element-plus/icons-vue'
import { getCollectionBook, getAttention } from '@/api/userCollect'

export default {
  name: "OriginalBookDetails",
  components: {
    ArrowRightBold,
    ArrowLeftBold
  },
  props: {
    bookId: {
      type: String,
      default: ''
    }
  },
  data(){
    return{
      disabled:false,
      userid:localStorage.getItem("id"),
      id: '',
      authorId:'',
      bookDetails:[],
      authorDetails:{},
      //存放请求到的绘本原始数据
      codeImg:require('../assets/images/pdfCode.webp'),
      loadingImages: true, // 图片加载状态
      imageLoadStatus: {}, // 每张图片的加载状态
      currentPageIndex: 0, // 当前页面索引
      isFlipping: false, // 是否正在翻页
      showFlipButton: false, // 是否显示右侧翻页按钮
      showPrevButton: false, // 是否显示左侧翻页按钮
      collectIdMap: {}, // 保存绘本ID到收藏记录ID的映射
      isCollecting: false, // 收藏按钮点击动画状态
      isFollowingAnimating: false, // 关注按钮点击动画状态
      imageAspectRatios: {}, // 存储每张图片的宽高比 {index: {width, height, ratio, isLandscape}}
      layoutMode: 'single', // 'single' 单页模式 或 'spread' 双页模式
    }
  },
  watch: {
    bookId: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          this.id = newVal;
        }
      }
    },
    '$route.params.bookId': {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          this.id = newVal;
        }
      }
    }
  },
  computed:{
    ...mapState([
      "collectBookArr",
      "likeBookArr",
      "attentionArr",
    ]),
    // 判断是否为双页模式（竖版书页）
    isSpreadMode() {
      // 检查第一张图片的宽高比来判断整体布局
      if (this.allPages.length === 0) return false;
      const firstImage = this.imageAspectRatios[0];
      if (!firstImage) return false;
      // 高 > 宽，判定为竖版，使用双页模式
      return firstImage.isPortrait;
    },
    // 总页数（根据模式计算）
    totalPages() {
      if (!this.bookDetails.content || !Array.isArray(this.bookDetails.content)) {
        return 0;
      }
      const contentLength = this.bookDetails.content.length + 1; // 包括二维码页
      // 双页模式：每2页算一屏，向上取整
      if (this.isSpreadMode) {
        return Math.ceil(contentLength / 2);
      }
      // 单页模式：每页一屏
      return contentLength;
    },
    // 所有页面内容（包括二维码）
    allPages() {
      if (!this.bookDetails.content || !Array.isArray(this.bookDetails.content)) {
        return [];
      }
      return [...this.bookDetails.content, this.codeImg];
    },
    // 类型标签映射
    typeLabel() {
      const typeMap = {
        'ai': this.$t('upload.categoryAi'),
        'reading': this.$t('originalBookDetails.typeReading'),
        'habit': this.$t('originalBookDetails.typeHabit'),
        'english': this.$t('originalBookDetails.typeEnglish'),
        'math': this.$t('originalBookDetails.typeMath'),
        'knowledge': this.$t('originalBookDetails.typeKnowledge'),
        'others': this.$t('originalBookDetails.typeOthers')
      };
      return typeMap[this.bookDetails.type] || this.bookDetails.type;
    }
  },

  methods:{
    // 获取当前页面内容（单页模式）
    getCurrentPageContent() {
      return this.allPages[this.currentPageIndex] || null;
    },
    // 获取当前双页内容（双页模式）
    getCurrentSpreadContent() {
      if (!this.isSpreadMode) return { left: null, right: null };
      const leftIndex = this.currentPageIndex * 2;
      const rightIndex = leftIndex + 1;
      return {
        left: this.allPages[leftIndex] || null,
        right: this.allPages[rightIndex] || null
      };
    },
    // 处理页面点击（保留原有功能，但优先级低于边缘按钮）
    handlePageClick(event) {
      // 如果点击的是边缘触发器区域，不处理
      if (event.target.closest('.page-flip-trigger')) {
        return;
      }
      const pageWidth = event.currentTarget.offsetWidth;
      const clickX = event.offsetX;
      // 点击右侧50%区域翻到下一页
      if (clickX > pageWidth / 2) {
        this.nextPage();
      } else {
        // 点击左侧50%区域翻到上一页
        this.prevPage();
      }
    },
    // 上一页
    prevPage() {
      if (this.currentPageIndex > 0 && !this.isFlipping) {
        this.isFlipping = true;
        this.showPrevButton = false; // 翻页时隐藏按钮
        // 双页模式：每次减1（代表一屏）
        // 单页模式：每次减1（代表一页）
        this.currentPageIndex--;
        setTimeout(() => {
          this.isFlipping = false;
        }, 300);
      }
    },
    // 下一页
    nextPage() {
      if (this.currentPageIndex < this.totalPages - 1 && !this.isFlipping) {
        this.isFlipping = true;
        this.showFlipButton = false; // 翻页时隐藏按钮
        // 双页模式：每次加1（代表一屏，包含2页）
        // 单页模式：每次加1（代表一页）
        this.currentPageIndex++;
        setTimeout(() => {
          this.isFlipping = false;
        }, 300);
      }
    },
    // 键盘快捷键支持
    handleKeyPress(event) {
      if (event.key === 'ArrowLeft') {
        this.prevPage();
      } else if (event.key === 'ArrowRight') {
        this.nextPage();
      }
    },
    // 处理页面图片加载
    handlePageImageLoad(index) {
      if (this.imageLoadStatus) {
        this.handleImageLoad(index);
      }
      // 检测图片宽高比（如果还没有检测过）
      if (!this.imageAspectRatios[index] && this.allPages[index]) {
        this.detectImageAspectRatio(this.allPages[index], index);
      }
    },
    // 检测图片宽高比
    detectImageAspectRatio(img, index) {
      return new Promise((resolve) => {
        if (typeof img === 'string' && !this.isImageId(img)) {
          const image = new Image();
          image.onload = () => {
            const width = image.naturalWidth || image.width;
            const height = image.naturalHeight || image.height;
            const ratio = width / height;
            const isLandscape = width > height; // 横版：宽 > 高
            const isPortrait = height > width; // 竖版：高 > 宽
            
            // Vue 3 中直接赋值即可触发响应式更新
            this.imageAspectRatios[index] = {
              width,
              height,
              ratio,
              isLandscape,
              isPortrait
            };
            
            // 根据第一张图片决定布局模式
            if (index === 0) {
              this.layoutMode = isPortrait ? 'spread' : 'single';
            }
            
            resolve({ width, height, ratio, isLandscape, isPortrait });
          };
          image.onerror = () => {
            // 加载失败时使用默认值（横版）
            // Vue 3 中直接赋值即可触发响应式更新
            this.imageAspectRatios[index] = {
              width: 4,
              height: 3,
              ratio: 4/3,
              isLandscape: true,
              isPortrait: false
            };
            if (index === 0) {
              this.layoutMode = 'single';
            }
            resolve({ width: 4, height: 3, ratio: 4/3, isLandscape: true, isPortrait: false });
          };
          image.src = this.getImageUrl(img);
        } else {
          resolve(null);
        }
      });
    },
    // 处理页面图片错误
    handlePageImageError(index) {
      if (this.imageLoadStatus) {
        this.handleImageError(index);
      }
    },
   //获取绘本详情
      async getBooks() {
      try {
        const initial = takePublicPageData('books')
        if (initial && !Array.isArray(initial)) { this.bookDetails = initial; applyPublicDetailSeo(initial, this.$route.path); return }
        // 获取 token 并添加到请求头
        const token = localStorage.getItem('token');
        const headers = {};
        if (token && token !== 'undefined') {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        let res = await this.$http.get(`/book/`+this.id, { headers })
        console.log(res)
        //对象数组，对象包含绘本的name\id\content\description等
        this.bookDetails = res.data.message
        applyPublicDetailSeo(this.bookDetails, this.$route.path)

      } catch (err) {
        this.loading = false
        console.log(err)
        ElMessage({
          message: this.$t('originalBookDetails.sorryError'),
          type: 'error'
        });
      }

    },
    //获取绘本的每一张图片
    async getImgUrl() {
        //获取绘本图片ID
        let tool = this.bookDetails.content
        if (!tool || !Array.isArray(tool)) {
          return
        }
        
        // 获取 token 并添加到请求头
        const token = localStorage.getItem('token');
        const headers = {};
        if (token && token !== 'undefined') {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        //初始化图片加载状态和宽高比检测
        this.imageLoadStatus = {}
        this.imageAspectRatios = {}
        for (let j = 0; j < tool.length; j++) {
          this.imageLoadStatus[j] = 'loading'
        }
        this.loadingImages = true
        
        //遍历绘本图片ID，替换成图片URL
        for (let i = 0; i < tool.length; i++) {
          const item = tool[i]
          
          // 检查是否已经是URL格式，如果是则保持loading状态，等待图片加载
          if (typeof item === 'string' && (item.startsWith('http://') || item.startsWith('https://'))) {
            // 已经是URL，检测宽高比
            await this.detectImageAspectRatio(item, i);
            continue
          }
          
          // 如果是图片ID（字符串且不包含/），需要获取URL
          if (typeof item === 'string' && !item.includes('/') && !item.includes('upload')) {
            try {
              let res = await this.$http.get(`/ill/` + item, { headers })
              if (res.data && res.data.message && res.data.message.content) {
                this.bookDetails.content[i] = res.data.message.content
                // 检测宽高比
                await this.detectImageAspectRatio(res.data.message.content, i);
              }
          } catch (err) {
            console.log(err)
              this.imageLoadStatus[i] = 'error'
          }
        }  
        }  
    },
    
    // 判断是否是图片ID（需要转换为URL）
    isImageId(item) {
      if (!item) return true
      // 如果是字符串且不包含/和upload，且不是完整URL，则认为是ID
      if (typeof item === 'string') {
        // 如果是完整URL，不是ID
        if (item.startsWith('http://') || item.startsWith('https://')) {
          return false
        }
        // 如果包含/或upload，可能是相对路径，不是ID
        if (item.includes('/') || item.includes('upload')) {
          return false
        }
        // 否则认为是ID
        return true
      }
      return false
    },
    
    // 获取图片URL（处理完整URL和相对路径）
    getImageUrl(url) {
      if (!url) return ''
      // 如果已经是完整URL，直接返回
      if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
        return url
      }
      // 本地静态资源或 data/blob URL 直接使用，避免错误拼接到静态域名
      if (
        typeof url === 'string' &&
        (url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:'))
      ) {
        return url
      }
      // 否则添加静态资源前缀
      return `https://static.kidstory.cc/${url}`
    },
    
    // 图片加载成功
    handleImageLoad(index) {
      this.imageLoadStatus[index] = 'loaded'
      this.checkAllImagesLoaded()
    },
    
    // 图片加载失败
    handleImageError(index) {
      this.imageLoadStatus[index] = 'error'
      this.checkAllImagesLoaded()
    },
    
    // 二维码图片加载成功
    handleCodeImageLoad() {
      // 二维码图片加载完成不影响整体加载状态
    },
    
    // 检查所有图片是否加载完成
    checkAllImagesLoaded() {
      const allLoaded = Object.values(this.imageLoadStatus).every(status => 
        status === 'loaded' || status === 'error'
      )
      if (allLoaded) {
        this.loadingImages = false
      }
    },




   attention(){
    console.log("关注作者")
   },

    // 处理关注按钮点击
    handleFollowClick(id) {
      if (this.isFollowingAnimating) return;
      
      this.isFollowingAnimating = true;
      
      if (this.attentionArr && this.attentionArr.includes(id)) {
        this.cancelAttention(id);
      } else {
        this.newAttention(id);
      }
      
      setTimeout(() => {
        this.isFollowingAnimating = false;
      }, 600);
    },

    //关注
    newAttention(id){
      this.$http
        .post(`/user/fllow/`+id,{},
        {
          headers:{
            "Authorization":"Bearer "+localStorage.getItem("token")
          }
        })
        .then((response) => {
          if (response.data.desc === "success" || response.data.code === 0) {
              //把该用户ID到用户已关注数组
              this.$store.commit("myAttention",id)
              ElMessage({
    message: this.$t('originalBookDetails.followSuccess'),
    type: 'success',
    plain: true,
    offset:100,
  })
          } else {
              ElMessage.warning(response.data.message || this.$t('originalBookDetails.followFailed'));
          }
        })
        .catch((error) => {
          console.error('关注失败:', error);
          ElMessage.error(this.$t('originalBookDetails.followFailedRetry'));
        });
   },
    //取消关注
    cancelAttention(id){
      this.$http
        .delete(`/user/list/fllow?id=`+id,
        {
          headers:{
            "Authorization":"Bearer "+localStorage.getItem("token")
          }
        },
    )
        .then((response) => {
          if (response.data.desc === "success" || response.data.code === 0) {
              //把该用户ID到用户已关注数组
              this.$store.commit("cancelAttention",id)
              ElMessage({
    message: this.$t('originalBookDetails.unfollowed'),
    type: 'info',
    plain: true,
    offset:150,
  })
          } else {
              ElMessage.warning(response.data.message || this.$t('originalBookDetails.unfollowFailed'));
          }
        })
        .catch((error) => {
          console.error('取消关注失败:', error);
          ElMessage.error(this.$t('originalBookDetails.unfollowFailedRetry'));
        });
   },
   //点击喜欢绘本
   likeBookFun(id) {
      this.$http
        .post(`/user/like/`+id,{ownerid:this.userid,type:"book",likeid:id}
        ,{
          headers:{
            "Authorization":"Bearer "+localStorage.getItem("token")
          }
        })
        .then((response) => {
          console.log(response)
          if (response.data.desc === "success") {
              //把该插画ID添加到用户已收藏插画数组
              this.$store.commit("likeBook",id)
          } 
        })
        .catch((error) => console.log(error));
    },
// 处理收藏按钮点击
handleCollectClick() {
  if (!this.bookDetails._id) return;
  
  this.isCollecting = true;
  
  if (this.collectBookArr.includes(this.bookDetails._id)) {
    this.cancelCollectBook(this.bookDetails._id);
  } else {
    this.collectBookFun(this.bookDetails._id);
  }
  
  // 动画结束后重置状态
  setTimeout(() => {
    this.isCollecting = false;
  }, 600);
},

//点击收藏绘本
collectBookFun(id) {
   this.$http.post(`/user/collect/${id}`, {
    type: "book"
  }, {
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    }
  })
  .then((response) => {
    console.log(response)
    if (response.data.desc === "success" || response.data.code === 0) {
      //把该绘本ID添加到用户已收藏绘本数组
      this.$store.commit("collectBook", [id])
      // 如果响应中包含收藏记录ID，保存到映射中
      if (response.data.message && response.data.message._id) {
        this.collectIdMap[id] = response.data.message._id;
      } else {
        // 如果没有返回收藏记录ID，重新获取收藏记录列表
        this.loadCollectIdMap();
      }
      ElMessage.success(this.$t('originalBookDetails.collectSuccess'));
    } else {
      ElMessage.warning(response.data.message || this.$t('originalBookDetails.collectFailed'));
    }
  })
  .catch((error) => {
    console.error('收藏失败:', error);
    ElMessage.error(this.$t('originalBookDetails.collectFailedRetry'));
  });
},

//取消收藏绘本
cancelCollectBook(bookId) {
  // 通过绘本ID找到对应的收藏记录ID
  const collectRecordId = this.collectIdMap[bookId];
  if (!collectRecordId) {
    // 如果没有映射，尝试从API获取
    this.loadCollectIdMap().then(() => {
      const recordId = this.collectIdMap[bookId];
      if (recordId) {
        this.performCancelCollect(bookId, recordId);
      } else {
        ElMessage.error(this.$t('originalBookDetails.collectRecordNotFound'));
      }
    });
    return;
  }
  
  this.performCancelCollect(bookId, collectRecordId);
},

// 执行取消收藏操作
performCancelCollect(bookId, collectRecordId) {
  this.$http.delete(`/user/list/collect?id=${collectRecordId}`, {
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    }
  })
  .then((response) => {
    if (response.data.desc === "success" || response.data.code === 0) {
      // 从store中移除
      this.$store.commit("cancelCoBook", bookId);
      // 从映射中移除
      delete this.collectIdMap[bookId];
      ElMessage.success('已取消收藏');
    } else {
      ElMessage.warning(response.data.message || '取消收藏失败');
    }
  })
  .catch((error) => {
    console.error('取消收藏失败:', error);
    ElMessage.error('取消收藏失败，请重试');
  });
},

// 加载收藏记录映射
async loadCollectIdMap() {
  if (!localStorage.getItem('id') || !localStorage.getItem('token') || localStorage.getItem('token') === 'undefined') return;
  try {
    const userId = localStorage.getItem("id");
    const res = await this.$http.get(`/user/list/collect?id=${userId}&category=book`, {
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("token")
      }
    });
    if (res.data.desc === "success" || res.data.code === 0) {
      const collectRecords = res.data.message || [];
      this.collectIdMap = {};
      collectRecords.forEach(record => {
        if (record.collectid) {
          this.collectIdMap[record.collectid] = record._id;
        }
      });
    }
  } catch (error) {
    console.error('加载收藏记录失败:', error);
  }
},

   setId(){
      this.authorId=this.bookDetails.ownerid
     },

     //获取绘本作者
     async getAuthor(){
       try{
         // 获取 token 并添加到请求头
         const token = localStorage.getItem('token');
         const headers = {};
         if (token && token !== 'undefined') {
           headers['Authorization'] = `Bearer ${token}`;
         }
         
         let res=await this.$http.get(`/user/`+this.authorId, { headers })
         this.authorDetails=res.data.message 
       } catch(err){
         console.log(err)
       }
     },
   likeit(){
    console.log("点赞")
   },
   collectit(){
    console.log("收藏")
   },
   toAuthor(id){
      this.$router.push({name:'user-g',params:{authorId:id}});
    },

    async downPDF() {
      this.disabled = true;
      ElMessage(this.$t('originalBookDetails.downloading'));
      // 统一页面尺寸：A4 横向（pt），兼容性和打印体验更好
      const pdf = new JsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const pages = (this.allPages || []).filter((item) => !this.isImageId(item));
      if (!pages.length) {
        this.disabled = false;
        return;
      }

      const loadImage = (src) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          // 仅远程地址使用匿名跨域，本地资源不设置，避免部分浏览器加载失败
          if (typeof src === 'string' && /^https?:\/\//.test(src)) {
            img.crossOrigin = 'anonymous';
          }
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`image load failed: ${src}`));
          img.src = src;
        });

      try {
        let addedCount = 0;
        for (let i = 0; i < pages.length; i++) {
          const src = this.getImageUrl(pages[i]);
          let img;
          try {
            img = await loadImage(src);
          } catch (e) {
            // 单张失败不影响整体导出
            console.warn('PDF页图片加载失败，已跳过:', e);
            continue;
          }
          const imgW = img.naturalWidth || img.width;
          const imgH = img.naturalHeight || img.height;
          if (!imgW || !imgH) continue;

          // 按原图比例缩放，整张图完整落在 PDF 页面内并居中
          const scale = Math.min(pageWidth / imgW, pageHeight / imgH);
          const renderW = imgW * scale;
          const renderH = imgH * scale;
          const x = (pageWidth - renderW) / 2;
          const y = (pageHeight - renderH) / 2;

          if (addedCount > 0) {
            pdf.addPage('a4', 'landscape');
          }
          pdf.addImage(img, 'JPEG', x, y, renderW, renderH);
          addedCount += 1;
        }
        if (addedCount === 0) {
          ElMessage.error(this.$t('originalBookDetails.pdfGenerationFailed'));
          return;
        }
        pdf.save('StoryTime.pdf');
      } catch (error) {
        console.error('PDF生成失败:', error);
        ElMessage.error(this.$t('originalBookDetails.pdfGenerationFailed'));
      } finally {
        this.disabled = false;
      }
    },
  },
  async mounted() {
    if (!this.id) {
      this.id = this.bookId || (this.$route ? this.$route.params.bookId : '');
    }

    if (this.userid && localStorage.getItem('token')) {
      await Promise.all([
        getCollectionBook(this.$http, this.$store),
        getAttention(this.$http, this.$store)
      ])
    }

    if (this.id) {
      await this.getBooks();
      await this.getImgUrl();
      await this.setId();
      await this.getAuthor();
      // 加载收藏记录映射
      await this.loadCollectIdMap();
    }

    // 添加键盘事件监听
    window.addEventListener('keydown', this.handleKeyPress);
  },
  beforeUnmount() {
    // 移除键盘事件监听
    window.removeEventListener('keydown', this.handleKeyPress);
  }
};
</script>
<style scoped>
.book-reader-container {
  min-height: 100vh;
  padding: 20px;
}




.book-layout {
  display: flex;
  gap: 24px;
  max-width: 80vw;
  margin: 0 auto;
  align-items: flex-start;
}

/* 左侧信息栏 - 宽度 1/4 (25%) */
.book-info {
  width: 25%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
}

/* 滚动条样式优化 */
.book-info::-webkit-scrollbar {
  width: 6px;
}

.book-info::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.book-info::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.book-info::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* 右侧书本翻页区域 - 宽度 3/4 (75%) */
.book-viewer-wrapper {
  width: 75%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-content .avatar {
  cursor: pointer;
  flex-shrink: 0;
}

.book-info .title {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
  text-align: left;
}

.book-info .author-info {
  font-size: 14px;
  color: #606266;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  width: 100%;
}

.author-name {
  cursor: pointer;
  color: #212121;
}

.author-name:hover {
  text-decoration: none;
  color: #8167a9;
}

/* 关注按钮样式 */
:deep(.follow-btn) {
  padding: 4px 12px !important;
  border-radius: 16px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  border: 1px solid !important;
  cursor: pointer !important;
  position: relative !important;
  overflow: hidden !important;
  min-height: auto !important;
  height: auto !important;
  line-height: 1.5 !important;
}

:deep(.follow-btn.not-followed) {
  background: linear-gradient(135deg, #8167a9 0%, #9d8bb8 100%) !important;
  border-color: #8167a9 !important;
  color: #fff !important;
}

:deep(.follow-btn.not-followed:hover) {
  background: linear-gradient(135deg, #9d8bb8 0%, #b5a5d0 100%) !important;
  border-color: #9d8bb8 !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 12px rgba(129, 103, 169, 0.3) !important;
}

:deep(.follow-btn.followed) {
  background: #f5f6fa !important;
  border-color: #dcdfe6 !important;
  color: #606266 !important;
}

:deep(.follow-btn.followed:hover) {
  background: #ebeef5 !important;
  border-color: #c0c4cc !important;
  color: #909399 !important;
}

:deep(.follow-btn.follow-animating) {
  pointer-events: none !important;
  animation: followPulse 0.6s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.follow-btn-text {
  position: relative;
  z-index: 1;
  display: inline-block;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.follow-btn.follow-animating .follow-btn-text) {
  animation: followTextBounce 0.6s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

@keyframes followPulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.98);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes followTextBounce {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.95);
  }
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.header-actions .iconfont {
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  vertical-align: middle;
}

.collect-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 44px !important;
  padding: 0 8px !important;
  line-height: 1 !important;
  vertical-align: middle;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.collect-btn :deep(.el-button__content) {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  line-height: 1 !important;
  margin: 0;
  padding: 0;
}

.collect-btn:hover {
  transform: scale(1.1);
}

.collect-btn.collecting {
  pointer-events: none;
}

.collect-animate {
  animation: collectPulse 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center center;
}

@keyframes collectPulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.5) rotate(10deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}

/* 书本翻页区域 */
.book-viewer {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  perspective: 2000px;
}

.book-wrapper {
  position: relative;
  width: 100%;
  max-width: 1200px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.6s ease;
}

.book-wrapper.flipping {
  pointer-events: none;
}

/* 书本页面 */
.book-page {
  position: relative;
  background: #fff;
  transform-style: preserve-3d;
  backface-visibility: hidden;
}

.book-page.single-page {
  width: 100%;
  margin: 0 auto;
  border-radius: 8px;
  box-shadow: 
    0 8px 30px rgba(0, 0, 0, 0.3),
    inset 0 0 0 3px #d4d7de;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.book-page.single-page:hover:not(.flipping) {
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.35),
    inset 0 0 0 3px #c0c4cc;
  transform: translateY(-2px);
}

.book-page.single-page.flipping {
  cursor: wait;
}

.page-content {
  width: 100%;
  aspect-ratio: 4 / 3; /* 横版绘本：宽 > 高 */
  position: relative;
  overflow: hidden;
  background: #fff;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

/* 双页跨页布局 */
.book-page.spread-page {
  width: 100%;
  margin: 0 auto;
  border-radius: 8px;
  box-shadow: 
    0 8px 30px rgba(0, 0, 0, 0.3),
    inset 0 0 0 3px #d4d7de;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.book-page.spread-page:hover:not(.flipping) {
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.35),
    inset 0 0 0 3px #c0c4cc;
  transform: translateY(-2px);
}

.book-page.spread-page.flipping {
  cursor: wait;
}

.spread-content {
  width: 100%;
  max-width: 100%;
  /* 竖版书页：高 > 宽，双页并排 */
  /* 使用更合理的高度设置：限制最大高度为视口的80%，同时保持3:4的宽高比 */
  aspect-ratio: 3 / 4;
  max-height: 80vh; /* 限制最大高度，避免在屏幕上过高 */
  min-height: 400px; /* 设置最小高度，确保在小屏幕上也有足够显示空间 */
  position: relative;
  overflow: hidden;
  background: #fff;
  display: flex;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.spread-content-inner {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
}

.spread-page-left,
.spread-page-right {
  flex: 1;
  position: relative;
  height: 100%;
  min-height: 0; /* 允许flex子元素缩小 */
  overflow: hidden;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.spread-page-left {
  border-right: 2px solid #e4e7ed;
}

.spread-page-left .page-image-wrapper,
.spread-page-right .page-image-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.spread-page-left .page-image,
.spread-page-right .page-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.spread-page-left .page-empty,
.spread-page-right .page-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  color: #909399;
  font-size: 24px;
  font-weight: 500;
}

.page-content-inner {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

/* 书页边缘效果 - 使用背景图片 */
.page-edge {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 6px;
  height: 100%;
  z-index: 15;
  pointer-events: none;
  background-image: url('@/assets/images/read_edgie.png');
  background-size: 12px 100%;
  background-repeat: no-repeat;
}

.page-edge.right-edge {
  right: 0;
  background-position: right center;
}

.page-edge.left-edge {
  left: 0;
  background-position: left center;
  transform: scaleX(-1); /* 翻转图片用于左侧 */
}

/* 页面边缘翻页触发器 */
.page-flip-trigger {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 60px;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.page-flip-trigger.right-trigger {
  right: 0;
  background: transparent;
  border-radius: 0 8px 8px 0;
}

.page-flip-trigger.left-trigger {
  left: 0;
  background: transparent;
  border-radius: 8px 0 0 8px;
}

.page-flip-trigger:hover {
  background: transparent;
}

.page-flip-trigger.left-trigger:hover {
  background: transparent;
}

.flip-button {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-width: 44px !important;
  height: 40px !important;
  padding: 0 12px !important;
  border-radius: 10px !important;
  line-height: 1 !important;
  background: rgba(255, 255, 255, 0.3) !important;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);

  color: #303133 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.flip-button :deep(.el-button__content) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  line-height: 0;
}

.flip-button :deep(.el-icon) {
  margin: 0 !important;
  color: #303133;
  display: flex;
  align-items: center;
  justify-content: center;
}

.flip-button :deep(.el-icon svg) {
  display: block;
}

.flip-button:hover {
  background: rgba(255, 255, 255, 0.4) !important;
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.6) !important;
}

/* 淡入淡出动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.fade-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

/* 翻页：轻量交叉淡入淡出（无位移，上一页/下一页同一套） */
.page-flip-enter-active,
.page-flip-leave-active {
  transition: opacity 0.26s ease;
}

.page-flip-enter-active {
  z-index: 2;
}

.page-flip-leave-active {
  z-index: 1;
}

.page-flip-enter-from,
.page-flip-leave-to {
  opacity: 0;
}

.page-image-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.page-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.page-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  color: #909399;
  font-size: 24px;
  font-weight: 500;
}

/* 翻页控制按钮 */
.page-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-top: 32px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 50px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.page-btn {
  min-width: 40px !important;
  width: auto !important;
  height: 36px !important;
  padding: 0 12px !important;
  border-radius: 10px !important;
  font-size: 16px;
  border: none;
  background: #8167a9;
  color: #fff;
  transition: all 0.3s;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.page-btn :deep(.el-button__content) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  margin: 0;
  padding: 0;
  line-height: 0;
}

.page-btn :deep(.el-icon) {
  margin: 0 !important;
}

.page-btn :deep(.el-icon svg) {
  display: block;
}

.page-btn:hover:not(:disabled) {
  background: #553a7d;
  transform: scale(1.1);
}

.page-btn:disabled {
  background: #c0c4cc;
  cursor: not-allowed;
}

.page-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  color: #303133;
  min-width: 80px;
  justify-content: center;
}

.current-page {
  font-weight: 700;
  color: #8167a9;
}

.separator {
  color: #909399;
}

.total-pages {
  color: #606266;
}

.spread-hint {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}

/* 描述信息 */
.book-description {
  padding: 0;
}

.book-description p {
  font-size: 14px;
  line-height: 1.8;
  color: #606266;
  margin: 0;
  text-align: left;
}

/* 图片加载中样式 */
.image-loading {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f5f6fa;
  color: #909399;
}

.image-loading i {
  font-size: 32px;
  margin-bottom: 12px;
  animation: rotating 2s linear infinite;
}

.image-loading p {
  font-size: 14px;
  margin: 0;
}

/* 图片加载失败样式 */
.image-error {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f5f6fa;
  color: #c0c4cc;
}

.image-error i {
  font-size: 32px;
  margin-bottom: 12px;
}

.image-error p {
  font-size: 14px;
  margin: 0;
}

/* 旋转动画 */
@keyframes rotating {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}


/* 响应式设计 */
@media (max-width: 1200px) {
  .book-layout {
    flex-direction: column;
    max-width: 100%;
  }
  
  /* 单列后信息栏不再做内部滚动，随页面自然展开 */
  .book-info {
    width: 100%;
    max-height: none;
    overflow: visible;
  }
  
  .book-viewer-wrapper {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .book-reader-container {
    padding: 10px;
    overflow-y: auto;
  }
  
  .book-layout {
    gap: 16px;
  }
  
  .book-viewer {
    padding: 10px 0;
  }
  
  .book-page.single-page {
    max-width: 100%;
  }
  
  .page-controls {
    gap: 16px;
    padding: 12px;
  }
  
  .page-btn {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
  
  .book-header {
    padding: 8px 12px;
  }
  
  .header-content {
    gap: 8px;
  }
  
  .book-description {
    padding: 8px 12px 0;
    max-height: 4.5em;
    overflow: hidden;
  }

  .book-description p {
    font-size: 13px;
    line-height: 1.5;
  }
}

</style>
