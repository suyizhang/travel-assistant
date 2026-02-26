import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getAttractionReviews, formatReviewSummary, getReviewsByTags } from "./data/reviews-data.js";

/**
 * 获取景点口碑信息的工具
 * AI 可以调用这个工具来查询用户对某个景点的真实评价
 */
export const reviewTool = tool(
  async ({ 城市, 景点, 标签筛选 }) => {
    const stats = getAttractionReviews(城市, 景点);

    if (!stats || stats.评价数 === 0) {
      return `暂无「${景点}」的用户口碑数据。`;
    }

    let result = `💬 ${stats.评价数}位用户推荐 ⭐${stats.平均评分}`;

    let reviews = stats.热评;

    // 如果有标签筛选
    if (标签筛选 && 标签筛选.length > 0) {
      reviews = getReviewsByTags(城市, 景点, ...标签筛选);
      if (reviews.length > 0) {
        result += `\n\n🏷️ 标签筛选: ${标签筛选.join(", ")}`;
      }
    }

    // 最多显示 3 条热评
    const displayReviews = reviews.slice(0, 3);
    if (displayReviews.length > 0) {
      result += "\n\n📌 热门评价：";
      displayReviews.forEach((r, i) => {
        const name = r.匿名 ? "匿名用户" : (r.用户标识 || "用户");
        const time = formatTime(r.时间);
        result += `\n\n${i + 1}. ${name} · ${time}\n   ${r.内容}`;
        if (r.有用数 > 0) {
          result += `\n   👍 ${r.有用数}位用户觉得有帮助`;
        }
      });
    }

    if (stats.评价数 > 3) {
      result += `\n\n...还有 ${stats.评价数 - 3} 条评价，点击[查看评价]查看详情。`;
    }

    return result;
  },
  {
    name: "get_attraction_reviews",
    description: "获取景点的用户口碑信息，包括推荐数、平均评分、热门等。当提到某个景点时，应该调用此工具获取用户真实的游览体验和评价。",
    schema: z.object({
      城市: z.string().describe("景点所在的城市名称"),
      景点: z.string().describe("景点名称"),
      标签筛选: z.array(z.string()).optional().describe("可选，按标签筛选评价，如[\"避坑指南\", \"拍照好看\"]"),
    }),
  }
);

/**
 * 格式化时间为友好显示
 */
function formatTime(isoTime: string): string {
  const date = new Date(isoTime);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 7) return `${days}天前`;
  if (days < 30) return `${Math.floor(days / 7)}周前`;
  return date.toLocaleDateString("zh-CN", { month: "long", day: "numeric" });
}

/**
 * 获取评价摘要（简化版，用于快速展示）
 */
export const reviewSummaryTool = tool(
  async ({ 城市, 景点 }) => {
    const summary = formatReviewSummary(城市, 景点);
    if (!summary) {
      return "";
    }
    return summary;
  },
  {
    name: "get_review_summary",
    description: "快速获取景点的评价统计摘要（推荐数和平均评分），用于在回复中简洁展示",
    schema: z.object({
      城市: z.string().describe("景点所在的城市名称"),
      景点: z.string().describe("景点名称"),
    }),
  }
);
