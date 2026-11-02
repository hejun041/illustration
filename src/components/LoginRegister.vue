<template>
  <transition name="fade">
    <div v-if="true" class="container" @click.self="closeMask">
      <transition name="slide-up">
        <div v-if="true" class="box" @click.stop>
          <div class="close" @click="closeMask">
            <i class="el-icon-close"></i>
          </div>
          <div class="left"></div>
          <div class="right">
            <ul class="title">
              <li 
                @click="countIn" 
                :class="['title-item', { 'active': countLog }]"
              >
                {{ $t('loginRegister.accountLogin') }}
              </li>
              <li class="divider-wrapper">
                <el-divider direction="vertical"></el-divider>
              </li>
              <li 
                @click="toregister" 
                :class="['title-item', { 'active': !countLog }]"
              >
                {{ $t('loginRegister.register') }}
              </li>
            </ul>

            <transition name="form-fade" mode="out-in">
              <div v-if="countLog" key="login" class="form">

                <div class="form-group">
                  <div class="input-wrapper">
                    <i class="el-icon-user input-icon"></i>
                    <input 
                      v-model="count.name" 
                      type="text" 
                      name="email" 
                      class="input" 
                      :placeholder="$t('loginRegister.enterEmail')"
                      @focus="onInputFocus"
                      @blur="onInputBlur"
                    />
                  </div>
                </div>
                <div class="form-group">
                  <div class="input-wrapper">
                    <i class="el-icon-lock input-icon"></i>
                    <input 
                      v-model="count.pwd" 
                      type="password" 
                      name="password" 
                      class="input" 
                      :placeholder="$t('loginRegister.enterPassword')"
                      @focus="onInputFocus"
                      @blur="onInputBlur"
                    />
                  </div>
                </div>
                <button
                  @click="login"
                  class="btn btn-primary"
                  type="button"
                  :disabled="loading"
                >
                  {{ loading ? $t('common.loading') || 'Loading...' : $t('loginRegister.login') }}
                </button>
                <div class="forgot-password">
                  <span @click="handleForgotPassword" class="forgot-password-link">
                    {{ $t('loginRegister.forgotPassword') }}
                  </span>
                </div>
                <div class="toregister">
                  <span class="wechat-inline-login" @click="wechatLogin">
                    <span class="wechat-inline-icon" aria-hidden="true">
                      <img src="@/assets/logo/wepay.png" alt="" class="wechat-inline-icon-img" />
                    </span>
                    <span class="wechat-inline-text">微信登录</span>
                  </span>
                 
                
                </div>
              </div>

              <div v-else key="register" class="form">
                <div class="form-group">
                  <div class="input-wrapper">
                    <i class="el-icon-message input-icon"></i>
                    <input 
                      v-model="emailCount.emailName" 
                      type="text" 
                      name="email" 
                      class="input" 
                      :placeholder="$t('loginRegister.enterEmail')"
                      @focus="onInputFocus"
                      @blur="onInputBlur"
                    />
                  </div>
                </div>
                <div class="form-group">
                  <div class="input-wrapper">
                    <i class="el-icon-lock input-icon"></i>
                    <input 
                      v-model="emailCount.emailPwd" 
                      type="password" 
                      name="password" 
                      class="input" 
                      :placeholder="$t('loginRegister.enterPassword')"
                      @focus="onInputFocus"
                      @blur="onInputBlur"
                    />
                  </div>
                </div>
                <p class="register-bonus-hint">{{ $t('loginRegister.registerBonusHint') }}</p>
                <button
                  @click="register"
                  class="btn btn-primary"
                  type="button"
                  :disabled="loading"
                >
                  {{ loading ? $t('common.loading') || 'Loading...' : $t('loginRegister.register') }}
                </button>
                <div class="toregister">
                  {{ $t('loginRegister.hasAccount') }}
                  <span @click="countIn">{{ $t('loginRegister.loginNow') }}</span>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script>
import { ref, getCurrentInstance } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import axios from 'axios'

