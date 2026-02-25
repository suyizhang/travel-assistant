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

  useEffect(() => {
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
        const res = await chat(msg, sessionId.current)
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
      <View className='chat-header'>
        <View className='chat-header-back' onClick={goBack}>
          <Text className='chat-header-back-icon'>←</Text>
        </View>
        <View className='chat-header-center'>
          <Text className='chat-header-title'>旅伴</Text>
          <Text className='chat-header-dot' />
          <Text className='chat-header-status'>{loading ? '思考中' : '在线'}</Text>
        </View>
        <View className='chat-header-action' onClick={handleClear}>
          <Text className='chat-header-action-text'>清除</Text>
        </View>
      </View>

      <ScrollView
        className='chat-messages'
        scrollY
        scrollIntoView={scrollId.current}
        scrollWithAnimation
      >
        {messages.length === 0 && (
          <View className='chat-welcome'>
            <View className='chat-welcome-icon'>✈️</View>
            <Text className='chat-welcome-title'>欢迎来到旅伴</Text>
            <Text className='chat-welcome-desc'>
              我是你的 AI 旅行规划助手，问我任何旅行相关的问题吧
            </Text>
            <View className='chat-welcome-line' />
          </View>
        )}

        {messages.map((msg) => (
          <View
            key={msg.id}
            id={msg.id}
            className={`msg ${msg.role === 'user' ? 'msg--user' : 'msg--ai'}`}
          >
            {msg.role === 'user' ? (
              <>
                <View className='msg-body msg-body--user'>
                  <View className='msg-bubble msg-bubble--user'>
                    <Text className='msg-text'>{msg.content}</Text>
                  </View>
                </View>
                {user && (
                  <Image className='msg-avatar msg-avatar--user' src={user.avatar_url} mode='aspectFill' />
                )}
              </>
            ) : (
              <>
                <View className='msg-avatar msg-avatar--ai'>
                  <Text>✈️</Text>
                </View>
                <View className='msg-body'>
                  <Text className='msg-label'>旅伴</Text>
                  <View className='msg-bubble msg-bubble--ai'>
                    {msg.loading ? (
                      <View className='msg-typing'>
                        <View className='msg-typing-dot' />
                        <View className='msg-typing-dot' />
                        <View className='msg-typing-dot' />
                      </View>
                    ) : (
                      <Markdown content={msg.content} className='msg-text--ai' />
                    )}
                  </View>
                </View>
              </>
            )}
          </View>
        ))}

        <View id='msg-bottom' style={{ height: '1px' }} />
      </ScrollView>

      <View className='chat-bar'>
        <View className='chat-bar-inner'>
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
