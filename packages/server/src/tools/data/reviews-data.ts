/**
 * 景点口碑数据
 *
 * 数据说明:
 * - 预设评价：人工精选的高质量评价
 * - 用户评价：通过 API 动态提交的评价
 */

export interface Review {
  id: string
  城市: string
  景点: string
  评分: number // 1-5
  内容: string
  标签?: string[]
  匿名: boolean
  时间: string // ISO 格式
 有用数: number // 多少人标记有用
  数据来源?: '预设' | '用户' | string
  原文链接?: string
  用户标识?: string // 简单的用户标识，用于防刷评
}

export interface AttractionsStats {
  评价数: number
  平均评分: number
  有用评价数: number
  热评: Review[]
}

export interface ReviewsIndex {
  [城市: string]: {
    [景点: string]: AttractionsStats
  }
}

// ========== 预设评价数据（从真实平台收集后人工精选） ==========

const presetReviews: Review[] = [
  // 北京
  {
    id: 'preset_beijing_1',
    城市: '北京',
    景点: '故宫博物院',
    评分: 5,
    内容: '一定要提前预约，早上8点前进去人少，拍照效果最好。建议走中轴线+珍宝馆路线，至少3小时才能看完精华。',
    标签: ['避坑指南', '拍照好看'],
    匿名: true,
    时间: '2025-02-20T10:00:00Z',
    有用数: 0,
    数据来源: '小红书',
    用户标识: 'system',
  },
  {
    id: 'preset_beijing_2',
    城市: '北京',
    景点: '故宫博物院',
    评分: 4,
    内容: '珍宝馆值得单独买票，里面的展品太惊艳了。注意周一闭馆！',
    标签: ['值得推荐'],
    匿名: true,
    时间: '2025-02-21T14:00:00Z',
    有用数: 0,
    数据来源: '携程',
    用户标识: 'system',
  },
  {
    id: 'preset_beijing_3',
    城市: '北京',
    景点: '八达岭长城',
    评分: 5,
    内容: '北线人少景色好，推荐滑道下山超刺激！提前做好防晒，山上没遮挡。',
    标签: ['避坑指南', '值得推荐'],
    匿名: true,
    时间: '2025-02-18T09:00:00Z',
    有用数: 0,
    数据来源: '小红书',
    用户标识: 'system',
  },
  {
    id: 'preset_beijing_4',
    城市: '北京',
    景点: '天坛公园',
    评分: 4,
    内容: '回音壁的声学效果很神奇，建议找个人配合试一下。联票比较划算，单独买票不划算。',
    标签: ['性价比', '值得推荐'],
    匿名: true,
    时间: '2025-02-22T11:00:00Z',
    有用数: 0,
    数据来源: '知乎',
    用户标识: 'system',
  },
  {
    id: 'preset_beijing_5',
    城市: '北京',
    景点: '南锣鼓巷+什刹海',
    评分: 3,
    内容: '商业化比较严重，人很多。但是什刹海夜景不错，可以去酒吧街喝一杯。',
    标签: ['人少清静'],
    匿名: true,
    时间: '2025-02-19T16:00:00Z',
    有用数: 0,
    数据来源: '大众点评',
    用户标识: 'system',
  },

  // 上海
  {
    id: 'preset_shanghai_1',
    城市: '上海',
    景点: '外滩',
    评分: 5,
    内容: '夜晚的灯光秀太美了！建议下午五六点去，可以同时看日落和夜景。',
    标签: ['拍照好看', '值得推荐'],
    匿名: true,
    时间: '2025-02-15T18:00:00Z',
    有用数: 0,
    数据来源: '小红书',
    用户标识: 'system',
  },
  {
    id: 'preset_shanghai_2',
    城市: '上海',
    景点: '外滩',
    评分: 4,
    内容: '万国建筑真的很有历史感，建议花19块钱坐轮渡到对岸陆家嘴，可以从另一个角度看外滩。',
    标签: ['性价比', '拍照好看'],
    匿名: true,
    时间: '2025-02-17T12:00:00Z',
    有用数: 0,
    数据来源: '大众点评',
    用户标识: 'system',
  },
  {
    id: 'preset_shanghai_3',
    城市: '上海',
    景点: '豫园+城隍庙',
    评分: 4,
    内容: '园林很精致，值得一看。旁边的小笼包南翔馒头店要排队很久，旁边的小店味道也不错还便宜。',
    标签: ['美食推荐', '性价比'],
    匿名: true,
    时间: '2025-02-16T15:00:00Z',
    有用数: 0,
    数据来源: '携程',
    用户标识: 'system',
  },
  {
    id: 'preset_shanghai_4',
    城市: '上海',
    景点: '迪士尼乐园',
    评分: 5,
    内容: '烟花秀一定要看！提前40分钟去占位置。建议买早享卡，可以提前一小时入园，少排队。',
    标签: ['避坑指南', '值得推荐'],
    匿名: true,
    时间: '2025-02-13T08:00:00Z',
    有用数: 0,
    数据来源: '小红书',
    用户标识: 'system',
  },
  {
    id: 'preset_shanghai_5',
    城市: '上海',
    景点: '武康路',
    评分: 5,
    内容: '梧桐树真的很美，秋天落叶的时候拍照绝了！推荐早上或傍晚去，光线好人也少。',
    标签: ['拍照好看', '人少清静'],
    匿名: true,
    时间: '2025-02-14T10:00:00Z',
    有用数: 0,
    数据来源: '小红书',
    用户标识: 'system',
  },

  // 成都
  {
    id: 'preset_chengdu_1',
    城市: '成都',
    景点: '大熊猫繁育基地',
    评分: 5,
    内容: '一定要早上7点前去！成年熊猫上午比较活跃，下午都在睡觉。推荐看花花，太可爱了！',
    标签: ['避坑指南', '值得推荐'],
    匿名: true,
    时间: '2025-02-20T07:00:00Z',
    有用数: 0,
    数据来源: '小红书',
    用户标识: 'system',
  },
  {
    id: 'preset_chengdu_2',
    城市: '成都',
    景点: '宽窄巷子',
    评分: 3,
    内容: '商业化比较重，但是采耳体验很有意思，建议试试。旁边的小吃街好吃的比巷子里多。',
    标签: ['美食推荐'],
    匿名: true,
    时间: '2025-02-18T11:00:00Z',
    有用数: 0,
    数据来源: '大众点评',
    用户标识: 'system',
  },
  {
    id: 'preset_chengdu_3',
    城市: '成都',
    景点: '锦里古街',
    评分: 4,
    内容: '钵钵鸡和甜水面一定要吃！晚上去氛围好，红灯笼很漂亮。',
    标签: ['美食推荐', '拍照好看'],
    匿名: true,
    时间: '2025-02-17T19:00:00Z',
    有用数: 0,
    数据来源: '小红书',
    用户标识: 'system',
  },
  {
    id: 'preset_chengdu_4',
    城市: '成都',
    景点: '都江堰',
    评分: 5,
    内容: '古人的智慧真的太伟大了，两千年还在用！建议请导游，不然看不懂那些设计的精妙。',
    标签: ['值得推荐'],
    匿名: true,
    时间: '2025-02-19T10:00:00Z',
    有用数: 0,
    数据来源: '知乎',
    用户标识: 'system',
  },
  {
    id: 'preset_chengdu_5',
    城市: '成都',
    景点: '青城山',
    评分: 4,
    内容: '前山是道教文化，后山是自然风光。夏天去特凉快，避暑圣地！穿舒服的鞋，爬起来挺累的。',
    标签: ['避坑指南', '值得推荐'],
    匿名: true,
    时间: '2025-02-21T08:00:00Z',
    有用数: 0,
    数据来源: '携程',
    用户标识: 'system',
  },

  // 三亚
  {
    id: 'preset_sanya_1',
    城市: '三亚',
    景点: '亚龙湾',
    评分: 5,
    内容: '水清沙白，真的很美！推荐去亚龙湾热带天堂森林公园，玻璃栈道吓人但绝美。',
    标签: ['拍照好看', '值得推荐'],
    匿名: true,
    时间: '2025-02-10T14:00:00Z',
    有用数: 0,
    数据来源: '小红书',
    用户标识: 'system',
  },
  {
    id: 'preset_sanya_2',
    城市: '三亚',
    景点: '蜈支洲岛',
    评分: 4,
    内容: '岛上消费有点贵，建议提前吃好再去。潜水体验不错，能看到很多鱼。',
    标签: ['性价比', '值得推荐'],
    匿名: true,
    时间: '2025-02-12T10:00:00Z',
    有用数: 0,
    数据来源: '携程',
    用户标识: 'system',
  },
  {
    id: 'preset_sanya_3',
    城市: '三亚',
    景点: '海鲜第一市场',
    评分: 4,
    内容: '现买现加工很新鲜，但是要记得砍价！推荐椰子饭和清蒸石斑鱼。',
    标签: ['美食推荐', '性价比'],
    匿名: true,
    时间: '2025-02-11T18:00:00Z',
    有用数: 0,
    数据来源: '大众点评',
    用户标识: 'system',
  },

  // 西安
  {
    id: 'preset_xian_1',
    城市: '西安',
    景点: '秦始皇兵马俑',
    评分: 5,
    内容: '现场比照片震撼太多了！一号坑最震撼。建议请讲解员，不然就是一堆泥人。',
    标签: ['值得推荐', '避坑指南'],
    匿名: true,
    时间: '2025-02-10T09:00:00Z',
    有用数: 0,
    数据来源: '小红书',
    用户标识: 'system',
  },
  {
    id: 'preset_xian_2',
    城市: '西安',
    景点: '大唐不夜城',
    评分: 5,
    内容: '夜晚的灯光秀真的绝美，感觉穿越回大唐！不倒翁小姐姐表演一定要看，排队挺久的。',
    标签: ['拍照好看', '值得推荐'],
    匿名: true,
    时间: '2025-02-11T20:00:00Z',
    有用数: 0,
    数据来源: '小红书',
    用户标识: 'system',
  },
  {
    id: 'preset_xian_3',
    城市: '西安',
    景点: '回民街/洒金桥',
    评分: 4,
    内容: '洒金桥比回民街本地人更多，价格也更实惠。肉夹馍、凉皮、羊肉泡馍都好吃！',
    标签: ['美食推荐', '性价比'],
    匿名: true,
    时间: '2025-02-12T12:00:00Z',
    有用数: 0,
    数据来源: '大众点评',
    用户标识: 'system',
  },
]