export default {
    name: 'LoginRegister',
    setup() {
        const store = useStore()
        const router = useRouter()
        const { proxy } = getCurrentInstance()
        const { t } = useI18n()
        
        const countLog = ref(true)
        const loading = ref(false)
        const wechatLoading = ref(false)
        const count = ref({
            name: "",
            pwd: ""
        })
        const userid = ref("")
        const emailCount = ref({
            emailName: "",
            emailPwd: "",
        })
        
        const $http = proxy?.$http || axios
        const $message = proxy?.$message || ElMessage
        
        const onInputFocus = (e) => {
            e.target.parentElement.classList.add('focused')
        }
        
        const onInputBlur = (e) => {
            e.target.parentElement.classList.remove('focused')
        }
        
        const closeMask = () => {
            store.commit("closeMask")
        }
        const countIn = () => {
            countLog.value = true
        }
       
        //获取用户信息
        const getUser = async () => {
            try {
                if (!userid.value) {
                    return // 如果没有用户ID，直接返回
                }
                let res = await $http.get(`/user/` + userid.value, {
                    timeout: 10000 // 10秒超时
                })
                let toolUser = res.data.message
                store.commit("setUserInfo", toolUser)
            } catch(err) {
                console.error('获取用户信息失败:', err)
                // 只有网络错误或超时才显示登录框，其他错误不处理
                if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK' || err.message?.includes('timeout')) {
                    // 网络错误或超时，不强制显示登录框
                } else {
                    store.commit('showMask')
                }
            }
        }
       
        // 微信登录 - 根据微信官方文档实现
        // 参考：https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html
        const wechatLogin = async () => {
            wechatLoading.value = true
            
            try {
                // 1. 生成 state 参数（用于防止 CSRF 攻击）
                // 根据官方文档：state参数用于保持请求和回调的状态，授权请求后原样带回给第三方
                // 该参数可用于防止csrf攻击（跨站请求伪造攻击）
                const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
                localStorage.setItem('wechat_state', state)
                
                // 2. 保存当前页面，用于登录后跳转
                let currentPath = window.location.pathname + window.location.search
                try {
                    const pending = sessionStorage.getItem('kidstory-pending-creation')
                    if (/^\/creation-studio\/book\/(ai|topdf)(\?sample=forest)?$/.test(pending || '')) currentPath = pending
                } catch { /* use the current page */ }
                if (currentPath !== '/wechat/callback') {
                    localStorage.setItem('wechat_redirect', currentPath)
                }
                
                // 3. 构建回调地址
                // 重要：根据微信官方文档，redirect_uri 的域名必须与微信开放平台配置的授权回调域名完全一致
                // 必须使用固定的生产域名，不能使用 window.location.origin（开发环境会是 localhost）
                // 微信授权成功后，会跳转到：https://www.kidstory.cc/wechat/callback?code=CODE&state=STATE
                const callbackUrl = 'https://www.kidstory.cc/wechat/callback'
                
                // 4. 尝试从后端获取 AppID（如果后端提供了接口）
                // 如果后端没有提供接口，可以使用环境变量作为备选
                let appid = null
                try {
                    const appidResponse = await $http.get('/pb/auth/wechat/appid', {
                        timeout: 10000
                    })
                    // 支持多种响应格式
                    if (appidResponse.data.desc === 'success' && appidResponse.data.appid) {
                        appid = appidResponse.data.appid
                    } else if (appidResponse.data.code === 1000 && appidResponse.data.appid) {
                        appid = appidResponse.data.appid
                    }
                } catch (err) {
                    console.warn('无法从后端获取AppID，尝试使用环境变量:', err)
                    // 如果后端接口不存在或失败，使用环境变量作为备选
                    appid = process.env.VUE_APP_WECHAT_APPID
                }
                
                // 如果仍然没有 AppID，使用用户提供的默认值
                if (!appid) {
                    appid = 'wx3893106e37688674' // 从用户提供的URL中获取的AppID
                }
                
                // 5. 根据官方文档构建微信授权URL（第一步：请求CODE）
                // URL格式：https://open.weixin.qq.com/connect/qrconnect?appid=APPID&redirect_uri=REDIRECT_URI&response_type=code&scope=snsapi_login&state=STATE#wechat_redirect
                // 参数说明：
                // - appid: 应用唯一标识（必需）
                // - redirect_uri: 授权后重定向的回调链接地址，使用urlEncode对链接进行处理（必需）
                // - response_type: 返回类型，填code（必需）
                // - scope: 应用授权作用域，网站应用目前仅填写snsapi_login（必需）
                // - state: 用于保持请求和回调的状态，授权请求后原样带回给第三方，用于防止CSRF攻击（可选但建议使用）
                // - lang: 界面语言，支持cn（中文简体）与en（英文），默认为cn（可选）
                const redirectUri = encodeURIComponent(callbackUrl)
                const lang = 'cn' // 中文简体
                const wechatAuthUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${appid}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login&state=${state}&lang=${lang}#wechat_redirect`
                
                // 调试信息：打印实际使用的 redirect_uri
                console.log('=== 微信登录调试信息 ===')
                console.log('AppID:', appid)
                console.log('回调地址 (callbackUrl):', callbackUrl)
                console.log('编码后的回调地址 (redirectUri):', redirectUri)
                console.log('完整的授权URL:', wechatAuthUrl)
                console.log('注意：微信授权成功后，会跳转到回调地址，格式为：', callbackUrl + '?code=CODE&state=' + state)
                console.log('如果跳转到了 api.kidstory.cc，请检查：')
                console.log('1. 是否使用了后端 /pb/auth/wechat/authorize 接口')
                console.log('2. 微信开放平台配置的回调域名是否正确')
                console.log('========================')
                
                // 6. 跳转到微信授权页面
                // 用户扫码并确认授权后，微信会重定向到：
                // redirect_uri?code=CODE&state=STATE
                // 例如：https://www.kidstory.cc/wechat/callback?code=081L7Fll2dO52h4pKsml2baLOJ3L7FlE&state=3d6be0a40sssssxxxxx6624a415e
                // ⚠️ 重要：如果实际跳转到了 https://api.kidstory.cc/pb/auth/wechat/callback
                // 说明可能使用了后端的 /pb/auth/wechat/authorize 接口，或者微信开放平台配置有误
                window.location.href = wechatAuthUrl
            } catch (error) {
                wechatLoading.value = false
                console.error('微信登录失败:', error)
                let errorMsg = '微信登录配置未完成，请联系管理员'
                
                if (error.response) {
                    if (error.response.status === 404) {
                        errorMsg = '微信登录接口未找到，请联系管理员检查后端配置'
                    } else if (error.response.data?.message) {
                        errorMsg = error.response.data.message
                    } else if (error.response.data?.errmsg) {
                        errorMsg = error.response.data.errmsg
                    }
                } else if (error.message) {
                    errorMsg = error.message
                }
                
                $message({
                    message: errorMsg,
                    type: 'error',
                    offset: 180,
                })
            }
        }
       
        //登陆
        const login = () => {
            // 表单验证
            if (!count.value.name || !count.value.pwd) {
                $message({
                    message: t('loginRegister.enterEmailAndPassword'),
                    type: 'warning',
                    offset: 180,
                })
                return
            }

            loading.value = true
            $http
                .post(`/pb/login`, {
                    email: count.value.name, 
                    password: count.value.pwd,
                }, {
                    timeout: 15000 // 15秒超时
                })
                .then((response) => {
                    loading.value = false
                    if (response.data.desc === "success") {
                        closeMask()
                        localStorage.setItem("token", response.data.message)
                        localStorage.setItem("id", response.data.user_id)
                        store.commit("hasLogin", true)
                        userid.value = localStorage.getItem("id")
                        getUser(userid.value)
                    } else {
                        $message({
                            message: t('loginRegister.emailOrPasswordError'),
                            type: 'warning',
                            offset: 180,
                        })
                        console.log("login")
                    }
                })
                .catch((error) => {
                    loading.value = false
                    console.error('登录错误:', error)
                    let errorMsg = t('loginRegister.loginFailed')
                    if (error.code === 'ECONNABORTED') {
                        errorMsg = t('loginRegister.requestTimeout')
                    } else if (error.code === 'ERR_NETWORK') {
                        errorMsg = t('loginRegister.networkError')
                    } else if (error.response) {
                        errorMsg = error.response.data?.message || t('loginRegister.loginFailedShort')
                    }
                    $message({
                        message: errorMsg,
                        type: 'error',
                        offset: 180,
                    })
                })
        }

        //注册
        const register = () => {
            // 表单验证
            if (!emailCount.value.emailName || !emailCount.value.emailPwd) {
                $message({
                    message: t('loginRegister.enterEmailAndPassword'),
                    type: 'warning',
                    offset: 180,
                })
                return
            }

            loading.value = true
            $http
                .post(`/pb/regist/`, {
                    email: emailCount.value.emailName, 
                    password: emailCount.value.emailPwd,
                }, {
                    timeout: 15000 // 15秒超时
                })
                .then((response) => {
                    loading.value = false
                    if (response.data.desc === "success") {
                        countLog.value = true
                        $message({
                            message: t('loginRegister.registerSuccess'),
                            type: 'success',
                            offset: 180,
                        })
                    } else {
                        $message({
                            message: response.data?.message || t('loginRegister.tryAgain'),
                            type: 'warning',
                            offset: 180,
                        })
                    }
                })
                .catch((error) => {
                    loading.value = false
                    console.error('注册错误:', error)
                    let errorMsg = t('loginRegister.registerFailed')
                    if (error.code === 'ECONNABORTED') {
                        errorMsg = t('loginRegister.requestTimeout')
                    } else if (error.code === 'ERR_NETWORK') {
                        errorMsg = t('loginRegister.networkError')
                    } else if (error.response) {
                        errorMsg = error.response.data?.message || t('loginRegister.registerFailedShort')
                    }
                    $message({
                        message: errorMsg,
                        type: 'error',
                        offset: 180,
                    })
                })
        }

        const toregister = () => {
            countLog.value = false
        }

        // 处理忘记密码 - 跳转到找回密码页面
        const handleForgotPassword = () => {
            router.push('/forgot-password')
        }
        
        return {
            countLog,
            count,
            userid,
            emailCount,
            loading,
            wechatLoading,
            closeMask,
            countIn,
            getUser,
            login,
            wechatLogin,
            register,
            toregister,
            handleForgotPassword,
            onInputFocus,
            onInputBlur
        }
    }
}
</script>

