import { View, Text, Input, ScrollView, Image } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { chat, chatStream, clearSession } from '../../services/api'
import Markdown from '../../components/markdown'
import './index.less'

const STORAGE_KEY_MESSAGES = 'chat_messages'
const STORAGE_KEY_SESSION = 'chat_session_id'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
  error?: boolean
}

function getUserInfo() {
  try {
    const raw = Taro.getStorageSync('user')
    return raw ? JSON.parse(raw) as { login: string; avatar_url: string } : null
  } catch { return null }
}

function getChatHints(): { icon: string; text: string }[] {
  const month = new Date().getMonth() + 1
  if (month >= 1 && month <= 2) return [
    { icon: '🧧', text: '春节去哪里旅行？' },
    { icon: '🎿', text: '推荐国内滑雪胜地' },
  ]
  if (month >= 3 && month <= 4) return [
    { icon: '🌸', text: '春天去哪里赏花？' },
    { icon: '🗺️', text: '五一假期去哪玩？' },
  ]
  if (month >= 5 && month <= 6) return [
    { icon: '🏖️', text: '夏天海岛游推荐' },
    { icon: '🌊', text: '端午短途游去哪？' },
  ]
  if (month >= 7 && month <= 8) return [
    { icon: '🏔️', text: '暑期亲子游推荐' },
    { icon: '❄️', text: '夏天哪里最凉快？' },
  ]
  if (month >= 9 && month <= 10) return [
    { icon: '🏮', text: '国庆假期去哪玩？' },
    { icon: '🍁', text: '去哪里看红叶？' },
  ]
  return [
    { icon: '♨️', text: '冬天泡温泉去哪好？' },
    { icon: '🎄', text: '元旦跨年去哪里？' },
  ]
}

function loadMessages(): Message[] {
  try {
    const raw = Taro.getStorageSync(STORAGE_KEY_MESSAGES)
    if (!raw) return []
    const msgs = JSON.parse(raw) as Message[]
    // 清除残留的 loading 状态
    return msgs.map(m => ({ ...m, loading: false }))
  } catch { return [] }
}

function loadSessionId(): string {
  try {
    return Taro.getStorageSync(STORAGE_KEY_SESSION) || `s_${Date.now()}`
  } catch { return `s_${Date.now()}` }
}

function saveMessages(msgs: Message[]) {
  try {
    // 只保存最近 50 条，避免 storage 过大
    const toSave = msgs.slice(-50).map(m => ({ ...m, loading: false }))
    Taro.setStorageSync(STORAGE_KEY_MESSAGES, JSON.stringify(toSave))
  } catch {}
}

function saveSessionId(sid: string) {
  try {
    Taro.setStorageSync(STORAGE_KEY_SESSION, sid)
  } catch {}
}

