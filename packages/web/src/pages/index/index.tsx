import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useMemo } from 'react'
import './index.less'

interface QuickQuestion {
  icon: string
  text: string
  tag: string
}

function getSeasonQuestions(): QuickQuestion[] {
  const now = new Date()
  const month = now.getMonth() + 1 // 1-12

  // 计算即将到来的假期
  const upcoming: QuickQuestion[] = []
  if (month >= 1 && month <= 2) {
    upcoming.push({ icon: '🧧', text: '春节去哪里旅行比较好？', tag: '春节' })
    upcoming.push({ icon: '🎿', text: '国内有哪些滑雪胜地？', tag: '滑雪' })
  } else if (month === 3) {
    upcoming.push({ icon: '🌸', text: '三月去哪里赏花？', tag: '赏花' })
    upcoming.push({ icon: '☘️', text: '清明假期短途游推荐', tag: '清明' })
  } else if (month === 4) {
    upcoming.push({ icon: '🌺', text: '四月最美的旅行目的地？', tag: '春游' })
    upcoming.push({ icon: '🗺️', text: '五一假期去哪玩？', tag: '五一' })
  } else if (month === 5) {
    upcoming.push({ icon: '🗺️', text: '五一假期去哪玩？', tag: '五一' })
    upcoming.push({ icon: '🏖️', text: '端午三天去哪里好？', tag: '端午' })
  } else if (month === 6) {
    upcoming.push({ icon: '🏖️', text: '暑假海岛游推荐', tag: '海岛' })
    upcoming.push({ icon: '🌊', text: '六月避暑去哪好？', tag: '避暑' })
  } else if (month === 7 || month === 8) {
    upcoming.push({ icon: '🏔️', text: '暑期亲子游去哪好？', tag: '亲子' })
    upcoming.push({ icon: '❄️', text: '夏天哪里最凉快？', tag: '避暑' })
  } else if (month === 9) {
    upcoming.push({ icon: '🍂', text: '九月最佳旅行目的地？', tag: '初秋' })
    upcoming.push({ icon: '🏮', text: '国庆黄金周去哪玩？', tag: '国庆' })
  } else if (month === 10) {
    upcoming.push({ icon: '🏮', text: '国庆黄金周去哪玩？', tag: '国庆' })
    upcoming.push({ icon: '🍁', text: '十月去哪里看红叶？', tag: '赏秋' })
  } else if (month === 11) {
    upcoming.push({ icon: '🍁', text: '深秋赏红叶去哪好？', tag: '赏秋' })
    upcoming.push({ icon: '♨️', text: '冬天泡温泉哪里好？', tag: '温泉' })
  } else {
    upcoming.push({ icon: '🎄', text: '元旦跨年去哪里？', tag: '跨年' })
    upcoming.push({ icon: '🧧', text: '春节旅行提前规划', tag: '春节' })
  }

  // 常驻问题（行程+预算类）
  const evergreen: QuickQuestion[] = [
    { icon: '🏛️', text: '北京三日游怎么安排？', tag: '行程' },
    { icon: '🌶️', text: '去成都旅行预算多少？', tag: '预算' },
  ]

  return [...upcoming, ...evergreen].slice(0, 4)
}

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

function isGuestMode(): boolean {
  try {
    return Taro.getStorageSync('guest_mode') === 'true'
  } catch { return false }
}

export default function Index() {
  const [user] = useState(getUserInfo)
  const [guest] = useState(isGuestMode)
  const quickQuestions = useMemo(() => getSeasonQuestions(), [])

  const goChat = (question?: string) => {
    Taro.navigateTo({
      url: `/pages/chat/index${question ? `?q=${encodeURIComponent(question)}` : ''}`,
    })
  }

  const handleLogout = () => {
    Taro.removeStorageSync('token')
    Taro.removeStorageSync('user')
    Taro.removeStorageSync('guest_mode')
    Taro.redirectTo({ url: '/pages/login/index' })
  }

  return (
    <View className='index'>
      {/* 背景装饰 */}
      <View className='index-deco index-deco--1' />
      <View className='index-deco index-deco--2' />
      <View className='index-deco index-deco--3' />

      {/* 用户栏 */}
      {user ? (
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
      ) : guest ? (
        <View className='topbar'>
          <View className='topbar-user'>
            <View className='topbar-guest-avatar'>
              <Text className='topbar-guest-emoji'>🌍</Text>
            </View>
            <View className='topbar-info'>
              <Text className='topbar-greeting'>游客模式</Text>
              <Text className='topbar-name'>每日 5 次免费体验</Text>
            </View>
          </View>
          <Text className='topbar-login' onClick={handleLogout}>登录</Text>
        </View>
      ) : null}

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