<style scoped>
/* 模态框背景动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* 模态框内容动画 */
.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.slide-up-enter-from {
  opacity: 0;
  transform: translateY(30px) scale(0.95);
}
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-30px) scale(0.95);
}

/* 表单切换动画 */
.form-fade-enter-active, .form-fade-leave-active {
  transition: all 0.3s ease;
}
.form-fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.form-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.container {
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  width: 100vw;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

.box {
  width: 100%;
  max-width: 820px;
  min-height: 440px;
  position: relative;
  color: #505050;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 40px 60px;
  box-sizing: border-box;
  background-color: #fff;
  background-image: url('../assets/images/login.webp');
  background-position: 100% 100%;
  background-repeat: no-repeat;
  background-size: auto 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  user-select: none;
  overflow: hidden;
}

.box::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(129, 103, 169, 0.05) 0%, rgba(255, 255, 255, 0.95) 50%);
  z-index: 0;
}

.box > * {
  position: relative;
  z-index: 1;
}

.box .close {
  font-size: 24px;
  position: absolute;
  top: 20px;
  right: 20px;
  cursor: pointer;
  color: #909399;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
  z-index: 10;
}

.box .close:hover {
  color: #8167a9;
  background-color: rgba(129, 103, 169, 0.1);
  transform: rotate(90deg);
}

