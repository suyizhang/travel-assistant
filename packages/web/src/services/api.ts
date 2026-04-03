import Taro from '@tarojs/taro'

const BASE_URL = process.env.TARO_ENV === 'h5' ? '' : 'https://suyi.fun'

function getToken(): string {
  return Taro.getStorageSync('token') || ''
}

function isGuestMode(): boolean {
  try {
    return Taro.getStorageSync('guest_mode') === 'true'
  } catch { return false }
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
    // 游客模式下不跳登录页，直接抛出错误
    if (!isGuestMode()) {
      Taro.removeStorageSync('token')
      if (process.env.TARO_ENV === 'h5') {
        Taro.redirectTo({ url: '/pages/login/index' })
      } else {
        Taro.showToast({ title: '登录已过期，请重新进入', icon: 'none' })
      }
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

/** 发送消息（非流式，小程序端使用） */
export async function chat(
  message: string,
  sessionId?: string,
  location?: { latitude: number; longitude: number; city?: string }
) {
  return request<{ reply: string; session_id: string }>('/api/chat', {
    message,
    session_id: sessionId,
    ...(location ? { location } : {}),
  })
}

/** 流式聊天（H5 端使用 SSE） */
export function chatStream(
  message: string,
  sessionId: string,
  onChunk: (text: string) => void,
  onDone: (fullText: string) => void,
  onError: (err: string) => void,
  location?: { latitude: number; longitude: number; city?: string }
): () => void {
  const token = getToken()
  const body = JSON.stringify({
    message,
    session_id: sessionId,
    ...(location ? { location } : {}),
  })

  let aborted = false
  const controller = new AbortController()

  ;(async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body,
        signal: controller.signal,
      })

      if (!response.ok) {
        if (response.status === 401 && !isGuestMode()) {
          Taro.removeStorageSync('token')
          Taro.redirectTo({ url: '/pages/login/index' })
          throw new Error('Unauthorized')
        }
        const errData = await response.json().catch(() => ({}))
        throw new Error((errData as any)?.error || `请求失败 (${response.status})`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('浏览器不支持流式读取')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (!aborted) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue

          try {
            const data = JSON.parse(trimmed.slice(6))
            if (data.type === 'chunk' && data.content) {
              onChunk(data.content)
            } else if (data.type === 'done') {
              onDone(data.content || '')
            } else if (data.type === 'error') {
              onError(data.content || '服务异常')
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err: any) {
      if (!aborted && err.name !== 'AbortError') {
        onError(err.message || '请求失败')
      }
    }
  })()

  // 返回取消函数
  return () => {
    aborted = true
    controller.abort()
  }
}

/** 清除会话 */
export async function clearSession(sessionId?: string) {
  return request<{ message: string }>('/api/clear', {
    session_id: sessionId,
  })
}

/** 获取景点评价 */
export async function getReviews(city: string, attraction: string) {
  const token = getToken()
  const res = await Taro.request({
    url: `${BASE_URL}/api/reviews/${encodeURIComponent(city)}/${encodeURIComponent(attraction)}`,
    method: 'GET',
    header: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (res.statusCode !== 200) {
    throw new Error((res.data as any)?.error || '获取评价失败')
  }
  return res.data
}

/** 提交评价 */
export async function submitReview(data: {
  城市: string
  景点: string
  评分: number
  内容: string
  匿名?: boolean
  标签?: string[]
}) {
  return request<{ id: string; message: string }>('/api/reviews', data)
}

/** 标记评价有用 */
export async function markHelpful(reviewId: string) {
  return request<{ message: string }>(`/api/reviews/${reviewId}/helpful`, {})
}
