import { View, Text, Input, ScrollView, Image } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useState, useEffect, useRef, useCallback } from 'react'
import { chat, clearSession } from '../../services/api'
import Markdown from '../../components/markdown'
import './index.less'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
}

function getUserInfo() {
  try {
    const raw = Taro.getStorageSync('user')
    return raw ? JSON.parse(raw) as { login: string; avatar_url: string } : null
  } catch { return null }
}

export default function Chat() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const sessionId = useRef(`s_${Date.now()}`)
  const scrollId = useRef('msg-bottom')
  const [user] = useState(getUserInfo)
  const locationRef = useRef<{ latitude: number; longitude: number; city?: string } | null>(null)

  useEffect(() => {
    // H5 端：未登录则跳登录页
    if (process.env.TARO_ENV === 'h5') {
      const token = Taro.getStorageSync('token')
      if (!token) {
        Taro.redirectTo({ url: '/pages/login/index' })
        return
      }
    }

    // 获取用户定位
    if (process.env.TARO_ENV === 'weapp') {
      Taro.getLocation({ type: 'gcj02' })
        .then((loc) => {
          locationRef.current = { latitude: loc.latitude, longitude: loc.longitude }
        })
        .catch(() => {})
    } else {
      // H5 端使用 Geolocation API
      if (navigator?.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            locationRef.current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
          },
          () => {}
        )
      }
    }

    const q = router.params.q
    if (q) {
      sendMessage(decodeURIComponent(q))
    }
  }, [])

  const sendMessage = useCallback(
    async (text?: string) => {
      const msg = (text || input).trim()
      if (!msg || loading) return

      setInput('')

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
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsg.id
              ? {
                  ...m,
                  content: err.message || '请求失败，请重试',
                  loading: false,
                }
              : m
          )
        )
      } finally {
        setLoading(false)
        scrollId.current = `msg-${Date.now()}`
      }
    },
    [input, loading]
  )

  const handleClear = async () => {
    try {
      await clearSession(sessionId.current)
      setMessages([])
      sessionId.current = `s_${Date.now()}`
      Taro.showToast({ title: '会话已清除', icon: 'success' })
    } catch {
      Taro.showToast({ title: '操作失败', icon: 'none' })
    }
  }

  const goBack = () => {
    Taro.navigateBack()
  }

  return (
    <View className='chat'>
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
          <View className='chat-header-right' onClick={handleClear}>
            <Text className='chat-header-clear-icon'>🗑</Text>
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
                <View className='chat-empty-hint' onClick={() => sendMessage('推荐五一去哪玩？')}>
                  <Text className='chat-empty-hint-icon'>🗺️</Text>
                  <Text className='chat-empty-hint-text'>推荐五一去哪玩？</Text>
                </View>
                <View className='chat-empty-hint' onClick={() => sendMessage('三亚最近天气怎么样？')}>
                  <Text className='chat-empty-hint-icon'>🏖️</Text>
                  <Text className='chat-empty-hint-text'>三亚最近天气怎么样？</Text>
                </View>
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
                    <Markdown content={msg.content} className='msg-md' />
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
          {messages.length > 0 && (
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
          <View
            className={`chat-bar-send ${loading ? 'chat-bar-send--disabled' : ''}`}
            onClick={() => sendMessage()}
          >
            <Text className='chat-bar-send-icon'>↑</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