.box .left {
  width: 173px;
  height: 281px;
  flex-shrink: 0;
}

.box .right {
  width: 100%;
  max-width: 400px;
  flex: 1;
}

.box .right .title {
  list-style: none;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 30px;
  margin-top: 10px;
  gap: 20px;
}

.title-item {
  font-size: 18px;
  font-weight: 500;
  padding: 8px 20px;
  text-align: center;
  cursor: pointer;
  color: #909399;
  position: relative;
  transition: all 0.3s ease;
  border-radius: 4px;
}

.title-item:hover {
  color: #8167a9;
  background-color: rgba(129, 103, 169, 0.05);
}

.title-item.active {
  color: #8167a9;
  font-weight: 600;
}

.title-item.active::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
  height: 3px;
  background: linear-gradient(90deg, #9d8bb8, #8167a9);
  border-radius: 2px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    width: 0;
  }
  to {
    width: 30px;
  }
}

.form {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 20px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 48px;
  border: 2px solid #e7e7e7;
  border-radius: 8px;
  padding: 0 16px;
  background-color: #fff;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.input-wrapper:hover {
  border-color: #c0c4cc;
}

.input-wrapper.focused {
  border-color: #8167a9;
  box-shadow: 0 0 0 3px rgba(129, 103, 169, 0.1);
  transform: translateY(-1px);
}

