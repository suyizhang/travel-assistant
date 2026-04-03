import { View, Text, Input, Textarea, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useState, useEffect, useCallback } from 'react'
import { getReviews, submitReview, markHelpful } from '../../services/api'
import './index.less'

interface Review {
  id: string
  评分: number
  内容: string
  标签?: string[]
  时间: string
  有用数: number
  数据来源?: string
}

interface ReviewStats {
  评价数: number
  平均评分: number
  有用评价数: number
  热评: Review[]
}

const TAG_OPTIONS = ['值得推荐', '避坑指南', '拍照好看', '美食推荐', '性价比', '人少清静']

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <View className='stars'>
      {[1, 2, 3, 4, 5].map((n) => (
        <Text
          key={n}
          className={`star ${n <= value ? 'star--active' : ''}`}
          onClick={() => onChange?.(n)}
        >
          ★
        </Text>
      ))}
    </View>
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${m}月${day}日`
}

export default function ReviewPage() {
  const router = useRouter()
  const city = decodeURIComponent(router.params.city || '')
  const attraction = decodeURIComponent(router.params.attraction || '')

  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [loadError, setLoadError] = useState('')
  const [showForm, setShowForm] = useState(false)

  // 表单
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const loadReviews = useCallback(async () => {
    if (!city || !attraction) {
      setLoadError('缺少城市或景点参数')
      return
    }
    try {
      const data = await getReviews(city, attraction)
      setStats(data as ReviewStats)
      setLoadError('')
    } catch (err: any) {
      setLoadError(err.message || '加载失败')
    }
  }, [city, attraction])

  useEffect(() => {
    loadReviews()
  }, [loadReviews])

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleSubmit = async () => {
    if (submitting) return
    const trimmed = content.trim()
    if (!trimmed || trimmed.length < 5) {
      Taro.showToast({ title: '评价至少5个字', icon: 'none' })
      return
    }

    setSubmitting(true)
    try {
      await submitReview({
        城市: city,
        景点: attraction,
        评分: rating,
        内容: trimmed,
        标签: selectedTags.length > 0 ? selectedTags : undefined,
      })
      Taro.showToast({ title: '评价提交成功', icon: 'success' })
      setShowForm(false)
      setContent('')
      setRating(5)
      setSelectedTags([])
      loadReviews()
    } catch (err: any) {
      Taro.showToast({ title: err.message || '提交失败', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleHelpful = async (reviewId: string) => {
    try {
      await markHelpful(reviewId)
      Taro.showToast({ title: '已标记有用', icon: 'success', duration: 1000 })
      loadReviews()
    } catch {
      Taro.showToast({ title: '操作失败', icon: 'none', duration: 1000 })
    }
  }

  const goBack = () => {
    Taro.navigateBack()
  }

  return (
    <View className='review-page'>
      {/* Header */}
      {process.env.TARO_ENV === 'h5' && (
        <View className='review-header'>
          <View className='review-header-back' onClick={goBack}>
            <Text className='review-header-back-icon'>‹</Text>
          </View>
          <View className='review-header-center'>
            <Text className='review-header-title'>{attraction || '景点评价'}</Text>
            <Text className='review-header-sub'>{city}</Text>
          </View>
          <View className='review-header-placeholder' />
        </View>
      )}

      <ScrollView className='review-body' scrollY enhanced showScrollbar={false}>
        {/* 评分概览 */}
        {stats && (
          <View className='review-overview'>
            <View className='review-score'>
              <Text className='review-score-num'>{stats.平均评分}</Text>
              <StarRating value={Math.round(stats.平均评分)} />
              <Text className='review-score-count'>{stats.评价数} 条评价</Text>
            </View>
          </View>
        )}

        {loadError && (
          <View className='review-error'>
            <Text className='review-error-icon'>😢</Text>
            <Text className='review-error-text'>{loadError}</Text>
          </View>
        )}

        {/* 评价列表 */}
        {stats?.热评 && stats.热评.length > 0 && (
          <View className='review-list'>
            <View className='review-list-header'>
              <View className='review-list-dot' />
              <Text className='review-list-label'>用户评价</Text>
            </View>
            {stats.热评.map((r) => (
              <View key={r.id} className='review-card'>
                <View className='review-card-top'>
                  <StarRating value={r.评分} />
                  <Text className='review-card-time'>{formatTime(r.时间)}</Text>
                </View>
                <Text className='review-card-content'>{r.内容}</Text>
                {r.标签 && r.标签.length > 0 && (
                  <View className='review-card-tags'>
                    {r.标签.map((tag) => (
                      <Text key={tag} className='review-card-tag'>{tag}</Text>
                    ))}
                  </View>
                )}
                <View className='review-card-bottom'>
                  {r.数据来源 && r.数据来源 !== '用户' && (
                    <Text className='review-card-source'>来自{r.数据来源}</Text>
                  )}
                  <View className='review-card-helpful' onClick={() => handleHelpful(r.id)}>
                    <Text className='review-card-helpful-icon'>👍</Text>
                    <Text className='review-card-helpful-text'>
                      有用{r.有用数 > 0 ? ` (${r.有用数})` : ''}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 写评价表单 */}
        {showForm && (
          <View className='review-form'>
            <View className='review-form-header'>
              <Text className='review-form-title'>写评价</Text>
              <Text className='review-form-close' onClick={() => setShowForm(false)}>✕</Text>
            </View>

            <View className='review-form-row'>
              <Text className='review-form-label'>评分</Text>
              <StarRating value={rating} onChange={setRating} />
            </View>

            <View className='review-form-row'>
              <Text className='review-form-label'>标签</Text>
              <View className='review-form-tags'>
                {TAG_OPTIONS.map((tag) => (
                  <Text
                    key={tag}
                    className={`review-form-tag ${selectedTags.includes(tag) ? 'review-form-tag--active' : ''}`}
                    onClick={() => handleToggleTag(tag)}
                  >
                    {tag}
                  </Text>
                ))}
              </View>
            </View>

            <Textarea
              className='review-form-textarea'
              placeholder='分享你的真实体验，至少5个字...'
              placeholderClass='review-form-placeholder'
              value={content}
              onInput={(e) => setContent(e.detail.value)}
              maxlength={500}
            />

            <View className='review-form-footer'>
              <Text className='review-form-count'>{content.length}/500</Text>
              <View
                className={`review-form-submit ${submitting ? 'review-form-submit--disabled' : ''}`}
                onClick={handleSubmit}
              >
                <Text className='review-form-submit-text'>
                  {submitting ? '提交中...' : '提交评价'}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: '120px' }} />
      </ScrollView>

      {/* 底部操作栏 */}
      {!showForm && (
        <View className='review-bar'>
          <View className='review-bar-btn' onClick={() => setShowForm(true)}>
            <Text className='review-bar-btn-icon'>✍️</Text>
            <Text className='review-bar-btn-text'>写评价</Text>
          </View>
        </View>
      )}
    </View>
  )
}