// ========== 构建索引 ==========

function buildReviewsIndex(): ReviewsIndex {
  const index: ReviewsIndex = {}

  for (const review of presetReviews) {
    if (!index[review.城市]) {
      index[review.城市] = {}
    }

    if (!index[review.城市][review.景点]) {
      index[review.城市][review.景点] = {
        评价数: 0,
        平均评分: 0,
        有用评价数: 0,
        热评: [],
      }
    }

    index[review.城市][review.景点].热评.push(review)
  }

  // 计算统计数据
  for (const city in index) {
    for (const attraction in index[city]) {
      const reviews = index[city][attraction].热评
      const avgScore = reviews.reduce((sum, r) => sum + r.评分, 0) / reviews.length

      index[city][attraction].评价数 = reviews.length
      index[city][attraction].平均评分 = Math.round(avgScore * 10) / 10
      index[city][attraction].有用评价数 = reviews.filter(r => r.有用数 > 0).length

      // 排序热评：有用数优先，然后评分，最后时间
      index[city][attraction].热评.sort((a, b) => {
        if (b.有用数 !== a.有用数) return b.有用数 - a.有用数
        if (b.评分 !== a.评分) return b.评分 - a.评分
        return new Date(b.时间).getTime() - new Date(a.时间).getTime()
      })
    }
  }

  return index
}

