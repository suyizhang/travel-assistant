import Taro from '@tarojs/taro'

const BASE_URL = process.env.TARO_ENV === 'h5' ? '' : 'https://suyi.fun'

function getToken(): string {
  return Taro.getStorageSync('token') || ''
}

async function request<T = any>(
  url: string,
  data?: Record<string, any>
): Promise<T> {
  const token = getToken()
  const res = await Taro.request({
    url: `${BASE_URL}${url}`,
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    data,
  })

  if (res.statusCode === 401) {
    Taro.removeStorageSync('token')
    // H5 环境跳转登录页
    if (process.env.TARO_ENV === 'h5') {
      Taro.redirectTo({ url: '/pages/login/index' })
    } else {
      Taro.showToast({ title: '登录已过期，请重新进入', icon: 'none' })
    }
    throw new Error('Unauthorized')
  }

  if (res.statusCode !== 200) {
    const msg = (res.data as any)?.error || '请求失败'
    throw new Error(msg)
  }

  return res.data as T
}

/** 微信小程序登录 */
export async function login(code: string) {
  return request<{ token: string; expires_in: number }>('/api/login', { code })
}

/** H5 GitHub 登录 */
export async function h5Login(code: string) {
  return request<{ token: string; expires_in: number; user?: { login: string; avatar_url: string } }>('/api/login/h5', { code })
}

/** 发送消息 */
export async function chat(message: string, sessionId?: string) {
  return request<{ reply: string; session_id: string }>('/api/chat', {
    message,
    session_id: sessionId,
  })
}

/** 清除会话 */
export async function clearSession(sessionId?: string) {
  return request<{ message: string }>('/api/clear', {
    session_id: sessionId,
  })
}
