import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import './index.less'

const quickQuestions = [
  { icon: '🗺️', text: '推荐五一去哪玩？', tag: '热门' },
  { icon: '🏛️', text: '北京三日游怎么安排？', tag: '行程' },
  { icon: '🌶️', text: '去成都旅行预算多少？', tag: '预算' },
  { icon: '🏖️', text: '三亚最近天气怎么样？', tag: '天气' },
]

const features = [
  { icon: '📍', label: '目的地推荐' },
  { icon: '📋', label: '行程规划' },
  { icon: '💰', label: '预算估算' },
  { icon: '🌤️', label: '天气查询' },
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
      {/* 背景装饰 */}
      <View className='index-deco index-deco--1' />
      <View className='index-deco index-deco--2' />
      <View className='index-deco index-deco--3' />

      {/* 用户栏 */}
      {user && (
        <View className='topbar'>
          <View className='topbar-user'>
            <Image className='topbar-avatar' src={user.avatar_url} mode='aspectFill' />
            <View className='topbar-info'>
              <Text className='topbar-greeting'>欢迎回来</Text>
              <Text className='topbar-name'>{user.login}</Text>
            </View>
          </View>
          <Text className='topbar-logout' onClick={handleLogout}>退出</Text>
        </View>
      )}

      {/* Hero */}
      <View className='hero'>
        <View className='hero-icon-wrap'>
          <View className='hero-icon-ring' />
          <Text className='hero-icon'>✈️</Text>
        </View>
        <Text className='hero-title'>旅伴</Text>
        <Text className='hero-subtitle'>你的 AI 旅行规划助手</Text>
      </View>

      {/* 能力标签 */}
      <View className='features'>
        {features.map((f) => (
          <View key={f.label} className='feature-chip'>
            <Text className='feature-chip-icon'>{f.icon}</Text>
            <Text className='feature-chip-label'>{f.label}</Text>
          </View>
        ))}
      </View>

      {/* 快捷问题 */}
      <View className='quick'>
        <View className='quick-header'>
          <View className='quick-dot' />
          <Text className='quick-label'>热门问题</Text>
        </View>
        <View className='quick-grid'>
          {quickQuestions.map((q) => (
            <View key={q.text} className='quick-card' onClick={() => goChat(q.text)}>
              <View className='quick-card-left'>
                <Text className='quick-card-icon'>{q.icon}</Text>
                <Text className='quick-card-text'>{q.text}</Text>
              </View>
              <View className='quick-card-tag'>
                <Text className='quick-card-tag-text'>{q.tag}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* CTA */}
      <View className='cta' onClick={() => goChat()}>
        <View className='cta-content'>
          <Text className='cta-text'>开始规划旅行</Text>
          <Text className='cta-sub'>告诉我你想去哪，剩下的交给我</Text>
        </View>
        <View className='cta-arrow'>
          <Text className='cta-arrow-icon'>→</Text>
        </View>
      </View>
    </View>
  )
}