// ========== 用户评价管理（内存存储，可迁移到Redis/数据库） ==========

// 用户提交的评价存储
const userReviews = new Map<string, Review>()

// 用户标记有用的记录（防止同一用户重复标记）
const helpfulRecords = new Map<string, Set<string>>() // reviewId -> Set of userId

/**
 * 生成评价ID
 */
function generateReviewId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 用户提交新评价
 */
export function addUserReview(
  城市: string,
  景点: string,
  评分: number,
  内容: string,
  用户标识: string,
  匿名 = true,
  标签?: string[]
): Review | null {
  // 参数校验
  if (!城市 || !景点 || !内容) {
    return null
  }
  if (评分 < 1 || 评分 > 5) {
    return null
  }
  if (内容.length < 5 || 内容.length > 500) {
    return null // 内容长度限制
  }

  const review: Review = {
    id: generateReviewId(),
    城市,
    景点,
    评分,
    内容: 内容.trim(),
    标签,
    匿名,
    时间: new Date().toISOString(),
    有用数: 0,
    数据来源: '用户',
    用户标识,
  }

  userReviews.set(review.id, review)

  // 重建索引
  rebuildIndex()

  console.log(`[新评价] ${城市} · ${景点} · 评分${评分} · 用户${用户标识.slice(0, 8)}***`)
  return review
}

/**
 * 标记评价为有用
 */
