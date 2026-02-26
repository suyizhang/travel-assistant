/**
 * 口碑数据转换工具
 *
 * 使用方法:
 * 1. 将收集好的数据保存为 reviews-source.csv（UTF-8编码）
 * 2. 运行: npx tsx tools/generate-reviews.ts
 * 3. 生成的数据会输出到 reviews-data.ts
 */

interface SourceReview {
  城市: string
  景点: string
  评分: number
  评价内容: string
  是否匿名: string // "是" | "否"
  数据来源: string
  原文链接?: string
  收集日期: string
}

interface Review {
  id: string
  城市: string
  景点: string
  评分: number
  内容: string
  标签?: string[]
  匿名: boolean
  时间: string // ISO格式
  数据来源?: string
  原文链接?: string
}

interface AttractionsStats {
  评价数: number
  平均评分: number
  热评: Review[]
}

interface ReviewsIndex {
  [城市: string]: {
    [景点: string]: AttractionsStats
  }
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 转换单条评价
 */
function convertReview(source: SourceReview): Review {
  // 尝试从评价内容中提取标签（可选）
  const tags: string[] = []
  const lowerContent = source.评价内容.toLowerCase()

  if (lowerContent.includes('拍照') || lowerContent.includes('摄影')) tags.push('拍照好看')
  if (lowerContent.includes('人少') || lowerContent.includes('清静')) tags.push('人少清静')
  if (lowerContent.includes('值得') || lowerContent.includes('推荐')) tags.push('值得推荐')
  if (lowerContent.includes('避坑') || lowerContent.includes('避开') || lowerContent.includes('不要')) tags.push('避坑指南')
  if (lowerContent.includes('便宜') || lowerContent.includes('划算') || lowerContent.includes('省钱')) tags.push('性价比')
  if (lowerContent.includes('美食') || lowerContent.includes('小吃') || lowerContent.includes('餐厅')) tags.push('美食推荐')

  return {
    id: generateId(),
    城市: source.城市,
    景点: source.景点,
    评分: source.评分,
    内容: source.评价内容,
    标签: tags.length > 0 ? tags : undefined,
    匿名: source.是否匿名 === '是',
    时间: new Date(source.收集日期).toISOString(),
    数据来源: source.数据来源,
    原文链接: source.原文链接,
  }
}

/**
 * 构建景点统计和评价列表
 */
function buildAttractionsStats(reviews: Review[]): AttractionsStats {
  if (reviews.length === 0) {
    return { 评价数: 0, 平均评分: 0, 热评: [] }
  }

  const 平均评分 = reviews.reduce((sum, r) => sum + r.评分, 0) / reviews.length

  // 热评：评分高的优先，然后按时间排序，最多显示5条
  const 热评 = [...reviews]
    .sort((a, b) => {
      if (b.评分 !== a.评分) return b.评分 - a.评分
      return new Date(b.时间).getTime() - new Date(a.时间).getTime()
    })
    .slice(0, 5)
    .map(r => ({
      id: r.id,
      城市: r.城市,
      景点: r.景点,
      评分: r.评分,
      内容: r.内容,
      标签: r.标签,
      匿名: r.匿名,
      时间: r.时间,
      数据来源: r.数据来源,
      原文链接: r.原文链接,
    }))

  return {
    评价数: reviews.length,
    平均评分: Math.round(平均评分 * 10) / 10, // 保留一位小数
    热评,
  }
}

/**
 * 主转换函数
 */
function convertReviewsData(sourceData: SourceReview[]): {
  allReviews: Review[]
  index: ReviewsIndex
} {
  const allReviews: Review[] = []
  const index: ReviewsIndex = {}

  for (const source of sourceData) {
    const review = convertReview(source)
    allReviews.push(review)

    // 构建索引
    if (!index[review.城市]) {
      index[review.城市] = {}
    }

    if (!index[review.城市][review.景点]) {
      index[review.城市][review.景点] = {
        评价数: 0,
        平均评分: 0,
        热评: [],
      }
    }

    // 累加评价（稍后会重新计算统计）
    index[review.城市][review.景点].热评.push(review)
  }

  // 计算每个景点的统计数据
  for (const 城市 in index) {
    for (const 景点 in index[城市]) {
      const reviews = index[城市][景点].热评
      index[城市][景点] = buildAttractionsStats(reviews)
    }
  }

  return { allReviews, index }
}

/**
 * 生成 TypeScript 代码
 */
function generateTSCode(data: { allReviews: Review[]; index: ReviewsIndex }): string {
  return `// 自动生成的口碑数据
// 生成时间: ${new Date().toLocaleString('zh-CN')}

export interface Review {
  id: string
  城市: string
  景点: string
  评分: number
  内容: string
  标签?: string[]
  匿名: boolean
  时间: string
  数据来源?: string
  原文链接?: string
}

export interface AttractionsStats {
  评价数: number
  平均评分: number
  热评: Review[]
}

export interface ReviewsIndex {
  [城市: string]: {
    [景点: string]: AttractionsStats
  }
}

export const allReviews: Review[] = ${JSON.stringify(data.allReviews, null, 2)}

export const reviewsIndex: ReviewsIndex = ${JSON.stringify(data.index, null, 2)}

/**
 * 获取景点口碑数据
 */
export function getAttractionReviews(城市: string, 景点: string) {
  return reviewsIndex[城市]?.[景点] || null
}

/**
 * 获取城市所有景点口碑统计
 */
export function getCityReviews(城市: string) {
  return reviewsIndex[城市] || {}
}
`
}

/**
 * CSV 数据解析
 */
function parseCSV(content: string): SourceReview[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length < 2) {
    throw new Error('CSV 文件为空或格式错误')
  }

  const headers = lines[0].split(',').map(h => h.trim())
  const reviews: SourceReview[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',')
    const review: any = {}

    headers.forEach((header, index) => {
      review[header] = values[index]?.trim() || ''
    })

    reviews.push({
      城市: review['城市'] || '',
      景点: review['景点'] || '',
      评分: parseInt(review['评分(1-5)']) || 0,
      评价内容: review['评价内容'] || '',
      是否匿名: review['是否匿名'] || '是',
      数据来源: review['数据来源'] || '未知',
      原文链接: review['原文链接'] || undefined,
      收集日期: review['收集日期'] || new Date().toISOString().split('T')[0],
    })
  }

  return reviews
}

// ========== 使用示例 ==========

// 示例数据（实际使用时替换为从文件读取）
const exampleData: SourceReview[] = [
  {
    城市: '北京',
    景点: '故宫博物院',
    评分: 5,
    评价内容: '一定要提前预约，早上8点前进去人少，拍照效果最好',
    是否匿名: '是',
    数据来源: '小红书',
    原文链接: 'https://example.com/1',
    收集日期: '2025-02-20',
  },
  {
    城市: '北京',
    景点: '故宫博物院',
    评分: 4,
    评价内容: '珍宝馆值得单独买票，里面的展品太惊艳了',
    是否匿名: '否',
    数据来源: '携程',
    原文链接: 'https://example.com/2',
    收集日期: '2025-02-21',
  },
  {
    城市: '北京',
    景点: '天坛公园',
    评分: 4,
    评价内容: '回音壁的声学效果很神奇，建议找个人配合试一下',
    是否匿名: '是',
    数据来源: '知乎',
    原文链接: 'https://example.com/3',
    收集日期: '2025-02-22',
  },
]

console.log('=== 示例数据转换结果 ===')
const result = convertReviewsData(exampleData)
console.log(JSON.stringify(result, null, 2))

console.log('\n=== 生成的 TypeScript 代码 ===')
console.log(generateTSCode(result))