export default function Chat() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(() => loadMessages())
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [offline, setOffline] = useState(false)
  const [guestLimitReached, setGuestLimitReached] = useState(false)
  const sessionId = useRef(loadSessionId())
  const scrollId = useRef('msg-bottom')
  const [user] = useState(getUserInfo)
  const locationRef = useRef<{ latitude: number; longitude: number; city?: string } | null>(null)
  const cancelStreamRef = useRef<(() => void) | null>(null)
  const lastUserMsgRef = useRef<string>('')
  const chatHints = useMemo(() => getChatHints(), [])

  // 持久化消息
  useEffect(() => {
    saveMessages(messages)
  }, [messages])

  // 持久化 sessionId
  useEffect(() => {
    saveSessionId(sessionId.current)
  }, [])

  useEffect(() => {
    // H5 端：未登录且非游客模式则跳登录页
    if (process.env.TARO_ENV === 'h5') {
      const token = Taro.getStorageSync('token')
      const isGuest = Taro.getStorageSync('guest_mode') === 'true'
      if (!token && !isGuest) {
        Taro.redirectTo({ url: '/pages/login/index' })
        return
      }
    }

    // 网络状态监听
    if (process.env.TARO_ENV === 'h5' && typeof window !== 'undefined') {
      const goOffline = () => setOffline(true)
      const goOnline = () => setOffline(false)
      window.addEventListener('offline', goOffline)
      window.addEventListener('online', goOnline)
      setOffline(!navigator.onLine)

      // 获取用户定位
      if (navigator?.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            locationRef.current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
          },
          () => {}
        )
      }

      const q = router.params.q
      if (q) {
        sendMessage(decodeURIComponent(q))
      }

      return () => {
        window.removeEventListener('offline', goOffline)
        window.removeEventListener('online', goOnline)
        cancelStreamRef.current?.()
      }
    }

    // 小程序端
    if (process.env.TARO_ENV === 'weapp') {
      Taro.getLocation({ type: 'gcj02' })
        .then((loc) => {
          locationRef.current = { latitude: loc.latitude, longitude: loc.longitude }
        })
        .catch(() => {})
    }

    const q = router.params.q
    if (q) {
      sendMessage(decodeURIComponent(q))
    }

    return () => {
      cancelStreamRef.current?.()
    }
  }, [])

  const sendMessage = useCallback(
    async (text?: string) => {
      const msg = (text || input).trim()
      if (!msg || loading) return

      setInput('')
      lastUserMsgRef.current = msg

      const userMsg: Message = {
        id: `u_${Date.now()}`,
        role: 'user',
        content: msg,
      }
      const aiMsg: Message = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: '',
        loading: true,
      }

      setMessages((prev) => [...prev, userMsg, aiMsg])
      setLoading(true)

      const isH5 = process.env.TARO_ENV === 'h5'

      if (isH5) {
        // H5 端：使用 SSE 流式输出
        const aiId = aiMsg.id
        cancelStreamRef.current = chatStream(
          msg,
          sessionId.current,
          // onChunk — 逐字追加
          (chunk) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiId
                  ? { ...m, content: m.content + chunk, loading: false }
                  : m
              )
            )
            scrollId.current = `msg-${Date.now()}`
          },
          // onDone
          (_fullText) => {
            setLoading(false)
            cancelStreamRef.current = null
            scrollId.current = `msg-${Date.now()}`
          },
          // onError
          (errMsg) => {
            // 检查游客限制
            if (errMsg && errMsg.includes('游客每日免费体验')) {
              setGuestLimitReached(true)
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiId
                  ? { ...m, content: errMsg || '请求失败，请重试', loading: false, error: true }
                  : m
              )
            )
            setLoading(false)
            cancelStreamRef.current = null
          },
          locationRef.current || undefined
        )
      } else {
        // 小程序端：普通请求
        try {
          const res = await chat(msg, sessionId.current, locationRef.current || undefined)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsg.id
                ? { ...m, content: res.reply, loading: false }
                : m
            )
          )
        } catch (err: any) {
          if (err.message && err.message.includes('游客每日免费体验')) {
            setGuestLimitReached(true)
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsg.id
                ? { ...m, content: err.message || '请求失败，请重试', loading: false, error: true }
                : m
            )
          )
        } finally {
          setLoading(false)
          scrollId.current = `msg-${Date.now()}`
        }
      }
    },
    [input, loading]
  )

  const handleRetry = useCallback(() => {
    if (loading || !lastUserMsgRef.current) return
    // 移除最后一条错误的 AI 消息和用户消息
    setMessages((prev) => {
      const newMsgs = [...prev]
      // 移除最后的 AI 错误消息
      if (newMsgs.length > 0 && newMsgs[newMsgs.length - 1].role === 'assistant') {
        newMsgs.pop()
      }
      // 移除最后的用户消息
      if (newMsgs.length > 0 && newMsgs[newMsgs.length - 1].role === 'user') {
        newMsgs.pop()
      }
      return newMsgs
    })
    // 重新发送
    sendMessage(lastUserMsgRef.current)
  }, [loading, sendMessage])

  const handleCancel = useCallback(() => {
    if (!loading) return
    cancelStreamRef.current?.()
    cancelStreamRef.current = null
    setLoading(false)
    // 把正在 loading 的消息标记为中断
    setMessages((prev) =>
      prev.map((m) =>
        m.loading ? { ...m, loading: false, content: m.content || '已取消', error: !m.content } : m
      )
    )
  }, [loading])

  const handleClear = async () => {
    cancelStreamRef.current?.()
    cancelStreamRef.current = null
    try {
      await clearSession(sessionId.current)
      setMessages([])
      const newSid = `s_${Date.now()}`
      sessionId.current = newSid
      saveSessionId(newSid)
      Taro.showToast({ title: '会话已清除', icon: 'success' })
    } catch {
      Taro.showToast({ title: '操作失败', icon: 'none' })
    }
  }

  const handleNewChat = () => {
    cancelStreamRef.current?.()
    cancelStreamRef.current = null
    setMessages([])
    setLoading(false)
    const newSid = `s_${Date.now()}`
    sessionId.current = newSid
    saveSessionId(newSid)
    clearSession(sessionId.current).catch(() => {})
  }

  const handleCopy = useCallback((text: string) => {
    if (process.env.TARO_ENV === 'h5' && navigator?.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        Taro.showToast({ title: '已复制', icon: 'success', duration: 1500 })
      }).catch(() => {
        Taro.setClipboardData({ data: text })
      })
    } else {
      Taro.setClipboardData({ data: text })
    }
  }, [])

  const handleShare = useCallback((text: string) => {
    if (process.env.TARO_ENV === 'h5' && typeof window !== 'undefined') {
      const shareText = `✈️ 来自「旅伴」AI旅行助手的推荐：\n\n${text}\n\n🔗 体验地址：${window.location.origin}`
      if (navigator?.clipboard) {
        navigator.clipboard.writeText(shareText).then(() => {
          Taro.showToast({ title: '分享内容已复制', icon: 'success', duration: 2000 })
        }).catch(() => {
          Taro.setClipboardData({ data: shareText })
        })
      } else {
        Taro.setClipboardData({ data: shareText })
      }
    }
  }, [])

  const handleGoLogin = useCallback(() => {
    Taro.removeStorageSync('guest_mode')
    Taro.redirectTo({ url: '/pages/login/index' })
  }, [])

  const goBack = () => {
    cancelStreamRef.current?.()
    Taro.navigateBack()
  }

  return (
    <View className='chat'>
      {/* 断网提示横幅 */}
      {offline && (
        <View className='chat-offline'>
          <Text className='chat-offline-icon'>⚠️</Text>
          <Text className='chat-offline-text'>网络已断开，请检查网络连接</Text>
        </View>
      )}

      {/* 游客限制提示 */}
      {guestLimitReached && (
        <View className='chat-guest-limit'>
          <View className='chat-guest-limit-info'>
            <Text className='chat-guest-limit-icon'>🔒</Text>
            <Text className='chat-guest-limit-text'>今日免费体验次数已用完</Text>
          </View>
          <View className='chat-guest-limit-btn' onClick={handleGoLogin}>
            <Text className='chat-guest-limit-btn-text'>登录解锁</Text>
          </View>
        </View>
      )}

      {/* Header — 仅 H5 端显示自定义 header */}
      {process.env.TARO_ENV === 'h5' && (
        <View className='chat-header'>
          <View className='chat-header-left' onClick={goBack}>
            <Text className='chat-header-back-icon'>‹</Text>
          </View>
          <View className='chat-header-center'>
            <View className='chat-header-avatar-wrap'>
              <Text className='chat-header-avatar-emoji'>✈️</Text>
              <View className='chat-header-online-dot' />
            </View>
            <View className='chat-header-info'>
              <Text className='chat-header-title'>旅伴</Text>
              <Text className='chat-header-status'>{loading ? '正在思考...' : '在线'}</Text>
            </View>
          </View>
          <View className='chat-header-actions'>
            {messages.length > 0 && (
              <View className='chat-header-btn' onClick={handleNewChat}>
                <Text className='chat-header-btn-icon'>＋</Text>
              </View>
            )}
            <View className='chat-header-btn' onClick={handleClear}>
              <Text className='chat-header-btn-icon'>🗑</Text>
            </View>
          </View>
        </View>
      )}

      {/* Messages */}
      <ScrollView
        className='chat-messages'
        scrollY
        scrollIntoView={scrollId.current}
        scrollWithAnimation
        enhanced
        showScrollbar={false}
      >
        {messages.length === 0 && (
          <View className='chat-empty'>
            <View className='chat-empty-card'>
              <Text className='chat-empty-icon'>🌍</Text>
              <Text className='chat-empty-title'>开始你的旅行对话</Text>
              <Text className='chat-empty-desc'>
                问我任何旅行相关的问题，我会为你提供专业的建议
              </Text>
              <View className='chat-empty-divider' />
              <View className='chat-empty-hints'>
                {chatHints.map((h) => (
                  <View key={h.text} className='chat-empty-hint' onClick={() => sendMessage(h.text)}>
                    <Text className='chat-empty-hint-icon'>{h.icon}</Text>
                    <Text className='chat-empty-hint-text'>{h.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {messages.map((msg) => (
          <View
            key={msg.id}
            id={msg.id}
            className={`msg ${msg.role === 'user' ? 'msg--user' : 'msg--ai'}`}
          >
            {msg.role === 'user' ? (
              <View className='msg-row msg-row--user'>
                <View className='msg-bubble msg-bubble--user'>
                  <Text className='msg-text msg-text--user'>{msg.content}</Text>
                </View>
                {user?.avatar_url ? (
                  <Image className='msg-avatar msg-avatar--user' src={user.avatar_url} mode='aspectFill' />
                ) : (
                  <View className='msg-avatar-default msg-avatar-default--user'>
                    <Text className='msg-avatar-default-text'>我</Text>
                  </View>
                )}
              </View>
            ) : (
              <View className='msg-row msg-row--ai'>
                <View className='msg-ai-avatar'>
                  <Text className='msg-ai-avatar-emoji'>✈️</Text>
                </View>
                <View className='msg-bubble msg-bubble--ai'>
                  {msg.loading ? (
                    <View className='msg-typing'>
                      <View className='msg-typing-dot' />
                      <View className='msg-typing-dot' />
                      <View className='msg-typing-dot' />
                    </View>
                  ) : (
                    <>
                      <Markdown content={msg.content} className='msg-md' />
                      {msg.error ? (
                        <View className='msg-retry' onClick={handleRetry}>
                          <Text className='msg-retry-icon'>↻</Text>
                          <Text className='msg-retry-text'>重试</Text>
                        </View>
                      ) : (
                        <View className='msg-actions'>
                          <View className='msg-action' onClick={() => handleCopy(msg.content)}>
                            <Text className='msg-action-icon'>📋</Text>
                            <Text className='msg-action-text'>复制</Text>
                          </View>
                          {process.env.TARO_ENV === 'h5' && (
                            <View className='msg-action' onClick={() => handleShare(msg.content)}>
                              <Text className='msg-action-icon'>🔗</Text>
                              <Text className='msg-action-text'>分享</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </>
                  )}
                </View>
              </View>
            )}
          </View>
        ))}

        <View id='msg-bottom' style={{ height: '2px' }} />
      </ScrollView>

      {/* Input bar */}
      <View className='chat-bar'>
        <View className='chat-bar-inner'>
          {messages.length > 0 && !loading && (
            <View className='chat-bar-clear' onClick={handleClear}>
              <Text className='chat-bar-clear-icon'>🗑</Text>
            </View>
          )}
          <Input
            className='chat-bar-input'
            placeholder='输入你的旅行问题...'
            placeholderClass='chat-bar-placeholder'
            value={input}
            onInput={(e) => setInput(e.detail.value)}
            onConfirm={() => sendMessage()}
            confirmType='send'
            disabled={loading}
          />
          {loading ? (
            <View className='chat-bar-cancel' onClick={handleCancel}>
              <Text className='chat-bar-cancel-icon'>■</Text>
            </View>
          ) : (
            <View
              className={`chat-bar-send ${!input.trim() ? 'chat-bar-send--disabled' : ''}`}
              onClick={() => sendMessage()}
            >
              <Text className='chat-bar-send-icon'>↑</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}