export function markReviewHelpful(reviewId: string, userId: string): boolean {
  const review = userReviews.get(reviewId)
  if (!review) {
    // 也检查预设评价
    const preset = presetReviews.find(r => r.id === reviewId)
    if (!preset) return false
    // 预设评价也支持标记有用（存在内存中）
    preset.有用数++
    return true
  }

  // 检查是否已经标记过
  const userRecords = helpfulRecords.get(reviewId)
  if (userRecords?.has(userId)) {
    return false // 已标记过
  }

  // 增加"有用"数
  review.有用数++

  // 记录用户已标记
  if (!userRecords) {
    helpfulRecords.set(reviewId, new Set([userId]))
  } else {
    userRecords.add(userId)
  }

  // 重建索引
  rebuildIndex()

  return true
}

/**
 * 获取用户的所有评价
 */
export function getUserReviews(userId: string): Review[] {
  return Array.from(userReviews.values()).filter(r => r.用户标识 === userId)
}

/**
 * 重建索引（当数据更新时调用）
 */
function rebuildIndex(): void {
  // 合并预设评价和用户评价
  const allReviews = [...presetReviews, ...Array.from(userReviews.values())]

  // 清空现有索引
  for (const city in reviewsIndex) {
    for (const attraction in reviewsIndex[city]) {
      reviewsIndex[city][attraction] = {
        评价数: 0,
        平均评分: 0,
        有用评价数: 0,
        热评: [],
      }
    }
  }

  // 重新构建索引
  for (const review of allReviews) {
    if (!reviewsIndex[review.城市]) {
      reviewsIndex[review.城市] = {}
    }

    if (!reviewsIndex[review.城市][review.景点]) {
      reviewsIndex[review.城市][review.景点] = {
        评价数: 0,
        平均评分: 0,
        有用评价数: 0,
        热评: [],
      }
    }

    reviewsIndex[review.城市][review.景点].热评.push(review)
  }

  // 重新计算统计数据
  for (const city in reviewsIndex) {
    for (const attraction in reviewsIndex[city]) {
      const reviews = reviewsIndex[city][attraction].热评
      if (reviews.length === 0) continue

      const avgScore = reviews.reduce((sum, r) => sum + r.评分, 0) / reviews.length

      reviewsIndex[city][attraction].评价数 = reviews.length
      reviewsIndex[city][attraction].平均评分 = Math.round(avgScore * 10) / 10
      reviewsIndex[city][attraction].有用评价数 = reviews.filter(r => r.有用数 > 0).length

      // 排序热评
      reviewsIndex[city][attraction].热评.sort((a, b) => {
        if (b.有用数 !== a.有用数) return b.有用数 - a.有用数
        if (b.评分 !== a.评分) return b.评分 - a.评分
        return new Date(b.时间).getTime() - new Date(a.时间).getTime()
      })
    }
  }

  console.log(`[索引重建] 景点评价数据已更新`)
}

// ========== 导出 ==========

export const presetReviewsData = presetReviews
export const reviewsIndex = buildReviewsIndex()

/**
 * 获取景点口碑数据
 */
export function getAttractionReviews(城市: string, 景点: string): AttractionsStats | null {
  return reviewsIndex[城市]?.[景点] || null
}

/**
 * 获取城市所有景点口碑
 */
export function getCityReviews(城市: string) {
  return reviewsIndex[城市] || {}
}

/**
 * 格式化评价统计信息（用于AI回复）
 */
export function formatReviewSummary(城市: string, 景点: string): string | null {
  const stats = getAttractionReviews(城市, 景点)
  if (!stats || stats.评价数 === 0) {
    return null
  }

  return `💬 ${stats.评价数}位用户推荐 ⭐${stats.平均评分}`
}

/**
 * 根据标签筛选评价
 */
export function getReviewsByTags(城市: string, 景点: string, ...tags: string[]): Review[] {
  const attrReviews = getAttractionReviews(城市, 景点)
  if (!attrReviews) return []

  return attrReviews.热评.filter(r => {
    const reviewTags = r.标签
    if (!reviewTags) return false
    return tags.some(tag => reviewTags.includes(tag))
  })
}

/**
 * 获取所有评价（用于数据备份和迁移）
 */
export function getAllReviews(): Review[] {
  return [...presetReviews, ...Array.from(userReviews.values())]
}

/**
 * 获取用户评价统计
 */
export function getUserReviewStats(): {
  预设评价数: number
  用户评价数: number
  标记有用次数: number
} {
  return {
    预设评价数: presetReviews.length,
    用户评价数: userReviews.size,
    标记有用次数: Array.from(helpfulRecords.values()).reduce((sum, set) => sum + set.size, 0),
  }
}
