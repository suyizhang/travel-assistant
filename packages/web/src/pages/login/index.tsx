import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { h5Login } from '../../services/api'
import './index.less'

const GITHUB_CLIENT_ID = process.env.TARO_APP_GITHUB_CLIENT_ID || ''

export default function Login() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (process.env.TARO_ENV === 'h5') {
      handleGithubCallback()
    }
  }, [])

  async function handleGithubCallback() {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')

    if (!code) return

    url.searchParams.delete('code')
    url.searchParams.delete('state')
    window.history.replaceState({}, '', url.toString())

    setStatus('loading')
    try {
      const res = await h5Login(code)
      Taro.setStorageSync('token', res.token)
      if (res.user) {
        Taro.setStorageSync('user', JSON.stringify(res.user))
      }
      Taro.reLaunch({ url: '/pages/index/index' })
    } catch (err: any) {
      setStatus('error')
      setErrorMsg(err.message || '登录失败，请重试')
    }
  }

  function handleGithubLogin() {
    if (process.env.TARO_ENV !== 'h5') return

    if (!GITHUB_CLIENT_ID) {
      setStatus('error')
      setErrorMsg('GitHub 登录未配置')
      return
    }

    const redirectUri = encodeURIComponent(window.location.origin + '/pages/login/index')
    const state = Math.random().toString(36).slice(2, 10)

    window.location.href =
      `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=read:user&state=${state}`
  }

  return (
    <View className='login'>
      <View className='login-card'>
        <View className='login-badge'>
          <Text>TRAVEL COMPANION</Text>
        </View>
        <View className='login-emoji'>✈️</View>
        <View className='login-title'>旅伴</View>
        <View className='login-subtitle'>AI 旅行规划助手</View>
        <View className='login-divider' />

        {status === 'loading' ? (
          <View className='login-loading'>
            <View className='login-loading-dot' />
            <Text className='login-loading-text'>正在登录中...</Text>
          </View>
        ) : (
          <>
            <View className='login-github-btn' onClick={handleGithubLogin}>
              <Text className='login-github-icon'>
                <svg viewBox='0 0 24 24' width='24' height='24' fill='#fff'>
                  <path d='M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z' />
                </svg>
              </Text>
              <Text className='login-github-text'>GitHub 登录</Text>
            </View>

            {status === 'error' && (
              <View className='login-error'>
                <Text>{errorMsg}</Text>
              </View>
            )}

            <View className='login-tip'>
              <Text>使用 GitHub 账号即可快速登录</Text>
            </View>
          </>
        )}
      </View>
    </View>
  )
}
