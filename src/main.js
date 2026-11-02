import { createApp } from 'vue'
import App from './App.vue'
import lazyImage from './directives/lazyImage'
import { illustrationPreviewUrl, markIllustrationThumbnailFailed } from './utils/illustrationImages'
import router from './router'
import customComponents from '@/custom-component' // 注册自定义组件
import store from './store'
import { installGoogleAnalytics } from './utils/googleAnalytics'
// 基础重置样式应最先加载，避免覆盖第三方组件样式
import '@/styles/reset.css'
// 响应式断点 token 与公共工具类（需在业务样式之前引入）
import '@/styles/storyTokens.css'
import '@/styles/breakpoints.css'

// 模板组件及指令由构建插件按需导入。
import { ElMessage, ElMessageBox } from 'element-plus'
// JS 调用的服务不会经过模板组件解析，单独保留其样式。
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import 'element-plus/es/components/notification/style/css'
import 'element-plus/es/components/loading/style/css'
import '@/assets/iconfont/iconfont.css'
import i18n from './i18n'

// 非关键 CSS - 延迟加载
// cropper.css 和 animate.css 在需要时动态导入
// import '@/styles/cropper.css'
// import 'animate.css/animate.css'
import '@/assets/lefticon/iconfont.css'
import axios from 'axios'
import { installChunkLoadRecovery, clearChunkReloadParameter } from '@/utils/chunkLoadRecovery'
import {
  extractErrorMessage,
  isInsufficientPointsErrorObject,
  rejectIfApiPointsError,
  scheduleInsufficientPointsDialog,
} from '@/utils/insufficientPoints'

installChunkLoadRecovery();
clearChunkReloadParameter();

// History 路由：兼容旧 #/ 链接，301 式 replace 到无 hash 路径
function redirectLegacyHashRoutes() {
  const { origin, pathname, search, hash } = window.location
  if (!hash.startsWith('#/')) return
  const hashPath = (hash || '').replace(/^#/, '').replace(/^\/?/, '')
  if (!hashPath || hashPath === '/') return
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) return

  const path = `/${hashPath}`
  window.location.replace(`${origin}${path}${search || ''}`)
}
redirectLegacyHashRoutes()

const app = createApp(App)
installGoogleAnalytics(router)
store.subscribe((mutation) => {
  if (mutation.type !== 'hasLogin' || mutation.payload !== true) return
  if (window.location.pathname === '/wechat/callback') return
  try {
    const target = sessionStorage.getItem('kidstory-pending-creation')
    sessionStorage.removeItem('kidstory-pending-creation')
    if (/^\/creation-studio\/book\/(ai|topdf)(\?sample=forest)?$/.test(target || '')) router.push(target)
  } catch { /* normal login remains available */ }
})
app.directive('lazy-image', lazyImage)
app.config.globalProperties.$illustrationPreview = illustrationPreviewUrl
app.config.globalProperties.$thumbnailFailed = markIllustrationThumbnailFailed

// View UI Plus 仅用于编辑器，首次直达和站内跳转都在渲染前完成注册。
router.beforeResolve(async (to) => {
  const usesToolTheme = to.matched.some(record => record.path === '/creation-studio') ||
    ['photo-collage', 'diary-timeline', 'image-segmentation', 'lasso-crop', 'compose-illustration', 'topdf'].includes(to.name)
  if (usesToolTheme) {
    await Promise.all([import('@/styles/storyControls.css'), import('@/styles/creativeToolsTheme.css')])
  }
  if (to.name === 'editorpro') {
    const { installEditorUi } = await import('./utils/editorPro/installEditorUi')
    installEditorUi(app)
  }
})

app.use(router)
app.use(store)
app.use(i18n)
app.use(customComponents)

// 配置 axios
axios.defaults.baseURL = 'https://api.kidstory.cc/'
// 设置全局请求超时时间（30秒）
axios.defaults.timeout = 30000

// 添加请求拦截器：自动在请求头中添加 token
axios.interceptors.request.use(
  config => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('token')
    if (token) {
      // 自动添加 Authorization header
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    // 请求错误处理
    return Promise.reject(error)
  }
)

// 添加响应拦截器：积分不足引导充值 + token 过期
axios.interceptors.response.use(
  (response) => {
    const pointsErr = rejectIfApiPointsError(response, {
      router,
      t: i18n.global.t,
    })
    if (pointsErr) return Promise.reject(pointsErr)
    return response
  },
  (error) => {
    if (isInsufficientPointsErrorObject(error)) {
      scheduleInsufficientPointsDialog({
        message: extractErrorMessage(error),
        router,
        t: i18n.global.t,
      })
      error.insufficientPoints = true
    }
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('id')
    }
    return Promise.reject(error)
  }
)

// 将 axios 挂载到全局属性
app.config.globalProperties.$http = axios
// 将 Element Plus 的 message 挂载到全局属性（为了兼容性）
app.config.globalProperties.$message = ElMessage
// 按需加载不会安装 MessageBox 服务，保留现有页面的确认弹窗调用。
app.config.globalProperties.$confirm = ElMessageBox.confirm

app.mount('#app')

// 图标按需导入，不再全局注册所有图标
// 各组件需要使用时自行导入所需的图标组件

