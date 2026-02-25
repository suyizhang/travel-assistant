import { PropsWithChildren } from 'react'
import Taro, { useLaunch } from '@tarojs/taro'
import { login } from './services/api'

import './app.less'

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    initAuth()
  })

  return children
}

async function initAuth() {
  const token = Taro.getStorageSync('token')
  if (token) return

  if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
    // 小程序：自动 wx.login
    try {
      const { code } = await Taro.login()
      const res = await login(code)
      if (res.token) {
        Taro.setStorageSync('token', res.token)
      }
    } catch (err) {
      console.error('登录失败:', err)
    }
  } else {
    // H5：仅在登录页处理 GitHub 回调，不再强制跳转登录页
    // 用户可以先浏览首页，进入聊天时再检查登录状态
    if (typeof window !== 'undefined') {
      const hasCode = window.location.search.includes('code=')
      const isLoginPage = window.location.pathname.includes('/pages/login/index')

      if (hasCode && isLoginPage) {
        // 在登录页且有回调 code，正常处理即可
      }
    }
  }
}

export default App
