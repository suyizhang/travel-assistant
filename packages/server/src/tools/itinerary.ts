import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { itineraryData } from "./data/itinerary-data.ts";

export const itineraryTool = tool(
  async ({ city, days, preferences }) => {
    const travelDays = days || 3;
    const template = itineraryData[city];

    if (!template) {
      return `暂无 ${city} 的预设行程模板。建议 ${travelDays} 天行程安排：\n- 第 1 天：城市地标 + 适应当地节奏\n- 中间几天：核心景点 + 特色体验\n- 最后 1 天：购物/自由活动/返程\n\n可以告诉我更多偏好，我帮你定制。`;
    }

    const plan = template.slice(0, travelDays);
    const prefNote = preferences ? `\n\n🎯 根据你的偏好「${preferences}」，以上行程可灵活调整顺序和取舍。` : "";

    return `📋 ${city} ${travelDays} 天行程推荐：\n\n${plan.join("\n\n")}${prefNote}\n\n💡 以上为参考行程，可根据实际情况灵活调整。需要我调整某天的安排吗？`;
  },
  {
    name: "plan_itinerary",
    description: "为用户生成旅行行程规划，包含每天的景点安排和建议",
    schema: z.object({
      city: z.string().describe("目的地城市"),
      days: z.number().optional().describe("旅行天数，默认 3 天"),
      preferences: z.string().optional().describe("旅行偏好，如：文化历史、美食、购物、亲子、浪漫等"),
    }),
  }
);
