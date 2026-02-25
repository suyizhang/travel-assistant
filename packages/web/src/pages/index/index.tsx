import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import './index.less'

const quickQuestions = [
  { icon: '🗺️', text: '推荐五一去哪玩？' },
  { icon: '🏛️', text: '北京三日游怎么安排？' },
  { icon: '🌶️', text: '去成都旅行预算多少？' },
  { icon: '🏖️', text: '三亚最近天气怎么样？' },
]

function getUserInfo() {
  try {
    const raw = Taro.getStorageSync('user')
    return raw ? JSON.parse(raw) as { login: string; avatar_url: string } : null
  } catch { return null }
}

export default function Index() {
  const [user] = useState(getUserInfo)

  const goChat = (question?: string) => {
    Taro.navigateTo({
      url: `/pages/chat/index${question ? `?q=${encodeURIComponent(question)}` : ''}`,
    })
  }

  const handleLogout = () => {
    Taro.removeStorageSync('token')
    Taro.removeStorageSync('user')
    Taro.redirectTo({ url: '/pages/login/index' })
  }

  return (
    <View className='index'>
      <View className='index-bg-orb index-bg-orb--1' />
      <View className='index-bg-orb index-bg-orb--2' />

      {user && (
        <View className='topbar'>
          <View className='topbar-user'>
            <Image className='topbar-avatar' src={user.avatar_url} mode='aspectFill' />
            <Text className='topbar-name'>{user.login}</Text>
          </View>
          <Text className='topbar-logout' onClick={handleLogout}>退出</Text>
        </View>
      )}

      <View className='hero'>
        <View className='hero-badge'>
          <Text className='hero-badge-text'>TRAVEL COMPANION</Text>
        </View>
        <View className='hero-icon'>✈️</View>
        <Text className='hero-title'>旅伴</Text>
        <Text className='hero-subtitle'>你的 AI 旅行规划助手</Text>
        <View className='hero-line' />
        <Text className='hero-desc'>智能推荐目的地 · 规划行程 · 估算预算 · 查询天气</Text>
      </View>

      <View className='quick'>
        <Text className='quick-label'>热门问题</Text>
        <View className='quick-grid'>
          {quickQuestions.map((q) => (
            <View key={q.text} className='quick-card' onClick={() => goChat(q.text)}>
              <Text className='quick-card-icon'>{q.icon}</Text>
              <Text className='quick-card-text'>{q.text}</Text>
              <Text className='quick-card-arrow'>→</Text>
            </View>
          ))}
        </View>
      </View>

      <View className='cta' onClick={() => goChat()}>
        <Text className='cta-text'>开始规划旅行</Text>
        <Text className='cta-icon'>→</Text>
      </View>
    </View>
  )
}
