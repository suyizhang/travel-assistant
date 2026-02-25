import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { budgetData } from "./data/budget-data.ts";

export const budgetTool = tool(
  async ({ city, days, level }) => {
    const travelLevel = level || "中等";
    const travelDays = days || 3;
    const cityBudget = budgetData[city]?.[travelLevel];

    if (!cityBudget) {
      return `暂无 ${city}（${travelLevel}档）的预算数据。国内城市一般参考：经济型 ¥250-500/天，中等 ¥600-1200/天，豪华 ¥1500+/天。${travelDays} 天预计总费用需乘以天数，另加往返交通费。`;
    }

    return `💰 ${city} ${travelDays} 天旅行预算估算（${travelLevel}档）：

🏨 住宿：${cityBudget.accommodation}
🍜 餐饮：${cityBudget.food}
🚌 市内交通：${cityBudget.transport}
🎫 门票/活动：${cityBudget.tickets}

📊 每日合计：${cityBudget.total}
📊 ${travelDays} 天预估：以上日均 × ${travelDays}（不含往返大交通）

💡 省钱tips：提前订机票酒店可省20-30%，淡季出行更划算，关注各平台优惠券。`;
  },
  {
    name: "estimate_budget",
    description: "估算旅行目的地的费用预算，包括住宿、餐饮、交通、门票等",
    schema: z.object({
      city: z.string().describe("目的地城市"),
      days: z.number().optional().describe("旅行天数，默认 3 天"),
      level: z.enum(["经济", "中等", "豪华"]).optional().describe("消费档次，默认中等"),
    }),
  }
);