.input-icon {
  font-size: 18px;
  color: #909399;
  margin-right: 12px;
  transition: color 0.3s ease;
}

.input-wrapper.focused .input-icon {
  color: #8167a9;
}

.input-wrapper .input {
  flex: 1;
  border: none;
  outline: none;
  box-shadow: none;
  font-size: 14px;
  color: #212121;
  background: transparent;
  padding: 0;
  height: 100%;
}

.input-wrapper .input::placeholder {
  color: #c0c4cc;
}

.btn {
  width: 100%;
  height: 48px;
  margin-top: 10px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.3s ease;
  border: none;
  cursor: pointer;
}

/* 微信登录按钮样式 */
.btn-wechat {
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(7, 193, 96, 0.3);
  margin-bottom: 12px;
}

.btn-wechat:hover {
  background: linear-gradient(135deg, #06ad56 0%, #059948 100%);
  box-shadow: 0 6px 16px rgba(7, 193, 96, 0.4);
  transform: translateY(-2px);
}

.btn-wechat:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(7, 193, 96, 0.3);
}

.wechat-desc {
  text-align: center;
  font-size: 12px;
  color: #909399;
  margin-bottom: 20px;
}

.divider-wrapper {
  margin: 20px 0;
}

.divider-text {
  color: #909399;
  font-size: 12px;
  padding: 0 10px;
  background: #fff;
}

.btn-primary {
  background: linear-gradient(135deg, #9d8bb8 0%, #8167a9 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(129, 103, 169, 0.3);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #8167a9 0%, #6b5490 100%);
  box-shadow: 0 6px 16px rgba(129, 103, 169, 0.4);
  transform: translateY(-2px);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(129, 103, 169, 0.3);
}

.forgot-password {
  text-align: right;
  margin-top: 10px;
  margin-bottom: 10px;
  font-size: 14px;
}

.forgot-password-link {
  color: #8167a9;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  font-weight: 500;
}

.forgot-password-link:hover {
  color: #6b5490;
  text-decoration: underline;
}

.wechat-inline-login {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  color: #07c160;
  font-size: 16px;
  margin-right: 8px;
}

.wechat-inline-icon {
  margin-right: 6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #07c160;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.wechat-inline-icon-img {
  width: 14px;
  height: 14px;
  display: block;
  object-fit: contain;
  /* 将图标强制变为白色（适配绿色圆底） */
  filter: brightness(0) invert(1);
}

.wechat-inline-login:hover {
  color: #059948;
}

.divider-dot {
  margin: 0 4px;
  color: #c0c4cc;
}

.register-text {
  font-size: 14px;
  color: #909399;
}

.register-link {
  color: #8167a9;
  cursor: pointer;
  margin-left: 4px;
  position: relative;
  transition: all 0.3s ease;
}

.register-link::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 2px;
  background-color: #4fa5d9;
  transition: width 0.3s ease;
}

.register-link:hover {
  color: #6b5490;
}

.register-link:hover::after {
  width: 100%;
}

.register-bonus-hint {
  margin: 4px 0 12px;
  text-align: center;
  font-size: 13px;
  color: #8167a9;
  font-weight: 600;
}

.toregister {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: #909399;
}

.toregister span {
  font-weight: 400;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .box {
    max-width: 100%;
    padding: 30px 20px;
    flex-direction: column;
    min-height: auto;
  }

  .box .left {
    display: none;
  }

  .box .right {
    max-width: 100%;
    width: 100%;
  }

  .title-item {
    font-size: 16px;
    padding: 6px 16px;
  }

  .input-wrapper {
    height: 44px;
  }

  .btn {
    height: 44px;
    font-size: 15px;
  }
}

@media (max-width: 480px) {
  .container {
    padding: 10px;
  }

  .box {
    padding: 25px 15px;
    border-radius: 12px;
  }

  .box .close {
    top: 15px;
    right: 15px;
    width: 32px;
    height: 32px;
    font-size: 20px;
  }
}
</style>
