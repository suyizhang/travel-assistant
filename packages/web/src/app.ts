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
    // H5：检查是否在登录页（含 GitHub 回调 code），如果不在则跳转登录页
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname
      const isLoginPage = pathname.includes('/pages/login/index')
      const hasCode = window.location.search.includes('code=')

      if (!isLoginPage && !hasCode) {
        Taro.redirectTo({ url: '/pages/login/index' })
      }
    }
  }
}

export default App
